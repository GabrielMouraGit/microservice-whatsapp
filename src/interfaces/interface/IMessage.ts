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
    mimetype: string;
    caption: string;
    quoted_id: string;
  }): Promise<{ message_id: string }>;
  sendVideo(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    mimetype: string;
    caption: string;
    quoted_id: string;
  }): Promise<{ message_id: string }>;

  sendAudio(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    mimetype: string;
    quoted_id?: string;
  }): Promise<{ message_id: string }>;

  sendVoice(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    mimetype: string;
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
    caption: string;
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
  forwardMessage(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
  }): Promise<void>;

  markChatAsRead(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void>;

  sendTyping(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void>;

  markAsRead(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
  }): Promise<void>;
}
