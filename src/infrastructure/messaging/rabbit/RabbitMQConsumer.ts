import { ConfirmChannel, ConsumeMessage } from "amqplib";
import { RabbitMQConnection } from "./RabbitMQConnection";
import { RabbitMQRegistry } from "./RabbitMQRegistry";
import { withTimeout } from "./timeout";

const MAX_RETRIES = 20;
const PUBLISH_CONFIRM_TIMEOUT_MS = 15000;
const DEFAULT_HANDLER_TIMEOUT_MS = 60000;

//
// delay = ttl * multiplier^retryCount, capped at maxTtl. multiplier
// defaults to 1 (flat interval, today's behavior) when not configured.
//
function computeRetryDelayMs(
  retryCount: number,
  retry?: { ttl: number; multiplier?: number; maxTtl?: number },
): number {
  const ttl = retry?.ttl ?? 30000;
  const multiplier = retry?.multiplier ?? 1;

  const delay = ttl * Math.pow(multiplier, retryCount);

  return retry?.maxTtl ? Math.min(delay, retry.maxTtl) : delay;
}

export class RabbitMQConsumer {
  async consume(
    queue: string,
    handler: (
      data: any,
      msg: ConsumeMessage,
      channel: ConfirmChannel,
    ) => Promise<void>,
    maxRetries: number = MAX_RETRIES,
    onDeadLetter?: (data: any, msg: ConsumeMessage) => Promise<void> | void,
    handlerTimeoutMs: number = DEFAULT_HANDLER_TIMEOUT_MS,
  ) {
    const retryConfig = RabbitMQRegistry.flatMap((ex) => ex.queues).find(
      (q) => q.name === queue,
    )?.retry;

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
            await withTimeout(
              handler(content, msg, channel),
              handlerTimeoutMs,
              undefined,
              `handler timeout after ${handlerTimeoutMs}ms`,
            );
            channel.ack(msg);
          } catch (err: any) {
            console.error("❌ erro no handler:", err);

            if (retryCount < maxRetries) {
              const delayMs = computeRetryDelayMs(retryCount, retryConfig);

              channel.sendToQueue(`${queue}.retry`, msg.content, {
                persistent: true,
                expiration: String(delayMs),
                headers: {
                  ...headers,
                  "x-retry-count": retryCount + 1,
                  "x-last-error": err?.message,
                },
              });

              await withTimeout(
                channel.waitForConfirms(),
                PUBLISH_CONFIRM_TIMEOUT_MS,
              );
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

            await withTimeout(
              channel.waitForConfirms(),
              PUBLISH_CONFIRM_TIMEOUT_MS,
            );

            channel.ack(msg);

            try {
              await onDeadLetter?.(content, msg);
            } catch (dlqErr) {
              console.error("❌ erro no onDeadLetter:", dlqErr);
            }
          }
        },
        { noAck: false },
      );
    });
  }
}
