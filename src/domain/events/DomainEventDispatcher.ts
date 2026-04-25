import { EventBus } from "@/infrastructure/events/EventBus";
import { EventRoot } from "./EventRoot";

export class DomainEventDispatcher<T extends Record<string, any>> {
  constructor(private eventBus: EventBus<T>) {}

  async dispatch(aggregate: EventRoot) {
    const events = aggregate.pullEvents();

    for (const event of events) {
      await this.eventBus.emit(event.name, event as any);
    }
  }
}
