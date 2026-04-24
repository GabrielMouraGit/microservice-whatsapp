import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { SessionManager } from "../SessionManager";
import { SessionEvents } from "@/domain/events/SessionEvents";
import { EventBus } from "@/infrastructure/events/EventBus";
import { BaileysToWhatpyMapper } from "./BaileysToWhatpyMapper";
import { DomainError } from "@/domain/utils/DomainError";
import fs from "fs";
import path from "path";

export class BaileysConnector {
  constructor(
    private sockets: SessionManager,
    private events: EventBus<SessionEvents>,
  ) {}

  async connect(sessionId: string, tenantId: string) {
    const existing = this.sockets.get(sessionId);

    if (existing) {
      return { sock: existing };
    }

    const { sock, saveCreds } = await this.createSocket(sessionId);

    this.handleConnection(sock, sessionId, tenantId);
    this.bindMessages(sock, sessionId, tenantId, saveCreds);

    this.sockets.set(sessionId, sock);

    return { sock };
  }

  private async createSocket(sessionId: string) {
    const { state, saveCreds } = await useMultiFileAuthState(
      `./session/${sessionId}`,
    );

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
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
      }

      // CONECTADO
      if (connection === "open") {
        console.log("✅ conectado");
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

        // limpa socket antigo
        const existing = this.sockets.get(sessionId);
        if (existing) {
          try {
            existing.ws.close();
          } catch {
            this.sockets.delete(sessionId);
          }
        }

        // sessão inválida
        if (statusCode === 401) {
          console.log("⚠️ sessão inválida → resetando");
          await this.logout(sessionId);
          return this.connect(sessionId, tenantId);
        }

        // timeout / rede
        if (statusCode === 408) {
          console.log("⏱ timeout → retry");
          await new Promise((r) => setTimeout(r, 3000));
          return this.connect(sessionId, tenantId);
        }

        // fallback
        console.log("🔄 reconexão padrão");
        await new Promise((r) => setTimeout(r, 5000));
        return this.connect(sessionId, tenantId);
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
      console.log("📩 mensagem recebida");

      if (m.type !== "notify") return;

      const mapped = BaileysToWhatpyMapper.map(m.messages);

      await this.events.emit("message.received", {
        sessionId,
        tenantId,
        data: mapped,
      });
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
  async regenerateQr(sessionId: string, tenantId: string) {
    //  logout
    await this.logout(sessionId);

    // 2. reconecta
    return this.connect(sessionId, tenantId);
  }
}
