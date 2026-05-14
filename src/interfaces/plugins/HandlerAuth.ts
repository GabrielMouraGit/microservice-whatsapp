import fp from "fastify-plugin";
import { FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    auth: {
      tenant_id: string;
      user_id: string;
    };
  }
}

export default fp(async function (fastify) {
  fastify.decorateRequest("auth");

  fastify.addHook("preHandler", async (request: FastifyRequest) => {
    const tenant_id = request.headers["x-tenant-id"] as string;
    const user_id = request.headers["x-user-id"] as string;

    request.auth = {
      tenant_id,
      user_id,
    };
  });
});
