import { FastifyRequest } from "fastify";
import { IContact } from "../interface/IContact";

export class ContactAdapters {
  constructor(private controller: IContact) {}

  async httpGetContact(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    return await this.controller.getContact(tenant_id, session_id, number);
  }
  async httpCheckExists(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    return await this.controller.checkExists(tenant_id, session_id, number);
  }

  async httpBlockContact(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    await this.controller.blockContact(tenant_id, session_id, number);

    return { success: true };
  }

  async httpUnblockContact(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    await this.controller.unblockContact(tenant_id, session_id, number);

    return { success: true };
  }

  async httpGetContactStatus(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, number } = request.body as {
      session_id: string;
      number: string;
    };

    return await this.controller.getContactStatus(
      tenant_id,
      session_id,
      number,
    );
  }
}
