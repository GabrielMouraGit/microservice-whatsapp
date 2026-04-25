import { IEvent } from "./EventBus";

export abstract class EventRoot {
  private _events: IEvent[] = [];

  protected addEvent(event: IEvent) {
    this._events.push(event);
  }

  pullEvents(): IEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }
}
