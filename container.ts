// container.ts
import { SessionManager } from "./src/infrastructure/repositories/SessionManager";
import { BaileysConnector } from "./src/infrastructure/repositories/Baileys/BaileysConnector";

import { EventBus } from "@/infrastructure/events/EventBus";
import { ITypeSessionEvents } from "@/domain/events/ITypeSessionEvents";
import { ITypeMessageLogEvents } from "@/domain/events/ITypeMessageLogEvents";
import { DomainEventDispatcher } from "@/infrastructure/events/DomainEventDispatcher";
import { MessageEventLogRepository } from "@/infrastructure/repositories/MessageEventLogRepository";
import { ReSyncAllMessagensUseCase } from "@/application/usecase/ReSyncAllMessagensUseCase";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { BaileysRepository } from "@/infrastructure/repositories/Baileys/BaileysRepository";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { MessageRepository } from "@/infrastructure/repositories/MessageRepository";
import { ContactRepositoryPrisma } from "@/infrastructure/repositories/ContactRepositoryPrisma";
import { MessageController } from "@/interfaces/controllers/MessageController";
import { RabbitMQPublisher } from "@/infrastructure/messaging/rabbit/RabbitMQPublisher";
import { RabbitMQDlqReprocessor } from "@/infrastructure/messaging/rabbit/RabbitMQDlqReprocessor";

export const eventBus = new EventBus<AppEvents>();

export type AppEvents = ITypeSessionEvents & ITypeMessageLogEvents;

export const sessionManager = new SessionManager();
export const domainEventDispatcher = new DomainEventDispatcher<AppEvents>(
  eventBus,
);
const messageEventLogRepository = new MessageEventLogRepository();

export const baileysConnector = new BaileysConnector(
  sessionManager,
  eventBus,
  domainEventDispatcher,
);

export const rabbitMQPublisher = new RabbitMQPublisher();
export const rabbitMQDlqReprocessor = new RabbitMQDlqReprocessor();

const repositorySession = new SessionRepositoryPrisma();
const messageRepository = new MessageRepository();
const contactRepository = new ContactRepositoryPrisma();

export const reSyncAllMessagensUseCase = new ReSyncAllMessagensUseCase(
  messageEventLogRepository,
  baileysConnector,
  eventBus,
  messageRepository,
  rabbitMQPublisher,
);

const baileysRepository = new BaileysRepository(
  baileysConnector,
  sessionManager,
  messageEventLogRepository,
  messageRepository,
  contactRepository,
  repositorySession,
);

const runAdapter = new RunAdapterBaileys(baileysRepository);

// Shared MessageController instance so the HTTP routes and the
// messages.send.queue consumer dispatch through the same
// tenant/session validation and Baileys wiring.
export const messageController = new MessageController(
  repositorySession,
  runAdapter,
);
