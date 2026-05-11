import { FastifyRequest } from "fastify";
import { ITenant } from "@/domain/repositories/ITenant";
import { Tenant } from "@/domain/entities/Tenant";

export class TenantAdapters {
  constructor(private repo: ITenant) {}

  async httpRegisterTenant(request: FastifyRequest) {
    const { name, tenant_id } = request.body as {
      name: string;
      tenant_id: string;
    };

    return await this.repo.register(
      Tenant.create({
        id: tenant_id,
        name,
      }),
    );
  }
}
