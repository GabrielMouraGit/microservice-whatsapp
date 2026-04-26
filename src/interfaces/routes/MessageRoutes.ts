import { FastifyInstance } from "fastify";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { baileysConnector, sessionManager } from "container";
import { BaileysRepository } from "@/infrastructure/repositories/Baileys/BaileysRepository";
import { MessageAdapters } from "../adapters/MessageAdapters";
import { MessageController } from "../controllers/MessageController";
import { MessageEventLogRepository } from "@/infrastructure/repositories/MessageEventLogRepository";

const repositorySession = new SessionRepositoryPrisma();
const messageEventLogRepository = new MessageEventLogRepository();

const baileysRepository = new BaileysRepository(
  baileysConnector,
  sessionManager,
  messageEventLogRepository,
);

const runAdapter = new RunAdapterBaileys(baileysRepository);

const controller = new MessageController(repositorySession, runAdapter);
const adapters = new MessageAdapters(controller);

export async function MessageRoutes(net: FastifyInstance) {
  net.post("/api/v1/message/send-text", adapters.httpSendText.bind(adapters));

  net.post("/api/v1/message/send-image", adapters.httpSendImage.bind(adapters));

  net.post("/api/v1/message/send-video", adapters.httpSendVideo.bind(adapters));

  net.post("/api/v1/message/send-audio", adapters.httpSendAudio.bind(adapters));

  net.post("/api/v1/message/send-voice", adapters.httpSendVoice.bind(adapters));

  net.post(
    "/api/v1/message/send-document",
    adapters.httpSendDocument.bind(adapters),
  );
}
