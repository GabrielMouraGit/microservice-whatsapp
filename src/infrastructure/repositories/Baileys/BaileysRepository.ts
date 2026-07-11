import { SessionManager } from "../SessionManager";
import { BaileysConnector } from "./BaileysConnector";
import {
  AnyMessageContent,
  GroupMetadata,
  ParticipantAction,
  WAMessage,
  WAMessageKey,
  WAPresence,
  WASocket,
  proto,
} from "@whiskeysockets/baileys";
import { MessageEventLogRepository } from "../MessageEventLogRepository";
import { MessageRepository } from "../MessageRepository";
import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import path from "path";


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
    console.log("[newQrCode]");
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

  private toJid(number: string): string {
    if (number.includes("@")) return number;

    return `${number.replace(/\D/g, "")}@s.whatsapp.net`;
  }

  private async resolveLastMessageKey(
    jid: string,
  ): Promise<{
    key: WAMessageKey;
    messageTimestamp: WAMessage["messageTimestamp"];
  } | null> {
    const lastMessage =
      await this.messageRepository.getMessagesLastMessageByChatId(jid);

    if (!lastMessage) return null;

    const eventLog = await this.messageEventLogRepository.findByMessageId(
      lastMessage.toDTO().id,
    );
    const waMessage = eventLog?.payload as WAMessage | undefined;

    if (!waMessage?.key || !waMessage?.messageTimestamp) return null;

    return { key: waMessage.key, messageTimestamp: waMessage.messageTimestamp };
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
    content: AnyMessageContent,
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
    mimetype: string,
    caption?: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const content = {
      image: { url },
      caption,
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
  async sendVideoMessage(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    caption?: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const content = {
      video: { url },
      caption,
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
  async sendAudioMessage(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const content = {
      audio: { url },
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
  async sendVoiceMessage(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const  response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const opusBuffer = await this.convertToOpus(buffer);
    
    const content = {
      audio: opusBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
        waveform: new Uint8Array(64), // exemplo
    };

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send text message");
    }
    return {
      message_id: result?.key.id,
    };
  }


private async  convertToOpus(inputBuffer: Buffer): Promise<Buffer> {
  const input = path.join(tmpdir(), `${Date.now()}.input`);
  const output = path.join(tmpdir(), `${Date.now()}.ogg`);

  await fs.writeFile(input, inputBuffer);

  await new Promise<void>((resolve, reject) => {
  ffmpeg(input)
    .audioCodec("libopus")
    .audioBitrate(48)
    .audioFrequency(48000)
    .audioChannels(1)
    .format("ogg")
   .outputOptions([
  "-application", "voip",
  "-vbr", "on",
  "-compression_level", "10"
])
    .on("end", () => resolve())
    .on("error", reject)
    .save(output);
  });

  const result = await fs.readFile(output);

  await fs.unlink(input).catch(() => {});
  await fs.unlink(output).catch(() => {});

  return result;
}
  async sendDocumentMessage(
    sessionId: string,
    number: string,
    url: string,
    fileName: string,
    mimetype: string,
    quoted_id?: string,
    caption?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const content = {
      document: { url },
      fileName,
      mimetype,
      caption: caption || "",
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
    let contact = await this.findContact(sessionId, number);

    if (!contact?.exists) {
      contact = await this.findContact(
        sessionId,
        number.replace(/^(\d{4})9/, "$1"),
      );
      if (!contact?.exists) {
        return {
          jid: "",
          name: "",
          exists: false,
          profilePicUrl: "",
        };
      }
    }

    let profilePicUrl: string;

    try {
      profilePicUrl =
        (await sock.profilePictureUrl(contact.jid, "image")) || "";
    } catch {
      profilePicUrl = "";
    }
    const nameContact = await this.messageRepository.getNameUserBy(contact.jid);

    return {
      jid: contact.jid,
      name: nameContact || "",
      exists: contact.exists,
      profilePicUrl,
    };
  }

  private async findContact(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;
    const result = await sock.onWhatsApp(jid);
    const contact = result?.[0];
    return contact;
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
    try {
      const sock = this.sessions.get(sessionId);

      return { connected: !!sock?.user };
    } catch {
      return { connected: false };
    }
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

  async forwardMessage(sessionId: string, number: string, messageId: string) {
    const sock = await this.getReadySocket(sessionId);

    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    const message =
      await this.messageEventLogRepository.findByMessageId(messageId);

    if (!message?.payload) {
      throw new Error("Message not found");
    }

    const waMessage = message.payload as WAMessage;

    const result = await sock.sendMessage(jid, {
      forward: waMessage,
    });

    if (!result?.key?.id) {
      throw new Error("Failed to forward message");
    }

    return {
      success: true,
      message_id: result.key.id,
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
    } catch (err: Error | unknown) {
      throw new Error(
        `Failed to delete message: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  async markChatAsRead(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const resolved = await this.resolveLastMessageKey(jid);

    await sock.chatModify(
      {
        markRead: true,
        lastMessages: resolved
          ? [{ key: resolved.key, messageTimestamp: resolved.messageTimestamp }]
          : [],
      },
      jid,
    );
  }

  async sendTyping(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = `${number.replace(/\D/g, "")}@s.whatsapp.net`;

    await sock.sendPresenceUpdate("composing", jid);
    await new Promise((r) => setTimeout(r, 5000));
    await sock.sendPresenceUpdate("paused", jid);
  }

  async markAsRead(sessionId: string, number: string, messageId: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const eventLog =
      await this.messageEventLogRepository.findByMessageId(messageId);
    const waMessage = eventLog?.payload as WAMessage | undefined;

    if (waMessage?.key) {
      await sock.readMessages([waMessage.key]);
      return;
    }

    if (jid.endsWith("@g.us")) {
      throw new Error(
        `Não foi possível marcar a mensagem ${messageId} como lida: chave original da mensagem de grupo não encontrada`,
      );
    }

    await sock.readMessages([{ remoteJid: jid, id: messageId, fromMe: false }]);
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
      const message = (await this.messageEventLogRepository.findByMessageId(
        messageId,
      )) as { payload: WAMessage } | null;

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
    } catch (err: Error | unknown) {
      throw new Error(
        `Failed to edit message: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ---- Reactions ----

  async sendReaction(
    sessionId: string,
    number: string,
    messageId: string,
    emoji: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const eventLog =
      await this.messageEventLogRepository.findByMessageId(messageId);
    const key = (eventLog?.payload as WAMessage | undefined)?.key;

    if (!key) {
      throw new Error(`Mensagem ${messageId} não encontrada para reagir`);
    }

    await sock.sendMessage(jid, { react: { text: emoji, key } });
  }

  async removeReaction(sessionId: string, number: string, messageId: string) {
    await this.sendReaction(sessionId, number, messageId, "");
  }

  // ---- Message actions (star / pin / delete-for-me) ----

  async starMessage(
    sessionId: string,
    number: string,
    messageId: string,
    fromMe: boolean,
    star: boolean,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    await sock.chatModify(
      { star: { messages: [{ id: messageId, fromMe }], star } },
      jid,
    );
  }

  async pinMessage(
    sessionId: string,
    number: string,
    messageId: string,
    pin: boolean,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const eventLog =
      await this.messageEventLogRepository.findByMessageId(messageId);
    const key = (eventLog?.payload as WAMessage | undefined)?.key;

    if (!key) {
      throw new Error(`Mensagem ${messageId} não encontrada para fixar`);
    }

    await sock.sendMessage(jid, {
      pin: key,
      type: pin
        ? proto.PinInChat.Type.PIN_FOR_ALL
        : proto.PinInChat.Type.UNPIN_FOR_ALL,
    });
  }

  async deleteMessageForMe(
    sessionId: string,
    number: string,
    messageId: string,
    fromMe: boolean,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const eventLog =
      await this.messageEventLogRepository.findByMessageId(messageId);
    const waMessage = eventLog?.payload as WAMessage | undefined;

    const key: WAMessageKey = waMessage?.key ?? {
      remoteJid: jid,
      id: messageId,
      fromMe,
    };
    const timestamp = waMessage?.messageTimestamp
      ? Number(waMessage.messageTimestamp)
      : Math.floor(Date.now() / 1000);

    await sock.chatModify(
      { deleteForMe: { key, timestamp, deleteMedia: false } },
      jid,
    );
  }

  // ---- Presence ----

  async sendRecording(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    await sock.sendPresenceUpdate("recording", jid);
    await new Promise((r) => setTimeout(r, 5000));
    await sock.sendPresenceUpdate("paused", jid);
  }

  async setOwnPresence(sessionId: string, presence: WAPresence) {
    const sock = await this.getReadySocket(sessionId);

    await sock.sendPresenceUpdate(presence);
  }

  async subscribePresence(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    await sock.presenceSubscribe(jid);
  }

  // ---- Chat management ----

  async archiveChat(sessionId: string, number: string, archive: boolean) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const resolved = await this.resolveLastMessageKey(jid);

    await sock.chatModify(
      {
        archive,
        lastMessages: resolved
          ? [{ key: resolved.key, messageTimestamp: resolved.messageTimestamp }]
          : [],
      },
      jid,
    );
  }

  async muteChat(sessionId: string, number: string, durationMs: number | null) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    await sock.chatModify({ mute: durationMs }, jid);
  }

  async deleteChat(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const resolved = await this.resolveLastMessageKey(jid);

    await sock.chatModify(
      {
        delete: true,
        lastMessages: resolved
          ? [{ key: resolved.key, messageTimestamp: resolved.messageTimestamp }]
          : [],
      },
      jid,
    );
  }

  async clearChat(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const resolved = await this.resolveLastMessageKey(jid);

    await sock.chatModify(
      {
        clear: true,
        lastMessages: resolved
          ? [{ key: resolved.key, messageTimestamp: resolved.messageTimestamp }]
          : [],
      },
      jid,
    );
  }

  // ---- Rich content messages ----

  async sendLocationMessage(
    sessionId: string,
    number: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const content = {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name,
        address,
      },
    };

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send location message");
    }

    return { message_id: result.key.id };
  }

  async sendContactMessage(
    sessionId: string,
    number: string,
    displayName: string,
    vcard: string,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const content = {
      contacts: {
        displayName,
        contacts: [{ displayName, vcard }],
      },
    };

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send contact message");
    }

    return { message_id: result.key.id };
  }

  async sendStickerMessage(
    sessionId: string,
    number: string,
    url: string,
    isAnimated?: boolean,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const content = {
      sticker: { url },
      isAnimated: !!isAnimated,
    };

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send sticker message");
    }

    return { message_id: result.key.id };
  }

  async sendPollMessage(
    sessionId: string,
    number: string,
    name: string,
    values: string[],
    selectableCount: number,
    quoted_id?: string,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    const content = {
      poll: { name, values, selectableCount },
    };

    const result = await this.sendMessageCore(sock, jid, content, quoted_id);
    if (!result?.key?.id) {
      throw new Error("Failed to send poll message");
    }

    return { message_id: result.key.id };
  }

  // ---- Contact & own-profile management ----

  async blockContact(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    await sock.updateBlockStatus(jid, "block");
  }

  async unblockContact(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    await sock.updateBlockStatus(jid, "unblock");
  }

  async getContactStatus(sessionId: string, number: string) {
    const sock = await this.getReadySocket(sessionId);
    const jid = this.toJid(number);

    try {
      const [result] = (await sock.fetchStatus(jid)) || [];
      const status = (
        result as { status?: { status?: string } } | undefined
      )?.status?.status;

      return { status: status || "" };
    } catch {
      return { status: "" };
    }
  }

  async updateProfileName(sessionId: string, name: string) {
    const sock = await this.getReadySocket(sessionId);

    await sock.updateProfileName(name);
  }

  async updateProfileStatus(sessionId: string, status: string) {
    const sock = await this.getReadySocket(sessionId);

    await sock.updateProfileStatus(status);
  }

  async updateProfilePicture(sessionId: string, url: string) {
    const sock = await this.getReadySocket(sessionId);

    if (!sock.user?.id) {
      throw new Error("Sessão não conectada");
    }

    await sock.updateProfilePicture(sock.user.id, { url });
  }

  async removeProfilePicture(sessionId: string) {
    const sock = await this.getReadySocket(sessionId);

    if (!sock.user?.id) {
      throw new Error("Sessão não conectada");
    }

    await sock.removeProfilePicture(sock.user.id);
  }

  // ---- Group management ----

  private mapGroupMetadata(metadata: GroupMetadata) {
    return {
      id: metadata.id,
      subject: metadata.subject,
      description: metadata.desc || "",
      owner: metadata.owner || "",
      participants: metadata.participants.map((p) => ({
        jid: p.id,
        isAdmin: !!p.admin,
        isSuperAdmin: p.admin === "superadmin",
      })),
    };
  }

  private async updateGroupParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
    action: ParticipantAction,
  ) {
    const sock = await this.getReadySocket(sessionId);
    const participants = participantNumbers.map((n) => this.toJid(n));

    const result = await sock.groupParticipantsUpdate(
      groupJid,
      participants,
      action,
    );

    return result.map((r) => ({ jid: r.jid || "", status: r.status }));
  }

  async createGroup(
    sessionId: string,
    subject: string,
    participantNumbers: string[],
  ) {
    const sock = await this.getReadySocket(sessionId);
    const participants = participantNumbers.map((n) => this.toJid(n));

    const metadata = await sock.groupCreate(subject, participants);

    return this.mapGroupMetadata(metadata);
  }

  async addParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ) {
    return this.updateGroupParticipants(
      sessionId,
      groupJid,
      participantNumbers,
      "add",
    );
  }

  async removeParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ) {
    return this.updateGroupParticipants(
      sessionId,
      groupJid,
      participantNumbers,
      "remove",
    );
  }

  async promoteParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ) {
    return this.updateGroupParticipants(
      sessionId,
      groupJid,
      participantNumbers,
      "promote",
    );
  }

  async demoteParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ) {
    return this.updateGroupParticipants(
      sessionId,
      groupJid,
      participantNumbers,
      "demote",
    );
  }

  async updateGroupSubject(sessionId: string, groupJid: string, subject: string) {
    const sock = await this.getReadySocket(sessionId);

    await sock.groupUpdateSubject(groupJid, subject);
  }

  async updateGroupDescription(
    sessionId: string,
    groupJid: string,
    description: string,
  ) {
    const sock = await this.getReadySocket(sessionId);

    await sock.groupUpdateDescription(groupJid, description);
  }

  async getGroupMetadata(sessionId: string, groupJid: string) {
    const sock = await this.getReadySocket(sessionId);

    const metadata = await sock.groupMetadata(groupJid);

    return this.mapGroupMetadata(metadata);
  }

  async getGroupInviteCode(sessionId: string, groupJid: string) {
    const sock = await this.getReadySocket(sessionId);

    const code = await sock.groupInviteCode(groupJid);

    return { inviteCode: code || "" };
  }

  async revokeGroupInvite(sessionId: string, groupJid: string) {
    const sock = await this.getReadySocket(sessionId);

    const code = await sock.groupRevokeInvite(groupJid);

    return { inviteCode: code || "" };
  }

  async joinGroupViaInvite(sessionId: string, code: string) {
    const sock = await this.getReadySocket(sessionId);

    const groupJid = await sock.groupAcceptInvite(code);

    return { groupJid: groupJid || "" };
  }

  async leaveGroup(sessionId: string, groupJid: string) {
    const sock = await this.getReadySocket(sessionId);

    await sock.groupLeave(groupJid);
  }
}
