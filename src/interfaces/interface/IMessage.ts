export interface IMessage {
  sendText(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    text: string;
    quoted_id: string;
  }): Promise<void>;

  sendImage(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    caption: string;
    quoted_id: string;
  }): Promise<void>;

  sendVideo(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    caption: string;
    quoted_id: string;
  }): Promise<void>;

  sendAudio(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    quoted_id?: string;
  }): Promise<void>;

  sendVoice(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    quoted_id: string;
  }): Promise<void>;

  sendDocument(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    fileName: string;
    mimetype: string;
    quoted_id: string;
  }): Promise<void>;
}
