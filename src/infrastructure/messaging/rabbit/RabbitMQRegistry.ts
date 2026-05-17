export const RabbitMQRegistry: RabbitMQExchangeConfig[] = [
  {
    exchange: "messages.exchange",

    type: "topic",

    queues: [
      {
        name: "messages.queue",

        routingKey: "messages.upsert",

        retry: {
          queue: "messages.queue.retry",
          ttl: 30000,
        },

        dlq: {
          exchange: "messages.dlx",
          queue: "messages.queue.dlq",
        },
      },
    ],
  },
];

export type RabbitMQRouting = {
  name: string;

  routingKey: string;

  dlq?: {
    exchange: string;
    queue: string;
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
