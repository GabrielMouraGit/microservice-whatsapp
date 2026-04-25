import { IMessageEvent } from "@/domain/repositories/IMessageEvent";

export class MessageEventLogStatusEvent implements IMessageEvent {
  public name = "message.event.status.changed";
  constructor(
    public readonly uuid: string,
    public readonly sessionId: string,
    public readonly tenantId: string,
    public readonly status: "processed" | "failed",
  ) {}
}
