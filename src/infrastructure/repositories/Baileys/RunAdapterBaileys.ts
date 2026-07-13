import { IWhatsappAdapter } from "@/domain/repositories/IWhatsappAdapter";

import { Session } from "@/domain/entities/Session";
import { BaileysRepository } from "./BaileysRepository";

export class RunAdapterBaileys implements IWhatsappAdapter {
  constructor(private repository: BaileysRepository) {}

  async createSession(session: Session) {
    await this.repository.createSession(session.id, session.tenant_id);
  }
  async newQrCode(session: Session) {
    const { qr } = await this.repository.newQrCode(
      session.id,
      session.tenant_id,
    );

    return {
      qr: qr || "",
    };
  }
  async deleteMessage(sessionId: string, number: string, message_id: string) {
    return await this.repository.deleteMessage(sessionId, number, message_id);
  }

  async sendText(
    tenant_id: string,
    sessionId: string,
    number: string,
    text: string,
    quoted_id: string,
  ) {
    return this.repository.sendTextMessage(
      tenant_id,
      sessionId,
      number,
      text,
      quoted_id,
    );
  }
  async sendImage(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    caption: string,
    quoted_id: string,
  ) {
    return this.repository.sendImageMessage(
      sessionId,
      number,
      url,
      mimetype,
      caption,
      quoted_id,
    );
  }
  async sendVideo(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    caption: string,
    quoted_id: string,
  ) {
    return this.repository.sendVideoMessage(
      sessionId,
      number,
      url,
      mimetype,
      caption,
      quoted_id,
    );
  }
  async sendAudio(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    quoted_id?: string,
  ) {
    return this.repository.sendAudioMessage(
      sessionId,
      number,
      url,
      mimetype,
      quoted_id,
    );
  }
  async sendVoice(
    sessionId: string,
    number: string,
    url: string,
    mimetype: string,
    quoted_id: string,
  ) {
    return this.repository.sendVoiceMessage(
      sessionId,
      number,
      url,
      mimetype,
      quoted_id,
    );
  }
  async sendDocument(
    sessionId: string,
    number: string,
    url: string,
    fileName: string,
    mimetype: string,
    quoted_id: string,
    caption: string,
  ) {
    return this.repository.sendDocumentMessage(
      sessionId,
      number,
      url,
      fileName,
      mimetype,
      quoted_id,
      caption,
    );
  }
  async logout(sessionId: string) {
    return this.repository.logout(sessionId);
  }
  async getContact(sessionId: string, number: string, tenant_id: string) {
    return this.repository.getContact(sessionId, number, tenant_id);
  }
  async checkExists(sessionId: string, number: string) {
    return this.repository.checkExists(sessionId, number);
  }
  async getMyProfile(sessionId: string): Promise<{
    jid: string;
    name: string;
    phone: string;
    profilePicUrl: string;
  }> {
    return await this.repository.getMyProfile(sessionId);
  }
  async isConnected(sessionId: string): Promise<{ connected: boolean }> {
    return await this.repository.isConnected(sessionId);
  }
  async editMessage(
    sessionId: string,
    number: string,
    messageId: string,
    newText: string,
  ): Promise<void> {
    await this.repository.editMessage(sessionId, number, messageId, newText);
  }
  async forwardMessage(
    sessionId: string,
    number: string,
    messageId: string,
  ): Promise<void> {
    await this.repository.forwardMessage(sessionId, number, messageId);
  }

  async markChatAsRead(sessionId: string, number: string): Promise<void> {
    await this.repository.markChatAsRead(sessionId, number);
  }

  async sendTyping(sessionId: string, number: string): Promise<void> {
    await this.repository.sendTyping(sessionId, number);
  }

  async markAsRead(
    sessionId: string,
    number: string,
    messageId: string,
  ): Promise<void> {
    await this.repository.markAsRead(sessionId, number, messageId);
  }

  // Reactions
  async sendReaction(
    sessionId: string,
    number: string,
    messageId: string,
    emoji: string,
  ): Promise<void> {
    await this.repository.sendReaction(sessionId, number, messageId, emoji);
  }
  async removeReaction(
    sessionId: string,
    number: string,
    messageId: string,
  ): Promise<void> {
    await this.repository.removeReaction(sessionId, number, messageId);
  }

  // Message actions
  async starMessage(
    sessionId: string,
    number: string,
    messageId: string,
    fromMe: boolean,
    star: boolean,
  ): Promise<void> {
    await this.repository.starMessage(
      sessionId,
      number,
      messageId,
      fromMe,
      star,
    );
  }
  async pinMessage(
    sessionId: string,
    number: string,
    messageId: string,
    pin: boolean,
  ): Promise<void> {
    await this.repository.pinMessage(sessionId, number, messageId, pin);
  }
  async deleteMessageForMe(
    sessionId: string,
    number: string,
    messageId: string,
    fromMe: boolean,
  ): Promise<void> {
    await this.repository.deleteMessageForMe(
      sessionId,
      number,
      messageId,
      fromMe,
    );
  }

  // Presence
  async sendRecording(sessionId: string, number: string): Promise<void> {
    await this.repository.sendRecording(sessionId, number);
  }
  async setOwnPresence(
    sessionId: string,
    presence: "available" | "unavailable",
  ): Promise<void> {
    await this.repository.setOwnPresence(sessionId, presence);
  }
  async subscribePresence(sessionId: string, number: string): Promise<void> {
    await this.repository.subscribePresence(sessionId, number);
  }

  // Chat management
  async archiveChat(
    sessionId: string,
    number: string,
    archive: boolean,
  ): Promise<void> {
    await this.repository.archiveChat(sessionId, number, archive);
  }
  async muteChat(
    sessionId: string,
    number: string,
    durationMs: number | null,
  ): Promise<void> {
    await this.repository.muteChat(sessionId, number, durationMs);
  }
  async deleteChat(sessionId: string, number: string): Promise<void> {
    await this.repository.deleteChat(sessionId, number);
  }
  async clearChat(sessionId: string, number: string): Promise<void> {
    await this.repository.clearChat(sessionId, number);
  }

  // Rich content messages
  async sendLocation(
    sessionId: string,
    number: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
    quoted_id?: string,
  ) {
    return this.repository.sendLocationMessage(
      sessionId,
      number,
      latitude,
      longitude,
      name,
      address,
      quoted_id,
    );
  }
  async sendContactCard(
    sessionId: string,
    number: string,
    displayName: string,
    vcard: string,
    quoted_id?: string,
  ) {
    return this.repository.sendContactMessage(
      sessionId,
      number,
      displayName,
      vcard,
      quoted_id,
    );
  }
  async sendSticker(
    sessionId: string,
    number: string,
    url: string,
    isAnimated?: boolean,
    quoted_id?: string,
  ) {
    return this.repository.sendStickerMessage(
      sessionId,
      number,
      url,
      isAnimated,
      quoted_id,
    );
  }
  async sendPoll(
    sessionId: string,
    number: string,
    name: string,
    values: string[],
    selectableCount: number,
    quoted_id?: string,
  ) {
    return this.repository.sendPollMessage(
      sessionId,
      number,
      name,
      values,
      selectableCount,
      quoted_id,
    );
  }

  // Contact & own-profile management
  async blockContact(sessionId: string, number: string): Promise<void> {
    await this.repository.blockContact(sessionId, number);
  }
  async unblockContact(sessionId: string, number: string): Promise<void> {
    await this.repository.unblockContact(sessionId, number);
  }
  async getContactStatus(sessionId: string, number: string) {
    return this.repository.getContactStatus(sessionId, number);
  }
  async updateProfileName(sessionId: string, name: string): Promise<void> {
    await this.repository.updateProfileName(sessionId, name);
  }
  async updateProfileStatus(sessionId: string, status: string): Promise<void> {
    await this.repository.updateProfileStatus(sessionId, status);
  }
  async updateProfilePicture(sessionId: string, url: string): Promise<void> {
    await this.repository.updateProfilePicture(sessionId, url);
  }
  async removeProfilePicture(sessionId: string): Promise<void> {
    await this.repository.removeProfilePicture(sessionId);
  }

  // Group management
  async createGroup(
    sessionId: string,
    subject: string,
    participantNumbers: string[],
  ) {
    return this.repository.createGroup(sessionId, subject, participantNumbers);
  }
  async addParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ) {
    return this.repository.addParticipants(
      sessionId,
      groupJid,
      participantNumbers,
    );
  }
  async removeParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ) {
    return this.repository.removeParticipants(
      sessionId,
      groupJid,
      participantNumbers,
    );
  }
  async promoteParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ) {
    return this.repository.promoteParticipants(
      sessionId,
      groupJid,
      participantNumbers,
    );
  }
  async demoteParticipants(
    sessionId: string,
    groupJid: string,
    participantNumbers: string[],
  ) {
    return this.repository.demoteParticipants(
      sessionId,
      groupJid,
      participantNumbers,
    );
  }
  async updateGroupSubject(
    sessionId: string,
    groupJid: string,
    subject: string,
  ): Promise<void> {
    await this.repository.updateGroupSubject(sessionId, groupJid, subject);
  }
  async updateGroupDescription(
    sessionId: string,
    groupJid: string,
    description: string,
  ): Promise<void> {
    await this.repository.updateGroupDescription(
      sessionId,
      groupJid,
      description,
    );
  }
  async getGroupMetadata(sessionId: string, groupJid: string) {
    return this.repository.getGroupMetadata(sessionId, groupJid);
  }
  async getGroupInviteCode(sessionId: string, groupJid: string) {
    return this.repository.getGroupInviteCode(sessionId, groupJid);
  }
  async revokeGroupInvite(sessionId: string, groupJid: string) {
    return this.repository.revokeGroupInvite(sessionId, groupJid);
  }
  async joinGroupViaInvite(sessionId: string, code: string) {
    return this.repository.joinGroupViaInvite(sessionId, code);
  }
  async leaveGroup(sessionId: string, groupJid: string): Promise<void> {
    await this.repository.leaveGroup(sessionId, groupJid);
  }
}
