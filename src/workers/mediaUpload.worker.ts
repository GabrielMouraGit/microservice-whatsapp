import { RabbitMQConsumer } from "@/infrastructure/messaging/rabbit/RabbitMQConsumer";
import { RabbitMQRegistry } from "@/infrastructure/messaging/rabbit/RabbitMQRegistry";
import {
  readStagedMedia,
  deleteStagedMedia,
} from "@/infrastructure/repositories/Baileys/MediaStaging";
import { BaileysToWhatpyMapper } from "@/infrastructure/repositories/Baileys/BaileysToWhatpyMapper";
import { EventLog } from "@/domain/aggregates/EventLog";
import { $config } from "@config/config";
import { eventBus, domainEventDispatcher } from "container";
import { WAMessage } from "@whiskeysockets/baileys";

const QUEUE = "media.upload.queue";

const queueConfig = RabbitMQRegistry.flatMap((ex) => ex.queues).find(
  (q) => q.name === QUEUE,
);

type MediaUploadJob = {
  filePath: string;
  mimeType: string;
  fileName: string;
  storagePath: string;
  tenantId: string;
  sessionId: string;
  msg: WAMessage;
};

async function processMediaUpload(content: MediaUploadJob) {
  const { filePath, mimeType, fileName, storagePath, tenantId, sessionId, msg } =
    content;

  const buffer = readStagedMedia(filePath);

  const formData = new FormData();

  formData.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    fileName,
  );

  formData.append("path", storagePath);

  const response = await fetch(
    `${$config.MICROSERVICE_STORAGE}/storage/api/v1/file/add-item`,
    {
      method: "POST",
      headers: {
        "x-backend-token": $config.MICROSERVICE_STORAGE_TOKEN,
        "x-tenant-id": tenantId,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(`erro upload: ${response.status}`);
  }

  const uploaded = await response.json();

  const mapped = BaileysToWhatpyMapper.map(msg, uploaded.url);

  if (mapped) {
    await eventBus.emit("message.received", {
      sessionId,
      tenantId,
      data: mapped,
    });
  }

  deleteStagedMedia(filePath);
}

async function onMediaUploadDeadLetter(content: MediaUploadJob) {
  const { sessionId, tenantId, filePath, msg } = content;

  console.error(
    `☠️ upload de mídia esgotou tentativas, mensagem ${msg?.key?.id} — arquivo preservado em ${filePath}`,
  );

  const log = new EventLog(sessionId, tenantId);

  log.log("media.upload.dlq", { filePath, messageId: msg?.key?.id });
  log.fail();

  domainEventDispatcher.dispatch(log);
}

export async function startMediaUploadWorker() {
  const consumer = new RabbitMQConsumer();

  await consumer.consume(
    QUEUE,
    async (content: MediaUploadJob) => {
      await processMediaUpload(content);
    },
    queueConfig?.maxRetries,
    onMediaUploadDeadLetter,
  );

  console.log("🟢 media upload worker iniciado");
}
