export interface IMessage {
  sendText(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    text: string;
    quoted_id: string;
  }): Promise<void>;
}
