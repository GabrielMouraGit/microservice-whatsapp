import {
  WebhookWhatsapp,
  WhatsAppMessage,
  WhatsAppMessageAudio,
  WhatsAppMessageContext,
  WhatsAppMessageDocument,
  WhatsAppMessageImage,
  WhatsAppMessageSticker,
  WhatsAppMessageText,
  WhatsAppMessageVideo,
  WhatsAppMessageVoice,
} from "@/domain/repositories/IWhatsappAdapter";

import { WAMessage, proto } from "@whiskeysockets/baileys";
import { v4 } from "uuid";

export class BaileysToWhatpyMapper {
  static map(messages: WAMessage): WebhookWhatsapp | null {
    console.log("[ORIGINAL MESSAGE]", messages);
    const mappedMessages = this.buildMessage(messages);
    if (!mappedMessages) {
      throw new Error(
        "Failed to map message - unsupported type or missing content",
      );
    }

    return {
      messages: mappedMessages,
      event: {
        type: "messages",
        event: "post",
      },
      channel_id: "default",
    };
  }

  private static buildMessage(msg: WAMessage): WhatsAppMessage | null {
    const base = this.buildBase(msg);

    if (!msg.message) return null;

    const m = msg.message;

    if (m.conversation) {
      return {
        ...base,
        type: "text",
        text: this.buildTextMessage(m.conversation),
      };
    }

    if (m.extendedTextMessage) {
      return {
        ...base,
        type: "text",
        text: this.buildTextMessage(m.extendedTextMessage.text || ""),
        context: this.buildContext(m.extendedTextMessage.contextInfo),
      };
    }

    if (m.imageMessage) {
      return {
        ...base,
        type: "image",
        image: this.buildImageMessage(m.imageMessage),
        context: this.buildContext(m.imageMessage.contextInfo),
      };
    }

    if (m.documentMessage) {
      return {
        ...base,
        type: "document",
        document: this.buildDocumentMessage(m.documentMessage),
        context: this.buildContext(m.documentMessage.contextInfo),
      };
    }
    if (m?.documentWithCaptionMessage?.message?.documentMessage) {
      return {
        ...base,
        type: "document",
        document: this.buildDocumentMessage(
          m?.documentWithCaptionMessage?.message?.documentMessage,
        ),
        context: this.buildContext(
          m?.documentWithCaptionMessage?.message?.documentMessage?.contextInfo,
        ),
      };
    }

    if (m.videoMessage) {
      return {
        ...base,
        type: "video",
        video: this.buildVideoMessage(m.videoMessage),
        context: this.buildContext(m.videoMessage.contextInfo),
      };
    }

    if (m.audioMessage?.ptt === true) {
      return {
        ...base,
        type: "voice",
        voice: this.buildVoiceMessage(m.audioMessage),
        context: this.buildContext(m.audioMessage.contextInfo),
      };
    }

    if (m.audioMessage) {
      return {
        ...base,
        type: "audio",
        audio: this.buildAudioMessage(m.audioMessage),
        context: this.buildContext(m.audioMessage.contextInfo),
      };
    }

    if (m.stickerMessage) {
      return {
        ...base,
        type: "sticker",
        sticker: this.buildStickerMessage(m.stickerMessage),
        context: this.buildContext(m.stickerMessage.contextInfo),
      };
    }

    return null;
  }

  private static buildStickerMessage(
    sticker: proto.Message.IStickerMessage,
  ): WhatsAppMessageSticker {
    return {
      id: v4(),
      mime_type: sticker.mimetype || "",
      file_size: Number(sticker.fileLength || 0),
      sha256:
        this.normalizeBase64(sticker.fileSha256 || sticker.fileEncSha256) || "",
      link: "https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/2023/03/image-1.png?w=849&h=477&crop=0", //sticker.url || "",
      is_animated: !!sticker.isAnimated,
      is_ai_sticker: !!sticker.isAiSticker,
      is_lottie: !!sticker.isLottie,
      preview: sticker.isAnimated
        ? undefined
        : `data:${sticker.mimetype};base64,${this.normalizeBase64(
            sticker.fileSha256,
          )}`,
    };
  }

  private static buildAudioMessage(
    audio: proto.Message.IAudioMessage,
  ): WhatsAppMessageAudio {
    return {
      id: v4(),
      mime_type: audio.mimetype || "",
      file_size: Number(audio.fileLength || 0),
      sha256:
        this.normalizeBase64(audio.fileSha256 || audio.fileEncSha256) || "",
      link: "https://cdn.pixabay.com/download/audio/2023/06/22/audio_70ac38c7c8.mp3?filename=olenchic--154909.mp3", // audio.url || "",
      seconds: audio.seconds || 0,
    };
  }

  private static buildVoiceMessage(
    audio: proto.Message.IAudioMessage,
  ): WhatsAppMessageVoice {
    return {
      id: v4(),
      mime_type: audio.mimetype || "",
      file_size: Number(audio.fileLength || 0),
      sha256:
        this.normalizeBase64(audio.fileSha256 || audio.fileEncSha256) || "",
      link: "https://cdn.pixabay.com/download/audio/2023/06/22/audio_70ac38c7c8.mp3?filename=olenchic--154909.mp3", // audio.url || "",
      seconds: audio.seconds || 0,
    };
  }

  private static buildImageMessage(
    image: proto.Message.IImageMessage,
  ): WhatsAppMessageImage {
    return {
      id: v4(),
      mime_type: image.mimetype || "",
      file_size: Number(image.fileLength || 0),
      sha256:
        this.normalizeBase64(image.fileSha256 || image.fileEncSha256) || "",
      caption: image.caption || "",
      width: image.width || 0,
      height: image.height || 0,
      link: "https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/2023/03/image-1.png?w=849&h=477&crop=0", // image.url || "",
      preview: `data:${image.mimetype};base64,${this.normalizeBase64(image.jpegThumbnail)}`,
    };
  }

  private static buildDocumentMessage(
    doc: proto.Message.IDocumentMessage,
  ): WhatsAppMessageDocument {
    return {
      id: v4(),
      mime_type: doc.mimetype || "",
      file_size: Number(doc.fileLength || 0),
      sha256: this.normalizeBase64(doc.fileSha256 || doc.fileEncSha256) || "",
      link: "https://eppg.fgv.br/sites/default/files/teste.pdf", //doc.url || "",
      file_name: doc.fileName || doc.title || "",
      filename: doc.fileName || doc.title || "",
      caption: doc.caption || "",
    };
  }

  private static buildVideoMessage(
    video: proto.Message.IVideoMessage,
  ): WhatsAppMessageVideo {
    return {
      id: v4(),
      mime_type: video.mimetype || "",
      file_size: Number(video.fileLength || 0),
      sha256:
        this.normalizeBase64(video.fileSha256 || video.fileEncSha256) || "",
      width: video.width || 0,
      height: video.height || 0,
      seconds: video.seconds || 0,
      link: "https://videos.pexels.com/video-files/6802247/6802247-uhd_3840_2160_30fps.mp4", // video.url || "",
      caption: video.caption || "",
      preview: video.jpegThumbnail
        ? `data:${video.mimetype};base64,${this.normalizeBase64(
            video.jpegThumbnail,
          )}`
        : undefined,
    };
  }

  private static buildBase(msg: WAMessage): Omit<WhatsAppMessage, "type"> {
    return {
      id: msg.key.id || "",
      from_me: msg.key.fromMe || false,
      chat_id: msg.key.remoteJidAlt || msg.key.remoteJid || "",
      timestamp: Number(new Date(msg.messageTimestamp * 1000)),
      source: "baileys",
      starred: false,
      status: "sent",
      from: msg.key.remoteJidAlt?.includes("@s.whatsapp.net")
        ? msg.key.remoteJidAlt?.replace("@s.whatsapp.net", "")
        : msg.key.remoteJid?.replace("@s.whatsapp.net", "") || "",
      from_name:
        msg.pushName
          ?.toLowerCase()
          .trim()
          .split(/\s+/)
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(" ") || "",
    };
  }

  private static buildTextMessage(text: string): WhatsAppMessageText {
    return {
      body: text,
    };
  }

  private static buildContext(
    contextInfo?: proto.IContextInfo | null,
  ): WhatsAppMessageContext | undefined {
    if (!contextInfo) return undefined;

    if (!contextInfo.isForwarded && !contextInfo.stanzaId) {
      return undefined;
    }

    return {
      forwarded: !!contextInfo.isForwarded,
      quoted_id: contextInfo.stanzaId || "",
      quoted_author: contextInfo.participant || "",
      quoted_type: "unknown",
      quoted_content: {
        body:
          contextInfo?.quotedMessage?.conversation ||
          contextInfo?.quotedMessage?.extendedTextMessage?.text ||
          "",
      },
    };
  }

  private static normalizeBase64(value: unknown): string {
    if (!value) return "";

    if (typeof value === "string") return value;

    if (Buffer.isBuffer(value)) {
      return value.toString("base64");
    }

    if (typeof value === "object") {
      return Buffer.from(
        Object.values(value as Record<string, number>),
      ).toString("base64");
    }

    return "";
  }
}
