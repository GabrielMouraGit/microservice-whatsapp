export interface IMessage {
  sendText(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    text: string;
    quoted_id: string;
  }): Promise<{ message_id: string }>;

  sendImage(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    caption: string;
    quoted_id: string;
  }): Promise<{ message_id: string }>;
  sendVideo(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    caption: string;
    quoted_id: string;
  }): Promise<{ message_id: string }>;

  sendAudio(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    quoted_id?: string;
  }): Promise<{ message_id: string }>;

  sendVoice(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    quoted_id: string;
  }): Promise<{ message_id: string }>;

  sendDocument(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    fileName: string;
    mimetype: string;
    quoted_id: string;
  }): Promise<{ message_id: string }>;
  deleteMessage(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
  }): Promise<void>;
  editMessage(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    newText: string;
  }): Promise<void>;
}
