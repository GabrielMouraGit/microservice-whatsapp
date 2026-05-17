// RabbitMQPublisher.ts

import { ConfirmChannel } from "amqplib";
import { RabbitMQConnection } from "./RabbitMQConnection";

export class RabbitMQPublisher {
  async publishQueue(queue: string, message: unknown) {
    const conn = await RabbitMQConnection.getInstance();

    const channel = await conn.getChannel();

    await channel.assertQueue(queue, {
      durable: true,
    });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    await channel.waitForConfirms();

    console.log(`📤 mensagem enviada fila: ${queue}`);
  }

  async publishExchange(
    exchange: string,
    routingKey: string,
    message: unknown,
  ) {
    const conn = await RabbitMQConnection.getInstance();

    const channel: ConfirmChannel = await conn.getChannel();

    await channel.assertExchange(exchange, "topic", {
      durable: true,
    });

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
  }
}
