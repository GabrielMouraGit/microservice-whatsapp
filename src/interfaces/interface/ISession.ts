import { SessionDTO } from "@/domain/entities/Session";

export interface ISession {
  create(data: {
    name: string;
    descricao: string;
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
}
