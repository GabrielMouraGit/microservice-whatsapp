import { WAMessage } from "@whiskeysockets/baileys";

export type ITypeMessageLogEvents = {
  "message.event.logged": {
    uuid: string;
    sessionId: string;
    tenantId: string;
    eventName: string;
    payload: WAMessage;
    name: string;
  };

  "message.event.status.changed": {
    uuid: string;
    sessionId: string;
    tenantId: string;
    status: "processed" | "failed";
    name: string;
  };
};
