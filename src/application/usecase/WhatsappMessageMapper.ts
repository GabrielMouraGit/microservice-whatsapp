import { Message } from "@/domain/entities/Message";
import { WhatsAppMessage } from "@/domain/repositories/IWhatsappAdapter";

export class WhatsappMessageMapper {
  static toDomain(msg: WhatsAppMessage): Message {
    return Message.create({
      id: msg.id,
      chat_id: msg.chat_id,
      type: msg.type,
      from: msg.from,
      from_name: msg.from_name,
      from_me: msg.from_me,
      source: msg.source,
      forwarded: msg.context?.forwarded ?? false,
      is_read: msg.status === "read",
      timestamp: new Date(msg.timestamp),

      text: msg.text,
      image: msg.image,
      video: msg.video,
      audio: msg.audio ?? msg.voice,
      document: msg.document,
      contact: msg.contact,
      context: msg.context,
    });
  }
}
