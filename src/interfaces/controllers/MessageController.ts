import { ISessionRepository } from "@/domain/repositories/ISessionRepository";
import { DomainError } from "@/domain/utils/DomainError";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { IMessage } from "../interface/IMessage";

export class MessageController implements IMessage {
  constructor(
    private sessionRepository: ISessionRepository,
    private runAdapter: RunAdapterBaileys,
  ) {}

  async sendText(data: {
    tenant_id: string;
    sessionId: string;
    number: string;
    text: string;
    quoted_id: string;
  }): Promise<void> {
    const session = await this.sessionRepository.findById(data.sessionId);

    if (!session || session.tenant_id != data.tenant_id) {
      throw new DomainError("Session não encontrada");
    }

    await this.runAdapter.sendText(
      data.tenant_id,
      data.sessionId,
      data.number,
      data.text,
      data.quoted_id,
    );
  }
}
