import { IMessageRepository } from "@/domain/repositories/IMessageRepository";
import { RabbitMQPublisher } from "@/infrastructure/messaging/rabbit/RabbitMQPublisher";

export class OnMessageEditedHandler {
  constructor(
    private messageRepo: IMessageRepository,
    private rabbitMQPublisher: RabbitMQPublisher,
  ) {}

  async handle(event: {
    sessionId: string;
    tenantId: string;
    messageId: string;
    newText: string;
    editedAt: Date;
  }) {
    try {
      const updated = await this.messageRepo.updateMessageText(
        event.messageId,
        event.tenantId,
        event.sessionId,
        event.newText,
      );

      if (!updated) {
        console.warn(
          `⚠️ edição recebida para mensagem não encontrada (id=${event.messageId}), ignorando`,
        );
        return;
      }

      await this.rabbitMQPublisher.publishExchange(
        "messages.edited.exchange",
        "messages.edited",
        {
          message_id: event.messageId,
          tenant_id: event.tenantId,
          session_id: event.sessionId,
          new_text: event.newText,
          edited_at: event.editedAt,
        },
      );

      console.log(
        `✅ edição persistida e publicada (id=${event.messageId})`,
      );
    } catch (err) {
      console.error("❌ erro geral ao processar mensagem editada:", err);
    }
  }
}
