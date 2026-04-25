import { MessageEventLoggedEvent } from "../events/EventLog/MessageEventLoggedEvent";
import { MessageEventLogStatusEvent } from "../events/EventLog/MessageEventLogStatusEvent";
import { EventRoot } from "../events/EventRoot";
import { v4 as uuidv4 } from "uuid";

export class EventLog extends EventRoot {
  private _sessionId: string;
  private _tenantId: string;
  private _uuid: string;

  constructor(sessionId: string, tenantId: string) {
    super();
    this._sessionId = sessionId;
    this._tenantId = tenantId;
    this._uuid = uuidv4();
  }

  log(eventName: string, payload: unknown) {
    this.addEvent(
      new MessageEventLoggedEvent(
        this._uuid,
        this._sessionId,
        this._tenantId,
        eventName,
        payload,
      ),
    );
  }

  done() {
    this.addEvent(
      new MessageEventLogStatusEvent(
        this._uuid,
        this._sessionId,
        this._tenantId,
        "done",
      ),
    );
  }

  fail() {
    this.addEvent(
      new MessageEventLogStatusEvent(
        this._uuid,
        this._sessionId,
        this._tenantId,
        "failed",
      ),
    );
  }
}
