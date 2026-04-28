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
        const retry = queue.retry;
        const dlq = queue.dlq;

        // 🔥 fila principal
        await channel.assertQueue(queue.name, {
          durable: true,
          arguments: {
            ...(retry
              ? {
                  "x-dead-letter-exchange": ex.exchange,
                  "x-dead-letter-routing-key": queue.routingKeys[0],
                }
              : {}),
          },
        });

        // retry queue (com delay)
        if (retry) {
          await channel.assertQueue(retry.queue, {
            durable: true,
            arguments: {
              "x-message-ttl": retry.ttl,
              "x-dead-letter-exchange": ex.exchange,
              "x-dead-letter-routing-key": queue.routingKeys[0],
            },
          });

          await channel.bindQueue(
            retry.queue,
            ex.exchange,
            `${queue.routingKeys[0]}.retry`,
          );
        }

        // 💀 DLQ final
        if (dlq) {
          await channel.assertExchange(dlq.exchange, "topic", {
            durable: true,
          });

          await channel.assertQueue(dlq.queue, {
            durable: true,
          });

          await channel.bindQueue(dlq.queue, dlq.exchange, dlq.routingKey);
        }

        // bind fila principal
        for (const key of queue.routingKeys) {
          await channel.bindQueue(queue.name, ex.exchange, key);
        }
      }
    }
  }
}
