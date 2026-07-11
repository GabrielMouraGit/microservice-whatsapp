import { ISessionRepository } from "@/domain/repositories/ISessionRepository";
import { DomainError } from "@/domain/utils/DomainError";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { IGroup } from "../interface/IGroup";

export class GroupController implements IGroup {
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

  async createGroup(params: {
    tenant_id: string;
    sessionId: string;
    subject: string;
    participants: string[];
  }) {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.createGroup(
      params.sessionId,
      params.subject,
      params.participants,
    );
  }

  async addParticipants(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    participants: string[];
  }) {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.addParticipants(
      params.sessionId,
      params.groupJid,
      params.participants,
    );
  }

  async removeParticipants(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    participants: string[];
  }) {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.removeParticipants(
      params.sessionId,
      params.groupJid,
      params.participants,
    );
  }

  async promoteParticipants(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    participants: string[];
  }) {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.promoteParticipants(
      params.sessionId,
      params.groupJid,
      params.participants,
    );
  }

  async demoteParticipants(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    participants: string[];
  }) {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.demoteParticipants(
      params.sessionId,
      params.groupJid,
      params.participants,
    );
  }

  async updateSubject(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    subject: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.updateGroupSubject(
      params.sessionId,
      params.groupJid,
      params.subject,
    );
  }

  async updateDescription(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    description: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.updateGroupDescription(
      params.sessionId,
      params.groupJid,
      params.description,
    );
  }

  async getMetadata(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
  }) {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.getGroupMetadata(
      params.sessionId,
      params.groupJid,
    );
  }

  async getInviteCode(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
  }) {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.getGroupInviteCode(
      params.sessionId,
      params.groupJid,
    );
  }

  async revokeInvite(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
  }) {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.revokeGroupInvite(
      params.sessionId,
      params.groupJid,
    );
  }

  async joinViaInvite(params: {
    tenant_id: string;
    sessionId: string;
    code: string;
  }) {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.joinGroupViaInvite(
      params.sessionId,
      params.code,
    );
  }

  async leaveGroup(params: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.leaveGroup(params.sessionId, params.groupJid);
  }
}
