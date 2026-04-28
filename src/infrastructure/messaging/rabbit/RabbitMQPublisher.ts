// RabbitMQPublisher.ts
import { RabbitMQConnection } from "./RabbitMQConnection";

export class RabbitMQPublisher {
  async publishQueue(queue: string, message: unknown) {
    const conn = await RabbitMQConnection.getInstance();
    const channel = conn.getChannel();

    await channel.assertQueue(queue, { durable: true });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true, // (mensagem sobrevive restart)
    });
  }
  async publishExchange(
    exchange: string,
    routingKey: string,
    message: unknown,
  ) {
    const conn = await RabbitMQConnection.getInstance();
    const channel = conn.getChannel();

    // 🔥 garante exchange existe
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
  }
}

// await channel.assertExchange("messages.exchange", "topic", {
//   durable: true,
// });

// await channel.assertQueue("messages.queue", {
//   durable: true,
// });

// await channel.bindQueue(
//   "messages.queue",
//   "messages.exchange",
//   "messages.upsert"
// );
