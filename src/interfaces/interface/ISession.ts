import { SessionDTO } from "@/domain/entities/Session";

export interface ISession {
  create(data: {
    name: string;
    descricao: string;
    session_id: string;
    tenant_id: string;
  }): Promise<{ session_id: string }>;
  update(data: {
    id: string;
    name: string;
    descricao: string;
    tenant_id: string;
  }): Promise<void>;
  findById(session_id: string, tenant_id: string): Promise<SessionDTO>;
  newQRCode(session_id: string, tenant_id: string): Promise<{ qr: string }>;
  deleteSession(session_id: string, tenant_id: string): Promise<void>;
  logout(session_id: string, tenant_id: string): Promise<void>;
  findAll(tenant_id: string): Promise<SessionDTO[]>;
  getMyProfile(
    tenant_id: string,
    session_id: string,
  ): Promise<{
    jid: string;
    name: string;
    phone: string;
    profilePicUrl: string;
  }>;
  isConnected(
    tenant_id: string,
    session_id: string,
  ): Promise<{ connected: boolean }>;
}
