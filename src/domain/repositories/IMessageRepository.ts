import { Message } from "../entities/Message";

export interface IMessageRepository {
  getMessagesById(id: string, tenant_id: string): Promise<Message | null>;
  saveMessage(
    message: Message,
    tenant_id: string,
    sessionId: string,
  ): Promise<void>;
}
