## ADDED Requirements

### Requirement: Resync reprocesses pending and failed event logs
The system SHALL, on every `/resyncall` execution, fetch `MessageEventLog` rows whose `status` is `pending` OR `failed` (ordered oldest-first by `created_at`, up to the existing batch limit) and attempt to reprocess each one through the same mapping/re-emit pipeline used for pending rows today (media staging when applicable, otherwise mapping the raw payload and emitting `message.received`).

#### Scenario: A failed event log is retried and succeeds
- **WHEN** a `MessageEventLog` row has `status = "failed"` and its payload can now be mapped and processed successfully
- **THEN** the system emits `message.received` for it and marks it `status = "processed"`

#### Scenario: A failed event log is retried and fails again
- **WHEN** a `MessageEventLog` row has `status = "failed"` and reprocessing throws an error again
- **THEN** the system logs the error, leaves the row's status unchanged (`failed`), and continues processing the remaining rows in the batch without aborting

#### Scenario: A pending event log continues to be processed as before
- **WHEN** a `MessageEventLog` row has `status = "pending"`
- **THEN** the system processes it exactly as it did prior to this change (no behavior change for pending rows)

### Requirement: Resync republishes the last 500 received messages per session
The system SHALL, on every `/resyncall` execution, for each distinct `session_id` present in the `Message` table, fetch the most recent 500 messages with `from_me = false` ordered by `timestamp` descending, and republish each one to the `messages.exchange` RabbitMQ exchange with routing key `messages.upsert`, using the payload shape `{ message: <message DTO>, tenant_id, session_id }`.

#### Scenario: Republishing the last 500 received messages of a session
- **WHEN** `/resyncall` runs and a session has 500 or more persisted messages with `from_me = false`
- **THEN** the system republishes exactly the 500 most recent (by `timestamp`) of those messages to `messages.exchange` / `messages.upsert`

#### Scenario: A session has fewer than 500 received messages
- **WHEN** a session has fewer than 500 persisted messages with `from_me = false`
- **THEN** the system republishes all of that session's received messages, without erroring due to the batch being smaller than 500

#### Scenario: A single republish failure does not block the rest of the batch
- **WHEN** publishing one message in the last-500 batch to RabbitMQ fails (e.g. transient broker error)
- **THEN** the system logs the failure and continues republishing the remaining messages in that session's batch and any subsequent sessions' batches

#### Scenario: This step runs unconditionally, not behind a flag
- **WHEN** `/resyncall` is invoked (on-demand via HTTP or via the periodic timer)
- **THEN** the last-500-received-messages republish step always executes, with no request parameter required to enable it
