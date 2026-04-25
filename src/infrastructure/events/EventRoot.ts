import { IMessageEvent } from "@/domain/repositories/IMessageEvent";

export abstract class EventRoot {
  private _events: IMessageEvent[] = [];

  protected addEvent(event: IMessageEvent) {
    this._events.push(event);
  }

  pullEvents(): IMessageEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }
}
