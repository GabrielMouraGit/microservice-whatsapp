import { RabbitMQConsumer } from "@/infrastructure/messaging/rabbit/RabbitMQConsumer";
import { RabbitMQRegistry } from "@/infrastructure/messaging/rabbit/RabbitMQRegistry";
import { messageController, rabbitMQPublisher } from "container";

const QUEUE = "messages.send.queue";

const queueConfig = RabbitMQRegistry.flatMap((ex) => ex.queues).find(
  (q) => q.name === QUEUE,
);

type SendCommand = {
  message_id: string;
  tenant_id: string;
  session_id: string;
  type: "text" | "image" | "video" | "audio" | "voice" | "document";
  to: string;
  quoted_id?: string;
  payload: {
    text?: string;
    url?: string;
    mimetype?: string;
    caption?: string;
    fileName?: string;
  };
};

// Connection/session-readiness errors are worth retrying (the Baileys
// socket may just be reconnecting); anything else is treated as a
// permanent failure so the sender finds out immediately instead of
// waiting through the full retry/backoff cycle.
function isTransientError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);

  return /timeout|conex(a|ã)o/i.test(message);
}

async function dispatchSend(
  command: SendCommand,
): Promise<{ message_id: string }> {
  const { tenant_id, session_id, to, quoted_id, payload } = command;

  switch (command.type) {
    case "text":
      return messageController.sendText({
        tenant_id,
        sessionId: session_id,
        number: to,
        text: payload.text ?? "",
        quoted_id: quoted_id ?? "",
      });

    case "image":
      return messageController.sendImage({
        tenant_id,
        sessionId: session_id,
        number: to,
        url: payload.url ?? "",
        mimetype: payload.mimetype ?? "",
        caption: payload.caption ?? "",
        quoted_id: quoted_id ?? "",
      });

    case "video":
      return messageController.sendVideo({
        tenant_id,
        sessionId: session_id,
        number: to,
        url: payload.url ?? "",
        mimetype: payload.mimetype ?? "",
        caption: payload.caption ?? "",
        quoted_id: quoted_id ?? "",
      });

    case "audio":
      return messageController.sendAudio({
        tenant_id,
        sessionId: session_id,
        number: to,
        url: payload.url ?? "",
        mimetype: payload.mimetype ?? "",
        quoted_id: quoted_id ?? "",
      });

    case "voice":
      return messageController.sendVoice({
        tenant_id,
        sessionId: session_id,
        number: to,
        url: payload.url ?? "",
        mimetype: payload.mimetype ?? "",
        quoted_id: quoted_id ?? "",
      });

    case "document":
      return messageController.sendDocument({
        tenant_id,
        sessionId: session_id,
        number: to,
        url: payload.url ?? "",
        fileName: payload.fileName ?? "",
        mimetype: payload.mimetype ?? "",
        caption: payload.caption ?? "",
        quoted_id: quoted_id ?? "",
      });

    default:
      throw new Error(`Unsupported send command type: ${command.type}`);
  }
}

async function publishStatus(
  command: SendCommand,
  result:
    | { status: "sent"; provider_message_id: string }
    | { status: "failed"; error_reason: string },
) {
  await rabbitMQPublisher.publishExchange("messages.status.exchange", "messages.status", {
    message_id: command.message_id,
    tenant_id: command.tenant_id,
    session_id: command.session_id,
    occurred_at: new Date().toISOString(),
    ...result,
  });
}

async function processSendCommand(command: SendCommand) {
  try {
    const { message_id } = await dispatchSend(command);

    await publishStatus(command, {
      status: "sent",
      provider_message_id: message_id,
    });
  } catch (err) {
    if (isTransientError(err)) {
      // rethrow so RabbitMQConsumer retries with backoff
      throw err;
    }

    const error_reason = err instanceof Error ? err.message : "unknown-error";

    console.error(
      `❌ falha permanente ao enviar mensagem ${command.message_id}:`,
      error_reason,
    );

    await publishStatus(command, { status: "failed", error_reason });
  }
}

export async function startMessagesSendWorker() {
  const consumer = new RabbitMQConsumer();

  await consumer.consume(
    QUEUE,
    async (content: SendCommand) => {
      await processSendCommand(content);
    },
    queueConfig?.maxRetries,
  );

  console.log("🟢 messages send worker iniciado");
}
