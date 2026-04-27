export interface IContact {
  getContact(
    tenant_id: string,
    sessionId: string,
    number: string,
  ): Promise<{
    jid: string;
    name: string;
    exists: boolean;
    profilePicUrl: string;
  }>;
  checkExists(
    tenant_id: string,
    sessionId: string,
    number: string,
  ): Promise<{ exists: boolean }>;
}
