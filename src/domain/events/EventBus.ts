type EventHandler<T> = (event: T) => Promise<void>; // RabbitMQ/Function

export interface IEvent {
  name: string;
}

export class EventBus {
  private static handlers = new Map<string, EventHandler<IEvent>[]>();

  static register<T extends IEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ) {
    const handlers = this.handlers.get(eventName) || [];

    handlers.push(handler as EventHandler<IEvent>);

    this.handlers.set(eventName, handlers);
  }

  static async publish(event: IEvent) {
    const handlers = this.handlers.get(event.name) || [];

    for (const handler of handlers) {
      await handler(event);
    }
  }
}
