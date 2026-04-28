// RabbitMQConsumer.ts
import { RabbitMQConnection } from "./RabbitMQConnection";

export class RabbitMQConsumer {
  async consume(queue: string, handler: (data: unknown) => Promise<void>) {
    const conn = await RabbitMQConnection.getInstance();
    const channel = conn.getChannel();

    await channel.assertQueue(queue, { durable: true });

    channel.prefetch(10); // controle de concorrência

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());

        await handler(content);

        channel.ack(msg);
      } catch (err) {
        console.error("Erro no consumer:", err);

        channel.nack(msg, false, false); // manda pra DLQ se tiver
      }
    });
  }
}
