export class MessageEventLogStatusEvent {
  public name = "message.event.status.changed";
  constructor(
    public readonly uuid: string,
    public readonly sessionId: string,
    public readonly tenantId: string,
    public readonly status: "done" | "failed",
  ) {}
}
