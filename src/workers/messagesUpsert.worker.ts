import { registerSessionHandlers } from "@/infrastructure/events/implementation/session.handlers";
import { RabbitMQConnection } from "@/infrastructure/messaging/rabbit/RabbitMQConnection";
import { eventBus } from "container";

async function start() {
  try {
    // registra handlers do domínio
    registerSessionHandlers();

    const conn = await RabbitMQConnection.getInstance();
    const channel = conn.getChannel();

    // exchange
    await channel.assertExchange("messages.exchange", "topic", {
      durable: true,
    });

    // queue
    await channel.assertQueue("messages.queue", {
      durable: true,
    });

    //bind routing key
    await channel.bindQueue(
      "messages.queue",
      "messages.exchange",
      "messages.upsert",
    );

    // 🔥 controle de concorrência
    channel.prefetch(10);

    console.log("🟢 Worker messages.upsert rodando...");

    // 📥 consumer
    channel.consume("messages.queue", async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());

        /**
         * aqui você desacopla tudo:
         * RabbitMQ → EventBus → Handlers
         */

        eventBus.emit("message.received", content);

        channel.ack(msg);
      } catch (err) {
        console.error("❌ erro no worker messages.upsert:", err);

        // ❗ se quiser retry depois, troca isso
        channel.nack(msg, false, false);
      }
    });
  } catch (err) {
    console.error("❌ falha ao iniciar worker:", err);
    process.exit(1);
  }
}

start();
