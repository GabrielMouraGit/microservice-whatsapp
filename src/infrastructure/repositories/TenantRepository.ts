import { Tenant } from "@/domain/entities/Tenant";
import { ITenant } from "@/domain/repositories/ITenant";
import { DomainError } from "@/domain/utils/DomainError";
import { $prismaClient } from "@config/database";

export class TenantRepository implements ITenant {
  constructor() {}

  async register(data: Tenant): Promise<void> {
    try {
      await $prismaClient.tenant.create({
        data: {
          id: data.id,
          name: data.name,
        },
      });
    } catch (err) {
      console.error("ERRO [getMessagesById]", err);
      throw new DomainError("Failed to fetch message by id");
    }
  }
}
