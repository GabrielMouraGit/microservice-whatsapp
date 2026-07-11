## Why

Today, once a message exhausts its automatic retries it lands in a dead-letter queue (`messages.queue.dlq`, and — since the recent `resilient-media-upload` change — `media.upload.queue.dlq` too) and stays there forever. There is no code path that reads a DLQ back out; the only way to give a dead-lettered message another chance is to manually inspect and republish it via the RabbitMQ management UI, message by message. The project was checked for any existing reprocess/replay mechanism (`grep` across `src/` for `dlq`/`replay`/`reprocess`) and none exists — only the code that *sends* messages to a DLQ, never anything that drains one. An HTTP endpoint that pulls everything currently sitting in a DLQ and requeues it onto its original queue closes that gap with a single operator action instead of manual per-message republishing.

## What Changes

- Add an HTTP endpoint that drains a dead-letter queue and requeues each message onto its original main queue for a fresh processing attempt, resetting its retry-count header so it gets a full new retry budget rather than going straight back to the DLQ.
- Built generically off `RabbitMQRegistry` (which already maps each main queue to its `dlq`/`retry` config) rather than hardcoded to `messages.queue.dlq`, so the same endpoint also covers `media.upload.queue.dlq` — introduced in the immediately-preceding `resilient-media-upload` change — without duplicating the drain logic per queue.
- Bounded per call (a max batch size) so a very large backlog doesn't turn one HTTP request into an unbounded, long-running operation — callers can invoke it again to continue draining.
- **BREAKING**: none — purely additive; no existing route, queue, or message shape changes.

## Capabilities

### New Capabilities
- `dlq-reprocessing`: The system SHALL provide an operator-triggerable way to drain a dead-letter queue and requeue its messages onto their original queue for another processing attempt, instead of requiring manual per-message republishing via the broker's management UI.

### Modified Capabilities
(none — this is a new, additive operational capability; it does not change the behavior of `resilient-media-delivery` or any existing message-sending requirement)

## Impact

- **Code**:
  - New: a small RabbitMQ helper (e.g. `RabbitMQDlqReprocessor`) that drains a named DLQ via `channel.get()` in a bounded loop, republishing each message onto its main queue with `x-retry-count` reset and `x-reprocessed-at`/`x-reprocessed-count` headers added for traceability.
  - New: a route (following the existing `src/interfaces/routes/*.ts` convention, or the simpler one-off pattern already used for `/whatsapp-service/public/api/v1/resyncall` in `server.ts`) exposing this as an HTTP endpoint, taking which queue to drain and an optional batch-size limit.
- **Config**: none — reuses the existing `RABBITMQ_URL` connection.
- **No Prisma/schema changes.**
- **No changes** to `RabbitMQRegistry`/`RabbitMQBootstrap`/`RabbitMQConsumer` topology or retry/backoff behavior from the `resilient-media-upload` change — this only adds a way to read a DLQ back out, it doesn't touch how messages get into one.
- **Ops**: this endpoint performs a real side-effecting action (re-sends previously-failed jobs, which for `media.upload.queue.dlq` re-attempts a real upload, and for `messages.queue.dlq` re-emits a `message.received` event) — worth confirming with the team whether it needs to be gated beyond the existing gateway-secret mechanism (`HandlerAuth.ts`) before this ships, flagged as a decision in `design.md`.
