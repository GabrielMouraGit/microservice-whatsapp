import { FastifyInstance } from "fastify";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { baileysConnector, sessionManager } from "container";
import { BaileysRepository } from "@/infrastructure/repositories/Baileys/BaileysRepository";
import { GroupController } from "../controllers/GroupController";
import { GroupAdapters } from "../adapters/GroupAdapters";
import { MessageEventLogRepository } from "@/infrastructure/repositories/MessageEventLogRepository";
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
);

const runAdapter = new RunAdapterBaileys(baileysRepository);

const controller = new GroupController(repositorySession, runAdapter);
const adapters = new GroupAdapters(controller);

export async function GroupRoutes(net: FastifyInstance) {
  net.post("/api/v1/group/create", adapters.httpCreateGroup.bind(adapters));
  net.post(
    "/api/v1/group/add-participants",
    adapters.httpAddParticipants.bind(adapters),
  );
  net.post(
    "/api/v1/group/remove-participants",
    adapters.httpRemoveParticipants.bind(adapters),
  );
  net.post(
    "/api/v1/group/promote-participants",
    adapters.httpPromoteParticipants.bind(adapters),
  );
  net.post(
    "/api/v1/group/demote-participants",
    adapters.httpDemoteParticipants.bind(adapters),
  );
  net.post(
    "/api/v1/group/update-subject",
    adapters.httpUpdateSubject.bind(adapters),
  );
  net.post(
    "/api/v1/group/update-description",
    adapters.httpUpdateDescription.bind(adapters),
  );
  net.post("/api/v1/group/metadata", adapters.httpGetMetadata.bind(adapters));
  net.post(
    "/api/v1/group/invite-code",
    adapters.httpGetInviteCode.bind(adapters),
  );
  net.post(
    "/api/v1/group/revoke-invite",
    adapters.httpRevokeInvite.bind(adapters),
  );
  net.post("/api/v1/group/join", adapters.httpJoinViaInvite.bind(adapters));
  net.post("/api/v1/group/leave", adapters.httpLeaveGroup.bind(adapters));
}
