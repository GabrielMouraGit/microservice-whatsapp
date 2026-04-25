import { WhatsappMessageMapper } from "@/application/usecase/WhatsappMessageMapper";
import { IMessageRepository } from "@/domain/repositories/IMessageRepository";
import { WebhookWhatsapp } from "@/domain/repositories/IWhatsappAdapter";

export class OnMessageReceivedHandler {
  constructor(private messageRepo: IMessageRepository) {}

  async handle(event: {
    sessionId: string;
    tenantId: string;
    data: WebhookWhatsapp | null;
  }) {
    if (!event.data) return;

    try {
      for (const msg of event.data.messages) {
        try {
          const message = WhatsappMessageMapper.toDomain(msg);
          console.log(message.toDTO());
          await this.messageRepo.saveMessage(
            message,
            event.tenantId,
            event.sessionId,
          );
        } catch (err) {
          console.error("❌ erro ao mapear mensagem:", msg.id, err);
        }
      }
    } catch (err) {
      console.error("❌ erro geral ao processar mensagens:", err);
    }
  }
}
