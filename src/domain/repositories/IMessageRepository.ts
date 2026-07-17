import { Message } from "../entities/Message";

export type ReceivedMessageWithTenant = {
  message: Message;
  tenant_id: string;
};

export interface IMessageRepository {
  getMessagesById(id: string, tenant_id: string): Promise<Message | null>;
  getMessagesLastMessageByChatId(chat_id: string): Promise<Message | null>;
  saveMessage(
    message: Message,
    tenant_id: string,
    sessionId: string,
  ): Promise<void>;
  updateMessageText(
    messageId: string,
    tenantId: string,
    sessionId: string,
    newText: string,
  ): Promise<boolean>;
  getNameUserBy(chat_id: string): Promise<string>;
  getDistinctSessionIds(): Promise<string[]>;
  getLastReceivedMessages(
    sessionId: string,
    limit: number,
  ): Promise<ReceivedMessageWithTenant[]>;
  getReceivedMessagesSince(
    sessionId: string,
    since: Date,
  ): Promise<ReceivedMessageWithTenant[]>;
}
