import { registerLogHandlers } from "./implementation/log.handlers";
import { registerSessionHandlers } from "./implementation/session.handlers";

export function registerEventHandlers() {
  console.log("🔥 Registrando todos os handlers...");

  registerSessionHandlers();
  registerLogHandlers();
}
