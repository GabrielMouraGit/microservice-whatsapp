import { IContactRepository } from "@/domain/repositories/IContactRepository";
import { $prismaClient } from "@config/database";

export class ContactRepositoryPrisma implements IContactRepository {
  async findByPhone(
    tenant_id: string,
    phone: string,
  ): Promise<{ url_photo: string; photo_synced_at: Date | null } | null> {
    const contact = await $prismaClient.contact.findUnique({
      where: { tenant_id_phone: { tenant_id, phone } },
    });

    if (!contact?.url_photo) return null;

    return {
      url_photo: contact.url_photo,
      photo_synced_at: contact.photo_synced_at,
    };
  }

  async upsertPhoto(
    tenant_id: string,
    phone: string,
    name: string,
    url_photo: string,
  ): Promise<void> {
    const photo_synced_at = new Date();

    await $prismaClient.contact.upsert({
      where: { tenant_id_phone: { tenant_id, phone } },
      create: { tenant_id, phone, name, url_photo, photo_synced_at },
      update: { name, url_photo, photo_synced_at },
    });
  }
}
