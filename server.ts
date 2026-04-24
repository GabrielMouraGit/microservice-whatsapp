import Fastify from "fastify";
import cors from "@fastify/cors";
import HandlerRequest from "@/interfaces/plugins/HandlerRequest";
import { SessionRoutes } from "@/interfaces/routes/SessionRoutes";
import { SessionBootstrap } from "@/interfaces/plugins/SessionBootstrap";
import { SessionRepositoryPrisma } from "@/infrastructure/repositories/SessionRepositoryPrisma";
import { baileysConnector } from "container";

const fastify = Fastify({ logger: true });

fastify.register(cors, {
  origin: "*",
});

await fastify.register(HandlerRequest);

fastify.register(SessionRoutes, { prefix: "/" });
fastify.get("/status", async () => {
  return { status: true };
});

async function start() {
  const repositorySession = new SessionRepositoryPrisma();

  const sessionBootstrap = new SessionBootstrap(
    baileysConnector,
    repositorySession,
  );

  // sobe API primeiro
  await fastify.listen({ port: 3060, host: "0.0.0.0" });

  console.log("🚀 API rodando");

  // roda bootstrap em background (não bloqueia API)
  sessionBootstrap.init().catch((err) => {
    console.error("Erro ao inicializar sessões:", err);
  });
}

start();
