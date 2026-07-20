import amqp, { ChannelModel, ConfirmChannel, Options } from "amqplib";
import { RabbitMQBootstrap } from "./RabbitMQBootstrap";

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

  //
  // Incremented each time a new connection is established.
  // Used to cancel stale consumer loops from previous connections.
  //
  private connectionGeneration = 0;

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
            ? `${url}&heartbeat=10`
            : `${url}?heartbeat=10`;

          const connection = await amqp.connect(connectUrl);

          this.connection = connection;

          connection.on("close", async () => {
            console.log(
              "⚠️  RabbitMQ conexão fechada — iniciando reconexão...",
            );

            this.connection = undefined;

            await this.reconnect();
          });

          connection.on("error", (err) => {
            console.error("❌ erro conexão RabbitMQ:", err.message);
          });

          connection.on("blocked", (reason) => {
            console.error("🚫 RabbitMQ blocked:", reason);
          });

          connection.on("unblocked", () => {
            console.log("✅ RabbitMQ unblocked");
          });

          console.log("✅ RabbitMQ conectado");

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

    console.log("🔄 tentando reconectar RabbitMQ...");

    while (!this.connection) {
      try {
        await this.connect();

        if (this.connection) {
          await this.setupTopology();

          const generation = ++this.connectionGeneration;

          this.restoreConsumers(generation);

          console.log("✅ RabbitMQ reconectado com sucesso");

          break;
        }
      } catch (err) {
        console.error("❌ erro reconnect:", err);

        this.connection = undefined;
      }

      await this.sleep(5000);
    }

    this.connectingPromise = undefined;
    this.reconnecting = false;

    if (!this.connection) {
      this.reconnect();
    }
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

    channel.on("error", (err) => {
      console.error("❌ erro channel:", err.message);
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
      console.warn(`⚠️  consumer já registrado: ${name}`);

      return;
    }

    const consumer: ConsumerRegistry = { name, listener };

    this.consumers.push(consumer);

    //
    // Start the consumer loop tied to the current connection generation.
    // If the connection drops and reconnects, restoreConsumers() will
    // start a new loop for the new generation.
    //
    this.startConsumerLoop(consumer, this.connectionGeneration).catch(() => {});
  }

  //
  // SETUP TOPOLOGY (exchanges, queues, bindings) via RabbitMQBootstrap
  //
  private async setupTopology(): Promise<void> {
    const channel = await this.createChannel();
    try {
      await RabbitMQBootstrap.setup(channel);
      console.log("✅ topology RabbitMQ recriada");
    } finally {
      await channel.close();
    }
  }

  //
  // RESTORE ALL CONSUMERS AFTER RECONNECT
  // Fire-and-forget: each consumer manages its own retry loop.
  //
  private restoreConsumers(generation: number): void {
    if (!this.connection || this.consumers.length === 0) return;

    console.log(`🔄 restaurando ${this.consumers.length} consumer(s)...`);

    for (const consumer of this.consumers) {
      this.startConsumerLoop(consumer, generation).catch(() => {});
    }
  }

  //
  // CONSUMER LOOP
  //
  // Keeps a consumer alive for a given connection generation.
  // - Retries automatically if the channel dies due to a channel-level error
  //   (e.g. queue not found) while the connection is still alive.
  // - Stops naturally when the connection generation changes (i.e. the
  //   connection dropped and a new one is being established).
  //
  private async startConsumerLoop(
    consumer: ConsumerRegistry,
    generation: number,
  ): Promise<void> {
    while (this.connectionGeneration === generation) {
      try {
        if (!this.connection) break;

        const channel = await this.createChannel();

        await consumer.listener(channel);

        console.log(`✅ consumer ativo: ${consumer.name}`);

        //
        // Block until the channel closes (connection drop or channel error).
        // When it closes the loop will decide whether to retry or stop.
        //
        await new Promise<void>((resolve) => {
          channel.once("close", resolve);
          channel.once("error", () => resolve());
        });

        if (this.connectionGeneration === generation && this.connection) {
          console.log(
            `🔄 canal fechado, recriando consumer ${consumer.name}...`,
          );
          await this.sleep(2000);
        }
      } catch (err) {
        if (this.connectionGeneration !== generation || !this.connection) break;

        console.error(`❌ erro consumer ${consumer.name}, retry em 5s:`, err);

        await this.sleep(5000);
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
