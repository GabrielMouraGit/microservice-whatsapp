import { IMessageEventLogRepository } from "@/domain/repositories/IMessageEventLogRepository";

type SaveEventLogInput = {
  sessionId: string;
  tenantId: string;
  eventName: string;
  payload: unknown;
};

export class OnSaveEventLogHandler {
  constructor(private eventLogRepository: IMessageEventLogRepository) {}

  async handle(event: SaveEventLogInput) {
    await this.eventLogRepository.save({
      sessionId: event.sessionId,
      tenantId: event.tenantId,
      eventName: event.eventName,
      payload: event.payload,
    });
  }
}
