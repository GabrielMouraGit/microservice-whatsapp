import { $config } from "@config/config";
import amqp, { Connection, Channel } from "amqplib";

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;

  private connection!: Connection;
  private channel!: Channel;

  private constructor() {}

  static async getInstance() {
    if (!this.instance) {
      this.instance = new RabbitMQConnection();
      await this.instance.connect();
    }

    return this.instance;
  }

  private async connect() {
    this.connection = await amqp.connect($config.RABBITMQ_URL);

    this.channel = await this.connection.createChannel();
  }

  getChannel(): Channel {
    return this.channel;
  }
}
