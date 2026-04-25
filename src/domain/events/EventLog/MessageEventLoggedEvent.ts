export class MessageEventLoggedEvent {
  public readonly name = "message.event.logged";
  constructor(
    public readonly uuid: string,
    public readonly sessionId: string,
    public readonly tenantId: string,
    public readonly eventName: string,
    public readonly payload: unknown,
  ) {}
}
