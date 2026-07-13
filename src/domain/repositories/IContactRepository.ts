export interface IContactRepository {
  findByPhone(
    tenant_id: string,
    phone: string,
  ): Promise<{ url_photo: string; photo_synced_at: Date | null } | null>;
  upsertPhoto(
    tenant_id: string,
    phone: string,
    name: string,
    url_photo: string,
  ): Promise<void>;
}
