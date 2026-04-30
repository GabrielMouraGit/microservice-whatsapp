import { eventBus } from "container";
import { OnQrGeneratedHandler } from "@/application/handlers/OnQrGeneratedHandler";
import { OnSessionConnectedHandler } from "@/application/handlers/OnSessionConnectedHandler";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { OnMessageReceivedHandler } from "@/application/handlers/message/OnMessageReceivedHandler";
import { MessageRepository } from "@/infrastructure/repositories/MessageRepository";
import { RabbitMQPublisher } from "@/infrastructure/messaging/rabbit/RabbitMQPublisher";

export function registerSessionHandlers() {
  const sessionRepository = new SessionRepositoryPrisma();
  const messageRepository = new MessageRepository();
  const onQrGeneratedHandler = new OnQrGeneratedHandler(sessionRepository);
  const onSessionConnectedHandler = new OnSessionConnectedHandler(
    sessionRepository,
  );
  const rabbitMQPublisher = new RabbitMQPublisher();
  const onMessageReceivedHandler = new OnMessageReceivedHandler(
    messageRepository,
    rabbitMQPublisher,
  );
  eventBus.on("session.qr.generated", (e) => onQrGeneratedHandler.handle(e));
  eventBus.on("session.connected", (e) => onSessionConnectedHandler.handle(e));
  eventBus.on("message.received", (e) => onMessageReceivedHandler.handle(e));
}
