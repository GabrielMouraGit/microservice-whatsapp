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
    const allMessagesLogs =
      await this.messageEventLogRepository.getAllMessagesLogs();
    console.log(
      `Total de mensagens a re-sincronizar: ${allMessagesLogs.length}`,
    );
    for (const msg of allMessagesLogs) {
      if (!msg?.payload || !msg.tenantId || !msg.sessionId) continue;

      console.log(
        `Re-sincronizando mensagem: ${msg.id} - Sessão: ${msg.sessionId} - Início: ${new Date().toISOString()}`,
      );
      const messagePayload = msg.payload as WAMessage;
      const sock = await this.baileysConnector.getSocket(msg.sessionId);
      if (sock) continue;

      const { url } = await this.baileysConnector.uploadMessageMedia(
        sock,
        msg,
        msg.tenantId,
      );

      const mapped = BaileysToWhatpyMapper.map(messagePayload, url);

      if (!mapped) continue;

      await this.events.emit("message.received", {
        sessionId: msg.sessionId,
        tenantId: msg.tenantId,
        data: mapped,
      });
      console.log(
        `Re-sincronizando mensagem: ${msg.id} - Sessão: ${msg.sessionId} - Fim: ${new Date().toISOString()}`,
      );
    }
  }
}
