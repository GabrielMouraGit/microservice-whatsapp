import Fastify from "fastify";
import cors from "@fastify/cors";
import { baileysConnector, reSyncAllMessagensUseCase } from "container";
import HandlerRequest from "@/interfaces/plugins/HandlerRequest";
import HandlerAuth from "@/interfaces/plugins/HandlerAuth";
import { SessionRoutes } from "@/interfaces/routes/SessionRoutes";
import { SessionBootstrap } from "@/interfaces/plugins/SessionBootstrap";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { registerEventHandlers } from "@/infrastructure/events/RegisterEvents";
import { MessageRoutes } from "@/interfaces/routes/MessageRoutes";
import { ContactRoutes } from "@/interfaces/routes/ContactRoutes";
import { TenantRoutes } from "@/interfaces/routes/TenantRoutes";
import { GroupRoutes } from "@/interfaces/routes/GroupRoutes";
import { bootstrapRabbitMQ } from "@/infrastructure/messaging/rabbit/RabbitMQInitApp";
import { startMediaUploadWorker } from "@/workers/mediaUpload.worker";

const PREFIX_SERVICE = "/whatsapp-service";

const fastify = Fastify({ logger: true });

process.on("uncaughtException", (err) => {
  console.error("💥 uncaughtException:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 unhandledRejection:", reason);
});

fastify.register(cors, {
  origin: "*",
});

await fastify.register(HandlerRequest);
await fastify.register(HandlerAuth);

fastify.register(SessionRoutes, { prefix: PREFIX_SERVICE });
fastify.register(MessageRoutes, { prefix: PREFIX_SERVICE });
fastify.register(ContactRoutes, { prefix: PREFIX_SERVICE });
fastify.register(TenantRoutes, { prefix: PREFIX_SERVICE });
fastify.register(GroupRoutes, { prefix: PREFIX_SERVICE });

fastify.get(`${PREFIX_SERVICE}/public/api/v1/status`, async () => {
  return { status: true };
});

fastify.get(`${PREFIX_SERVICE}/public/api/v1/resyncall`, async () => {
  reSyncAllMessagensUseCase.execute().catch((err) => {
    console.error("Erro ao re-sincronizar mensagens:", err);
  });
  return { resync: true };
});

let syncRunning = false;

function startPeriodicSync(intervalMs = 5 * 60 * 1000) {
  setInterval(async () => {
    if (syncRunning) return;
    syncRunning = true;
    try {
      await reSyncAllMessagensUseCase.execute();
    } catch (err) {
      console.error("❌ erro no sync periódico:", err);
    } finally {
      syncRunning = false;
    }
  }, intervalMs);
}

async function start() {
  // sobe API primeiro
  await fastify.listen({ port: 3060, host: "0.0.0.0" });

  try {
    await bootstrapRabbitMQ();

    registerEventHandlers();

    await startMediaUploadWorker();

    const repositorySession = new SessionRepositoryPrisma();

    const sessionBootstrap = new SessionBootstrap(
      baileysConnector,
      repositorySession,
    );

    sessionBootstrap.init().catch((err) => {
      console.error("Erro ao inicializar sessões:", err);
    });

    startPeriodicSync();
  } catch (err) {
    console.error("❌ erro no background init:", err);
  }
}

start();
