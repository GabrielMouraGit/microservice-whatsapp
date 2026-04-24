import { Session } from "../entities/Session";

export interface IWhatsappAdapter {
  createSession(session: Session): Promise<void>;
  newQrCode(session: Session): Promise<{ qr: string }>;
  sendText(sessionId: string, number: string, text: string): Promise<void>;
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
  link?: string;
  height?: number;
  preview?: string; // base64
}

export interface WhatsAppMessageVideo {
  id: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  width?: number;
  link?: string;
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
  link?: string;
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
  link?: string;
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
  link?: string;
  file_name: string; // nome do arquivo enviado
  filename?: string; // às vezes usado também
  caption?: string;
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
    | "sticker";
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
  context?: WhatsAppMessageContext;
  from: string;
  from_name: string;
}

export interface WhatsAppMessageSticker {
  id: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  link?: string;
  is_animated?: boolean;
  is_ai_sticker?: boolean;
  is_lottie?: boolean;
  preview?: string;
}
export interface WhatsAppMessageSticker {
  id: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  link?: string;
  is_animated?: boolean;
  is_ai_sticker?: boolean;
  is_lottie?: boolean;
  preview?: string;
}

export interface WhatsAppEvent {
  type: string; // ex: "messages"
  event: string; // ex: "post"
}

export interface WebhookWhatsapp {
  messages: WhatsAppMessage[];
  event: WhatsAppEvent;
  channel_id: string;
}
