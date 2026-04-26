import Fastify from "fastify";
import cors from "@fastify/cors";
import { baileysConnector } from "container";
import HandlerRequest from "@/interfaces/plugins/HandlerRequest";
import { SessionRoutes } from "@/interfaces/routes/SessionRoutes";
import { SessionBootstrap } from "@/interfaces/plugins/SessionBootstrap";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { registerEventHandlers } from "@/infrastructure/events/RegisterEvents";
import { MessageRoutes } from "@/interfaces/routes/MessageRoutes";

const fastify = Fastify({ logger: true });

fastify.register(cors, {
  origin: "*",
});

await fastify.register(HandlerRequest);

fastify.register(SessionRoutes, { prefix: "/" });
fastify.register(MessageRoutes, { prefix: "/" });

fastify.get("/status", async () => {
  return { status: true };
});

async function start() {
  registerEventHandlers();

  const repositorySession = new SessionRepositoryPrisma();

  const sessionBootstrap = new SessionBootstrap(
    baileysConnector,
    repositorySession,
  );

  // sobe API primeiro
  await fastify.listen({ port: 3060, host: "0.0.0.0" });

  console.log("🚀 API rodando");

  sessionBootstrap.init().catch((err) => {
    console.error("Erro ao inicializar sessões:", err);
  });
}

start();
