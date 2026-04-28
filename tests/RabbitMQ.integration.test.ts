import { describe, expect, it } from "vitest";
import { RabbitMQPublisher } from "../src/infrastructure/messaging/rabbit/RabbitMQPublisher";
import { RabbitMQConsumer } from "../src/infrastructure/messaging/rabbit/RabbitMQConsumer";

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
});
