// RabbitMQPublisher.ts
import { RabbitMQConnection } from "./RabbitMQConnection";
import { withTimeout } from "./timeout";

const PUBLISH_CONFIRM_TIMEOUT_MS = 15000;

export class RabbitMQPublisher {
  async publishQueue(queue: string, message: unknown) {
    const conn = await RabbitMQConnection.getInstance();

    const channel = await conn.createChannel();

    await channel.assertQueue(queue, {
      durable: true,
    });

    try {
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
      });

      await withTimeout(
        channel.waitForConfirms(),
        PUBLISH_CONFIRM_TIMEOUT_MS,
        () => channel.close().catch(() => {}),
      );

      console.log(`📤 mensagem enviada fila: ${queue}`);
    } finally {
      await channel.close().catch(() => {});
    }
  }

  async publishExchange(
    exchange: string,
    routingKey: string,
    message: unknown,
  ) {
    const conn = await RabbitMQConnection.getInstance();

    const channel = await conn.createChannel();

    await channel.assertExchange(exchange, "topic", {
      durable: true,
    });

    try {
      channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
        },
      );

      await withTimeout(
        channel.waitForConfirms(),
        PUBLISH_CONFIRM_TIMEOUT_MS,
        () => channel.close().catch(() => {}),
      );

      console.log(`📤 exchange=${exchange} routingKey=${routingKey}`);
    } finally {
      await channel.close().catch(() => {});
    }
  }
}
