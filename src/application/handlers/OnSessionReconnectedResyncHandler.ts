import { ReSyncAllMessagensUseCase } from "@/application/usecase/ReSyncAllMessagensUseCase";

// downtimes curtos (blip de rede, restart normal) não valem o custo de uma
// varredura no banco — só sessões que ficaram fora do ar por um tempo que
// realisticamente poderia ter perdido mensagem entram nesse fluxo
const MIN_DOWNTIME_MS_TO_RESYNC = 5_000;

// mensagens podem ter chegado um pouco antes do close ser detectado (ex.:
// watchdog) ou logo antes do open ser processado — folga pra não deixar
// nenhuma mensagem de borda de fora da janela
const SAFETY_MARGIN_MS = 60_000;

export class OnSessionReconnectedResyncHandler {
  constructor(private reSyncAllMessagensUseCase: ReSyncAllMessagensUseCase) {}

  async handle(event: {
    sessionId: string;
    tenantId: string;
    downtimeMs?: number;
  }) {
    if (!event.downtimeMs || event.downtimeMs < MIN_DOWNTIME_MS_TO_RESYNC) {
      return;
    }

    const since = new Date(Date.now() - event.downtimeMs - SAFETY_MARGIN_MS);

    console.log(
      `🔁 sessão ${event.sessionId}: resync pós-reconexão desde ${since.toISOString()}`,
    );

    try {
      await this.reSyncAllMessagensUseCase.executeForSession(
        event.sessionId,
        since,
      );
    } catch (err) {
      console.error(
        `❌ erro ao sincronizar sessão ${event.sessionId} após reconexão:`,
        err,
      );
    }
  }
}
