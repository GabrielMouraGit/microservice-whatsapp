import { SessionManager } from "../SessionManager";
import { BaileysConnector } from "./BaileysConnector";
import { WASocket } from "@whiskeysockets/baileys";
import { MessageEventLogRepository } from "../MessageEventLogRepository";

export class BaileysRepository {
  constructor(
    private connector: BaileysConnector,
    private sessions: SessionManager,
    private messageEventLogRepository: MessageEventLogRepository,
  ) {}

  async createSession(sessionId: string, tenantId: string) {
    const { sock } = await this.connector.connect(sessionId, tenantId);
    this.sessions.set(sessionId, sock);

    return { sessionId };
  }
  async newQrCode(sessionId: string, tenantId: string) {
    const { qr } = await this.connector.regenerateQr(sessionId, tenantId);

    return { qr };
  }

  private async getReadySocket(sessionId: string): Promise<WASocket> {
    let sock = this.sessions.get(sessionId);

    if (!sock) {
      const result = await this.connector.connect(sessionId, "");
      sock = result.sock;
      this.sessions.set(sessionId, sock);
    }

    if (!sock.user) {
      await this.waitForConnection(sock);
    }

    return sock;
  }

  async logout(sessionId: string): Promise<void> {
    await this.connector.logout(sessionId);
  }

  private waitForConnection(sock: WASocket) {
    return new Promise<void>((resolve, reject) => {
      if (sock.user) return resolve();

      const timeout = setTimeout(() => {
        reject(new Error("Timeout ao conectar sessão"));
      }, 20000);

      sock.ev.on("connection.update", (update) => {
        if (update.connection === "open") {
          clearTimeout(timeout);
          resolve();
        }

        if (update.connection === "close") {
          clearTimeout(timeout);
          reject(new Error("Conexão fechada antes de conectar"));
        }
      });
    });
  }

  async sendTextMessage(
    tenant_id: string,
    sessionId: string,
    number: string,
    text: string,
    quoted_id: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;
    await sock.sendPresenceUpdate("composing", jid);

    const message =
      await this.messageEventLogRepository.findByMessageId(quoted_id);

    const quoted = message?.payload?.messages?.[0] || null;

    await new Promise((r) => setTimeout(r, 2000)); // deley
    await sock.sendPresenceUpdate("paused", jid);
    return sock.sendMessage(
      jid,
      { text },
      { ...(quoted ? { quoted: quoted } : {}) },
    );
  }
}
