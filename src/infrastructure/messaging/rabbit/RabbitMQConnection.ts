import amqp, { ChannelModel, ConfirmChannel } from "amqplib";

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private reconnecting = false;
  private connectingPromise?: Promise<void>;

  private consumers = new Map<
    string,
    (channel: ConfirmChannel) => Promise<void>
  >();

  private constructor() {}

  static async getInstance() {
    if (!this.instance) {
      this.instance = new RabbitMQConnection();

      await this.instance.connect();
    }

    return this.instance;
  }

  async connect() {
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = (async () => {
      while (true) {
        try {
          console.log("🔄 conectando RabbitMQ...");

          const connection = await amqp.connect(process.env.RABBITMQ_URL!);

          this.connection = connection;

          const channel = await connection.createConfirmChannel();

          this.channel = channel;

          console.log("✅ rabbit conectado");

          return; // sai do loop quando conectar
        } catch (err) {
          console.error("❌ falha conectar RabbitMQ, retry em 5s...", err);

          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    })();

    return this.connectingPromise;
  }

  private async reconnect() {
    if (this.reconnecting) return;

    this.reconnecting = true;

    this.connectingPromise = undefined; // 🔥 IMPORTANTE

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

      await new Promise((r) => setTimeout(r, 5000));
    }

    this.reconnecting = false;
  }

  async registerConsumer(
    name: string,
    listener: (channel: ConfirmChannel) => Promise<void>,
  ) {
    if (this.consumers.has(name)) {
      console.warn(`⚠️ consumer já registrado: ${name}`);

      return;
    }

    this.consumers.set(name, listener);

    if (this.channel) {
      await listener(this.channel);
    }
  }
  async getChannel() {
    if (this.channel && this.connection) {
      return this.channel;
    }

    while (!this.channel || !this.connection) {
      console.log("⏳ aguardando RabbitMQ reconnect...");

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return this.channel!;
  }

  async close() {
    try {
      await this.channel?.close();

      await this.connection?.close();

      console.log("🛑 RabbitMQ connection closed");
    } catch (err) {
      console.error("❌ erro fechar RabbitMQ:", err);
    }
  }
}
