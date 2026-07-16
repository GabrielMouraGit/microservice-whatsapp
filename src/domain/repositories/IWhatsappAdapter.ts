import { Session } from "../entities/Session";

export interface IWhatsappAdapter {
  createSession(session: Session): Promise<void>;
  newQrCode(session: Session): Promise<{ qr: string }>;
  logout(sessionId: string): Promise<void>;
  sendText(
    tenant_id: string,
    sessionId: string,
    number: string,
    text: string,
    quoted_id: string,
  ): Promise<{ message_id: string }>;
  deleteMessage(
    sessionId: string,
    number: string,
    message_id: string,
  ): Promise<{ message_id: string }>;
  forwardMessage(
    sessionId: string,
    number: string,
    message_id: string,
  ): Promise<void>;

  sendImage(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    caption: string,
    quoted_id: string,
  ): Promise<{ message_id: string }>;
  sendVideo(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    caption: string,
    quoted_id: string,
  ): Promise<{ message_id: string }>;
  sendAudio(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    quoted_id?: string,
  ): Promise<{ message_id: string }>;

  sendVoice(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    quoted_id: string,
  ): Promise<{ message_id: string }>;
  sendDocument(
    sessionId: string,
    number: string,
    url: string,
    fileName: string,
    mimetype: string,
    quoted_id: string,
    caption: string,
  ): Promise<{ message_id: string }>;
  getContact(
    sessionId: string,
    number: string,
    tenant_id: string,
  ): Promise<{
    jid: string;
    name: string;
    exists: boolean;
    profilePicUrl: string;
  }>;
  checkExists(sessionId: string, number: string): Promise<{ exists: boolean }>;
  isConnected(sessionId: string): Promise<{ connected: boolean }>;
  getMyProfile(sessionId: string): Promise<{
    jid: string;
    name: string;
    phone: string;
    profilePicUrl: string;
  }>;

  editMessage(
    sessionId: string,
    number: string,
    messageId: string,
    newText: string,
  ): Promise<void>;

  markChatAsRead(sessionId: string, number: string): Promise<void>;
  sendTyping(sessionId: string, number: string): Promise<void>;
  markAsRead(
    sessionId: string,
    number: string,
    messageId: string,
  ): Promise<void>;

  // Reactions
  sendReaction(
    sessionId: string,
    number: string,
    messageId: string,
    emoji: string,
  ): Promise<void>;
  removeReaction(
    sessionId: string,
    number: string,
    messageId: string,
  ): Promise<void>;

  // Message actions
  starMessage(
    sessionId: string,
    number: string,
    messageId: string,
    fromMe: boolean,
    star: boolean,
  ): Promise<void>;
  pinMessage(
    sessionId: string,
    number: string,
    messageId: string,
    pin: boolean,
  ): Promise<void>;
  deleteMessageForMe(
    sessionId: string,
    number: string,
    messageId: string,
    fromMe: boolean,
  ): Promise<void>;

  // Presence
  sendRecording(sessionId: string, number: string): Promise<void>;
  setOwnPresence(
    sessionId: string,
    presence: "available" | "unavailable",
  ): Promise<void>;
  subscribePresence(sessionId: string, number: string): Promise<void>;

  // Chat management
  archiveChat(
    sessionId: string,
    number: string,
    archive: boolean,
  ): Promise<void>;
  muteChat(
    sessionId: string,
    number: string,
    durationMs: number | null,
  ): Promise<void>;
  deleteChat(sessionId: string, number: string): Promise<void>;
  clearChat(sessionId: string, number: string): Promise<void>;

  // Rich content messages
  sendLocation(
    sessionId: string,
    number: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
    quoted_id?: string,
  ): Promise<{ message_id: string }>;
  sendContactCard(
    sessionId: string,
    number: string,
    displayName: string,
    vcard: string,
    quoted_id?: string,
  ): Promise<{ message_id: string }>;
  sendSticker(
    sessionId: string,
    number: string,
    url: string,
    isAnimated?: boolean,
    quoted_id?: string,
  ): Promise<{ message_id: string }>;
  sendPoll(
    sessionId: string,
    number: string,
    name: string,
    values: string[],
    selectableCount: number,
    quoted_id?: string,
  ): Promise<{ message_id: string }>;

  // Contact & own-profile management
  blockContact(sessionId: string, number: string): Promise<void>;
  unblockContact(sessionId: string, number: string): Promise<void>;
  getContactStatus(
    sessionId: string,
    number: string,
  ): Promise<{ status: string }>;
  updateProfileName(sessionId: string, name: string): Promise<void>;
  updateProfileStatus(sessionId: string, status: string): Promise<void>;
  updateProfilePicture(sessionId: string, url: string): Promise<void>;
  removeProfilePicture(sessionId: string): Promise<void>;

  // Group management
  createGroup(
    sessionId: string,
    subject: string,
    participantNumbers: string[],
  ): Promise<GroupMetadataResult>;
  addParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ): Promise<GroupParticipantUpdateResult[]>;
  removeParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ): Promise<GroupParticipantUpdateResult[]>;
  promoteParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ): Promise<GroupParticipantUpdateResult[]>;
  demoteParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ): Promise<GroupParticipantUpdateResult[]>;
  updateGroupSubject(
    sessionId: string,
    groupJid: string,
    subject: string,
  ): Promise<void>;
  updateGroupDescription(
    sessionId: string,
    groupJid: string,
    description: string,
  ): Promise<void>;
  getGroupMetadata(
    sessionId: string,
    groupJid: string,
  ): Promise<GroupMetadataResult>;
  getGroupInviteCode(
    sessionId: string,
    groupJid: string,
  ): Promise<{ inviteCode: string }>;
  revokeGroupInvite(
    sessionId: string,
    groupJid: string,
  ): Promise<{ inviteCode: string }>;
  joinGroupViaInvite(
    sessionId: string,
    code: string,
  ): Promise<{ groupJid: string }>;
  leaveGroup(sessionId: string, groupJid: string): Promise<void>;
}

export interface GroupParticipantUpdateResult {
  jid: string;
  status: string;
}

export interface GroupMetadataResult {
  id: string;
  subject: string;
  description: string;
  owner: string;
  participants: {
    jid: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }[];
}

export interface WhatsAppMessageText {
  body: string;
}

export interface WhatsAppMessageImage {
  id: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  caption?: string;
  width?: number;
  link: string;
  height?: number;
  preview?: string; // base64
}

export interface WhatsAppMessageVideo {
  id: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  width?: number;
  link: string;
  height?: number;
  seconds?: number; // duração do vídeo
  preview?: string; // base64
  caption?: string;
}

export interface WhatsAppMessageVoice {
  id: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  link: string;
  seconds: number; // duração do áudio
}
export interface WhatsAppMessageReplyList {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppMessageReply {
  type: "list_reply" | string; // pode ter outros tipos futuramente
  list_reply?: WhatsAppMessageReplyList;
}
export interface WhatsAppMessageContextRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppMessageContextSection {
  title: string;
  rows: WhatsAppMessageContextRow[];
}

export interface WhatsAppMessageContextContent {
  header?: string;
  body?: string;
  label?: string;
  footer?: string;
  sections?: WhatsAppMessageContextSection[];
}
export interface WhatsAppMessageAudio {
  id: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  link: string;
  seconds?: number;
}

export interface WhatsAppMessageContext {
  forwarded: boolean;
  quoted_id: string;
  quoted_author: string;
  quoted_content: WhatsAppMessageContextContent;
  quoted_type: "list" | "button" | string; // tipo da mensagem citada
}

export interface WhatsAppMessageDocument {
  id: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  link: string;
  file_name: string;
  filename: string;
  caption?: string;
}

export interface WhatsAppMessageSticker {
  id: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  link: string;
  is_animated?: boolean;
  is_ai_sticker?: boolean;
  is_lottie?: boolean;
  preview?: string;
}

export interface WhatsAppMessageContact {
  id: string;
  display_name: string;
  vcard: string;
  phone?: string;
}

export interface WhatsAppMessage {
  id: string;
  from_me: boolean;
  type:
    | "text"
    | "image"
    | "voice"
    | "document"
    | "video"
    | "audio"
    | "reply"
    | "sticker"
    | "contact";
  chat_id: string;
  timestamp: number;
  status: string;
  starred: boolean;
  source: string; // ex: "mobile", "web"
  text?: WhatsAppMessageText;
  image?: WhatsAppMessageImage;
  document?: WhatsAppMessageDocument;
  video?: WhatsAppMessageVideo; // se type === "video"
  voice?: WhatsAppMessageVoice;
  reply?: WhatsAppMessageReply;
  audio?: WhatsAppMessageAudio;
  sticker?: WhatsAppMessageAudio;
  contact?: WhatsAppMessageContact;
  context?: WhatsAppMessageContext;
  from: string;
  from_name: string;
}

export interface WhatsAppEvent {
  type: string; // ex: "messages"
  event: string; // ex: "post"
}

export interface WebhookWhatsapp {
  messages: WhatsAppMessage;
  event: WhatsAppEvent;
  channel_id: string;
}
