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

  async sendText(sessionId: string, number: string, text: string) {
    this.repository.sendTextMessage(sessionId, number, text);
  }
}
