import { ConsumeMessage, ConfirmChannel } from "amqplib";

import { registerSessionHandlers } from "@/infrastructure/events/implementation/session.handlers";

import { RabbitMQBootstrap } from "@/infrastructure/messaging/rabbit/RabbitMQBootstrap";

import { RabbitMQConnection } from "@/infrastructure/messaging/rabbit/RabbitMQConnection";

import { eventBus } from "container";

const MAX_RETRIES = 3;

const MAIN_QUEUE = "messages.queue";

const RETRY_QUEUE = "messages.queue.retry";

const DLQ_QUEUE = "messages.queue.dlq";

//
// PROCESS MESSAGE
//
async function processMessage(channel: ConfirmChannel, msg: ConsumeMessage) {
  let content: any;

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

    await channel.waitForConfirms();

    channel.ack(msg);

    return;
  }

  const headers = msg.properties.headers || {};

  const retryCount = Number(headers["x-retry-count"] ?? 0);

  try {
    const ignoreTypes = ["@newsletter", "@g.us"];

    if (
      ignoreTypes.some((type) =>
        String(content?.message?.from || "").includes(type),
      )
    ) {
      channel.ack(msg);

      return;
    }

    await eventBus.emit("message.received", content);

    channel.ack(msg);

    console.log("✅ mensagem processada");
  } catch (err) {
    console.error("❌ erro worker:", err);

    if (retryCount < MAX_RETRIES) {
      channel.sendToQueue(RETRY_QUEUE, msg.content, {
        persistent: true,

        headers: {
          ...headers,

          "x-retry-count": retryCount + 1,

          "x-last-error": err instanceof Error ? err.message : "unknown-error",
        },
      });

      await channel.waitForConfirms();

      channel.ack(msg);

      console.log(`🔄 retry ${retryCount + 1}/${MAX_RETRIES}`);

      return;
    }

    channel.sendToQueue(DLQ_QUEUE, msg.content, {
      persistent: true,

      headers: {
        ...headers,

        "x-failed-at": new Date().toISOString(),

        "x-last-error": err instanceof Error ? err.message : "unknown-error",
      },
    });

    await channel.waitForConfirms();

    channel.ack(msg);

    console.log("☠️ enviado DLQ");
  }
}

export async function start() {
  try {
    registerSessionHandlers();

    const rabbit = await RabbitMQConnection.getInstance();

    await rabbit.registerConsumer(
      "messages-worker",

      async (channel: ConfirmChannel) => {
        try {
          console.log("🟢 iniciando topology...");

          await RabbitMQBootstrap.setup(channel);

          console.log("🟢 topology pronta");

          await channel.consume(
            MAIN_QUEUE,

            async (msg) => {
              if (!msg) return;

              try {
                await processMessage(channel, msg);
              } catch (err) {
                console.error("❌ erro fatal consumer:", err);

                channel.nack(msg, false, true);
              }
            },

            {
              noAck: false,
            },
          );

          console.log("🟢 worker iniciado");
        } catch (err) {
          console.error("❌ erro iniciar consumer:", err);

          throw err;
        }
      },
    );
  } catch (err) {
    console.error("❌ falha iniciar worker:", err);

    process.exit(1);
  }
}

start();
