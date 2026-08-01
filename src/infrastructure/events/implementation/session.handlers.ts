import { eventBus, reSyncAllMessagensUseCase } from "container";
import { OnQrGeneratedHandler } from "@/application/handlers/OnQrGeneratedHandler";
import { OnSessionConnectedHandler } from "@/application/handlers/OnSessionConnectedHandler";
import { OnSessionReconnectedResyncHandler } from "@/application/handlers/OnSessionReconnectedResyncHandler";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { OnMessageReceivedHandler } from "@/application/handlers/message/OnMessageReceivedHandler";
import { OnMessageEditedHandler } from "@/application/handlers/message/OnMessageEditedHandler";
import { MessageRepository } from "@/infrastructure/repositories/MessageRepository";
import { RabbitMQPublisher } from "@/infrastructure/messaging/rabbit/RabbitMQPublisher";

export function registerSessionHandlers() {
  const sessionRepository = new SessionRepositoryPrisma();
  const messageRepository = new MessageRepository();
  const onQrGeneratedHandler = new OnQrGeneratedHandler(sessionRepository);
  const onSessionConnectedHandler = new OnSessionConnectedHandler(
    sessionRepository,
  );
  const onSessionReconnectedResyncHandler =
    new OnSessionReconnectedResyncHandler(reSyncAllMessagensUseCase);
  const rabbitMQPublisher = new RabbitMQPublisher();
  const onMessageReceivedHandler = new OnMessageReceivedHandler(
    messageRepository,
    rabbitMQPublisher,
  );
  const onMessageEditedHandler = new OnMessageEditedHandler(
    messageRepository,
    rabbitMQPublisher,
  );
  eventBus.on("session.qr.generated", (e) => onQrGeneratedHandler.handle(e));
  eventBus.on("session.connected", (e) => onSessionConnectedHandler.handle(e));
  eventBus.on("session.connected", (e) =>
    onSessionReconnectedResyncHandler.handle(e),
  );
  eventBus.on("message.received", (e) => onMessageReceivedHandler.handle(e));
  eventBus.on("message.edited", (e) => onMessageEditedHandler.handle(e));
}
