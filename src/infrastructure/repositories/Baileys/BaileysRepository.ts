import { SessionManager } from "../SessionManager";
import { BaileysConnector } from "./BaileysConnector";
import { WASocket } from "@whiskeysockets/baileys";
import { MessageEventLogRepository } from "../MessageEventLogRepository";
import { MessageRepository } from "../MessageRepository";

export class BaileysRepository {
  constructor(
    private connector: BaileysConnector,
    private sessions: SessionManager,
    private messageEventLogRepository: MessageEventLogRepository,
    private messageRepository: MessageRepository,
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

  private async buildQuotedMessage(quoted_id?: string) {
    if (!quoted_id) return {};

    const message =
      await this.messageEventLogRepository.findByMessageId(quoted_id);

    const quoted = message?.payload?.messages?.[0];

    if (!quoted) return {};

    return { quoted };
  }
  private async simulateTyping(sock: WASocket, jid: string, delay = 2000) {
    await sock.sendPresenceUpdate("composing", jid);

    await new Promise((r) => setTimeout(r, delay));

    await sock.sendPresenceUpdate("paused", jid);
  }

  private async sendMessageCore(
    sock: WASocket,
    jid: string,
    content: any,
    quoted_id?: string,
  ) {
    const quotedOptions = await this.buildQuotedMessage(quoted_id);

    await this.simulateTyping(sock, jid, 2000);

    return sock.sendMessage(jid, content, quotedOptions);
  }

  async sendTextMessage(
    tenant_id: string,
    sessionId: string,
    number: string,
    text: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    return this.sendMessageCore(sock, jid, { text }, quoted_id);
  }
  async sendImageMessage(
    sessionId: string,
    number: string,
    url: string,
    caption?: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const content = {
      image: { url },
      caption,
    };

    return this.sendMessageCore(sock, jid, content, quoted_id);
  }
  async sendVideoMessage(
    sessionId: string,
    number: string,
    url: string,
    caption?: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const content = {
      video: { url },
      caption,
    };

    return this.sendMessageCore(sock, jid, content, quoted_id);
  }
  async sendAudioMessage(
    sessionId: string,
    number: string,
    url: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const content = {
      audio: { url },
      mimetype: "audio/mp4",
    };

    return this.sendMessageCore(sock, jid, content, quoted_id);
  }
  async sendVoiceMessage(
    sessionId: string,
    number: string,
    url: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const content = {
      audio: { url },
      mimetype: "audio/mp4",
      ptt: true,
    };

    return this.sendMessageCore(sock, jid, content, quoted_id);
  }
  async sendDocumentMessage(
    sessionId: string,
    number: string,
    url: string,
    fileName: string,
    mimetype: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const content = {
      document: { url },
      fileName,
      mimetype,
    };

    return this.sendMessageCore(sock, jid, content, quoted_id);
  }
  async getContact(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const result = await sock.onWhatsApp(jid);

    const contact = result?.[0];

    if (!contact?.exists) {
      return {
        jid: "",
        name: "",
        exists: false,
        profilePicUrl: "",
      };
    }

    let profilePicUrl: string;

    try {
      profilePicUrl = (await sock.profilePictureUrl(jid, "image")) || "";
    } catch {
      profilePicUrl = "";
    }
    const messageContact =
      await this.messageRepository.getMessagesLastMessageByChatId(jid);
    console.log(messageContact);

    return {
      jid,
      name: messageContact?.from_name || "",
      exists: contact.exists,
      profilePicUrl,
    };
  }
}
