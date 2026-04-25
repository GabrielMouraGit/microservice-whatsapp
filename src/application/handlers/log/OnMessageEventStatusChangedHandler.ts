import { IMessageEventLogRepository } from "@/domain/repositories/IMessageEventLogRepository";

export class OnMessageEventStatusChangedHandler {
  constructor(private logRepo: IMessageEventLogRepository) {}

  async handle(event: {
    uuid: string;
    sessionId: string;
    tenantId: string;
    status: "processed" | "failed";
    name: string;
  }) {
    if (event.status === "processed") {
      await this.logRepo.markAsProcessed(event.uuid);
      return;
    }

    if (event.status === "failed") {
      await this.logRepo.markAsFailed(event.uuid);
    }
  }
}
