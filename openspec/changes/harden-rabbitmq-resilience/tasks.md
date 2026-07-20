## 1. Shared timeout helper

- [x] 1.1 Add a small `withTimeout<T>(promise: Promise<T>, ms: number, onTimeout?: () => void | Promise<void>, message?: string): Promise<T>` helper (e.g. new `src/infrastructure/messaging/rabbit/timeout.ts`) that races `promise` against a timer; on timeout, awaits `onTimeout?.()` (for cleanup, e.g. closing a channel) then throws an `Error` with a clear message (e.g. `"RabbitMQ operation timed out after {ms}ms"`).

## 2. Bound publish-confirm waits

- [x] 2.1 In `src/infrastructure/messaging/rabbit/RabbitMQPublisher.ts`, wrap `await channel.waitForConfirms()` in `publishQueue` (line ~19) with `withTimeout(..., PUBLISH_CONFIRM_TIMEOUT_MS, () => channel.close().catch(() => {}))`, where `PUBLISH_CONFIRM_TIMEOUT_MS = 15000` is a new module constant.
- [x] 2.2 Apply the same wrapping to `publishExchange`'s `await channel.waitForConfirms()` (line ~50).
- [x] 2.3 In `src/infrastructure/messaging/rabbit/RabbitMQConsumer.ts`, wrap both retry-path and DLQ-path `await channel.waitForConfirms()` calls (lines ~81, ~95) with the same helper and timeout constant, using the same channel passed into the consume callback (do not close it on timeout here, since it's the shared consumer channel, not a per-call one — just throw so the surrounding `catch` logs it).

## 3. Bound consumer handler execution

- [x] 3.1 In `RabbitMQConsumer.ts`, add an optional `handlerTimeoutMs: number = 60000` parameter to `consume()`, following the existing `maxRetries` parameter pattern.
- [x] 3.2 Wrap `await handler(content, msg, channel)` (line ~63) with `withTimeout(..., handlerTimeoutMs, undefined, "handler timeout")` so a hung handler rejects instead of hanging, flowing into the existing `catch (err)` retry/DLQ logic unchanged.

## 4. Broker flow-control visibility

- [x] 4.1 In `src/infrastructure/messaging/rabbit/RabbitMQConnection.ts`'s `connect()`, alongside the existing `connection.on("close", ...)`/`connection.on("error", ...)` listeners (lines ~65-77), add `connection.on("blocked", (reason) => console.error("🚫 RabbitMQ blocked:", reason))` and `connection.on("unblocked", () => console.log("✅ RabbitMQ unblocked"))`.

## 5. Fix untimed fetch and blocking I/O in the media path

- [x] 5.1 In `src/workers/mediaUpload.worker.ts`, add `signal: AbortSignal.timeout(...)` to the `fetch()` call (line ~45) to `MICROSERVICE_STORAGE`, mirroring the existing pattern already used in `src/infrastructure/repositories/Baileys/BaileysRepository.ts` (commit `8bfd56c`).
- [x] 5.2 In `src/infrastructure/repositories/Baileys/MediaStaging.ts`, replace `fs.writeFileSync`/`fs.readFileSync` with their `fs/promises` equivalents (`await fs.writeFile(...)`/`await fs.readFile(...)`), updating call sites in `mediaUpload.worker.ts` and `BaileysConnector.ts` to `await` them.

## 6. Verification

- [x] 6.1 Run `npm run test:run` and `tsc --noEmit` to confirm no regressions. `tsc --noEmit` reports 16 pre-existing errors, all in `node_modules` type declarations (`@types/mocha`, `ws`, `whatsapp-rust-bridge`, `fluent-ffmpeg`) unrelated to any file touched here — confirmed identical before/after via `git stash`. `test:run`: 8 passed / 2 failed, same 2 pre-existing failures in `tests/RabbitMQ.integration.test.ts` (require a live RabbitMQ broker / `RABBITMQ_URL`, unavailable in this sandbox) — confirmed identical before/after via `git stash`.
- [ ] 6.2 Manually verify against the local `docker-compose.yml` broker: publish a message, then simulate a stuck confirm (e.g. pause/block the `whatsapp-app` container's network path to `rabbitmq` mid-publish with `docker network disconnect` or an iptables rule) and confirm the app logs a publish timeout within ~15s and resumes processing subsequent messages instead of freezing.
- [ ] 6.3 Manually verify the consumer handler timeout: temporarily point `MICROSERVICE_STORAGE` at an unreachable host/port, send a media message, and confirm `media.upload.queue`'s handler times out at ~60s, retries with backoff, and does not block other queues (`messages.send.queue`, etc.) from continuing to process.
- [ ] 6.4 Manually verify `blocked`/`unblocked` logging: trigger a RabbitMQ memory alarm on the dev broker (e.g. temporarily lower `vm_memory_high_watermark` via `rabbitmqctl` in the running container and publish enough messages to cross it) and confirm `🚫 RabbitMQ blocked` / `✅ RabbitMQ unblocked` appear in logs at the right times.
- [ ] 6.5 Manually verify the untimed-fetch fix: confirm a media upload attempt against an unreachable `MICROSERVICE_STORAGE` fails within the configured `AbortSignal.timeout` window rather than hanging.
- [ ] 6.6 Leave the service running under normal load for a soak period post-deploy and confirm no manual RabbitMQ/app restart is needed to keep messages flowing.
