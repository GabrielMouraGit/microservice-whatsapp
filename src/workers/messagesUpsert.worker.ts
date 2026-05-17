import { ConsumeMessage, Channel } from "amqplib";

import { registerSessionHandlers } from "@/infrastructure/events/implementation/session.handlers";
import { RabbitMQBootstrap } from "@/infrastructure/messaging/rabbit/RabbitMQBootstrap";
import { RabbitMQConnection } from "@/infrastructure/messaging/rabbit/RabbitMQConnection";

import { eventBus } from "container";

const MAX_RETRIES = 3;

const MAIN_QUEUE = "messages.queue";
const RETRY_QUEUE = "messages.queue.retry";
const DLQ_QUEUE = "messages.queue.dlq";

async function processMessage(channel: Channel, msg: ConsumeMessage) {
  let content: any;

  // proteção payload inválido
  try {
    content = JSON.parse(msg.content.toString());
  } catch (err) {
    console.error("❌ payload inválido:", err);

    channel.sendToQueue(DLQ_QUEUE, msg.content, {
      persistent: true,
      headers: {
        "x-error": "invalid-json",
        "x-failed-at": new Date().toISOString(),
      },
    });

    channel.ack(msg);

    return;
  }

  const headers = msg.properties.headers || {};

  const retryCount = Number(headers["x-retry-count"] ?? 0);

  try {
    // ignora grupos/newsletter
    const ignoreTypes = ["@newsletter", "@g.us"];

    if (
      ignoreTypes.some((type) =>
        String(content?.message?.from || "").includes(type),
      )
    ) {
      channel.ack(msg);
      return;
    }

    // dispara evento
    await eventBus.emit("message.received", content);

    channel.ack(msg);

    console.log("✅ mensagem processada");
  } catch (err) {
    console.error("❌ erro no worker:", err);

    try {
      // retry
      if (retryCount < MAX_RETRIES) {
        channel.sendToQueue(RETRY_QUEUE, msg.content, {
          persistent: true,
          headers: {
            ...headers,
            "x-retry-count": retryCount + 1,
            "x-last-error":
              err instanceof Error ? err.message : "unknown-error",
          },
        });

        channel.ack(msg);

        console.log(`🔄 retry ${retryCount + 1}/${MAX_RETRIES}`);

        return;
      }

      // DLQ
      channel.sendToQueue(DLQ_QUEUE, msg.content, {
        persistent: true,
        headers: {
          ...headers,
          "x-failed-at": new Date().toISOString(),
          "x-last-error": err instanceof Error ? err.message : "unknown-error",
        },
      });

      channel.ack(msg);

      console.log("☠️ mensagem enviada DLQ");
    } catch (retryErr) {
      console.error("❌ erro reenfileirar:", retryErr);

      // sem ACK
      // RabbitMQ reentrega
    }
  }
}

export async function start() {
  try {
    // registra handlers domínio
    registerSessionHandlers();

    const rabbit = await RabbitMQConnection.getInstance();

    await rabbit.registerConsumer(async (channel) => {
      console.log("🟢 iniciando topology...");

      // setup topology
      await RabbitMQBootstrap.setup(channel);

      // MAIN
      await channel.assertQueue(MAIN_QUEUE, {
        durable: true,
      });

      // RETRY
      await channel.assertQueue(RETRY_QUEUE, {
        durable: true,

        // retry automático
        messageTtl: 5000,

        deadLetterExchange: "",

        deadLetterRoutingKey: MAIN_QUEUE,
      });

      // DLQ
      await channel.assertQueue(DLQ_QUEUE, {
        durable: true,
      });

      await channel.prefetch(10);

      console.log("🟢 worker messages.queue rodando...");

      await channel.consume(MAIN_QUEUE, async (msg) => {
        if (!msg) return;

        try {
          await processMessage(channel, msg);
        } catch (err) {
          console.error("❌ erro fatal consumer:", err);

          // requeue automática
          channel.nack(msg, false, true);
        }
      });
    });
  } catch (err) {
    console.error("❌ falha ao iniciar worker:", err);

    process.exit(1);
  }
}

start();
