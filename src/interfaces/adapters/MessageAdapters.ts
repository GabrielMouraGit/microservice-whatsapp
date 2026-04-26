import { FastifyRequest } from "fastify";
import { IMessage } from "../interface/IMessage";

export class MessageAdapters {
  constructor(private controller: IMessage) {}

  async httpSendMessage(request: FastifyRequest) {
    const tenant_id = "9bdaeaa6-f4fd-4b22-8825-af0141d924cc";
    const { session_id, number, text, quoted_id } = request.body as {
      session_id: string;
      number: string;
      text: string;
      quoted_id?: string;
    };

    return await this.controller.sendText({
      sessionId: session_id,
      tenant_id: tenant_id,
      number: number,
      text: text,
      quoted_id: quoted_id || "",
    });
  }
}
