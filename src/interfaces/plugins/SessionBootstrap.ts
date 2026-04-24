import { ISessionRepository } from "@/domain/repositories/ISessionRepository";
import { BaileysConnector } from "@/infrastructure/repositories/Baileys/BaileysConnector";
import fs from "fs";
import path from "path";

export class SessionBootstrap {
  constructor(
    private connector: BaileysConnector,
    private sessionRepository: ISessionRepository,
  ) {}

  async init() {
    const sessionDir = path.resolve("./session");

    if (!fs.existsSync(sessionDir)) {
      console.log("Nenhuma sessão encontrada.");
      return;
    }

    const folders = fs.readdirSync(sessionDir);

    const sessionIds = folders; // fazer prexifo

    console.log("Sessões encontradas:", sessionIds);

    await Promise.all(
      sessionIds.map(async (sessionId) => {
        console.log(`🔄 Subindo sessão ${sessionId}`);

        const session = await this.sessionRepository.findById(sessionId);
        if (!session) return;

        return this.connector.connect(session.id, session.tenant_id);
      }),
    );
  }
}
