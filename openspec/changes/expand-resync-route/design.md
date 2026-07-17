## Context

`GET /resyncall` runs `ReSyncAllMessagensUseCase.execute()` (`src/application/usecase/ReSyncAllMessagensUseCase.ts`), both on-demand and every 5 minutes via `startPeriodicSync()` in `server.ts`. Today it does one thing: `messageEventLogRepository.findPending(100)` pulls `MessageEventLog` rows with `status = "pending"`, maps each raw Baileys payload, and re-emits `message.received` (which `OnMessageReceivedHandler` persists to `Message` and publishes to `messages.exchange` / `messages.upsert`).

Two gaps are being closed in the same use case:
1. `MessageEventLog` rows that ended up `status = "failed"` are never retried — `findPending` only ever selects `pending`.
2. There is no way to force RabbitMQ re-delivery of already-persisted `Message` rows (`from_me = false`) for downstream consumers that need to reprocess or missed a delivery.

Both fit naturally into the existing resync flow since it already owns the "replay to RabbitMQ" responsibility; no new route or infrastructure is being introduced.

## Goals / Non-Goals

**Goals:**
- `/resyncall` reprocesses both `pending` and `failed` `MessageEventLog` rows through the existing mapping/re-emit path.
- Every `/resyncall` run also republishes the last 500 received (`from_me = false`) `Message` rows per `session_id` to `messages.exchange` / `messages.upsert`, unconditionally (no opt-in flag).
- A failure on any single event-log row or any single message republish must not stop processing of the rest of the batch.

**Non-Goals:**
- No new HTTP endpoint, request parameter, or response shape — `/resyncall`'s external contract is unchanged.
- No change to how `MessageEventLog.status` transitions during live ingestion (`BaileysConnector`'s `log.done()`/`log.fail()` calls stay as-is).
- No retry-count/backoff bookkeeping is added to `MessageEventLog` — reprocessing failed rows uses the same idempotent mark-processed/mark-failed semantics that already exist.
- Not addressing `/dlq/reprocess` — that route already handles RabbitMQ-level DLQ draining and is out of scope here.

## Decisions

**1. Extend `findPending` to accept `status` filter rather than adding a parallel `findFailed` method.**
`IMessageEventLogRepository.findPending(limit?)` becomes `findPending(limit?, statuses: EventStatus[] = ["pending"])`, and `ReSyncAllMessagensUseCase` calls it once with `["pending", "failed"]`. Keeping one query method (rather than two near-duplicate ones) avoids duplicating the `orderBy created_at asc` / FIFO logic. Alternative considered: separate `findFailed` method — rejected because the use case would need to merge and re-sort two result sets to preserve FIFO ordering across both statuses.

**2. Reprocessing a `failed` row uses the exact same try/catch branch as `pending` today.**
No special-casing by status inside the loop: if it succeeds, `markAsProcessed`; if it throws again, it's simply left in `console.error` (matching current behavior for pending failures) and remains `status = "failed"` — Prisma's own `error` column is not currently written by the use case (only `markAsFailed` sets it, with no message), so this is unchanged. Accepting the risk of a row being retried indefinitely on every periodic resync (see Risks) rather than introducing new retry-count tracking, since that's explicitly out of scope for this change.

**3. Last-500-received-messages is scoped per `session_id`, discovered via `SELECT DISTINCT session_id FROM Message`, not via `BaileysConnector`'s connected-socket list.**
Sessions with a currently-connected socket are not the same set as sessions that have historical received messages — a session could be temporarily disconnected yet still need its last 500 receives republished. Since this step only reads/republishes already-persisted `Message` rows (no live Baileys socket calls, unlike the pending/failed event-log path which may touch `stageAndEnqueueMedia`), no connected socket is required. `IMessageRepository` gains `getDistinctSessionIds(): Promise<string[]>` and `getLastReceivedMessages(sessionId: string, limit: number): Promise<Message[]>` (ordered by `timestamp desc`, `where from_me = false`).

**4. Republish payload matches `OnMessageReceivedHandler` exactly: `{ message: message.toDTO(), tenant_id, session_id }` via `rabbitMQPublisher.publishExchange("messages.exchange", "messages.upsert", ...)`.**
Reuses the existing publisher and routing key so downstream consumers see no difference between a live receive and a resync-triggered republish. `tenant_id` is read off the `Message` row (already stored per-message); no new lookup needed.

**5. Each of the 500-per-session republishes is wrapped in its own try/catch, same pattern as the event-log loop.**
One `publishExchange` failure (e.g. transient RabbitMQ connection issue) must not abort the remaining messages in that session's batch or subsequent sessions' batches.

## Risks / Trade-offs

- **[Risk]** A `MessageEventLog` row that permanently fails to map (e.g. corrupt payload) will be retried every 5 minutes forever, spamming logs → **Mitigation**: none added in this change (explicitly a non-goal); if this becomes a real problem, a follow-up change can add a retry cap or move permanently-broken rows to a dead state.
- **[Risk]** Republishing 500 messages × N sessions on every resync run (including the 5-minute periodic timer) creates recurring RabbitMQ load and duplicate-delivery churn for consumers that already processed those messages → **Mitigation**: consumers of `messages.exchange`/`messages.upsert` must already be idempotent on `message.id` (this is the same guarantee `saveMessage`'s upsert relies on); flagged here so downstream teams are aware resync now causes periodic re-delivery of up to 500 messages per session, not just error cases.
- **[Trade-off]** Discovering sessions via `DISTINCT session_id` on `Message` (potentially a large table scan) instead of an indexed session registry — acceptable given `session_id` should already be indexed for existing per-chat queries, and this runs at most every 5 minutes.

## Migration Plan

No data migration. Deploy is a plain code rollout:
1. Ship repository changes (`findPending` signature, new `IMessageRepository` methods) alongside the use case change in one deploy — both interfaces and the use case must land together since the use case calls the new methods directly.
2. Rollback is a straight revert; no schema change and no persisted state depends on the new behavior.

## Open Questions

- Should the periodic 5-minute `startPeriodicSync()` trigger also run the last-500-received republish every time, or only the on-demand `GET /resyncall` call? This design assumes both, since the proposal says "every resync run" and the periodic timer calls the same `execute()` — flag to the user if the periodic cadence turns out to be too chatty for RabbitMQ/consumers in practice.
