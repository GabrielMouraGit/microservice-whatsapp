## Why

Today `GET /resyncall` (`ReSyncAllMessagensUseCase`) only reprocesses `MessageEventLog` rows with `status = "pending"`. Rows that ended up `status = "failed"` (raw WhatsApp events that threw during mapping/persist) are never retried by this route, so a class of dropped incoming messages has no recovery path. Separately, there is no way to force a re-publish of recently-received messages to RabbitMQ (`messages.exchange` / `messages.upsert`) for downstream consumers that missed them or need to reprocess (e.g. after a consumer-side bug fix or reindex). Both gaps are addressed by extending the existing resync route rather than adding new infrastructure, since the retry/mapping/publish machinery already exists.

## What Changes

- `ReSyncAllMessagensUseCase` will also pull `MessageEventLog` rows with `status = "failed"` (in addition to the current `pending` ones) and run them through the same mapping/re-emit pipeline used today, so previously-errored inbound events get another chance to be persisted and published.
- After processing pending/failed event logs, the same resync run will additionally fetch, per `session_id`, the last 500 `Message` rows with `from_me = false` (received messages) ordered by `timestamp` descending, and republish each one to `messages.exchange` / `messages.upsert` with the standard `{ message, tenant_id, session_id }` payload — this always runs as part of `/resyncall`, with no new opt-in flag.
- Failures publishing/reprocessing an individual message must not abort the batch; each item is processed independently so one bad record doesn't block the other 499 (or the rest of the failed-event-log batch).

## Capabilities

### New Capabilities
- `message-event-resync`: Defines the resync route's behavior — reprocessing pending and failed `MessageEventLog` rows, and republishing the last 500 received messages per session to RabbitMQ on every resync run.

### Modified Capabilities
(none — no existing spec currently documents `/resyncall`'s behavior)

## Impact

- `src/application/usecase/ReSyncAllMessagensUseCase.ts` — add failed-event-log reprocessing and the last-500-received-messages republish step.
- `src/infrastructure/repositories/MessageEventLogRepository.ts` / `IMessageEventLogRepository.ts` — extend `findPending` (or add a new method) to also return `failed` rows, or add a dedicated `findFailed` method.
- `src/infrastructure/repositories/MessageRepository.ts` / `IMessageRepository.ts` — add a method to fetch the last N received messages (`from_me = false`) per `session_id`.
- `src/infrastructure/messaging/rabbit/RabbitMQPublisher.ts` — reused as-is (`publishExchange("messages.exchange", "messages.upsert", ...)`), no changes expected.
- No HTTP contract change: `GET /resyncall` keeps the same request/response shape; only its internal behavior grows.
