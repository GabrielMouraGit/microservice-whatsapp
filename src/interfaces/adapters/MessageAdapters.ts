import { FastifyRequest } from "fastify";
import { IMessage } from "../interface/IMessage";

export class MessageAdapters {
  constructor(private controller: IMessage) {}

  async httpSendText(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, text, quoted_id } = request.body as {
      session_id: string;
      number: string;
      text: string;
      quoted_id?: string;
    };

    return await this.controller.sendText({
      sessionId: session_id,
      tenant_id,
      number,
      text,
      quoted_id: quoted_id || "",
    });
  }

  async httpSendImage(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, caption, mimetype, quoted_id } =
      request.body as {
        session_id: string;
        number: string;
        url: string;
        caption: string;
        mimetype: string;
        quoted_id?: string;
      };

    return await this.controller.sendImage({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      caption,
      mimetype,
      quoted_id: quoted_id || "",
    });
  }

  async httpSendVideo(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, caption, mimetype, quoted_id } =
      request.body as {
        session_id: string;
        number: string;
        url: string;
        caption: string;
        mimetype: string;
        quoted_id?: string;
      };

    return await this.controller.sendVideo({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      caption,
      mimetype,
      quoted_id: quoted_id || "",
    });
  }

  async httpSendAudio(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, mimetype, quoted_id } = request.body as {
      session_id: string;
      number: string;
      url: string;
      mimetype: string;
      quoted_id?: string;
    };

    return await this.controller.sendAudio({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      mimetype,
      quoted_id: quoted_id || "",
    });
  }

  async httpSendVoice(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, mimetype, quoted_id } = request.body as {
      session_id: string;
      number: string;
      url: string;
      mimetype: string;
      quoted_id?: string;
    };
    console.log("Received voice message request:", {
      session_id,
      number,
      url,
      mimetype,
      quoted_id,
    });
    return await this.controller.sendVoice({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      mimetype,
      quoted_id: quoted_id || "",
    });
  }

  async httpSendDocument(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, fileName, mimetype, quoted_id,caption } =
      request.body as {
        session_id: string;
        number: string;
        url: string;
        fileName: string;
        mimetype: string;
        caption: string;
        quoted_id?: string;
      };

    return await this.controller.sendDocument({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      fileName,
      mimetype,
      quoted_id: quoted_id || "",
      caption: caption || "",
    });
  }
  async httpDeleteMessage(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const result = request.body as {
      session_id: string;
      number: string;
      message_id: string;
    };

    return await this.controller.deleteMessage({
      messageId: result.message_id,
      number: result.number,
      sessionId: result.session_id,
      tenant_id,
    });
  }
  async httpEditMessage(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const result = request.body as {
      session_id: string;
      number: string;
      message_id: string;
      new_text: string;
    };

    return await this.controller.editMessage({
      messageId: result.message_id,
      number: result.number,
      sessionId: result.session_id,
      newText: result.new_text,
      tenant_id,
    });
  }
  async httpForwardMessage(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const result = request.body as {
      session_id: string;
      number: string;
      message_id: string;
    };

    return await this.controller.forwardMessage({
      messageId: result.message_id,
      number: result.number,
      sessionId: result.session_id,
      tenant_id,
    });
  }

  async httpMarkChatAsRead(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    await this.controller.markChatAsRead({ sessionId: session_id, tenant_id, number });

    return { success: true };
  }

  async httpSendTyping(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    await this.controller.sendTyping({ sessionId: session_id, tenant_id, number });

    return { success: true };
  }

  async httpMarkAsRead(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, message_id } = request.body as {
      session_id: string;
      number: string;
      message_id: string;
    };

    await this.controller.markAsRead({
      sessionId: session_id,
      tenant_id,
      number,
      messageId: message_id,
    });

    return { success: true };
  }

  async httpSendReaction(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, message_id, emoji } = request.body as {
      session_id: string;
      number: string;
      message_id: string;
      emoji: string;
    };

    await this.controller.sendReaction({
      sessionId: session_id,
      tenant_id,
      number,
      messageId: message_id,
      emoji,
    });

    return { success: true };
  }

  async httpRemoveReaction(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, message_id } = request.body as {
      session_id: string;
      number: string;
      message_id: string;
    };

    await this.controller.removeReaction({
      sessionId: session_id,
      tenant_id,
      number,
      messageId: message_id,
    });

    return { success: true };
  }

  async httpStarMessage(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, message_id, from_me, star } =
      request.body as {
        session_id: string;
        number: string;
        message_id: string;
        from_me?: boolean;
        star?: boolean;
      };

    await this.controller.starMessage({
      sessionId: session_id,
      tenant_id,
      number,
      messageId: message_id,
      fromMe: !!from_me,
      star: star ?? true,
    });

    return { success: true };
  }

  async httpPinMessage(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, message_id, pin } = request.body as {
      session_id: string;
      number: string;
      message_id: string;
      pin?: boolean;
    };

    await this.controller.pinMessage({
      sessionId: session_id,
      tenant_id,
      number,
      messageId: message_id,
      pin: pin ?? true,
    });

    return { success: true };
  }

  async httpDeleteMessageForMe(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, message_id, from_me } = request.body as {
      session_id: string;
      number: string;
      message_id: string;
      from_me?: boolean;
    };

    await this.controller.deleteMessageForMe({
      sessionId: session_id,
      tenant_id,
      number,
      messageId: message_id,
      fromMe: !!from_me,
    });

    return { success: true };
  }

  async httpSendRecording(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    await this.controller.sendRecording({
      sessionId: session_id,
      tenant_id,
      number,
    });

    return { success: true };
  }

  async httpSubscribePresence(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    await this.controller.subscribePresence({
      sessionId: session_id,
      tenant_id,
      number,
    });

    return { success: true };
  }

  async httpArchiveChat(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, archive } = request.body as {
      session_id: string;
      number: string;
      archive?: boolean;
    };

    await this.controller.archiveChat({
      sessionId: session_id,
      tenant_id,
      number,
      archive: archive ?? true,
    });

    return { success: true };
  }

  async httpMuteChat(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, duration_ms } = request.body as {
      session_id: string;
      number: string;
      duration_ms?: number | null;
    };

    await this.controller.muteChat({
      sessionId: session_id,
      tenant_id,
      number,
      durationMs: duration_ms ?? null,
    });

    return { success: true };
  }

  async httpDeleteChat(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    await this.controller.deleteChat({
      sessionId: session_id,
      tenant_id,
      number,
    });

    return { success: true };
  }

  async httpClearChat(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    await this.controller.clearChat({
      sessionId: session_id,
      tenant_id,
      number,
    });

    return { success: true };
  }

  async httpSendLocation(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, latitude, longitude, name, address, quoted_id } =
      request.body as {
        session_id: string;
        number: string;
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
        quoted_id?: string;
      };

    return await this.controller.sendLocation({
      sessionId: session_id,
      tenant_id,
      number,
      latitude,
      longitude,
      name,
      address,
      quoted_id,
    });
  }

  async httpSendContactCard(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, display_name, vcard, quoted_id } =
      request.body as {
        session_id: string;
        number: string;
        display_name: string;
        vcard: string;
        quoted_id?: string;
      };

    return await this.controller.sendContactCard({
      sessionId: session_id,
      tenant_id,
      number,
      displayName: display_name,
      vcard,
      quoted_id,
    });
  }

  async httpSendSticker(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, is_animated, quoted_id } =
      request.body as {
        session_id: string;
        number: string;
        url: string;
        is_animated?: boolean;
        quoted_id?: string;
      };

    return await this.controller.sendSticker({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      isAnimated: is_animated,
      quoted_id,
    });
  }

  async httpSendPoll(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, name, values, selectable_count, quoted_id } =
      request.body as {
        session_id: string;
        number: string;
        name: string;
        values: string[];
        selectable_count?: number;
        quoted_id?: string;
      };

    return await this.controller.sendPoll({
      sessionId: session_id,
      tenant_id,
      number,
      name,
      values,
      selectableCount: selectable_count ?? 1,
      quoted_id,
    });
  }
}
