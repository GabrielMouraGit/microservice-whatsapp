import { ISessionRepository } from "@/domain/repositories/ISessionRepository";
import { ISession } from "../interface/ISession";
import { Session, SessionDTO } from "@/domain/entities/Session";
import { v4 as uuidv4 } from "uuid";
import { DomainError } from "@/domain/utils/DomainError";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";

export class SessionController implements ISession {
  constructor(
    private sessionRepository: ISessionRepository,
    private runAdapter: RunAdapterBaileys,
  ) {}

  async create(data: {
    name: string;
    descricao: string;
    tenant_id: string;
  }): Promise<{ session_id: string }> {
    const session = Session.create({
      id: uuidv4(),
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
}
