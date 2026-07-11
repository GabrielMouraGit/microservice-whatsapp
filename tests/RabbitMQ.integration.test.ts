import { describe, expect, it } from "vitest";
import { RabbitMQPublisher } from "../src/infrastructure/messaging/rabbit/RabbitMQPublisher";
import { RabbitMQConsumer } from "../src/infrastructure/messaging/rabbit/RabbitMQConsumer";
import { RabbitMQConnection } from "../src/infrastructure/messaging/rabbit/RabbitMQConnection";
import { RabbitMQBootstrap } from "../src/infrastructure/messaging/rabbit/RabbitMQBootstrap";

describe("RabbitMQ integration", () => {
  it("should publish and consume message", async () => {
    const publisher = new RabbitMQPublisher();
    const consumer = new RabbitMQConsumer();

    const received: any[] = [];

    await consumer.consume("messages.upsert", async (data) => {
      received.push(data);
    });

    await publisher.publishQueue("messages.upsert", {
      hello: "world",
    });

    // espera processamento async
    await new Promise((r) => setTimeout(r, 500));

    expect(received.length).toBe(1);
    expect(received[0]).toEqual({ hello: "world" });
  });

  it("should publish and consume through media.exchange / media.upload.queue", async () => {
    const conn = await RabbitMQConnection.getInstance();
    const channel = await conn.createChannel();
    await RabbitMQBootstrap.setup(channel);
    await channel.close();

    const publisher = new RabbitMQPublisher();
    const consumer = new RabbitMQConsumer();

    const received: any[] = [];

    await consumer.consume("media.upload.queue", async (data) => {
      received.push(data);
    });

    await publisher.publishExchange("media.exchange", "media.upload", {
      filePath: "/tmp/fake-media.jpg",
    });

    await new Promise((r) => setTimeout(r, 500));

    expect(received.length).toBe(1);
    expect(received[0]).toEqual({ filePath: "/tmp/fake-media.jpg" });
  });
});
