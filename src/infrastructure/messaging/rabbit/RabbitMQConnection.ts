import amqp, { ChannelModel, ConfirmChannel, Options } from "amqplib";

type ConsumerListener = (channel: ConfirmChannel) => Promise<void>;

interface ConsumerRegistry {
  name: string;
  listener: ConsumerListener;
}

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;

  private connection?: ChannelModel;

  private connectingPromise?: Promise<void>;

  private reconnecting = false;

  private consumers: ConsumerRegistry[] = [];

  private constructor() {}

  //
  // SINGLETON
  //
  static async getInstance(): Promise<RabbitMQConnection> {
    if (!this.instance) {
      this.instance = new RabbitMQConnection();

      await this.instance.connect();
    }

    return this.instance;
  }

  //
  // CONNECT
  //
  async connect(): Promise<void> {
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      while (true) {
        try {
          console.log("🔄 conectando RabbitMQ...");

          const url = process.env.RABBITMQ_URL!;
          const connectUrl = url.includes("?")
            ? `${url}&heartbeat=30`
            : `${url}?heartbeat=30`;
          const connection = await amqp.connect(connectUrl);

          this.connection = connection;

          //
          // EVENTS
          //
          connection.on("close", async () => {
            console.log("⚠️ RabbitMQ conexão fechada");

            this.connection = undefined;

            await this.reconnect();
          });

          connection.on("error", async (err) => {
            console.error("❌ erro conexão RabbitMQ:", err);
          });

          console.log("✅ RabbitMQ conectado");

          //
          // RESTORE CONSUMERS
          //
          await this.restoreConsumers();

          return;
        } catch (err) {
          console.error("❌ falha conectar RabbitMQ, retry em 5s...", err);

          await this.sleep(5000);
        }
      }
    })();

    return this.connectingPromise;
  }

  //
  // RECONNECT
  //
  private async reconnect(): Promise<void> {
    if (this.reconnecting) return;

    this.reconnecting = true;

    this.connectingPromise = undefined;

    while (!this.connection) {
      try {
        console.log("🔄 tentando reconectar RabbitMQ...");

        await this.connect();

        if (this.connection) {
          console.log("✅ RabbitMQ reconectado");

          break;
        }
      } catch (err) {
        console.error("❌ erro reconnect:", err);
      }

      await this.sleep(5000);
    }

    this.connectingPromise = undefined;
    this.reconnecting = false;
  }

  //
  // CREATE NEW CHANNEL
  // IMPORTANT:
  // NEVER SHARE CHANNELS
  //
  async createChannel(): Promise<ConfirmChannel> {
    if (!this.connection) {
      await this.connect();
    }

    const channel = await this.connection!.createConfirmChannel();

    channel.on("close", () => {
      console.log("⚠️ channel fechado");
    });

    channel.on("error", (err) => {
      console.error("❌ erro channel:", err);
    });

    return channel;
  }

  //
  // ASSERT QUEUE
  //
  async assertQueue(
    queue: string,
    options?: Options.AssertQueue,
  ): Promise<void> {
    const channel = await this.createChannel();

    try {
      await channel.assertQueue(queue, {
        durable: true,
        ...options,
      });
    } finally {
      await channel.close();
    }
  }

  //
  // REGISTER CONSUMER
  //
  async registerConsumer(
    name: string,
    listener: ConsumerListener,
  ): Promise<void> {
    const exists = this.consumers.find((c) => c.name === name);

    if (exists) {
      console.warn(`⚠️ consumer já registrado: ${name}`);

      return;
    }

    this.consumers.push({
      name,
      listener,
    });

    //
    // START IMMEDIATELY
    //
    const channel = await this.createChannel();

    await listener(channel);
  }

  //
  // RESTORE CONSUMERS AFTER RECONNECT
  //
  private async restoreConsumers(): Promise<void> {
    if (!this.connection) return;

    console.log("🔄 restaurando consumers...");

    for (const consumer of this.consumers) {
      try {
        const channel = await this.createChannel();

        await consumer.listener(channel);

        console.log(`✅ consumer restaurado: ${consumer.name}`);
      } catch (err) {
        console.error(`❌ erro restaurar consumer ${consumer.name}:`, err);
      }
    }
  }

  //
  // CLOSE
  //
  async close(): Promise<void> {
    try {
      await this.connection?.close();

      console.log("🛑 RabbitMQ connection closed");
    } catch (err) {
      console.error("❌ erro fechar RabbitMQ:", err);
    }
  }

  //
  // UTILS
  //
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
