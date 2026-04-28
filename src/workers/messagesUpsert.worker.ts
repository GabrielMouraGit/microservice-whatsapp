import { registerSessionHandlers } from "@/infrastructure/events/implementation/session.handlers";
import { RabbitMQBootstrap } from "@/infrastructure/messaging/rabbit/RabbitMQBootstrap";
import { RabbitMQConnection } from "@/infrastructure/messaging/rabbit/RabbitMQConnection";
import { eventBus } from "container";

const MAX_RETRIES = 3;

async function start() {
  try {
    // registra handlers do domínio
    registerSessionHandlers();

    const conn = await RabbitMQConnection.getInstance();
    const channel = conn.getChannel();

    await RabbitMQBootstrap.setup(channel);

    channel.prefetch(10);

    console.log("🟢 Worker messages.queue rodando...");

    channel.consume("messages.queue", async (msg) => {
      if (!msg) return;

      const content = JSON.parse(msg.content.toString());

      const headers = msg.properties.headers || {};
      const retryCount = headers["x-retry-count"] || 0;

      try {
        // send event
        await eventBus.emit("message.received", content);

        channel.ack(msg);
      } catch (err) {
        console.error("❌ erro no worker:", err);

        // ainda pode tentar novamente
        if (retryCount < MAX_RETRIES) {
          const retryQueue = "messages.queue.retry";

          channel.sendToQueue(retryQueue, msg.content, {
            headers: {
              ...headers,
              "x-retry-count": retryCount + 1,
            },
          });

          channel.ack(msg);
          return;
        }

        // estourou retry → manda pra DLQ
        channel.nack(msg, false, false);
      }
    });
  } catch (err) {
    console.error("❌ falha ao iniciar worker:", err);
    process.exit(1);
  }
}

start();
