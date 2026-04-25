import {
  IMessageEventLogRepository,
  MessageEventLogInput,
  MessageEventLogOutput,
} from "@/domain/repositories/IMessageEventLogRepository";
import { $prismaClient } from "@config/database";

export class MessageEventLogRepository implements IMessageEventLogRepository {
  constructor() {}

  async save(data: MessageEventLogInput): Promise<MessageEventLogOutput> {
    const result = await $prismaClient.messageEventLog.create({
      data: {
        session_id: data.sessionId,
        tenant_id: data.tenantId,
        event_name: data.eventName,
        payload: this.safeJson(data.payload),
      },
    });

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
