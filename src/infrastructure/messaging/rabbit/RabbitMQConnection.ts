import amqp, { Channel, ChannelModel } from "amqplib";

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;

  private connection?: ChannelModel;
  private channel?: Channel;

  private isConnecting = false;
  private isReconnecting = false;

  private reconnectListeners: Array<(channel: Channel) => Promise<void>> = [];

  private constructor() {}

  static async getInstance() {
    if (!this.instance) {
      this.instance = new RabbitMQConnection();

      await this.instance.connect();
    }

    return this.instance;
  }

  async connect() {
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      console.log("🔄 conectando RabbitMQ...");

      const connection = await amqp.connect(process.env.RABBITMQ_URL!);

      this.connection = connection;

      connection.on("error", (err) => {
        console.error("❌ rabbit connection error:", err);
      });

      connection.on("close", async () => {
        console.error("⚠️ rabbit connection closed");

        this.channel = undefined;
        this.connection = undefined;

        await this.reconnect();
      });

      const channel = await connection.createChannel();

      this.channel = channel;

      channel.on("error", (err) => {
        console.error("❌ channel error:", err);
      });

      channel.on("close", () => {
        console.error("⚠️ channel closed");
      });

      console.log("✅ rabbit conectado");

      for (const listener of this.reconnectListeners) {
        await listener(channel);
      }
    } catch (err) {
      console.error("❌ falha rabbit:", err);
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  private async reconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;

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

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    this.isReconnecting = false;
  }

  async registerConsumer(listener: (channel: Channel) => Promise<void>) {
    this.reconnectListeners.push(listener);

    if (this.channel) {
      await listener(this.channel);
    }
  }

  getChannel() {
    if (!this.channel) {
      throw new Error("RabbitMQ channel indisponível");
    }

    return this.channel;
  }
}
