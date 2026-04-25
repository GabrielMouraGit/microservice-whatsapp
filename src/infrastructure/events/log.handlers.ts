import { eventBus } from "container";

export function registerLogHandlers() {
  eventBus.on("message.event.logged", (e) => {
    console.log("🧾 LOG EVENT:", e);
  });

  eventBus.on("message.event.status.changed", (e) => {
    console.log("📌 STATUS EVENT:", e);
  });
}
