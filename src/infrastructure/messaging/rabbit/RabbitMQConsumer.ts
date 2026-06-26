import { ConfirmChannel, ConsumeMessage } from "amqplib";
import { RabbitMQConnection } from "./RabbitMQConnection";

const MAX_RETRIES = 20;

export class RabbitMQConsumer {
  async consume(
    queue: string,
    handler: (
      data: any,
      msg: ConsumeMessage,
      channel: ConfirmChannel,
    ) => Promise<void>,
  ) {
    const conn = await RabbitMQConnection.getInstance();

    await conn.registerConsumer(queue, async (channel) => {
      await channel.prefetch(10);

      console.log(`🟢 consumindo fila: ${queue}`);

      await channel.consume(
        queue,
        async (msg) => {
          if (!msg) return;

          let content: any;

          try {
            content = JSON.parse(msg.content.toString());
          } catch {
            channel.nack(msg, false, false);
            return;
          }

          const headers = msg.properties.headers || {};
          const retryCount = Number(headers["x-retry-count"] ?? 0);

          try {
            await handler(content, msg, channel);
            channel.ack(msg);
          } catch (err: any) {
            console.error("❌ erro no handler:", err);

            if (retryCount < MAX_RETRIES) {
              channel.sendToQueue(`${queue}.retry`, msg.content, {
                persistent: true,
                headers: {
                  ...headers,
                  "x-retry-count": retryCount + 1,
                  "x-last-error": err?.message,
                },
              });

              await channel.waitForConfirms();
              channel.ack(msg);
              return;
            }

            channel.sendToQueue(`${queue}.dlq`, msg.content, {
              persistent: true,
              headers: {
                ...headers,
                "x-failed-at": new Date().toISOString(),
                "x-last-error": err?.message,
              },
            });

            await channel.waitForConfirms();

            channel.ack(msg);
          }
        },
        { noAck: false },
      );
    });
  }
}
