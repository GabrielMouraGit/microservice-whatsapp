## 1. Repository layer — event logs

- [x] 1.1 Update `IMessageEventLogRepository.findPending` signature to accept an optional `statuses: EventStatus[]` parameter (default `["pending"]`), in `src/domain/repositories/IMessageEventLogRepository.ts`
- [x] 1.2 Update `MessageEventLogRepository.findPending` in `src/infrastructure/repositories/MessageEventLogRepository.ts` to filter `where: { status: { in: statuses } }` instead of the hardcoded `"pending"`, keeping `orderBy: { created_at: "asc" }`

## 2. Repository layer — received messages

- [x] 2.1 Add `getDistinctSessionIds(): Promise<string[]>` to `IMessageRepository` (`src/domain/repositories/IMessageRepository.ts`) and implement it in `MessageRepository` (`src/infrastructure/repositories/MessageRepository.ts`) via `$prismaClient.message.findMany({ distinct: ["session_id"], select: { session_id: true } })`
- [x] 2.2 Add `getLastReceivedMessages(sessionId: string, limit: number): Promise<Message[]>` to `IMessageRepository` and implement it in `MessageRepository`, querying `where: { session_id: sessionId, from_me: false }`, `orderBy: { timestamp: "desc" }`, `take: limit`, including the same relations (`text/image/video/audio/document/context/contact`) and `Message.restore(...)` mapping used in `getMessagesById`/`getMessagesLastMessageByChatId`
- [x] 2.3 Ensure the returned `Message` domain entities expose `tenant_id` (or fetch it alongside) so it can be included in the republish payload

## 3. Use case — failed event log reprocessing

- [x] 3.1 In `src/application/usecase/ReSyncAllMessagensUseCase.ts`, change the `findPending(100)` call to `findPending(100, ["pending", "failed"])`
- [x] 3.2 Verify the existing per-row try/catch already covers failed-row reprocessing without further branching (no code change expected beyond 3.1, per design.md Decision 2)

## 4. Use case — republish last 500 received messages

- [x] 4.1 In `ReSyncAllMessagensUseCase`, inject `IMessageRepository` and `RabbitMQPublisher` as new constructor dependencies
- [x] 4.2 After the event-log reprocessing loop, add a step that calls `getDistinctSessionIds()`, then for each `session_id` calls `getLastReceivedMessages(sessionId, 500)`
- [x] 4.3 For each returned message, wrap in try/catch and call `rabbitMQPublisher.publishExchange("messages.exchange", "messages.upsert", { message: message.toDTO(), tenant_id, session_id })`, logging and continuing on failure without aborting the batch or the outer session loop
- [x] 4.4 Update `container.ts` to pass `messageRepository` and `rabbitMQPublisher` into the `ReSyncAllMessagensUseCase` constructor call

## 5. Verification

- [x] 5.1 Manually trigger `GET /resyncall` against a local/dev environment with at least one `MessageEventLog` row seeded as `status = "failed"` and confirm it transitions to `processed` (or stays `failed` with a logged error) as expected
- [x] 5.2 Manually verify that a session with received messages gets up to 500 republish events on `messages.exchange`/`messages.upsert` (e.g. via `rabbitmqadmin` or a temporary consumer), and that a session with fewer than 500 received messages republishes all of them without error
- [x] 5.3 Confirm one forced publish failure (e.g. temporarily stop RabbitMQ mid-run) does not stop the rest of the batch from being attempted, per the design's per-item try/catch requirement
