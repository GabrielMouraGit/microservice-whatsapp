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

  {
    exchange: "media.exchange",

    type: "topic",

    queues: [
      {
        name: "media.upload.queue",

        routingKey: "media.upload",

        // storage microservice outages can last a while; retry with
        // exponential backoff (1min, 2min, 4min, 8min, 16min, capped at
        // 30min) instead of hammering it at a fixed interval
        maxRetries: 30,

        retry: {
          queue: "media.upload.queue.retry",
          ttl: 60000,
          multiplier: 2,
          maxTtl: 1800000,
        },

        dlq: {
          exchange: "media.exchange.dlx",
          queue: "media.upload.queue.dlq",
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

    // Base delay (ms) before the first retry.
    ttl: number;

    // Exponential backoff factor applied per retry attempt
    // (delay = ttl * multiplier^retryCount). Defaults to 1 (flat interval,
    // today's behavior) when omitted.
    multiplier?: number;

    // Caps the computed delay so backoff doesn't grow unbounded.
    maxTtl?: number;
  };

  //
  // Overrides RabbitMQConsumer's default MAX_RETRIES for this queue.
  //
  maxRetries?: number;
};

export type RabbitMQExchangeConfig = {
  exchange: string;
  type: "topic" | "direct" | "fanout";
  queues: RabbitMQRouting[];
};

// DLX (Dead Letter Exchange)
// DLQ (fila de erro)
