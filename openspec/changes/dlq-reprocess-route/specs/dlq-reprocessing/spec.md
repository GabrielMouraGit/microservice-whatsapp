## ADDED Requirements

### Requirement: Drain a dead-letter queue back onto its main queue
The system SHALL provide an HTTP endpoint that, given a main queue name, drains the messages currently sitting in that queue's dead-letter queue and republishes each one onto the main queue for a fresh processing attempt.

#### Scenario: Reprocessing messages.queue.dlq
- **WHEN** an operator calls the reprocess endpoint with no queue specified (or `queue=messages.queue`)
- **THEN** every message currently in `messages.queue.dlq`, up to the batch limit, is removed from the DLQ and republished onto `messages.queue`

#### Scenario: Reprocessing media.upload.queue.dlq
- **WHEN** an operator calls the reprocess endpoint with `queue=media.upload.queue`
- **THEN** every message currently in `media.upload.queue.dlq`, up to the batch limit, is removed from the DLQ and republished onto `media.upload.queue`, where the existing `mediaUpload.worker.ts` consumer picks it up and retries the upload

#### Scenario: Empty DLQ
- **WHEN** an operator calls the reprocess endpoint for a queue whose DLQ currently has no messages
- **THEN** the endpoint returns successfully reporting zero messages reprocessed, without error

### Requirement: Requeued messages get a fresh retry budget
The system SHALL reset a message's retry-count tracking when requeuing it from a DLQ, so it is not immediately treated as having exhausted its retries again.

#### Scenario: Message that previously exhausted retries is reprocessed and fails again
- **WHEN** a message that previously hit its queue's `maxRetries` is reprocessed and its first attempt after requeuing fails again
- **THEN** it is retried according to the queue's normal retry/backoff policy (starting from the first retry step) rather than going straight back to the DLQ

### Requirement: Reprocessing is bounded per call
The system SHALL limit the number of messages drained and requeued in a single invocation of the reprocess endpoint.

#### Scenario: DLQ backlog larger than the batch limit
- **WHEN** a DLQ contains more messages than the endpoint's batch limit
- **THEN** only up to the batch limit is reprocessed in that call, the rest remain in the DLQ, and the response indicates how many were reprocessed so the operator can call again to continue
