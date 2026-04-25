import { eventBus } from "container";
import { OnQrGeneratedHandler } from "@/application/handlers/OnQrGeneratedHandler";
import { OnSessionConnectedHandler } from "@/application/handlers/OnSessionConnectedHandler";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";

export function registerSessionHandlers() {
  const sessionRepository = new SessionRepositoryPrisma();

  const onQrGeneratedHandler = new OnQrGeneratedHandler(sessionRepository);
  const onSessionConnectedHandler = new OnSessionConnectedHandler(
    sessionRepository,
  );

  eventBus.on("session.qr.generated", (e) => onQrGeneratedHandler.handle(e));
  eventBus.on("session.connected", (e) => onSessionConnectedHandler.handle(e));
}
