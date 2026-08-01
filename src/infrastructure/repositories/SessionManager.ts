import { WASocket } from "@whiskeysockets/baileys";

export class SessionManager {
  private sessions = new Map<string, WASocket>();

  set(sessionId: string, sock: WASocket) {
    this.sessions.set(sessionId, sock);
  }

  get(sessionId: string): WASocket | undefined {
    return this.sessions.get(sessionId);
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  delete(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  entries(): [string, WASocket][] {
    return Array.from(this.sessions.entries());
  }
}
