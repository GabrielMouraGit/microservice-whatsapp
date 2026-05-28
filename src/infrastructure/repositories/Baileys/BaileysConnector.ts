import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
  WAMessage,
  downloadMediaMessage,
  proto,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { SessionManager } from "../SessionManager";
import { EventBus } from "@/infrastructure/events/EventBus";
import { BaileysToWhatpyMapper } from "./BaileysToWhatpyMapper";
import { DomainError } from "@/domain/utils/DomainError";
import fs from "fs";
import path from "path";
import { AppEvents } from "container";
import { DomainEventDispatcher } from "@/infrastructure/events/DomainEventDispatcher";
import { EventLog } from "@/domain/aggregates/EventLog";
import { ITypeSessionEvents } from "@/domain/events/ITypeSessionEvents";
import { $config } from "@config/config";

export class BaileysConnector {
  private qrResolvers = new Map<string, (qr: string) => void>();
  private reconnecting = new Set<string>();

  constructor(
    private sockets: SessionManager,
    private events: EventBus<ITypeSessionEvents>,
    private dispatcher: DomainEventDispatcher<AppEvents>,
  ) {}

  async connect(sessionId: string, tenantId: string) {
    const existing = this.sockets.get(sessionId);

    if (existing && existing.user) {
      console.log("Já conectado");
      return { sock: existing };
    }

    const { sock, saveCreds } = await this.createSocket(sessionId);

    this.handleConnection(sock, sessionId, tenantId);
    this.bindMessages(sock, sessionId, tenantId, saveCreds);

    this.sockets.set(sessionId, sock);

    let qr = "";

    try {
      qr = await this.waitQr(sessionId);
    } catch {
      qr = "";
    }

    return {
      sock,
      qr: qr,
    };
  }

  private async createSocket(sessionId: string) {
    const { state, saveCreds } = await useMultiFileAuthState(
      `./session/${sessionId}`,
    );

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      version,

      // produção
      printQRInTerminal: false,
      logger: pino({ level: "error" }),

      // controle de histórico
      syncFullHistory: false,

      // performance
      markOnlineOnConnect: false,
      emitOwnEvents: true, // notifica as mesagens enviadas por mim

      // estabilidade
      retryRequestDelayMs: 500,
      maxMsgRetryCount: 3,

      // evita payload gigante
      defaultQueryTimeoutMs: 60_000,
    });

    return { sock, saveCreds };
  }

  private handleConnection(
    sock: WASocket,
    sessionId: string,
    tenantId: string,
  ) {
    sock.ev.on("connection.update", async (update) => {
      const { connection, qr, lastDisconnect } = update;

      // QR GERADO
      if (qr) {
        const qrBase64 = await QRCode.toDataURL(qr);

        await this.events.emit("session.qr.generated", {
          sessionId,
          tenantId,
          qr: qrBase64,
        });

        this.qrResolvers.get(sessionId)?.(qrBase64);
        this.qrResolvers.delete(sessionId);
      }

      // CONECTADO
      if (connection === "open") {
        console.log("✅ conectado");

        // 🔥 importante: limpar flag de reconexão
        this.reconnecting.delete(sessionId);

        await this.events.emit("session.connected", {
          sessionId,
          tenantId,
        });
      }

      // DESCONECTADO
      if (connection === "close") {
        console.log("❌ fechado");

        const statusCode = (
          lastDisconnect?.error as { output?: { statusCode: number } }
        )?.output?.statusCode;

        console.log("status:", statusCode);

        // NÃO reconectar aqui
        if (statusCode === 515) {
          if (this.reconnecting.has(sessionId)) {
            return;
          }

          this.reconnecting.add(sessionId);

          console.log("♻️ reiniciando stream");

          this.sockets.delete(sessionId);

          setTimeout(async () => {
            try {
              await this.connect(sessionId, tenantId);
            } catch (err) {
              console.log("erro reconnect 515", err);
            } finally {
              this.reconnecting.delete(sessionId);
            }
          }, 1000);

          return;
        }

        // SEMPRE remove o socket antigo
        const existing = this.sockets.get(sessionId);

        if (existing) {
          try {
            existing.ws.close();
          } catch (err) {
            console.log("existing.ws.close", err);
          }
        }

        this.sockets.delete(sessionId);

        // evita reconexão duplicada
        if (this.reconnecting.has(sessionId)) {
          console.log("⏳ já reconectando...");
          return;
        }

        this.reconnecting.add(sessionId);

        // sessão inválida → precisa limpar tudo
        if (statusCode === 401) {
          console.log("⚠️ sessão inválida → resetando");

          await this.logout(sessionId);

          this.reconnecting.delete(sessionId);

          return;
        }

        console.log("🔄 tentando reconectar...");

        // retry com delay (evita loop agressivo)
        setTimeout(async () => {
          try {
            await this.connect(sessionId, tenantId);
          } catch (err) {
            console.log("❌ erro ao reconectar:", err);
          } finally {
            this.reconnecting.delete(sessionId);
          }
        }, 2000);
      }
    });
  }

  private bindMessages(
    sock: WASocket,
    sessionId: string,
    tenantId: string,
    saveCreds: () => void,
  ) {
    // remove antigos

    // salvar credenciais
    sock.ev.on("creds.update", saveCreds);

    // sock.ev.on("messages.update", (data) => {
    //   console.log("messages.update", JSON.stringify(data, null, 2));
    // });

    sock.ev.on("messages.upsert", async (m) => {
      const log = new EventLog(sessionId, tenantId);
      try {
        //replace | remove | prepend
        if (!["notify", "append"].includes(m.type)) {
          return;
        }

        if (!m.messages?.length) return;

        for (const msg of m.messages) {
          if (!msg.message) continue;

          if (
            msg.key.remoteJid === "status@broadcast" ||
            msg.broadcast ||
            msg.message?.senderKeyDistributionMessage
          ) {
            continue;
          }

          if (msg.key.fromMe) {
            console.log("📤 mensagem enviada");
          } else {
            console.log("📩 mensagem recebida");
          }

          log.log("messages.upsert.raw", msg);

          const { url } = await this.uploadMessageMedia(sock, msg, tenantId);

          const mapped = BaileysToWhatpyMapper.map(msg, url);

          if (!mapped) continue;

          await this.events.emit("message.received", {
            sessionId,
            tenantId,
            data: mapped,
          });

          log.done();
        }
      } catch {
        log.fail();
      } finally {
        this.dispatcher.dispatch(log);
      }
    });
  }
  private extractMediaMessage(message: proto.IMessage): ExtractedMedia {
    if (!message) {
      return null;
    }

    if (message.imageMessage) {
      return {
        type: "image",
        media: message.imageMessage,
      };
    }

    if (message.videoMessage) {
      return {
        type: "video",
        media: message.videoMessage,
      };
    }

    if (message.audioMessage) {
      return {
        type: message.audioMessage.ptt ? "voice" : "audio",

        media: message.audioMessage,
      };
    }

    if (message.documentMessage) {
      return {
        type: "document",
        media: message.documentMessage,
      };
    }

    if (message.stickerMessage) {
      return {
        type: "sticker",
        media: message.stickerMessage,
      };
    }

    // document with caption
    if (message.documentWithCaptionMessage?.message) {
      return this.extractMediaMessage(
        message.documentWithCaptionMessage.message,
      );
    }

    // view once
    if (message.viewOnceMessage?.message) {
      return this.extractMediaMessage(message.viewOnceMessage.message);
    }

    // view once v2
    if (message.viewOnceMessageV2?.message) {
      return this.extractMediaMessage(message.viewOnceMessageV2.message);
    }

    // ephemeral
    if (message.ephemeralMessage?.message) {
      return this.extractMediaMessage(message.ephemeralMessage.message);
    }

    return null;
  }

  private async uploadMessageMedia(
    sock: WASocket,
    msg: WAMessage,
    tenant_id: string,
  ): Promise<{ url: string }> {
    try {
      if (!msg.message) {
        return { url: "" };
      }

      if (msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2) {
        return { url: "" };
      }

      const extracted = this.extractMediaMessage(msg.message);

      if (!extracted) {
        return { url: "" };
      }

      const { media, type } = extracted;

      if (!media.mediaKey || !media.directPath) {
        return { url: "" };
      }

      const buffer = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        {
          logger: pino({ level: "silent" }),
          reuploadRequest: sock.updateMediaMessage,
        },
      );

      if (!buffer) {
        return { url: "" };
      }

      const mimeType = media.mimetype || "application/octet-stream";
      const extension = mimeType.split("/")[1]?.split(";")[0] || "bin";

      let fileName = `${type}-${Date.now()}.${extension}`; //media.fileName;

      // remove caracteres inválidos
      fileName = fileName.replace(/[^\w.\-]/g, "_");

      const formData = new FormData();

      formData.append(
        "file",
        new Blob([new Uint8Array(buffer)], {
          type: mimeType,
        }),
        fileName,
      );

      formData.append("path", `public/whatsapp/${msg.key.id}`);

      const response = await fetch(
        `${$config.MICROSERVICE_STORAGE}/storage/api/v1/file/add-item`,
        {
          method: "POST",
          headers: {
            "x-backend-token": $config.MICROSERVICE_STORAGE_TOKEN,
            "x-tenant-id": tenant_id,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`erro upload: ${response.status}`);
      }

      const uploaded = await response.json();

      return {
        url: uploaded.url,
      };
    } catch (err) {
      console.error("erro upload media", err);

      return {
        url: "",
      };
    }
  }

  async logout(sessionId: string) {
    try {
      const sock = this.sockets.get(sessionId);

      if (sock) {
        try {
          await sock.logout();
        } catch {
          console.log("ERRO");
        }
      }

      this.sockets.delete(sessionId);

      const sessionPath = path.resolve(`./session/${sessionId}`);

      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, {
          recursive: true,
          force: true,
        });
      }

      console.log("logout concluído:", sessionId);
    } catch (error) {
      console.error(error);

      throw new DomainError("Erro ao fazer logout");
    }
  }

  isConnected(sessionId: string) {
    return !!this.sockets.get(sessionId)?.user;
  }

  getSocket(sessionId: string) {
    return this.sockets.get(sessionId);
  }
  private waitQr(sessionId: string, timeout = 30000) {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.qrResolvers.delete(sessionId);

        reject(new Error("QR timeout"));
      }, timeout);

      this.qrResolvers.set(sessionId, (qr) => {
        clearTimeout(timer);

        resolve(qr);
      });
    });
  }

  async regenerateQr(sessionId: string, tenantId: string) {
    try {
      console.log("🔄 regenerando QR:", sessionId);

      // remove sessão atual completamente
      await this.logout(sessionId);

      // cria nova sessão limpa
      return await this.connect(sessionId, tenantId);
    } catch (err) {
      console.log("[ERRO regenerateQr]", err);

      return {
        qr: "",
      };
    }
  }
}
type ExtractedMedia = {
  type: "image" | "video" | "audio" | "voice" | "document" | "sticker";

  media:
    | proto.Message.IImageMessage
    | proto.Message.IVideoMessage
    | proto.Message.IAudioMessage
    | proto.Message.IDocumentMessage
    | proto.Message.IStickerMessage;
} | null;
