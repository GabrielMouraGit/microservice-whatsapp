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
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendText(
      params.tenant_id,
      params.sessionId,
      params.number,
      params.text,
      params.quoted_id,
    );
  }
  async deleteMessage(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.deleteMessage(
      params.sessionId,
      params.number,
      params.messageId,
    );
  }

  async sendImage(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    mimetype: string;
    caption: string;
    quoted_id: string;
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendImage(
      params.sessionId,
      params.number,
      params.url,
      params.mimetype,
      params.caption,
      params.quoted_id,
    );
  }

  async sendVideo(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    mimetype: string;
    caption: string;
    quoted_id: string;
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendVideo(
      params.sessionId,
      params.number,
      params.url,
      params.mimetype,
      params.caption,
      params.quoted_id,
    );
  }

  async sendAudio(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    mimetype: string;
    quoted_id?: string;
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendAudio(
      params.sessionId,
      params.number,
      params.url,
      params.mimetype,
      params.quoted_id,
    );
  }

  async sendVoice(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    mimetype: string;
    url: string;
    quoted_id: string;
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendVoice(
      params.sessionId,
      params.number,
      params.url,
      params.mimetype,
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
    caption: string;
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendDocument(
      params.sessionId,
      params.number,
      params.url,
      params.fileName,
      params.mimetype,
      params.quoted_id,
      params.caption,
    );
  }

  async editMessage(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    newText: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.editMessage(
      params.sessionId,
      params.number,
      params.messageId,
      params.newText,
    );
  }
  async forwardMessage(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.forwardMessage(
      params.sessionId,
      params.number,
      params.messageId,
    );
  }

  async markChatAsRead(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.markChatAsRead(params.sessionId, params.number);
  }

  async sendTyping(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.sendTyping(params.sessionId, params.number);
  }

  async markAsRead(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.markAsRead(
      params.sessionId,
      params.number,
      params.messageId,
    );
  }

  async sendReaction(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    emoji: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.sendReaction(
      params.sessionId,
      params.number,
      params.messageId,
      params.emoji,
    );
  }

  async removeReaction(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.removeReaction(
      params.sessionId,
      params.number,
      params.messageId,
    );
  }

  async starMessage(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    fromMe: boolean;
    star: boolean;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.starMessage(
      params.sessionId,
      params.number,
      params.messageId,
      params.fromMe,
      params.star,
    );
  }

  async pinMessage(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    pin: boolean;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.pinMessage(
      params.sessionId,
      params.number,
      params.messageId,
      params.pin,
    );
  }

  async deleteMessageForMe(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    messageId: string;
    fromMe: boolean;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.deleteMessageForMe(
      params.sessionId,
      params.number,
      params.messageId,
      params.fromMe,
    );
  }

  async sendRecording(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.sendRecording(params.sessionId, params.number);
  }

  async subscribePresence(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.subscribePresence(params.sessionId, params.number);
  }

  async archiveChat(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    archive: boolean;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.archiveChat(
      params.sessionId,
      params.number,
      params.archive,
    );
  }

  async muteChat(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    durationMs: number | null;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.muteChat(
      params.sessionId,
      params.number,
      params.durationMs,
    );
  }

  async deleteChat(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.deleteChat(params.sessionId, params.number);
  }

  async clearChat(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
  }): Promise<void> {
    await this.validateSession(params.tenant_id, params.sessionId);

    await this.runAdapter.clearChat(params.sessionId, params.number);
  }

  async sendLocation(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    quoted_id?: string;
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendLocation(
      params.sessionId,
      params.number,
      params.latitude,
      params.longitude,
      params.name,
      params.address,
      params.quoted_id,
    );
  }

  async sendContactCard(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    displayName: string;
    vcard: string;
    quoted_id?: string;
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendContactCard(
      params.sessionId,
      params.number,
      params.displayName,
      params.vcard,
      params.quoted_id,
    );
  }

  async sendSticker(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    url: string;
    isAnimated?: boolean;
    quoted_id?: string;
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendSticker(
      params.sessionId,
      params.number,
      params.url,
      params.isAnimated,
      params.quoted_id,
    );
  }

  async sendPoll(params: {
    tenant_id: string;
    sessionId: string;
    number: string;
    name: string;
    values: string[];
    selectableCount: number;
    quoted_id?: string;
  }): Promise<{ message_id: string }> {
    await this.validateSession(params.tenant_id, params.sessionId);

    return await this.runAdapter.sendPoll(
      params.sessionId,
      params.number,
      params.name,
      params.values,
      params.selectableCount,
      params.quoted_id,
    );
  }
}
