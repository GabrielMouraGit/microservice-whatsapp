// container.ts
import { SessionManager } from "./src/infrastructure/repositories/SessionManager";
import { BaileysConnector } from "./src/infrastructure/repositories/Baileys/BaileysConnector";

import { EventBus } from "@/infrastructure/events/EventBus";
import { ITypeSessionEvents } from "@/domain/events/ITypeSessionEvents";
import { ITypeMessageLogEvents } from "@/domain/events/ITypeMessageLogEvents";
import { DomainEventDispatcher } from "@/infrastructure/events/DomainEventDispatcher";

export const eventBus = new EventBus<AppEvents>();

export type AppEvents = ITypeSessionEvents & ITypeMessageLogEvents;

export const sessionManager = new SessionManager();
export const domainEventDispatcher = new DomainEventDispatcher<AppEvents>(
  eventBus,
);

export const baileysConnector = new BaileysConnector(
  sessionManager,
  eventBus,
  domainEventDispatcher,
);
