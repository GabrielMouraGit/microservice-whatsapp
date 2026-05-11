import { FastifyInstance } from "fastify";
import { TenantAdapters } from "../adapters/TenantAdapters";
import { TenantRepository } from "@/infrastructure/repositories/TenantRepository";

const repository = new TenantRepository();

const adapters = new TenantAdapters(repository);

export async function TenantRoutes(net: FastifyInstance) {
  net.post(
    "/public/api/v1/tenant/register",
    adapters.httpRegisterTenant.bind(adapters),
  );
}
