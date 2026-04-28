export const RabbitMQRegistry: RabbitMQExchangeConfig[] = [
  //   {
  //     exchange: "messages.exchange",
  //     type: "topic",
  //     queues: [
  //       {
  //         name: "messages.queue",
  //         routingKeys: ["messages.upsert"],
  //       },
  //       {
  //         name: "messages.audit.queue",
  //         routingKeys: ["messages.upsert"],
  //       },
  //       {
  //         name: "messages.analytics.queue",
  //         routingKeys: ["messages.upsert"],
  //       },
  //     ],
  //   },
];

export type RabbitMQRouting = {
  name: string;
  routingKeys: string[];
};

export type RabbitMQExchangeConfig = {
  exchange: string;
  type: "topic" | "direct" | "fanout";
  queues: RabbitMQRouting[];
};
