import { FastifyInstance } from "fastify";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { baileysConnector, sessionManager } from "container";
import { BaileysRepository } from "@/infrastructure/repositories/Baileys/BaileysRepository";
import { MessageEventLogRepository } from "@/infrastructure/repositories/MessageEventLogRepository";
import { ContactController } from "../controllers/ContactController";
import { ContactAdapters } from "../adapters/ContactAdapters";
import { MessageRepository } from "@/infrastructure/repositories/MessageRepository";
import { ContactRepositoryPrisma } from "@/infrastructure/repositories/ContactRepositoryPrisma";

const repositorySession = new SessionRepositoryPrisma();
const messageEventLogRepository = new MessageEventLogRepository();
const messageRepository = new MessageRepository();
const contactRepository = new ContactRepositoryPrisma();

const baileysRepository = new BaileysRepository(
  baileysConnector,
  sessionManager,
  messageEventLogRepository,
  messageRepository,
  contactRepository,
  repositorySession,
);

const runAdapter = new RunAdapterBaileys(baileysRepository);

const controller = new ContactController(repositorySession, runAdapter);
const adapters = new ContactAdapters(controller);

export async function ContactRoutes(net: FastifyInstance) {
  net.post(
    "/api/v1/contact/get-contact-by-id",
    adapters.httpGetContact.bind(adapters),
  );
  net.post(
    "/api/v1/contact/check-exists",
    adapters.httpCheckExists.bind(adapters),
  );
  net.post("/api/v1/contact/block", adapters.httpBlockContact.bind(adapters));
  net.post(
    "/api/v1/contact/unblock",
    adapters.httpUnblockContact.bind(adapters),
  );
  net.post(
    "/api/v1/contact/status",
    adapters.httpGetContactStatus.bind(adapters),
  );
}
