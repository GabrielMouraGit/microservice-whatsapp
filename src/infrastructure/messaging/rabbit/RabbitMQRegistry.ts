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
    exchange: "messages.edited.exchange",

    type: "topic",

    queues: [
      {
        name: "messages.edited.queue",

        routingKey: "messages.edited",

        retry: {
          queue: "messages.edited.queue.retry",
          ttl: 30000,
        },

        dlq: {
          exchange: "messages.edited.dlx",
          queue: "messages.edited.queue.dlq",
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

  {
    exchange: "messages.send.exchange",

    type: "topic",

    queues: [
      {
        name: "messages.send.queue",

        routingKey: "messages.send",

        maxRetries: 15,

        retry: {
          queue: "messages.send.queue.retry",
          ttl: 30000,
          multiplier: 2,
          maxTtl: 900000,
        },

        dlq: {
          exchange: "messages.send.exchange.dlx",
          queue: "messages.send.queue.dlq",
        },
      },
    ],
  },

  {
    exchange: "messages.status.exchange",

    type: "topic",

    queues: [
      {
        name: "messages.status.queue",

        routingKey: "messages.status",

        maxRetries: 15,

        retry: {
          queue: "messages.status.queue.retry",
          ttl: 30000,
          multiplier: 2,
          maxTtl: 900000,
        },

        dlq: {
          exchange: "messages.status.exchange.dlx",
          queue: "messages.status.queue.dlq",
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
