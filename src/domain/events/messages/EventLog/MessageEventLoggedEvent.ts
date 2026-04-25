import { IMessageEvent } from "@/domain/repositories/IMessageEvent";

export class MessageEventLoggedEvent implements IMessageEvent {
  public readonly name = "message.event.logged";
  constructor(
    public readonly uuid: string,
    public readonly sessionId: string,
    public readonly tenantId: string,
    public readonly eventName: string,
    public readonly payload: unknown,
  ) {}
}
