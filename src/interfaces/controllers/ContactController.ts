import { ISessionRepository } from "@/domain/repositories/ISessionRepository";
import { DomainError } from "@/domain/utils/DomainError";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { IContact } from "../interface/IContact";

export class ContactController implements IContact {
  constructor(
    private sessionRepository: ISessionRepository,
    private runAdapter: RunAdapterBaileys,
  ) {}

  private async validateSession(tenant_id: string, sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session || session.tenant_id !== tenant_id) {
      throw new DomainError("Session não encontrada");
    }
  }

  async getContact(
    tenant_id: string,
    sessionId: string,
    number: string,
  ): Promise<{
    jid: string;
    name: string;
    exists: boolean;
    profilePicUrl: string;
  }> {
    await this.validateSession(tenant_id, sessionId);

    return await this.runAdapter.getContact(sessionId, number);
  }
  async checkExists(
    tenant_id: string,
    sessionId: string,
    number: string,
  ): Promise<{
    exists: boolean;
  }> {
    await this.validateSession(tenant_id, sessionId);

    return await this.runAdapter.checkExists(sessionId, number);
  }
}
