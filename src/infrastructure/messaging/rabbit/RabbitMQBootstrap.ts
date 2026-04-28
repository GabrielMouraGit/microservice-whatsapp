// RabbitMQBootstrap.ts
import { Channel } from "amqplib";
import { RabbitMQRegistry } from "./RabbitMQRegistry";

export class RabbitMQBootstrap {
  static async setup(channel: Channel) {
    for (const ex of RabbitMQRegistry) {
      await channel.assertExchange(ex.exchange, ex.type, {
        durable: true,
      });

      for (const queue of ex.queues) {
        await channel.assertQueue(queue.name, {
          durable: true,
        });

        for (const key of queue.routingKeys) {
          await channel.bindQueue(queue.name, ex.exchange, key);
        }
      }
    }
  }
}
