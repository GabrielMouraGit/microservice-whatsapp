import {
  IMessageEventLogRepository,
  MessageEventLogInput,
  MessageEventLogOutput,
} from "@/domain/repositories/IMessageEventLogRepository";
import { $prismaClient } from "@config/database";
import { EventStatus, MessageEventLog } from "@prisma/client";

export class MessageEventLogRepository implements IMessageEventLogRepository {
  constructor() {}

  async save(data: MessageEventLogInput): Promise<MessageEventLogOutput> {
    const oldMessage = await this.findById(data.id);
    if (oldMessage) {
      return oldMessage;
    }

    const oldMessage2 = await this.findByMessageId(data.id);
    if (oldMessage2) {
      return oldMessage2;
    }

    const result = await $prismaClient.messageEventLog.create({
      data: {
        id: data.id,
        session_id: data.sessionId,
        message_id: data.message_id,
        tenant_id: data.tenantId,
        event_name: data.eventName,
        payload: this.safeJson(data.payload),
      },
    });

    return this.mapToOutput(result);
  }

  async getAllMessagesLogs(): Promise<MessageEventLogOutput[]> {
    const result = await $prismaClient.messageEventLog.findMany();

    return result.map((m) => this.mapToOutput(m));
  }

  async markAsProcessed(id: string): Promise<void> {
    await $prismaClient.messageEventLog.update({
      where: { id },
      data: {
        status: "processed",
        processed_at: new Date(),
        error: null,
      },
    });
  }

  async markAsFailed(id: string): Promise<void> {
    await $prismaClient.messageEventLog.update({
      where: { id },
      data: {
        status: "failed",
      },
    });
  }

  async findPending(
    limit = 50,
    statuses: EventStatus[] = ["pending"],
  ): Promise<MessageEventLogOutput[]> {
    const results = await $prismaClient.messageEventLog.findMany({
      where: {
        status: { in: statuses },
      },
      orderBy: {
        created_at: "asc", // importante pra FIFO
      },
      take: limit,
    });

    return results.map(this.mapToOutput);
  }

  async findCreatedSince(since: Date): Promise<MessageEventLogOutput[]> {
    const results = await $prismaClient.messageEventLog.findMany({
      where: {
        created_at: { gte: since },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    return results.map(this.mapToOutput);
  }

  async findById(id: string): Promise<MessageEventLogOutput | null> {
    const result = await $prismaClient.messageEventLog.findUnique({
      where: { id },
    });

    if (!result) return null;

    return this.mapToOutput(result);
  }
  async findByMessageId(id: string): Promise<MessageEventLogOutput | null> {
    const result = await $prismaClient.messageEventLog.findFirst({
      where: { message_id: id },
    });

    if (!result) return null;

    return this.mapToOutput(result);
  }

  private mapToOutput(result: MessageEventLog): MessageEventLogOutput {
    return {
      id: result.id,
      sessionId: result.session_id,
      tenantId: result.tenant_id,
      eventName: result.event_name,
      payload: result.payload,
      createdAt: result.created_at,
    };
  }

  private safeJson(value: unknown) {
    try {
      return JSON.parse(
        JSON.stringify(value, (_key, val) => {
          if (typeof val === "bigint") return val.toString();
          if (Buffer.isBuffer(val)) return val.toString("base64");
          if (val instanceof Date) return val.toISOString();
          return val;
        }),
      );
    } catch (err) {
      return {
        __serialization_error: true,
        message: "Failed to serialize payload",
        error: String(err),
        original_type: typeof value,
      };
    }
  }
}
