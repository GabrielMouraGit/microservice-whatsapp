import { RabbitMQConnection } from "./RabbitMQConnection";
import { RabbitMQRegistry } from "./RabbitMQRegistry";

const DEFAULT_BATCH_LIMIT = 500;

export type DlqReprocessResult = {
  queue: string;
  dlqQueue: string;
  reprocessed: number;
  remaining: number;
};

export class RabbitMQDlqReprocessor {
  //
  // Drains up to `limit` messages currently sitting in `queueName`'s DLQ,
  // republishing each straight onto the main queue (matching how
  // RabbitMQConsumer already returns retries to the main queue) with a
  // fresh retry budget. Only messages present at the initial checkQueue
  // snapshot are moved — failures landing mid-drain are left for the next
  // call, and `remaining` tells the caller whether to call again.
  //
  async reprocessQueue(
    queueName: string,
    limit: number = DEFAULT_BATCH_LIMIT,
  ): Promise<DlqReprocessResult> {
    const entry = RabbitMQRegistry.flatMap((ex) => ex.queues).find(
      (queue) => queue.name === queueName,
    );

    const dlq = entry?.dlq;

    if (!entry || !dlq) {
      throw new Error(`fila sem DLQ configurada: ${queueName}`);
    }

    const dlqQueue = dlq.queue;

    const conn = await RabbitMQConnection.getInstance();
    const channel = await conn.createChannel();

    let reprocessed = 0;

    try {
      const { messageCount } = await channel.checkQueue(dlqQueue);

      const attempts = Math.min(messageCount, limit);

      for (let i = 0; i < attempts; i++) {
        const msg = await channel.get(dlqQueue, { noAck: false });

        if (!msg) break;

        const headers = { ...(msg.properties.headers || {}) };

        const reprocessedCount = Number(headers["x-reprocessed-count"] ?? 0);

        headers["x-retry-count"] = 0;
        headers["x-reprocessed-count"] = reprocessedCount + 1;
        headers["x-reprocessed-at"] = new Date().toISOString();

        channel.sendToQueue(queueName, msg.content, {
          persistent: true,
          headers,
        });

        await channel.waitForConfirms();

        channel.ack(msg);

        reprocessed++;
      }

      return {
        queue: queueName,
        dlqQueue,
        reprocessed,
        remaining: messageCount - reprocessed,
      };
    } finally {
      await channel.close();
    }
  }
}
