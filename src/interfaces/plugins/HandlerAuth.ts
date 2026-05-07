import fp from "fastify-plugin";
import { FastifyReply, FastifyRequest } from "fastify";
import { $config } from "@config/config";

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

  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const isPrivate = request.headers["x-auth-required"] === "true";
      if (!isPrivate) return;

      const gatewaySecret = request.headers["x-gateway-secret"] as string;

      if (gatewaySecret !== $config.GATEWAY_SECRET_AUTH) {
        return reply.status(401).send({
          message: "Unauthorized gateway",
        });
      }

      const tenant_id = request.headers["x-tenant-id"] as string;
      const user_id = request.headers["x-user-id"] as string;

      if (!tenant_id) {
        return reply.status(401).send({
          message: "tenant_id missing",
        });
      }

      request.auth = {
        tenant_id,
        user_id,
      };
    },
  );
});
