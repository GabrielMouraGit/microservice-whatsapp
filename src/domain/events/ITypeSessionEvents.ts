import { WebhookWhatsapp } from "../repositories/IWhatsappAdapter";

export type ITypeSessionEvents = {
  "session.qr.generated": {
    sessionId: string;
    tenantId: string;
    qr: string;
  };

  "session.connected": {
    sessionId: string;
    tenantId: string;
  };

  "session.disconnected": {
    sessionId: string;
    tenantId: string;
  };

  "message.received": {
    sessionId: string;
    tenantId: string;
    data: WebhookWhatsapp | null;
  };

  "message.edited": {
    sessionId: string;
    tenantId: string;
    messageId: string;
    newText: string;
    editedAt: Date;
  };
  "session.logs": {
    sessionId: string;
    tenantId: string;
    eventName: string;
    payload: unknown;
  };
};
