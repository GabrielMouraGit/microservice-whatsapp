import { SessionEvents } from "@/domain/events/SessionEvents";
import { EventBus } from "./EventBus";
import { OnQrGeneratedHandler } from "@/application/handlers/OnQrGeneratedHandler";
import { SessionRepositoryPrisma } from "../repositories/SessionRepositoryPrisma";
import { OnSessionConnectedHandler } from "@/application/handlers/OnSessionConnectedHandler";

const event = new EventBus<SessionEvents>();

const sessionRepository = new SessionRepositoryPrisma();
const onQrGeneratedHandler = new OnQrGeneratedHandler(sessionRepository);
const onSessionConnectedHandler = new OnSessionConnectedHandler(
  sessionRepository,
);

event.on("session.qr.generated", (e) => onQrGeneratedHandler.handle(e));
event.on("session.connected", (e) => onSessionConnectedHandler.handle(e));

event.on("message.received", async (payload) => {
  console.log("Mensagem:", payload.data);
});

export const eventBusSession = event;
