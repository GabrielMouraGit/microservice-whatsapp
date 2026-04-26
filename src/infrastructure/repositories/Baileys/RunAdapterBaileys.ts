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
  async logout(sessionId: string) {
    this.repository.logout(sessionId);
  }
}
