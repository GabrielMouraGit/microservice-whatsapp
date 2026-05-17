// RabbitMQConsumer.ts

import { ConfirmChannel, ConsumeMessage } from "amqplib";

import { RabbitMQConnection } from "./RabbitMQConnection";

export class RabbitMQConsumer {
  async consume(
    queue: string,
    handler: (data: unknown, msg: ConsumeMessage) => Promise<void>,
  ) {
    const conn = await RabbitMQConnection.getInstance();

    const channel: ConfirmChannel = await conn.getChannel();

    // ❌ NÃO chama bootstrap aqui
    // await RabbitMQBootstrap.setup(channel);

    await channel.assertQueue(queue, {
      durable: true,
    });

    await channel.prefetch(10);

    console.log(`🟢 consumindo fila: ${queue}`);

    channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());

          await handler(content, msg);

          channel.ack(msg);
        } catch (err) {
          console.error("❌ erro no consumer:", err);

          // DLQ se configurado no broker
          channel.nack(msg, false, false);
        }
      },
      {
        noAck: false,
      },
    );
  }
}
