import { ISessionRepository } from "@/domain/repositories/ISessionRepository";
import { ISession } from "../interface/ISession";
import { Session, SessionDTO } from "@/domain/entities/Session";
import { DomainError } from "@/domain/utils/DomainError";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";

export class SessionController implements ISession {
  constructor(
    private sessionRepository: ISessionRepository,
    private runAdapter: RunAdapterBaileys,
  ) {}

  async create(data: {
    name: string;
    session_id: string;
    descricao: string;
    tenant_id: string;
  }): Promise<{ session_id: string }> {
    const session = Session.create({
      id: data.session_id,
      name: data.name,
      tenant_id: data.tenant_id,
      descricao: "",
      qrcode: "",
    });

    await this.sessionRepository.create(session);
    await this.runAdapter.createSession(session);

    return {
      session_id: session.id,
    };
  }
  async update(data: {
    id: string;
    name: string;
    descricao: string;
    tenant_id: string;
  }): Promise<void> {
    const session = await this.sessionRepository.findById(data.id);

    if (!session || session.tenant_id != data.tenant_id) {
      throw new DomainError("Session não encontrada");
    }

    session.name = data.name;
    session.descricao = data.descricao;

    return this.sessionRepository.update(session);
  }
  async findById(session_id: string): Promise<SessionDTO> {
    const session = await this.sessionRepository.findById(session_id);

    if (!session) throw new DomainError("Session não encontrada");

    return session.toDTO();
  }

  async newQRCode(
    session_id: string,
    tenant_id: string,
  ): Promise<{ qr: string }> {
    const session = await this.sessionRepository.findById(session_id);

    if (!session || session.tenant_id != tenant_id) {
      throw new DomainError("Session não encontrada");
    }

    return await this.runAdapter.newQrCode(session);
  }
  async deleteSession(session_id: string, tenant_id: string): Promise<void> {
    const session = await this.sessionRepository.findById(session_id);

    if (!session || session.tenant_id != tenant_id) {
      throw new DomainError("Session não encontrada");
    }

    await this.sessionRepository.delete(session.id, tenant_id);
    await this.runAdapter.logout(session.id);
  }
  async logout(session_id: string, tenant_id: string): Promise<void> {
    const session = await this.sessionRepository.findById(session_id);

    if (!session || session.tenant_id != tenant_id) {
      throw new DomainError("Session não encontrada");
    }

    await this.runAdapter.logout(session.id);
  }

  async findAll(tenant_id: string): Promise<SessionDTO[]> {
    const sessions = await this.sessionRepository.findAllByTenant(tenant_id);
    if (!sessions) return [];

    return await sessions.map((s) => s.toDTO());
  }

  async getMyProfile(tenant_id: string, session_id: string) {
    const session = await this.sessionRepository.findById(session_id);

    if (!session || session.tenant_id != tenant_id) {
      throw new DomainError("Session não encontrada");
    }
    return await this.runAdapter.getMyProfile(session.id);
  }

  async isConnected(tenant_id: string, session_id: string) {
    const session = await this.sessionRepository.findById(session_id);

    if (!session || session.tenant_id != tenant_id) {
      throw new DomainError("Session não encontrada");
    }
    return await this.runAdapter.isConnected(session.id);
  }
}
