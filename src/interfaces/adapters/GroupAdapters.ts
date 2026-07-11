import { FastifyRequest } from "fastify";
import { IGroup } from "../interface/IGroup";

export class GroupAdapters {
  constructor(private controller: IGroup) {}

  async httpCreateGroup(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, subject, participants } = request.body as {
      session_id: string;
      subject: string;
      participants: string[];
    };

    return await this.controller.createGroup({
      sessionId: session_id,
      tenant_id,
      subject,
      participants,
    });
  }

  async httpAddParticipants(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid, participants } = request.body as {
      session_id: string;
      group_jid: string;
      participants: string[];
    };

    return await this.controller.addParticipants({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
      participants,
    });
  }

  async httpRemoveParticipants(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid, participants } = request.body as {
      session_id: string;
      group_jid: string;
      participants: string[];
    };

    return await this.controller.removeParticipants({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
      participants,
    });
  }

  async httpPromoteParticipants(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid, participants } = request.body as {
      session_id: string;
      group_jid: string;
      participants: string[];
    };

    return await this.controller.promoteParticipants({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
      participants,
    });
  }

  async httpDemoteParticipants(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid, participants } = request.body as {
      session_id: string;
      group_jid: string;
      participants: string[];
    };

    return await this.controller.demoteParticipants({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
      participants,
    });
  }

  async httpUpdateSubject(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid, subject } = request.body as {
      session_id: string;
      group_jid: string;
      subject: string;
    };

    await this.controller.updateSubject({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
      subject,
    });

    return { success: true };
  }

  async httpUpdateDescription(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid, description } = request.body as {
      session_id: string;
      group_jid: string;
      description: string;
    };

    await this.controller.updateDescription({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
      description,
    });

    return { success: true };
  }

  async httpGetMetadata(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid } = request.body as {
      session_id: string;
      group_jid: string;
    };

    return await this.controller.getMetadata({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
    });
  }

  async httpGetInviteCode(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid } = request.body as {
      session_id: string;
      group_jid: string;
    };

    return await this.controller.getInviteCode({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
    });
  }

  async httpRevokeInvite(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid } = request.body as {
      session_id: string;
      group_jid: string;
    };

    return await this.controller.revokeInvite({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
    });
  }

  async httpJoinViaInvite(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, code } = request.body as {
      session_id: string;
      code: string;
    };

    return await this.controller.joinViaInvite({
      sessionId: session_id,
      tenant_id,
      code,
    });
  }

  async httpLeaveGroup(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, group_jid } = request.body as {
      session_id: string;
      group_jid: string;
    };

    await this.controller.leaveGroup({
      sessionId: session_id,
      tenant_id,
      groupJid: group_jid,
    });

    return { success: true };
  }
}
