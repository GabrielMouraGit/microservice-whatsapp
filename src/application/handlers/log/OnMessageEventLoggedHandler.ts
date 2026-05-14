import { IMessageEventLogRepository } from "@/domain/repositories/IMessageEventLogRepository";
import { WAMessage } from "@whiskeysockets/baileys";

export class OnMessageEventLoggedHandler {
  constructor(private logRepo: IMessageEventLogRepository) {}

  async handle(event: {
    uuid: string;
    sessionId: string;
    tenantId: string;
    eventName: string;
    payload: WAMessage;
    name: string;
  }) {
    await this.logRepo.save({
      id: event.uuid,
      sessionId: event.sessionId,
      tenantId: event.tenantId,
      eventName: event.eventName,
      payload: event.payload,
      message_id: event.payload?.key?.id || "",
    });
  }
}
