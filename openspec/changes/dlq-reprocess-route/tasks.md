## 1. DLQ reprocessor

- [x] 1.1 Create `src/infrastructure/messaging/rabbit/RabbitMQDlqReprocessor.ts`: given a main queue name, resolve its `dlq.queue` (and confirm it exists) via `RabbitMQRegistry.flatMap(ex => ex.queues).find(q => q.name === queue)`; throw/return a clear error if the queue name isn't registered or has no `dlq` configured.
- [x] 1.2 Implement the drain loop: `channel.checkQueue(dlqQueue)` to read `messageCount`, then loop `Math.min(messageCount, limit)` times calling `channel.get(dlqQueue, { noAck: false })`; stop early if `get` returns `false` (queue emptied faster than expected).
- [x] 1.3 For each drained message: parse `headers`, reset `x-retry-count` to `0`, increment `x-reprocessed-count` (default 0), set `x-reprocessed-at` to `new Date().toISOString()`; `channel.sendToQueue(mainQueue, msg.content, { persistent: true, headers })`, `await channel.waitForConfirms()`, then `channel.ack(originalMsg)` (matching the publish-then-ack-original ordering already used in `RabbitMQConsumer`'s retry/DLQ paths, so a mid-batch crash can duplicate at most the in-flight message, never lose one).
- [x] 1.4 Return a summary: `{ queue, dlqQueue, reprocessed: number, remaining: number }` (`remaining` = `messageCount - reprocessed`, useful for the caller to know whether to call again).
- [x] 1.5 Use a dedicated channel (via `RabbitMQConnection.getInstance().createChannel()`), closing it when done — consistent with "never share channels" convention already documented in `RabbitMQConnection.ts`.

## 2. HTTP endpoint

- [x] 2.1 Add a route (mirroring the existing `/whatsapp-service/public/api/v1/resyncall` one-off pattern in `server.ts`): e.g. `POST /whatsapp-service/public/api/v1/dlq/reprocess`, reading `queue` (default `"messages.queue"`) and `limit` (default e.g. `500`) from the request body or query string.
- [x] 2.2 Call `RabbitMQDlqReprocessor` with those params and return its summary as the JSON response; return a 4xx with a clear message if `queue` isn't a registered main queue with a configured `dlq`.
- [ ] 2.3 Confirm the route is reachable under this service's existing `HandlerAuth.ts` hook like every other route (no special-casing needed) — resolve the Open Question from `design.md` (stronger auth for this specific endpoint) with the user before or shortly after this ships, since it's a side-effecting operational action.

## 3. Verification

- [ ] 3.1 Manually verify against a real local RabbitMQ broker: publish a message directly to `messages.queue.dlq`, call the endpoint, confirm the message is gone from the DLQ and present on `messages.queue` with `x-retry-count` reset to `0` and `x-reprocessed-count`/`x-reprocessed-at` headers set.
- [ ] 3.2 Manually verify the same for `media.upload.queue.dlq` via `?queue=media.upload.queue`, and confirm (with the app's `mediaUpload.worker.ts` consumer running) that the requeued job is actually picked up and retried.
- [ ] 3.3 Manually verify the empty-DLQ case returns a successful zero-reprocessed response, not an error.
- [ ] 3.4 Manually verify the batch-limit case: put more messages in a DLQ than the limit, confirm only `limit` are reprocessed in one call and the response's `remaining` count reflects the rest.
- [ ] 3.5 Manually verify an unregistered/unknown `queue` value returns a clear 4xx rather than a crash or silent no-op.
- [x] 3.6 Run `npm run test:run` and `tsc --noEmit` to confirm no regressions — `tsc --noEmit` is clean; `test:run` has 2 pre-existing failures in `tests/RabbitMQ.integration.test.ts` unrelated to this change (they require a live RabbitMQ broker, none is running in this environment).
