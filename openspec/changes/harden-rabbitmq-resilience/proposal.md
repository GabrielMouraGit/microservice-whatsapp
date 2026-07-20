## Why

The service periodically stops receiving/processing WhatsApp messages entirely and only recovers after an operator manually stops RabbitMQ *and* restarts the app — meaning today the system cannot run unattended. Investigation of the RabbitMQ layer (`RabbitMQConnection.ts`, `RabbitMQConsumer.ts`, `RabbitMQPublisher.ts`) plus the code paths that call into it (`BaileysConnector.bindMessages`, `mediaUpload.worker.ts`, `MediaStaging.ts`) found several unbounded waits and a missing broker-flow-control listener that together explain the exact symptom:

- `RabbitMQPublisher.publishQueue`/`publishExchange` `await channel.waitForConfirms()` (`RabbitMQPublisher.ts:19,50`) has no timeout. `OnMessageReceivedHandler.handle()` awaits this synchronously (`OnMessageReceivedHandler.ts:28-36`), and it in turn is awaited, message-by-message, inside `BaileysConnector.bindMessages`'s `messages.upsert` loop (`BaileysConnector.ts:282,327` via `EventBus.emit`'s sequential `for`/`await`, `EventBus.ts:20-22`). One stuck confirm freezes ingestion of every subsequent WhatsApp message, not just RabbitMQ throughput.
- `RabbitMQConnection.ts` never registers `connection.on("blocked"/"unblocked")`. When the broker hits its memory or disk resource alarm (no `vm_memory_high_watermark`/`disk_free_limit` overrides are set in `docker-compose.yml`'s `rabbitmq` service), RabbitMQ stops reading frames on the connection without closing it — the existing `'close'`-driven `reconnect()` logic never fires, there's zero log signal, and the only way out is restarting the broker (clearing the alarm) — this is the piece that best explains why an app-only restart isn't enough.
- `mediaUpload.worker.ts:45` calls `fetch()` to `MICROSERVICE_STORAGE` with no timeout, and `MediaStaging.ts` uses synchronous `fs.readFileSync`/`writeFileSync` inside that same consumer path — both run on the one Node event loop that also owns the shared AMQP connection's heartbeat processing, so a slow storage service or slow disk can starve heartbeats/acks for every queue on the connection, not just media uploads.
- `RabbitMQConsumer.consume()`'s `await handler(...)` (`RabbitMQConsumer.ts:63`) has no timeout either, so any hung handler (e.g. the untimed fetch above) occupies one of that queue's `prefetch(10)` credits indefinitely; after 10 such hangs the queue silently stops delivering.

Git history shows the connection/reconnect state machine itself has already been iterated on multiple times (`8e61239 fix: auto reconnect`, heartbeat lowered from 30s to 10s, consumer-generation restore added) and the bug still recurs — consistent with the remaining root causes being these unbounded waits and the missing blocked/unblocked handling, which none of the prior fixes touched.

## What Changes

- Add a bounded timeout around every RabbitMQ publish-confirm wait (`RabbitMQPublisher.publishQueue`/`publishExchange`, and the retry/DLQ requeue `waitForConfirms()` calls inside `RabbitMQConsumer.consume()`), so a stalled broker or blocked connection can never hang a caller forever. On timeout the channel is force-closed/discarded and a clear error is thrown into the existing catch paths already in place.
- Add a bounded timeout around `await handler(...)` in `RabbitMQConsumer.consume()`, so a hung handler is treated as a normal handler failure (goes through the existing retry/DLQ path) instead of permanently occupying a prefetch credit.
- Register `connection.on("blocked", reason)` / `connection.on("unblocked")` listeners in `RabbitMQConnection.connect()` for visibility, so a broker resource alarm is logged loudly instead of silently stalling every publisher with zero signal.
- Add `AbortSignal.timeout(...)` to the untimed `fetch()` in `mediaUpload.worker.ts` — the same fix already applied to a comparable call in `BaileysRepository.ts` (commit `8bfd56c`).
- Switch `MediaStaging.ts`'s synchronous `fs.readFileSync`/`writeFileSync` to their async equivalents so slow disk I/O can't block the shared event loop (and therefore the shared AMQP connection's heartbeat processing).
- **BREAKING**: none — purely internal hardening; no route, queue, message shape, or public contract changes.

## Capabilities

### New Capabilities
- `rabbitmq-connection-resilience`: The system SHALL bound every RabbitMQ wait (publish confirms, consumer handler execution) with a timeout and SHALL surface broker flow-control (blocked/unblocked) state, so that no single stalled broker interaction can silently and indefinitely stop message ingestion or processing without operator intervention.

### Modified Capabilities
(none — no existing spec in `openspec/specs/` currently documents RabbitMQ connection/consumer behavior; this is new ground)

## Impact

- **Code**:
  - `src/infrastructure/messaging/rabbit/RabbitMQPublisher.ts` — wrap `waitForConfirms()` with a timeout; close/discard the channel on timeout.
  - `src/infrastructure/messaging/rabbit/RabbitMQConsumer.ts` — wrap `handler(...)` and the retry/DLQ `waitForConfirms()` calls with timeouts.
  - `src/infrastructure/messaging/rabbit/RabbitMQConnection.ts` — add `blocked`/`unblocked` listeners on the connection.
  - `src/workers/mediaUpload.worker.ts` — bound the storage-upload `fetch()` with `AbortSignal.timeout(...)`.
  - `src/infrastructure/repositories/Baileys/MediaStaging.ts` — switch to async `fs` calls.
- **Config**: none — reuses `RABBITMQ_URL`; timeout values are new internal constants, not new env vars (matching the existing `MAX_RETRIES`-as-constant convention in `RabbitMQConsumer.ts`).
- **No Prisma/schema changes. No HTTP contract changes.**
- **Ops**: flags, as an Open Question in `design.md`, whether the RabbitMQ broker's memory/disk alarm thresholds (dev: `docker-compose.yml`'s `rabbitmq` service has no overrides; prod: external broker, not in this repo) should also be tuned/monitored — the code-level timeouts prevent indefinite hangs regardless, but don't remove the alarm as an underlying trigger worth checking operationally.
