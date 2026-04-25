export type MessageEventLogInput = {
  id: string;
  sessionId: string;
  tenantId: string;
  eventName: string;
  payload: unknown;
};
export interface IMessageEventLogRepository {
  save(data: MessageEventLogInput): Promise<MessageEventLogOutput>;

  markAsProcessed(id: string): Promise<void>;

  markAsFailed(id: string): Promise<void>;

  findPending(limit?: number): Promise<MessageEventLogOutput[]>;

  findById(id: string): Promise<MessageEventLogOutput | null>;
}

export type MessageEventLogOutput = {
  id: string;
  sessionId: string;
  tenantId: string;
  eventName: string;
  payload: unknown;
  createdAt: Date;
};
