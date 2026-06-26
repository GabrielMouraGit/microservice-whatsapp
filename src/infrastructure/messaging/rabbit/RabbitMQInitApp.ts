import { RabbitMQBootstrap } from "./RabbitMQBootstrap";
import { RabbitMQConnection } from "./RabbitMQConnection";

export async function bootstrapRabbitMQ() {
  while (true) {
    try {
      const rabbit = await RabbitMQConnection.getInstance();

      const channel = await rabbit.createChannel();

      try {
        await RabbitMQBootstrap.setup(channel);
        console.log("✅ topology RabbitMQ criada");
      } finally {
        await channel.close();
      }

      return; // <- SAI DO LOOP
    } catch {
      console.error("❌ RabbitMQ ainda não está pronto, retry em 5s...");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
