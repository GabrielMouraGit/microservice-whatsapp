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

  // Reactions
  sendReaction(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    emoji: string;
  }): Promise<void>;
  removeReaction(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
  }): Promise<void>;

  // Message actions
  starMessage(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    fromMe: boolean;
    star: boolean;
  }): Promise<void>;
  pinMessage(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    pin: boolean;
  }): Promise<void>;
  deleteMessageForMe(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    fromMe: boolean;
  }): Promise<void>;

  // Presence
  sendRecording(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void>;
  subscribePresence(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void>;

  // Chat management
  archiveChat(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    archive: boolean;
  }): Promise<void>;
  muteChat(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    durationMs: number | null;
  }): Promise<void>;
  deleteChat(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void>;
  clearChat(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void>;

  // Rich content messages
  sendLocation(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    quoted_id?: string;
  }): Promise<{ message_id: string }>;
  sendContactCard(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    displayName: string;
    vcard: string;
    quoted_id?: string;
  }): Promise<{ message_id: string }>;
  sendSticker(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    isAnimated?: boolean;
    quoted_id?: string;
  }): Promise<{ message_id: string }>;
  sendPoll(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    name: string;
    values: string[];
    selectableCount: number;
    quoted_id?: string;
  }): Promise<{ message_id: string }>;
}
