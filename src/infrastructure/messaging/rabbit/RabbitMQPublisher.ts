// RabbitMQPublisher.ts
import { RabbitMQConnection } from "./RabbitMQConnection";

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

      await channel.waitForConfirms();

      console.log(`📤 mensagem enviada fila: ${queue}`);
    } finally {
      await channel.close();
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

      await channel.waitForConfirms();

      console.log(`📤 exchange=${exchange} routingKey=${routingKey}`);
    } finally {
      await channel.close();
    }
  }
}
