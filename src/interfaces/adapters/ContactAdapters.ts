import { FastifyRequest } from "fastify";
import { IContact } from "../interface/IContact";

export class ContactAdapters {
  constructor(private controller: IContact) {}

  async httpGetContact(request: FastifyRequest) {
    const tenant_id = "9bdaeaa6-f4fd-4b22-8825-af0141d924cc";
    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    return await this.controller.getContact(tenant_id, session_id, number);
  }
  async httpCheckExists(request: FastifyRequest) {
    const tenant_id = "9bdaeaa6-f4fd-4b22-8825-af0141d924cc";
    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    return await this.controller.checkExists(tenant_id, session_id, number);
  }
}
