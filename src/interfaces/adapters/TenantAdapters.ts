import { FastifyRequest } from "fastify";
import { ITenant } from "@/domain/repositories/ITenant";
import { Tenant } from "@/domain/entities/Tenant";

export class TenantAdapters {
  constructor(private repo: ITenant) {}

  async httpRegisterTenant(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { name } = request.body as {
      name: string;
    };

    return await this.repo.register(
      Tenant.create({
        id: tenant_id,
        name,
      }),
    );
  }
}
