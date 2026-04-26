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
  async sendText(
    tenant_id: string,
    sessionId: string,
    number: string,
    text: string,
    quoted_id: string,
  ) {
    this.repository.sendTextMessage(
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
    caption: string,
    quoted_id: string,
  ) {
    this.repository.sendImageMessage(
      sessionId,
      number,
      url,
      caption,
      quoted_id,
    );
  }
  async sendVideo(
    sessionId: string,
    number: string,
    url: string,
    caption: string,
    quoted_id: string,
  ) {
    this.repository.sendVideoMessage(
      sessionId,
      number,
      url,
      caption,
      quoted_id,
    );
  }
  async sendAudio(
    sessionId: string,
    number: string,
    url: string,
    quoted_id?: string,
  ) {
    this.repository.sendAudioMessage(sessionId, number, url, quoted_id);
  }
  async sendVoice(
    sessionId: string,
    number: string,
    url: string,
    quoted_id: string,
  ) {
    this.repository.sendVoiceMessage(sessionId, number, url, quoted_id);
  }
  async sendDocument(
    sessionId: string,
    number: string,
    url: string,
    fileName: string,
    mimetype: string,
    quoted_id: string,
  ) {
    this.repository.sendDocumentMessage(
      sessionId,
      number,
      url,
      fileName,
      mimetype,
      quoted_id,
    );
  }
  async logout(sessionId: string) {
    this.repository.logout(sessionId);
  }
  async getContact(sessionId: string, number: string) {
    return this.repository.getContact(sessionId, number);
  }
}
