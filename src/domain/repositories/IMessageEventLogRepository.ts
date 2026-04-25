export type MessageEventLogInput = {
  sessionId: string;
  tenantId: string;
  eventName: string;
  payload: unknown;
};
export interface IMessageEventLogRepository {
  save(data: MessageEventLogInput): Promise<MessageEventLogOutput>;
}

export type MessageEventLogOutput = {
  id: string;
  sessionId: string;
  tenantId: string;
  eventName: string;
  payload: unknown;
  createdAt: Date;
};
