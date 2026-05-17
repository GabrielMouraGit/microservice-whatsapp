import { Channel } from "amqplib";
import { RabbitMQRegistry } from "./RabbitMQRegistry";

export class RabbitMQBootstrap {
  static async setup(channel: Channel) {
    for (const ex of RabbitMQRegistry) {
      //
      // EXCHANGE PRINCIPAL
      //
      await channel.assertExchange(ex.exchange, ex.type, {
        durable: true,
      });

      for (const queue of ex.queues) {
        const retry = queue.retry;
        const dlq = queue.dlq;

        //
        // DLQ EXCHANGE + DLQ QUEUE
        //
        if (dlq) {
          await channel.assertExchange(dlq.exchange, "topic", {
            durable: true,
          });

          await channel.assertQueue(dlq.queue, {
            durable: true,
          });

          await channel.bindQueue(dlq.queue, dlq.exchange, queue.routingKey);
        }

        //
        // MAIN QUEUE
        //
        await channel.assertQueue(queue.name, {
          durable: true,

          arguments: {
            ...(retry
              ? {
                  //
                  // ERRO -> RETRY QUEUE
                  //
                  "x-dead-letter-exchange": ex.exchange,

                  "x-dead-letter-routing-key": `${queue.routingKey}.retry`,
                }
              : {}),
          },
        });

        //
        // MAIN QUEUE BIND
        //
        await channel.bindQueue(queue.name, ex.exchange, queue.routingKey);

        //
        // RETRY QUEUE
        //
        if (retry) {
          await channel.assertQueue(retry.queue, {
            durable: true,

            arguments: {
              //
              // TEMPO DE ESPERA
              //
              "x-message-ttl": retry.ttl,

              //
              // TTL EXPIROU -> VOLTA PRA MAIN
              //
              "x-dead-letter-exchange": ex.exchange,

              "x-dead-letter-routing-key": queue.routingKey,
            },
          });

          //
          // RETRY BIND
          //
          await channel.bindQueue(
            retry.queue,
            ex.exchange,
            `${queue.routingKey}.retry`,
          );
        }
      }
    }

    console.log("✅ RabbitMQ bootstrap finalizado");
  }
}
