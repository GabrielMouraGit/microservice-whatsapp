import { Message } from "@/domain/entities/Message";
import {
  IMessageRepository,
  ReceivedMessageWithTenant,
} from "@/domain/repositories/IMessageRepository";
import { DomainError } from "@/domain/utils/DomainError";
import { $prismaClient } from "@config/database";
import { MessageType, Prisma } from "@prisma/client";

const messageWithRelationsInclude = {
  text: true,
  image: true,
  video: true,
  audio: true,
  document: true,
  context: true,
  contact: true,
} satisfies Prisma.MessageInclude;

type MessageWithRelations = Prisma.MessageGetPayload<{
  include: typeof messageWithRelationsInclude;
}>;

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
          contact: true,
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

        contact: msg.contact
          ? {
              id: msg.contact.id,
              display_name: msg.contact.display_name,
              vcard: msg.contact.vcard,
              phone: msg.contact.phone,
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

      await $prismaClient.message.upsert({
        where: {
          id: dto.id,
        },
        create: {
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

          contact: dto.contact
            ? {
                create: {
                  ...dto.contact,
                  tenant: {
                    connect: { id: tenant_id },
                  },
                },
              }
            : undefined,
        },
        update: {}, // ou atualiza campos se quiser
      });
    } catch (err) {
      console.error("ERRO [saveMessage]", err);
      throw new DomainError("Failed to save message");
    }
  }
  async updateMessageText(
    messageId: string,
    tenantId: string,
    sessionId: string,
    newText: string,
  ): Promise<boolean> {
    try {
      const { count } = await $prismaClient.message.updateMany({
        where: {
          id: messageId,
          tenant_id: tenantId,
          session_id: sessionId,
        },
        data: {
          edited: true,
          edited_at: new Date(),
        },
      });

      if (count === 0) return false;

      await $prismaClient.messageText.updateMany({
        where: {
          message_id: messageId,
          tenant_id: tenantId,
        },
        data: {
          body: newText,
        },
      });

      return true;
    } catch (err) {
      console.error("ERRO [updateMessageText]", err);
      throw new DomainError("Failed to update message text");
    }
  }

  async getMessagesLastMessageByChatId(
    chat_id: string,
  ): Promise<Message | null> {
    try {
      const msg = await $prismaClient.message.findFirst({
        where: {
          chat_id,
        },
        orderBy: {
          timestamp: "desc", // ou created_at se preferir
        },
        include: {
          text: true,
          image: true,
          video: true,
          audio: true,
          document: true,
          context: true,
          contact: true,
        },
      });

      if (!msg) return null;

      return Message.restore({
        id: msg.id,
        chat_id: msg.chat_id,
        type: msg.type,
        from: msg.from,
        from_name: msg.from_name,
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
              file_size: msg.image.file_size || 0,
              id: msg.image.id || "",
              link: msg.image.link || "",
              mime_type: msg.image.mime_type || "",
              sha256: msg.image.sha256 || "",
              caption: msg.image.caption || "",
              height: msg.image.height || 0,
              width: msg.image.width || 0,
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

        contact: msg.contact
          ? {
              id: msg.contact.id,
              display_name: msg.contact.display_name,
              vcard: msg.contact.vcard,
              phone: msg.contact.phone,
            }
          : undefined,
      });
    } catch (err) {
      console.error("ERRO [getMessagesLastMessageByChatId]", err);
      throw new DomainError("Failed to fetch last message");
    }
  }
  async getNameUserBy(chat_id: string): Promise<string> {
    try {
      const result = await $prismaClient.message.findFirst({
        where: {
          chat_id,
          from_me: false,
        },
        orderBy: {
          timestamp: "desc", // ou created_at se preferir
        },
      });

      if (!result) return "";

      return result.from_name;
    } catch (err) {
      console.error("ERRO [getMessagesLastMessageByChatId]", err);
      throw new DomainError("Failed to fetch last message");
    }
  }

  async getDistinctSessionIds(): Promise<string[]> {
    try {
      const results = await $prismaClient.message.findMany({
        distinct: ["session_id"],
        select: { session_id: true },
      });

      return results.map((r) => r.session_id);
    } catch (err) {
      console.error("ERRO [getDistinctSessionIds]", err);
      throw new DomainError("Failed to fetch distinct session ids");
    }
  }

  async getLastReceivedMessages(
    sessionId: string,
    limit: number,
  ): Promise<ReceivedMessageWithTenant[]> {
    try {
      const results = await $prismaClient.message.findMany({
        where: {
          session_id: sessionId,
          from_me: false,
        },
        orderBy: {
          timestamp: "desc",
        },
        take: limit,
        include: messageWithRelationsInclude,
      });

      return results.map((msg) => this.mapToReceivedMessage(msg));
    } catch (err) {
      console.error("ERRO [getLastReceivedMessages]", err);
      throw new DomainError("Failed to fetch last received messages");
    }
  }

  async getReceivedMessagesSince(
    sessionId: string,
    since: Date,
  ): Promise<ReceivedMessageWithTenant[]> {
    try {
      const results = await $prismaClient.message.findMany({
        where: {
          session_id: sessionId,
          from_me: false,
          timestamp: { gte: since },
        },
        orderBy: {
          timestamp: "asc",
        },
        include: messageWithRelationsInclude,
      });

      return results.map((msg) => this.mapToReceivedMessage(msg));
    } catch (err) {
      console.error("ERRO [getReceivedMessagesSince]", err);
      throw new DomainError("Failed to fetch received messages since date");
    }
  }

  private mapToReceivedMessage(
    msg: MessageWithRelations,
  ): ReceivedMessageWithTenant {
    return {
      tenant_id: msg.tenant_id,
      message: Message.restore({
        id: msg.id,
        chat_id: msg.chat_id,
        type: msg.type,
        from: msg.from,
        from_name: msg.from_name,
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
              file_size: msg.image.file_size || 0,
              id: msg.image.id || "",
              link: msg.image.link || "",
              mime_type: msg.image.mime_type || "",
              sha256: msg.image.sha256 || "",
              caption: msg.image.caption || "",
              height: msg.image.height || 0,
              width: msg.image.width || 0,
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

        contact: msg.contact
          ? {
              id: msg.contact.id,
              display_name: msg.contact.display_name,
              vcard: msg.contact.vcard,
              phone: msg.contact.phone,
            }
          : undefined,
      }),
    };
  }
}
