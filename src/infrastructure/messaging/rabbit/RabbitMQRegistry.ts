export const RabbitMQRegistry: RabbitMQExchangeConfig[] = [
  {
    exchange: "messages.exchange",
    type: "topic",
    queues: [
      {
        name: "messages.queue",
        routingKeys: ["messages.upsert"],
        retry: {
          queue: "messages.queue.retry",
          ttl: 30000, // 30 segundos
        },
        dlq: {
          exchange: "messages.dlx",
          queue: "messages.queue.dlq",
          routingKey: "messages.upsert.dlq",
        },
      },
    ],
  },
];

export type RabbitMQRouting = {
  name: string;
  routingKeys: string[];
  dlq?: {
    exchange: string;
    queue: string;
    routingKey: string;
  };
  retry?: {
    queue: string;
    ttl: number;
  };
};

export type RabbitMQExchangeConfig = {
  exchange: string;
  type: "topic" | "direct" | "fanout";
  queues: RabbitMQRouting[];
};

// DLX (Dead Letter Exchange)
// DLQ (fila de erro)
