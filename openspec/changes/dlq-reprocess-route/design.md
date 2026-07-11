## Context

`RabbitMQRegistry.ts` currently defines two main queues, each with a retry queue and a DLQ: `messages.queue` → `messages.queue.retry` → `messages.queue.dlq`, and (from the recent `resilient-media-upload` change) `media.upload.queue` → `media.upload.queue.retry` → `media.upload.queue.dlq`. `RabbitMQConsumer.consume()` already implements the send-to-DLQ side (`channel.sendToQueue(`${queue}.dlq`, ...)` once retries are exhausted) but nothing in the codebase ever reads a DLQ back out — messages that land there stay there permanently, discoverable only via the RabbitMQ management UI (exposed at `:15672` in `docker-compose.yml`), and replayable today only by manually re-publishing each one by hand through that UI.

Worth noting for this design: `messages.queue` has no in-process consumer in this repo today — `src/workers/messagesUpsert.worker.ts` references it but is dead code (never started by any entrypoint, confirmed while building the `resilient-media-upload` change). Live WhatsApp messages are handled directly in-process (`BaileysConnector` → `eventBus` → `OnMessageReceivedHandler`), which then *publishes* to `messages.exchange`/`messages.queue` as a fan-out for external consumers (other services in this multi-repo system, e.g. `whatsapp-manager`). This means "reprocessing" a `messages.queue.dlq` message doesn't require this repo to do anything with the message's content — it only needs to put the message back on `messages.queue` so whichever consumer(s) exist (in this repo or elsewhere) get another delivery attempt. `media.upload.queue`, by contrast, *is* consumed in-process by `src/workers/mediaUpload.worker.ts`, so reprocessing a `media.upload.queue.dlq` message causes a real, immediate re-attempt of the storage upload.

## Goals / Non-Goals

**Goals:**
- Provide a single operator action (HTTP call) that drains all messages currently sitting in a given DLQ and puts them back on their original main queue for a fresh attempt, instead of manual per-message republishing via the management UI.
- Reset each message's retry-count header when requeuing, so it gets a full new retry budget (including, for `media.upload.queue.dlq`, the exponential backoff schedule from scratch) rather than immediately bouncing back to the DLQ because it already looks "at max retries."
- Work generically off `RabbitMQRegistry`'s existing `dlq`/`routingKey` mapping, so both `messages.queue.dlq` and `media.upload.queue.dlq` are covered by the same code path — and any DLQ added to the registry in the future is automatically supported with no extra work.
- Bound the amount of work a single call can do, so draining a large backlog can't turn one HTTP request into an unbounded operation.

**Non-Goals:**
- A UI for browsing/inspecting DLQ contents before deciding to reprocess — the RabbitMQ management UI already provides that; this change only adds the "put it back" action.
- Selective reprocessing (e.g. "only messages matching X tenant" or "only this one message ID") — out of scope for this change; it drains whatever is currently in the queue, oldest-first (AMQP queue order), up to the batch limit.
- Automatic/scheduled reprocessing (e.g. a cron that retries the DLQ periodically) — this is an explicit, operator-triggered action only.
- Changing anything about how messages *get into* a DLQ (retry counts, backoff, topology) — that's the `resilient-media-upload` change; this one only reads a DLQ back out.

## Decisions

**1. Drain via `channel.get()` in a count-bounded loop, not `channel.consume()`.**
`consume()` is a long-lived subscription meant for continuous processing; this operation is a one-shot "take what's there right now" action triggered by an HTTP request. `channel.get(queue, { noAck: false })` pulls a single message on demand and returns `false` when the queue is empty, which maps directly onto "process everything currently in the queue, then stop" without needing to manage a subscription lifecycle. To bound the work, first call `channel.checkQueue(dlq)` to read the current `messageCount`, then loop `Math.min(messageCount, batchLimit)` times — this also means messages arriving in the DLQ *during* the drain (a concurrent failure) are not swept up in the same run, which is the correct, predictable boundary for an operator-triggered action.

**2. Reset `x-retry-count` to 0 on requeue; add `x-reprocessed-count` and `x-reprocessed-at` headers instead of overwriting history.**
Without resetting the count, a message that hit `messages.queue`'s `maxRetries` (or `media.upload.queue`'s) would immediately fail its very first attempt after being requeued and go straight back to the DLQ, defeating the purpose. `x-reprocessed-count` (incremented each time this endpoint touches the message) and `x-reprocessed-at` (timestamp) are added so a message that has been manually reprocessed multiple times and keeps failing is distinguishable in the DLQ from one seeing its first-ever failure — useful operational signal without adding new infrastructure.

**3. Generic `RabbitMQDlqReprocessor`, parameterized by main-queue name, looked up from `RabbitMQRegistry` — not one handler per queue.**
The registry already has everything needed: given a main queue name, `RabbitMQRegistry.flatMap(ex => ex.queues).find(q => q.name === queue)` yields its `dlq.queue` and `routingKey`. A single reprocessor class takes a main-queue name, resolves its DLQ from the registry, and republishes onto the main queue by name (`channel.sendToQueue`, matching how `RabbitMQConsumer` already retries — not via the exchange/routing key, consistent with the existing retry-to-main-queue mechanism). This means supporting `media.upload.queue.dlq` alongside `messages.queue.dlq` costs nothing beyond the registry entry that already exists — no per-queue code.
Alternative considered: hardcode the endpoint to `messages.queue.dlq` only, per the literal request. Rejected: the registry-driven approach is barely more code (a lookup instead of a string literal) and this repo now has two DLQs after the immediately-preceding change, so a hardcoded version would need near-identical duplicate code the moment `media.upload.queue.dlq` needed the same treatment — reasonably foreseeable, not speculative gold-plating.

**4. Route accepts a `queue` (main queue name, e.g. `messages.queue` or `media.upload.queue`) and optional `limit`, defaulting `queue` to `messages.queue` and `limit` to a fixed cap (e.g. 500).**
Matches the literal request (reprocess `messages.queue.dlq` with no params needed) while making the media DLQ reachable via the same endpoint (`?queue=media.upload.queue`). The default cap keeps a single call from draining an enormous backlog in one HTTP request/response cycle; callers needing to drain more just call again.

**5. Route placement: a small dedicated route registered in `server.ts`, mirroring the existing one-off `/whatsapp-service/public/api/v1/resyncall` endpoint — not a full Controller/Adapter chain.**
This is an operational/infrastructure action, not a tenant-scoped WhatsApp business action (unlike everything in `MessageRoutes.ts`/`MessageController.ts`, which validates `session.tenant_id === request.auth.tenant_id`). It doesn't belong to a single tenant or session, so the existing Controller/Adapter/UseCase layering (built around per-session, per-tenant actions) doesn't fit naturally. `/resyncall` already established the precedent of a plain route handler defined directly in `server.ts` for this kind of whole-service operational action.

## Risks / Trade-offs

- [Reprocessing `media.upload.queue.dlq` re-attempts a real storage upload immediately — if the storage microservice is still down, requeued messages fail once and land back in the DLQ right away] → Accepted: this mirrors exactly what a human manually republishing via the management UI would get; the endpoint is meant to be used once the underlying problem (e.g. storage outage) is believed to be resolved.
- [No auth beyond the existing gateway-secret mechanism, which isn't yet enforced end-to-end for this service — see the `harden-tenant-gateway-trust` change] → Flagged as an Open Question below; this is a real side-effecting operational endpoint and deserves an explicit decision before shipping, not a silent default.
- [Draining is not transactional across the batch — if the process crashes mid-drain, some messages have already been moved to the main queue and acked off the DLQ, others haven't] → Accepted: each individual message's move (publish-with-confirm, then ack the DLQ read) is atomic per-message; a mid-batch crash simply means "some were reprocessed, the rest are still in the DLQ, call it again" — no message is ever lost or duplicated within a single move.
- [Concurrent invocations of the endpoint could both drain the same messages] → Accepted for this change: not addressed, documented as an Open Question. Expected usage is a manual, occasional operator action, not concurrent automated calls.

## Migration Plan

1. Add `RabbitMQDlqReprocessor` (or equivalent) alongside the existing `src/infrastructure/messaging/rabbit/` files, implementing the count-bounded `channel.get()` drain-and-republish loop described in Decisions 1–3.
2. Add the route (Decision 5), wired in `server.ts` next to the existing `/resyncall` endpoint.
3. Deploy: fully additive, no topology or existing-route changes — safe to ship independently of anything else.
4. Rollback: remove the route/module; no data migration involved, no messages are put in a state only this code understands (they're just sitting in a DLQ, same as before this change existed).

## Open Questions

- Should this endpoint require something stronger than the current (not-yet-enforced) gateway-secret mechanism, given it's a side-effecting operational action reachable by anyone who can reach this service directly? Needs an explicit answer before shipping to production.
- Is a fixed default batch limit (e.g. 500) the right number, or should it be configurable via env/config like other operational knobs in this service?
- Should concurrent calls to this endpoint be guarded against (e.g. a simple in-process lock), or is that unnecessary given expected manual, occasional usage?
