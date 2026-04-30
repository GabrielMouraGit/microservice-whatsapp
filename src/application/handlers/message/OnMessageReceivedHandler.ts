import { WhatsappMessageMapper } from "@/application/usecase/WhatsappMessageMapper";
import { IMessageRepository } from "@/domain/repositories/IMessageRepository";
import { WebhookWhatsapp } from "@/domain/repositories/IWhatsappAdapter";
import { RabbitMQPublisher } from "@/infrastructure/messaging/rabbit/RabbitMQPublisher";

export class OnMessageReceivedHandler {
  constructor(
    private messageRepo: IMessageRepository,
    private rabbitMQPublisher: RabbitMQPublisher,
  ) {}

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

          await this.messageRepo.saveMessage(
            message,
            event.tenantId,
            event.sessionId,
          );

          await this.rabbitMQPublisher.publishExchange(
            "messages.exchange",
            "messages.upsert",
            {
              message,
              tenant_id: event.tenantId,
              session_id: event.sessionId,
            },
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
