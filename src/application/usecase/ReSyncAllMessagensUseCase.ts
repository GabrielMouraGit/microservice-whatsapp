import { ITypeSessionEvents } from "@/domain/events/ITypeSessionEvents";
import { IMessageEventLogRepository } from "@/domain/repositories/IMessageEventLogRepository";
import { EventBus } from "@/infrastructure/events/EventBus";
import { BaileysConnector } from "@/infrastructure/repositories/Baileys/BaileysConnector";
import { BaileysToWhatpyMapper } from "@/infrastructure/repositories/Baileys/BaileysToWhatpyMapper";
import { WAMessage } from "@whiskeysockets/baileys";

export class ReSyncAllMessagensUseCase {
  constructor(
    private messageEventLogRepository: IMessageEventLogRepository,
    private baileysConnector: BaileysConnector,
    private events: EventBus<ITypeSessionEvents>,
  ) {}

  async execute() {
    const pending = await this.messageEventLogRepository.findPending(100);

    if (pending.length === 0) return;

    console.log(`🔄 re-sincronizando ${pending.length} mensagem(ns) pendente(s)...`);

    for (const msg of pending) {
      try {
        if (!msg?.payload || !msg.tenantId || !msg.sessionId) {
          await this.messageEventLogRepository.markAsProcessed(msg.id);
          continue;
        }

        const messagePayload = msg.payload as WAMessage;

        const sock = this.baileysConnector.getSocket(msg.sessionId);

        let url = "";

        if (sock) {
          const result = await this.baileysConnector.uploadMessageMedia(
            sock,
            messagePayload,
            msg.tenantId,
          );
          url = result.url;
        } else {
          console.log(`⚠️  sessão ${msg.sessionId} não conectada — sincronizando sem mídia`);
        }

        const mapped = BaileysToWhatpyMapper.map(messagePayload, url);

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
}
