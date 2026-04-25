import { Message } from "@/domain/entities/Message";
import { IMessageRepository } from "@/domain/repositories/IMessageRepository";
import { DomainError } from "@/domain/utils/DomainError";
import { $prismaClient } from "@config/database";
import { MessageType } from "@prisma/client";

export class MessageRepository implements IMessageRepository {
  constructor() {}

  async getMessagesById(
    id: string,
    tenant_id: string,
  ): Promise<Message | null> {
    try {
      const msg = await $prismaClient.message.findUnique({
        where: { id, tenant_id },
        include: {
          text: true,
          image: true,
          video: true,
          audio: true,
          document: true,
          context: true,
        },
      });

      if (!msg) return null;

      return Message.restore({
        id: msg.id,
        chat_id: msg.chat_id,
        type: msg.type,
        from: "", // ajusta se tiver origem real
        from_name: "",
        from_me: msg.from_me,
        source: msg.source,
        is_read: msg.is_read,
        timestamp: msg.timestamp,

        created_at: msg.created_at,
        forwarded: msg.forwarded,
        text: msg.text
          ? {
              body: msg.text.body,
            }
          : undefined,

        image: msg.image
          ? {
              file_size: msg.image?.file_size || 0,
              id: msg.image?.id || "",
              link: msg.image?.link || "",
              mime_type: msg.image?.mime_type || "",
              sha256: msg.image?.sha256 || "",
              caption: msg.image?.caption || "",
              height: msg.image?.height || 0,
              width: msg.image?.width || 0,
            }
          : undefined,
        video: msg.video
          ? {
              id: msg.video.id,
              mime_type: msg.video.mime_type,
              file_size: msg.video.file_size,
              sha256: msg.video.sha256,
              link: msg.video.link ?? "",
              width: msg.video.width ?? null,
              height: msg.video.height ?? null,
              seconds: msg.video.seconds ?? null,
              caption: msg.video.caption ?? null,
            }
          : undefined,

        audio: msg.audio
          ? {
              id: msg.audio.id,
              mime_type: msg.audio.mime_type,
              file_size: msg.audio.file_size,
              sha256: msg.audio.sha256,
              link: msg.audio.link ?? "",

              seconds: msg.audio.seconds ?? 0,
            }
          : undefined,

        document: msg.document
          ? {
              id: msg.document.id,
              mime_type: msg.document.mime_type,
              file_size: msg.document.file_size,

              sha256: msg.document.sha256,
              filename: msg.document.filename,
              link: msg.document.link ?? "",
            }
          : undefined,

        context: msg.context
          ? {
              quoted_id: msg.context.quoted_id,
              quoted_author: msg.context.quoted_author,
              quoted_type: msg.context.quoted_type,
            }
          : undefined,
      });
    } catch (err) {
      console.error("ERRO [getMessagesById]", err);
      throw new DomainError("Failed to fetch message by id");
    }
  }
  async saveMessage(
    message: Message,
    tenant_id: string,
    sessionId: string,
  ): Promise<void> {
    try {
      const dto = message.toDTO();

      await $prismaClient.message.create({
        data: {
          id: dto.id,
          type: dto.type as MessageType,
          from: dto.from,
          from_name: dto.from_name,
          from_me: dto.from_me,
          source: dto.source,
          forwarded: dto.forwarded,
          is_read: dto.is_read,
          chat_id: dto.chat_id,
          session_id: sessionId,
          tenant_id: tenant_id,
          timestamp: dto.timestamp,
          text: dto.text
            ? {
                create: {
                  body: dto.text.body,
                  tenant: {
                    connect: { id: tenant_id },
                  },
                },
              }
            : undefined,

          image: dto.image
            ? {
                create: {
                  ...dto.image,
                  tenant: {
                    connect: { id: tenant_id },
                  },
                },
              }
            : undefined,

          video: dto.video
            ? {
                create: {
                  ...dto.video,
                  tenant: {
                    connect: { id: tenant_id },
                  },
                },
              }
            : undefined,

          audio: dto.audio
            ? {
                create: {
                  ...dto.audio,
                  tenant: {
                    connect: { id: tenant_id },
                  },
                },
              }
            : undefined,

          document: dto.document
            ? {
                create: {
                  ...dto.document,
                  tenant: {
                    connect: { id: tenant_id },
                  },
                },
              }
            : undefined,

          context: dto.context
            ? {
                create: {
                  ...dto.context,
                  tenant: {
                    connect: { id: tenant_id },
                  },
                },
              }
            : undefined,
        },
      });
    } catch (err) {
      console.error("ERRO [saveMessage]", err);
      throw new DomainError("Failed to save message");
    }
  }
}
