import { eventBus } from "container";
import { MessageEventLogRepository } from "@/infrastructure/repositories/MessageEventLogRepository";
import { OnMessageEventLoggedHandler } from "@/application/handlers/log/OnMessageEventLoggedHandler";
import { OnMessageEventStatusChangedHandler } from "@/application/handlers/log/OnMessageEventStatusChangedHandler";

export function registerLogHandlers() {
  const repo = new MessageEventLogRepository();

  const onLogged = new OnMessageEventLoggedHandler(repo);
  const onStatusChanged = new OnMessageEventStatusChangedHandler(repo);

  eventBus.on("message.event.logged", (e) => onLogged.handle(e));

  eventBus.on("message.event.status.changed", (e) => onStatusChanged.handle(e));
}
