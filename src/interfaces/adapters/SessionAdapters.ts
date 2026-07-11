import { FastifyRequest } from "fastify";
import { ISession } from "../interface/ISession";

export class SessionAdapters {
  constructor(private controller: ISession) {}

  async httpCreate(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { name, descricao, session_id } = request.body as {
      name: string;
      session_id: string;
      descricao: string;
    };

    return await this.controller.create({
      descricao,
      session_id,
      name,
      tenant_id,
    });
  }
  async httpUpdate(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

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
    const tenant_id = request.auth.tenant_id;

    const { session_id } = request.body as {
      session_id: string;
    };

    return await this.controller.findById(session_id, tenant_id);
  }
  async httpNewQRCode(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id } = request.body as {
      session_id: string;
    };

    return await this.controller.newQRCode(session_id, tenant_id);
  }
  async httpLogout(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id } = request.body as {
      session_id: string;
    };

    return await this.controller.logout(session_id, tenant_id);
  }
  async httpDeleteSession(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id } = request.body as {
      session_id: string;
    };

    return await this.controller.deleteSession(session_id, tenant_id);
  }
  async httpAllSession(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    return await this.controller.findAll(tenant_id);
  }
  async httpGetMyProfile(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id } = request.body as {
      session_id: string;
    };

    return await this.controller.getMyProfile(tenant_id, session_id);
  }
  async httpIsConnected(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id } = request.body as {
      session_id: string;
    };

    return await this.controller.isConnected(tenant_id, session_id);
  }

  async httpSetPresence(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, presence } = request.body as {
      session_id: string;
      presence: "available" | "unavailable";
    };

    await this.controller.setPresence(tenant_id, session_id, presence);

    return { success: true };
  }

  async httpUpdateProfileName(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, name } = request.body as {
      session_id: string;
      name: string;
    };

    await this.controller.updateProfileName(tenant_id, session_id, name);

    return { success: true };
  }

  async httpUpdateProfileStatus(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, status } = request.body as {
      session_id: string;
      status: string;
    };

    await this.controller.updateProfileStatus(tenant_id, session_id, status);

    return { success: true };
  }

  async httpUpdateProfilePicture(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id, url } = request.body as {
      session_id: string;
      url: string;
    };

    await this.controller.updateProfilePicture(tenant_id, session_id, url);

    return { success: true };
  }

  async httpRemoveProfilePicture(request: FastifyRequest) {
    const tenant_id = request.auth.tenant_id;

    const { session_id } = request.body as {
      session_id: string;
    };

    await this.controller.removeProfilePicture(tenant_id, session_id);

    return { success: true };
  }
}
