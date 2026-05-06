import "dotenv/config";

export const $config = {
  RABBITMQ_URL: process.env.RABBITMQ_URL!,
  GATEWAY_SECRET: process.env.GATEWAY_SECRET!,
};
