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

    const { session_id, number, url, caption, quoted_id } = request.body as {
      session_id: string;
      number: string;
      url: string;
      caption: string;
      quoted_id?: string;
    };

    return await this.controller.sendImage({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      caption,
      quoted_id: quoted_id || "",
    });
  }

  async httpSendVideo(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, caption, quoted_id } = request.body as {
      session_id: string;
      number: string;
      url: string;
      caption: string;
      quoted_id?: string;
    };

    return await this.controller.sendVideo({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      caption,
      quoted_id: quoted_id || "",
    });
  }

  async httpSendAudio(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, quoted_id } = request.body as {
      session_id: string;
      number: string;
      url: string;
      quoted_id?: string;
    };

    return await this.controller.sendAudio({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      quoted_id: quoted_id || "",
    });
  }

  async httpSendVoice(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, quoted_id } = request.body as {
      session_id: string;
      number: string;
      url: string;
      quoted_id?: string;
    };

    return await this.controller.sendVoice({
      sessionId: session_id,
      tenant_id,
      number,
      url,
      quoted_id: quoted_id || "",
    });
  }

  async httpSendDocument(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number, url, fileName, mimetype, quoted_id } =
      request.body as {
        session_id: string;
        number: string;
        url: string;
        fileName: string;
        mimetype: string;
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
}
