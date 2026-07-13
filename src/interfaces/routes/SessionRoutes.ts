import { FastifyInstance } from "fastify";
import { SessionAdapters } from "../adapters/SessionAdapters";
import { SessionController } from "../controllers/SessionController";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { baileysConnector, sessionManager } from "container";
import { BaileysRepository } from "@/infrastructure/repositories/Baileys/BaileysRepository";
import { MessageRepository } from "@/infrastructure/repositories/MessageRepository";
import { MessageEventLogRepository } from "@/infrastructure/repositories/MessageEventLogRepository";
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
);

const runAdapter = new RunAdapterBaileys(baileysRepository);
const controller = new SessionController(repositorySession, runAdapter);
const adapters = new SessionAdapters(controller);

export async function SessionRoutes(net: FastifyInstance) {
  net.get("/api/v1/sessions", adapters.httpAllSession.bind(adapters));
  net.post("/api/v1/session/create", adapters.httpCreate.bind(adapters));
  net.post("/api/v1/session/update", adapters.httpUpdate.bind(adapters));
  net.post("/api/v1/session/get-by-id", adapters.httpFindById.bind(adapters));
  net.post("/api/v1/session/logout", adapters.httpLogout.bind(adapters));
  net.post(
    "/api/v1/session/is-connected",
    adapters.httpIsConnected.bind(adapters),
  );
  net.post("/api/v1/session/delete", adapters.httpDeleteSession.bind(adapters));
  net.post(
    "/api/v1/session/get-my-profile",
    adapters.httpGetMyProfile.bind(adapters),
  );
  net.post(
    "/api/v1/session/new-qr-code",
    adapters.httpNewQRCode.bind(adapters),
  );
  net.post("/api/v1/session/presence", adapters.httpSetPresence.bind(adapters));
  net.post(
    "/api/v1/session/profile-name",
    adapters.httpUpdateProfileName.bind(adapters),
  );
  net.post(
    "/api/v1/session/profile-status",
    adapters.httpUpdateProfileStatus.bind(adapters),
  );
  net.post(
    "/api/v1/session/profile-picture",
    adapters.httpUpdateProfilePicture.bind(adapters),
  );
  net.post(
    "/api/v1/session/profile-picture/remove",
    adapters.httpRemoveProfilePicture.bind(adapters),
  );
}
