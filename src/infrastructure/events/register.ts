import { registerSessionHandlers } from "./session.handlers";
import { registerLogHandlers } from "./log.handlers";

export function registerEventHandlers() {
  console.log("🔥 Registrando todos os handlers...");

  registerSessionHandlers();
  registerLogHandlers();
}
