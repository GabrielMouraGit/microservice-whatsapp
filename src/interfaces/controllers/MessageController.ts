import { ISessionRepository } from "@/domain/repositories/ISessionRepository";
import { DomainError } from "@/domain/utils/DomainError";
import { RunAdapterBaileys } from "@/infrastructure/repositories/Baileys/RunAdapterBaileys";
import { IMessage } from "../interface/IMessage";

export class MessageController implements IMessage {
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

  async sendText(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    text: string;
    quoted_id: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendText(
      params.tenant_id,
      params.sessionId,
      params.number,
      params.text,
      params.quoted_id,
    );
  }

  async sendImage(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    caption: string;
    quoted_id: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendImage(
      params.sessionId,
      params.number,
      params.url,
      params.caption,
      params.quoted_id,
    );
  }

  async sendVideo(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    caption: string;
    quoted_id: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendVideo(
      params.sessionId,
      params.number,
      params.url,
      params.caption,
      params.quoted_id,
    );
  }

  async sendAudio(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    quoted_id?: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendAudio(
      params.sessionId,
      params.number,
      params.url,
      params.quoted_id,
    );
  }

  async sendVoice(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    quoted_id: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendVoice(
      params.sessionId,
      params.number,
      params.url,
      params.quoted_id,
    );
  }

  async sendDocument(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    fileName: string;
    mimetype: string;
    quoted_id: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendDocument(
      params.sessionId,
      params.number,
      params.url,
      params.fileName,
      params.mimetype,
      params.quoted_id,
    );
  }
}
