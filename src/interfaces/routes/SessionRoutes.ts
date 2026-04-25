import { FastifyInstance } from "fastify";
import { SessionAdapters } from "../adapters/SessionAdapters";
import { SessionController } from "../controllers/SessionController";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { baileysConnector, sessionManager } from "container";
import { BaileysRepository } from "@/infrastructure/repositories/Baileys/BaileysRepository";

const repositorySession = new SessionRepositoryPrisma();

const baileysRepository = new BaileysRepository(
  baileysConnector,
  sessionManager,
);

const runAdapter = new RunAdapterBaileys(baileysRepository);
const controller = new SessionController(repositorySession, runAdapter);
const adapters = new SessionAdapters(controller);

export async function SessionRoutes(net: FastifyInstance) {
  net.post("/api/v1/session/create", adapters.httpCreate.bind(adapters));
  net.post("/api/v1/session/update", adapters.httpUpdate.bind(adapters));
  net.post("/api/v1/session/get-by-id", adapters.httpFindById.bind(adapters));
  net.post(
    "/api/v1/session/new-qr-code",
    adapters.httpNewQRCode.bind(adapters),
  );
  net.post("/api/v1/session/logout", adapters.httpLogout.bind(adapters));
  net.post("/api/v1/session/delete", adapters.httpDeleteSession.bind(adapters));
  net.get("/api/v1/sessions", adapters.httpAllSession.bind(adapters));
}
