## Context

`BaileysConnector.bindMessages` handles every `messages.upsert` event from Baileys in a single `for` loop, awaiting each message in turn (`BaileysConnector.ts:238-276`). For media messages it calls `uploadMessageMedia`, which:

1. Downloads and decrypts the buffer via `downloadMediaMessage` (with `reuploadRequest: sock.updateMediaMessage` so Baileys itself refreshes the WhatsApp CDN link if needed — this part is already reasonably resilient).
2. Immediately `fetch`es the buffer as multipart form data to `${MICROSERVICE_STORAGE}/storage/api/v1/file/add-item`.
3. On any error (network, non-2xx, timeout) the `catch` swallows it and returns `{ url: "" }`.

`BaileysToWhatpyMapper.map` only attaches an image/video/audio/document/sticker block `if (url)` is truthy. A pure-media message with no url maps to `null`, and `bindMessages` does `if (!mapped) continue` — the message is dropped before `messageRepo.saveMessage` or any RabbitMQ publish. Nothing is logged as a durable failure (`EventLog.fail()` is only called from the outer `catch`, which the swallowed error never reaches), so today a storage-service blip causes **silent, untraceable data loss**, exactly when the user is trying to send/receive a photo or voice note.

Separately, this service already has a full RabbitMQ retry/DLQ topology in production use for `messages.exchange` → `messages.queue` (`RabbitMQRegistry.ts`, `RabbitMQBootstrap.ts`, `RabbitMQConnection.ts`, `RabbitMQConsumer.ts`), plus a dedicated worker pattern (`src/workers/messagesUpsert.worker.ts`) that consumes durably or requeues to `.retry`/`.dlq` based on a retry-count header. `RABBITMQ_URL` is already configured and connected with auto-reconnect (`RabbitMQConnection.connect`/`reconnect`). This design reuses that exact infrastructure for the storage upload step rather than inventing a new one.

## Goals / Non-Goals

**Goals:**
- No photo/audio/video/document/sticker is ever silently dropped because the storage microservice was unreachable at the moment it arrived.
- The actual network call to `MICROSERVICE_STORAGE` becomes a durable, automatically-retried RabbitMQ job, following the same exchange/queue/retry/DLQ shape already used for `messages.exchange`.
- Text-only messages keep their current synchronous, low-latency path — this change must not add RabbitMQ round-trip latency to the common case.
- The retry ceiling for the media queue must be able to ride out a realistic storage outage (tens of minutes to a few hours), not just the ~10 minutes the current global `MAX_RETRIES=20` @ 30s TTL gives `messages.queue`.

**Non-Goals:**
- Fixing WhatsApp/Baileys media URL expiry itself — `reuploadRequest` already covers that at download time; this change only hardens the hop from this service to `MICROSERVICE_STORAGE`.
- Building an admin UI/endpoint to browse or manually replay the DLQ — flagged as an Open Question, not solved here.
- Making `SessionManager`/`BaileysConnector` multi-instance-safe — it already assumes a single instance holding in-memory sockets and local session files; the media staging directory follows that same single-instance assumption.
- Changing the `Message`/`MessageImage`/`MessageAudio`/etc. Prisma schema — rows are still only created once a real `link` is known, same as today.

## Decisions

**1. Stage the decrypted buffer to local disk before enqueueing, rather than putting the raw bytes in the RabbitMQ message body.**
WhatsApp audio/video/documents can be several MB to tens of MB; base64-encoding that into an AMQP message body (~33% inflation) is wasteful and pushes against broker message-size practices. This service is already single-instance and already relies on local disk surviving restarts for Baileys' own auth state (`./session/<sessionId>/`, bind-mounted via `volumes: - .:/app` in `docker-compose.yml`). A new `./session/media-pending/<messageId>.<ext>` staging file follows the identical, already-proven pattern. The RabbitMQ job payload carries only the file path + metadata (tenantId, sessionId, messageId, mimeType, fileName, the raw Baileys message needed to remap it after upload). Alternative considered: embed the buffer as base64 in the queue message — rejected for the size/broker-load reasons above, given a local-disk alternative that fits the project's existing deployment model.

**2. Enqueue-and-return for media messages; do not await the upload inside `bindMessages`.**
Awaiting the upload (even with retries) inside the `messages.upsert` handler would stall processing of subsequent messages in the same batch/session during a storage outage. Instead, `bindMessages` downloads+stages the buffer (fast, local, low failure risk) and calls `RabbitMQPublisher.publishExchange("media.exchange", "media.upload", {...})`, then moves on immediately — mirroring how `OnMessageReceivedHandler` already fires-and-forgets onto `messages.exchange` after saving. Text-only messages are unaffected (no media block, no queue hop, same as today).

**3. New `media.exchange`/`media.upload.queue` topology in `RabbitMQRegistry`, with its own retry policy — not reuse of `messages.queue`.**
`messages.queue`'s current retry shape (fixed 30s TTL, 20 attempts ≈ 10 minutes) is tuned for transient message-processing bugs, not for "an external HTTP dependency is down for a while." Media uploads need a materially longer, growing retry window. Rather than bumping the shared `MAX_RETRIES` constant (which would also change `messages.queue` behavior), `RabbitMQRegistry`'s per-queue config gains an optional `maxRetries` (defaulting to today's 20 if omitted, so `messages.queue` is unaffected), and `RabbitMQConsumer.consume()` takes an optional `maxRetries` param it forwards instead of the hardcoded module constant.

**3a. Exponential backoff via per-message TTL, not a fixed retry interval or multiple chained retry queues (revised from the original single-fixed-TTL decision below).**
The initial version of this design used a single fixed retry-queue TTL (e.g. 60s), so every retry happened at the same flat interval — the same shape `messages.queue` already had, just longer. That's a poor fit for "storage service is down": it hammers the same endpoint at a constant cadence instead of backing off. Revised approach: `RabbitMQRegistry`'s `retry` config gains optional `multiplier` and `maxTtl`. `RabbitMQConsumer` computes `delay = ttl * multiplier^retryCount` (capped at `maxTtl`) per retry and sets it as a **per-message** `expiration` property on the retried message, instead of a queue-level `x-message-ttl` argument (queue-level TTL cannot vary per message; RabbitMQ takes the *minimum* of queue TTL and message TTL, so a queue-level TTL would silently cap every attempt at that same value and defeat the backoff). `RabbitMQBootstrap`'s retry-queue assertion therefore no longer sets `x-message-ttl` at all — only the dead-letter-exchange/routing-key arguments needed to bounce back to the main queue once each message's own TTL expires. `media.upload.queue` is configured with `ttl: 60000, multiplier: 2, maxTtl: 1800000` (1min → 2min → 4min → 8min → 16min → capped at 30min) and `maxRetries: 30` — far fewer retries than the original flat 120, since backoff+cap reaches a similar total outage-tolerance (~13 hours) without hammering the endpoint every minute the whole time. `messages.queue` keeps `multiplier` unset (defaults to 1), so its behavior is byte-for-byte unchanged — flat 30s retries, exactly as before.
Alternative considered (original decision, now superseded): a single longer fixed TTL — simpler, but doesn't back off, so a real outage gets hammered at a constant rate for its whole duration. Alternative considered and rejected again here: multiple chained retry queues (30s→1m→5m→30m tiers), which achieves backoff without relying on per-message `expiration`, but requires `RabbitMQBootstrap` to declare N retry queues per main queue instead of 1 — real topology complexity for no behavioral gain over the per-message-TTL approach, which achieves the same backoff curve with a single retry queue.

**4. The worker builds the mapped message and emits `message.received` only after a successful upload — the existing pipeline downstream is untouched.**
`src/workers/mediaUpload.worker.ts` consumes `media.upload.queue` using the generic `RabbitMQConsumer.consume()` helper (not the hand-rolled retry logic of `src/workers/messagesUpsert.worker.ts` — see note below), re-reads the staged file, performs the `fetch` to `MICROSERVICE_STORAGE`, and on success calls `BaileysToWhatpyMapper.map(storedRawMsg, uploadedUrl)` then `eventBus.emit("message.received", {...})` — landing in `OnMessageReceivedHandler` exactly as today, so `saveMessage` and the `messages.exchange` publish need no changes. On failure it throws, letting `RabbitMQConsumer.consume()`'s built-in retry-count-header + `.retry`/`.dlq` requeue logic handle it.

**Note (surprising finding): `src/workers/messagesUpsert.worker.ts` is dead code today.** It self-invokes `start()` at module scope, but nothing starts that module — it's not imported by `server.ts`, not built by `tsup.api.ts` (which only bundles `server.ts`), and no `package.json` script or `docker-compose*.yml` command runs it. In the actual running system, `message.received` is handled entirely in-process: `BaileysConnector.bindMessages` emits it directly on the shared `eventBus`, `registerEventHandlers()` (called from `server.ts`'s `start()`) wires the in-process handlers, and `OnMessageReceivedHandler` is one of them. So `mediaUpload.worker.ts` cannot copy "how the existing worker is wired" — there is no existing wiring to copy. It must be started explicitly, e.g. by calling its `start()`/`consume()` setup from `server.ts`'s `start()` function, right after `bootstrapRabbitMQ()`, the same place `registerEventHandlers()` already runs.

**5. On terminal failure (DLQ), keep the staged file on disk; log it as a durable failure via the existing `EventLog`/`DomainEventDispatcher`.**
Today's swallowed error produces zero trace. After this change, exhausting retries results in an `EventLog.fail()` (visible via the existing `MessageEventLog` table/dispatcher already used for other message processing failures) plus the DLQ message itself carrying `x-last-error`/`x-failed-at` headers (same convention as `messages.queue.dlq` today) and the staged file left in place instead of deleted, so a later manual/administrative replay is possible without having re-fetched the media from WhatsApp (which may no longer be possible after the retry window).

## Risks / Trade-offs

- [Media messages may now be saved/delivered later than the text messages around them, especially during a storage outage — order-of-arrival at the backend is no longer guaranteed to match chat order] → Accepted: strictly better than the current behavior (never arriving at all); callers already handle async message delivery via RabbitMQ and can re-sort by `timestamp`.
- [Local-disk staging is single-instance — does not survive moving `BaileysConnector` to a horizontally-scaled deployment] → Accepted, matching the existing non-goal: `SessionManager` and Baileys auth state are already single-instance-only; this doesn't make that worse.
- [No admin tooling to inspect/replay `media.upload.queue.dlq` yet] → Accepted for now, tracked as an Open Question; the RabbitMQ management UI (already exposed at `:15672` per `docker-compose.yml`) is the interim way to inspect DLQ'd jobs and their preserved staging file paths.
- [Orphaned staging files if a job is DLQ'd and never manually replayed] → Accepted for now; a periodic cleanup sweep is a natural, small follow-up once real DLQ volume is observed, not blocking this change.
- [Longer `maxRetries`/TTL on `media.upload.queue` means a genuinely broken storage integration surfaces more slowly than today's instant swallow] → Mitigated by the `EventLog`/DLQ headers now existing at all (today there is zero signal either way); operators can watch the DLQ depth in the RabbitMQ management UI.

## Migration Plan

1. Add `maxRetries` support to `RabbitMQRegistry`'s queue config and thread it through `RabbitMQBootstrap`/`RabbitMQConsumer.consume()`, defaulting to the current `MAX_RETRIES=20` so `messages.queue` behavior is unchanged.
2. Add the `media.exchange`/`media.upload.queue` entry to `RabbitMQRegistry` (with its own retry TTL + higher `maxRetries`).
3. Add local staging helpers (write buffer to `./session/media-pending/<messageId>.<ext>`, read it back, delete on success) alongside `BaileysConnector`.
4. Split `uploadMessageMedia` into `stageMediaBuffer` (sync download+write, called from `bindMessages`) and a queue publish call; `bindMessages` no longer awaits the HTTP upload for media messages.
5. Add `src/workers/mediaUpload.worker.ts` and start it explicitly from `server.ts`'s `start()`, immediately after `bootstrapRabbitMQ()` (alongside `registerEventHandlers()`) — there is no existing separate-process worker convention in this repo to plug into (see Decision 4 note: `messagesUpsert.worker.ts` is currently dead code, unwired anywhere), so this must run in the same process as the API.
6. Deploy: `RabbitMQBootstrap.setup` is idempotent (`assertExchange`/`assertQueue` are safe to re-run), so the new topology is created automatically on next connect — no manual broker changes needed beyond redeploying.
7. Rollback: revert the code; any in-flight `media.upload.queue` jobs are simply not consumed anymore (they stay durable in the queue until a future deploy picks them back up, or are manually inspected/purged via the management UI) — no data loss on rollback either.

## Open Questions

- Should DLQ'd media jobs get an operator-facing replay mechanism (endpoint or CLI script) in a fast follow-up, or is the RabbitMQ management UI + manual re-publish sufficient for current volume?
- ~~Is a single longer retry TTL (Decision 3) sufficient, or does real-world storage-outage duration warrant tiered/exponential backoff?~~ Resolved by Decision 3a: exponential backoff via per-message TTL.
- Should staged files that are never claimed (job lost, worker code changed incompatibly) get an automatic TTL-based cleanup sweep, and if so what retention window?
