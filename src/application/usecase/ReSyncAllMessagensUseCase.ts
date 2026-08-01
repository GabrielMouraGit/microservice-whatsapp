import { ITypeSessionEvents } from "@/domain/events/ITypeSessionEvents";
import {
  IMessageEventLogRepository,
  MessageEventLogOutput,
} from "@/domain/repositories/IMessageEventLogRepository";
import {
  IMessageRepository,
  ReceivedMessageWithTenant,
} from "@/domain/repositories/IMessageRepository";
import { EventBus } from "@/infrastructure/events/EventBus";
import { BaileysConnector } from "@/infrastructure/repositories/Baileys/BaileysConnector";
import { BaileysToWhatpyMapper } from "@/infrastructure/repositories/Baileys/BaileysToWhatpyMapper";
import { RabbitMQPublisher } from "@/infrastructure/messaging/rabbit/RabbitMQPublisher";
import { WAMessage } from "@whiskeysockets/baileys";

const LAST_RECEIVED_MESSAGES_LIMIT = 500;
const FULL_RESYNC_WINDOW_HOURS = 48;

export class ReSyncAllMessagensUseCase {
  constructor(
    private messageEventLogRepository: IMessageEventLogRepository,
    private baileysConnector: BaileysConnector,
    private events: EventBus<ITypeSessionEvents>,
    private messageRepository: IMessageRepository,
    private rabbitMQPublisher: RabbitMQPublisher,
  ) {}

  // Roda a cada poucos minutos: só cobre o que ainda está pending/failed.
  async execute() {
    const pending = await this.messageEventLogRepository.findPending(100, [
      "pending",
      "failed",
    ]);

    await this.processEventLogs(pending);
    await this.republishLastReceivedMessages();
  }

  // Rede de segurança diária: reenvia tudo (inclusive já processado) dentro
  // da janela de tempo, já que o consumer do lado de lá é idempotente e
  // decide sozinho se já processou aquela mensagem ou não.
  async executeFull(windowHours: number = FULL_RESYNC_WINDOW_HOURS) {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const logs = await this.messageEventLogRepository.findCreatedSince(since);
    await this.processEventLogs(logs);

    await this.republishReceivedMessagesSince(since);
  }

  // Disparado sob demanda (não no cron) quando uma sessão volta a ficar
  // "open" depois de ter caído — cobre exatamente a janela em que ela
  // esteve fora do ar, sem esperar o próximo ciclo periódico e sem varrer
  // as outras sessões que não foram afetadas.
  async executeForSession(sessionId: string, since: Date) {
    const logs = (
      await this.messageEventLogRepository.findCreatedSince(since)
    ).filter((log) => log.sessionId === sessionId);

    await this.processEventLogs(logs);

    const received = await this.messageRepository.getReceivedMessagesSince(
      sessionId,
      since,
    );

    await this.publishReceivedMessages(sessionId, received);
  }

  private async processEventLogs(logs: MessageEventLogOutput[]) {
    if (logs.length === 0) return;

    console.log(`🔄 re-sincronizando ${logs.length} mensagem(ns)...`);

    for (const msg of logs) {
      try {
        if (!msg?.payload || !msg.tenantId || !msg.sessionId) {
          await this.messageEventLogRepository.markAsProcessed(msg.id);
          continue;
        }

        const messagePayload = msg.payload as WAMessage;

        const sock = this.baileysConnector.getSocket(msg.sessionId);

        if (sock) {
          const staged = await this.baileysConnector.stageAndEnqueueMedia(
            sock,
            messagePayload,
            msg.tenantId,
            msg.sessionId,
          );

          if (staged) {
            // upload real acontece de forma assíncrona/durável via RabbitMQ;
            // o worker emite message.received quando o upload for concluído
            await this.messageEventLogRepository.markAsProcessed(msg.id);
            continue;
          }
        } else {
          console.log(`⚠️  sessão ${msg.sessionId} não conectada — sincronizando sem mídia`);
        }

        const mapped = BaileysToWhatpyMapper.map(messagePayload);

        if (!mapped) {
          await this.messageEventLogRepository.markAsProcessed(msg.id);
          continue;
        }

        await this.events.emit("message.received", {
          sessionId: msg.sessionId,
          tenantId: msg.tenantId,
          data: mapped,
        });

        await this.messageEventLogRepository.markAsProcessed(msg.id);

        console.log(`✅ mensagem sincronizada: ${msg.id}`);
      } catch (err) {
        console.error(`❌ erro ao re-sincronizar mensagem ${msg.id}:`, err);
      }
    }
  }

  private async republishLastReceivedMessages() {
    const sessionIds = await this.messageRepository.getDistinctSessionIds();

    for (const sessionId of sessionIds) {
      const received = await this.messageRepository.getLastReceivedMessages(
        sessionId,
        LAST_RECEIVED_MESSAGES_LIMIT,
      );

      await this.publishReceivedMessages(sessionId, received);
    }
  }

  private async republishReceivedMessagesSince(since: Date) {
    const sessionIds = await this.messageRepository.getDistinctSessionIds();

    for (const sessionId of sessionIds) {
      const received = await this.messageRepository.getReceivedMessagesSince(
        sessionId,
        since,
      );

      await this.publishReceivedMessages(sessionId, received);
    }
  }

  private async publishReceivedMessages(
    sessionId: string,
    received: ReceivedMessageWithTenant[],
  ) {
    console.log(
      `🔁 republicando ${received.length} mensagem(ns) recebida(s) da sessão ${sessionId}...`,
    );

    for (const { message, tenant_id } of received) {
      try {
        await this.rabbitMQPublisher.publishExchange(
          "messages.exchange",
          "messages.upsert",
          {
            message: message.toDTO(),
            tenant_id,
            session_id: sessionId,
          },
        );
      } catch (err) {
        console.error(
          `❌ erro ao republicar mensagem ${message.id} da sessão ${sessionId}:`,
          err,
        );
      }
    }
  }
}
