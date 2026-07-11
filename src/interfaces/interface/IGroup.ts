import {
  GroupMetadataResult,
  GroupParticipantUpdateResult,
} from "@/domain/repositories/IWhatsappAdapter";

export interface IGroup {
  createGroup(data: {
    tenant_id: string;
    sessionId: string;
    subject: string;
    participants: string[];
  }): Promise<GroupMetadataResult>;

  addParticipants(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    participants: string[];
  }): Promise<GroupParticipantUpdateResult[]>;

  removeParticipants(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    participants: string[];
  }): Promise<GroupParticipantUpdateResult[]>;

  promoteParticipants(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    participants: string[];
  }): Promise<GroupParticipantUpdateResult[]>;

  demoteParticipants(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    participants: string[];
  }): Promise<GroupParticipantUpdateResult[]>;

  updateSubject(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    subject: string;
  }): Promise<void>;

  updateDescription(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
    description: string;
  }): Promise<void>;

  getMetadata(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
  }): Promise<GroupMetadataResult>;

  getInviteCode(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
  }): Promise<{ inviteCode: string }>;

  revokeInvite(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
  }): Promise<{ inviteCode: string }>;

  joinViaInvite(data: {
    tenant_id: string;
    sessionId: string;
    code: string;
  }): Promise<{ groupJid: string }>;

  leaveGroup(data: {
    tenant_id: string;
    sessionId: string;
    groupJid: string;
  }): Promise<void>;
}
