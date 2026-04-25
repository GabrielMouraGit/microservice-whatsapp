// container.ts
import { SessionManager } from "./src/infrastructure/repositories/SessionManager";
import { BaileysConnector } from "./src/infrastructure/repositories/Baileys/BaileysConnector";
import { SessionEvents } from "@/domain/events/SessionEvents";
import { MessageLogEvents } from "@/domain/events/EventLog/MessageLogEvents";
import { DomainEventDispatcher } from "@/domain/events/DomainEventDispatcher";
import { EventBus } from "@/infrastructure/events/EventBus";

export const eventBus = new EventBus<AppEvents>();
export type AppEvents = SessionEvents & MessageLogEvents;

export const sessionManager = new SessionManager();
export const domainEventDispatcher = new DomainEventDispatcher<AppEvents>(
  eventBus,
);

export const baileysConnector = new BaileysConnector(
  sessionManager,
  eventBus,
  domainEventDispatcher,
);
