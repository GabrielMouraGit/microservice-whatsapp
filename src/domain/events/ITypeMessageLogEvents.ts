export type ITypeMessageLogEvents = {
  "message.event.logged": {
    uuid: string;
    sessionId: string;
    tenantId: string;
    eventName: string;
    payload: unknown;
  };

  "message.event.status.changed": {
    uuid: string;
    sessionId: string;
    tenantId: string;
    status: "done" | "failed";
  };
};
