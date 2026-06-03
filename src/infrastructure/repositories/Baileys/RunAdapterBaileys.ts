import { IWhatsappAdapter } from "@/domain/repositories/IWhatsappAdapter";

import { Session } from "@/domain/entities/Session";
import { BaileysRepository } from "./BaileysRepository";

export class RunAdapterBaileys implements IWhatsappAdapter {
  constructor(private repository: BaileysRepository) {}

  async createSession(session: Session) {
    await this.repository.createSession(session.id, session.tenant_id);
  }
  async newQrCode(session: Session) {
    const { qr } = await this.repository.newQrCode(
      session.id,
      session.tenant_id,
    );

    return {
      qr: qr || "",
    };
  }
  async deleteMessage(sessionId: string, number: string, message_id: string) {
    return await this.repository.deleteMessage(sessionId, number, message_id);
  }

  async sendText(
    tenant_id: string,
    sessionId: string,
    number: string,
    text: string,
    quoted_id: string,
  ) {
    return this.repository.sendTextMessage(
      tenant_id,
      sessionId,
      number,
      text,
      quoted_id,
    );
  }
  async sendImage(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    caption: string,
    quoted_id: string,
  ) {
    return this.repository.sendImageMessage(
      sessionId,
      number,
      url,
      mimetype,
      caption,
      quoted_id,
    );
  }
  async sendVideo(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    caption: string,
    quoted_id: string,
  ) {
    return this.repository.sendVideoMessage(
      sessionId,
      number,
      url,
      mimetype,
      caption,
      quoted_id,
    );
  }
  async sendAudio(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    quoted_id?: string,
  ) {
    return this.repository.sendAudioMessage(
      sessionId,
      number,
      url,
      mimetype,
      quoted_id,
    );
  }
  async sendVoice(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    quoted_id: string,
  ) {
    return this.repository.sendVoiceMessage(
      sessionId,
      number,
      url,
      mimetype,
      quoted_id,
    );
  }
  async sendDocument(
    sessionId: string,
    number: string,
    url: string,
    fileName: string,
    mimetype: string,
    quoted_id: string,
    caption: string,
  ) {
    return this.repository.sendDocumentMessage(
      sessionId,
      number,
      url,
      fileName,
      mimetype,
      quoted_id,
      caption,
    );
  }
  async logout(sessionId: string) {
    return this.repository.logout(sessionId);
  }
  async getContact(sessionId: string, number: string) {
    return this.repository.getContact(sessionId, number);
  }
  async checkExists(sessionId: string, number: string) {
    return this.repository.checkExists(sessionId, number);
  }
  async getMyProfile(sessionId: string): Promise<{
    jid: string;
    name: string;
    phone: string;
    profilePicUrl: string;
  }> {
    return await this.repository.getMyProfile(sessionId);
  }
  async isConnected(sessionId: string): Promise<{ connected: boolean }> {
    return await this.repository.isConnected(sessionId);
  }
  async editMessage(
    sessionId: string,
    number: string,
    messageId: string,
    newText: string,
  ): Promise<void> {
    await this.repository.editMessage(sessionId, number, messageId, newText);
  }
  async forwardMessage(
    sessionId: string,
    number: string,
    messageId: string,
  ): Promise<void> {
    await this.repository.forwardMessage(sessionId, number, messageId);
  }
}
