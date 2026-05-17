import { SessionManager } from "../SessionManager";
import { BaileysConnector } from "./BaileysConnector";
import { WAMessage, WASocket } from "@whiskeysockets/baileys";
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

    const quoted = message?.payload as WAMessage;

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

    const result = await this.sendMessageCore(sock, jid, { text }, quoted_id);

    if (!result?.key?.id) {
      throw new Error("Failed to send text message");
    }

    return {
      message_id: result?.key.id,
    };
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

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send text message");
    }

    return {
      message_id: result?.key.id,
    };
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

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send text message");
    }
    return {
      message_id: result?.key.id,
    };
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

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send text message");
    }
    return {
      message_id: result?.key.id,
    };
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

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send text message");
    }
    return {
      message_id: result?.key.id,
    };
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

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send text message");
    }
    return {
      message_id: result?.key.id,
    };
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
    const nameContact = await this.messageRepository.getNameUserBy(jid);

    return {
      jid,
      name: nameContact || "",
      exists: contact.exists,
      profilePicUrl,
    };
  }
  async checkExists(
    sessionId: string,
    number: string,
  ): Promise<{ exists: boolean }> {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const result = await sock.onWhatsApp(jid);

    return { exists: result?.[0]?.exists ?? false };
  }
  async getContacts() {
    return [];
  }
  async isConnected(sessionId: string) {
    const sock = this.sessions.get(sessionId);

    return { connected: !!sock?.user };
  }
  async getMyProfile(sessionId: string) {
    const sock = await this.getReadySocket(sessionId);

    if (!sock.user) {
      return {
        jid: "",
        name: "",
        phone: "",
        profilePicUrl: "",
      };
    }

    const jid = sock?.user?.id || "";

    let profilePicUrl = "";

    try {
      profilePicUrl = (await sock.profilePictureUrl(jid, "image")) || "";
    } catch {
      profilePicUrl = "";
    }

    return {
      jid,
      name: sock.user.name || "",
      phone: jid.split("@")[0],
      profilePicUrl,
    };
  }
  async deleteMessage(
    sessionId: string,
    number: string,
    messageId: string,
    // participant?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);

    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const key = {
      remoteJid: jid,
      id: messageId,
      fromMe: true,
    };

    // Se for grupo, precisa do participant
    // if (participant) {
    //   key.participant = participant;
    // }

    try {
      await sock.sendMessage(jid, {
        delete: key,
      });

      return {
        success: true,
        message_id: messageId,
      };
    } catch (err: any) {
      throw new Error(`Failed to delete message: ${err?.message || err}`);
    }
  }
  async editMessage(
    sessionId: string,
    number: string,
    messageId: string,
    newText: string,
  ) {
    const sock = await this.getReadySocket(sessionId);

    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    try {
      const message =
        await this.messageEventLogRepository.findByMessageId(messageId);

      if (!message) {
        throw new Error("Message not found");
      }

      const originalKey = message.payload?.key;

      console.log("ORIGINAL KEY", originalKey);

      const result = await sock.sendMessage(jid, {
        text: newText,
        edit: {
          id: originalKey.id,
          fromMe: true,
          remoteJid: originalKey.remoteJid,
        },
      });

      if (!result?.key?.id) {
        throw new Error("Failed to edit message");
      }

      return {
        success: true,
        message_id: result.key.id,
        edited_message_id: messageId,
      };
    } catch (err: any) {
      throw new Error(`Failed to edit message: ${err?.message || err}`);
    }
  }
}
