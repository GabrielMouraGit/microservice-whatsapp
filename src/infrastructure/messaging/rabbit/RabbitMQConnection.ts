import amqp, { Channel, Connection } from "amqplib";

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;

  private connection!: Connection;
  private channel!: Channel;

  private isConnecting = false;

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
      console.log("conectando no rabbitmq...");

      this.connection = await amqp.connect(process.env.RABBITMQ_URL!);

      this.connection.on("error", (err) => {
        console.error("❌ rabbit connection error:", err);
      });

      this.connection.on("close", async () => {
        console.error("⚠️ rabbit connection closed");

        this.isConnecting = false;

        setTimeout(async () => {
          try {
            await this.connect();
          } catch (err) {
            console.error("❌ erro reconnect:", err);
          }
        }, 5000);
      });

      this.channel = await this.connection.createChannel();

      this.channel.on("error", (err) => {
        console.error("❌ channel error:", err);
      });

      this.channel.on("close", () => {
        console.error("⚠️ channel closed");
      });

      console.log("✅ rabbit conectado");

      this.isConnecting = false;
    } catch (err) {
      console.error("❌ falha rabbit:", err);

      this.isConnecting = false;

      setTimeout(async () => {
        await this.connect();
      }, 5000);
    }
  }

  async recreateChannel() {
    this.channel = await this.connection.createChannel();
  }

  getChannel(): Channel {
    return this.channel;
  }
}
