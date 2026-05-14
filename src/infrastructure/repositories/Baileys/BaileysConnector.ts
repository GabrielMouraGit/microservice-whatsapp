import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
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

    const qrPromise = this.waitQr(sessionId);

    return {
      sock,
      qr: (await qrPromise) || "",
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
    // salvar credenciais
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.update", (data) => {
      console.log("messages.update", JSON.stringify(data, null, 2));
    });

    sock.ev.on("messages.upsert", async (m) => {
      const log = new EventLog(sessionId, tenantId);
      try {
        if (m.type !== "notify") return;

        for (const msg of m.messages) {
          if (msg.key.fromMe) {
            console.log("📤 mensagem enviada");
          } else {
            console.log("📩 mensagem recebida");
          }

          log.log("messages.upsert.raw", m);

          const mapped = BaileysToWhatpyMapper.map(msg);

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

  async logout(sessionId: string) {
    try {
      const sock = this.sockets.get(sessionId);

      // 1. encerra conexão se existir
      if (sock) {
        try {
          await sock.logout(); // invalida no WhatsApp
        } catch (err) {
          console.log("⚠️ erro no logout (ignorado):", err);
        }

        try {
          sock.ws.close(); // garante fechamento
        } catch (err) {
          console.log("⚠️ erro ao fechar ws:", err);
        }
      }

      // 2. remove da memória
      this.sockets.delete(sessionId);

      // 3. remove arquivos da sessão
      const sessionPath = path.resolve(`./session/${sessionId}`);

      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log("🧹 sessão removida do disco:", sessionId);
      }

      console.log("logout concluído:", sessionId);
    } catch (error) {
      console.error("❌ erro ao fazer logout:", error);

      throw new DomainError("Erro ao fazer logout");
    }
  }

  isConnected(sessionId: string) {
    return !!this.sockets.get(sessionId)?.user;
  }

  getSocket(sessionId: string) {
    return this.sockets.get(sessionId);
  }
  private waitQr(sessionId: string) {
    return new Promise<string>((resolve) => {
      this.qrResolvers.set(sessionId, resolve);
    });
  }

  async regenerateQr(sessionId: string, tenantId: string) {
    const existing = this.sockets.get(sessionId);

    if (!existing) {
      return await this.connect(sessionId, tenantId);
    }

    const qr = await this.waitQr(sessionId);

    return { qr };
  }
}
