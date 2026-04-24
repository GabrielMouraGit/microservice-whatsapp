import { FastifyRequest } from "fastify";
import { ISession } from "../interface/ISession";

export class SessionAdapters {
  constructor(private controller: ISession) {}

  async httpCreate(request: FastifyRequest) {
    const tenant_id = "9bdaeaa6-f4fd-4b22-8825-af0141d924cc";
    const { name, descricao } = request.body as {
      name: string;
      descricao: string;
    };

    return await this.controller.create({
      descricao,
      name,
      tenant_id,
    });
  }
  async httpUpdate(request: FastifyRequest) {
    const tenant_id = "9bdaeaa6-f4fd-4b22-8825-af0141d924cc";
    const { descricao, id, name } = request.body as {
      descricao: string;
      id: string;
      name: string;
    };

    return await this.controller.update({
      descricao,
      id,
      name,
      tenant_id,
    });
  }

  async httpFindById(request: FastifyRequest) {
    const tenant_id = "9bdaeaa6-f4fd-4b22-8825-af0141d924cc";
    const { session_id } = request.body as {
      session_id: string;
    };

    return await this.controller.findById(session_id, tenant_id);
  }
  async httpNewQRCode(request: FastifyRequest) {
    const tenant_id = "9bdaeaa6-f4fd-4b22-8825-af0141d924cc";
    const { session_id } = request.body as {
      session_id: string;
    };

    return await this.controller.newQRCode(session_id, tenant_id);
  }
}
