## ADDED Requirements

### Requirement: Stage inbound media before upload
When an inbound WhatsApp message contains media (image, video, audio/voice note, document, or sticker), the system SHALL download and decrypt the media buffer and persist it to local disk before attempting any upload to the storage microservice.

#### Scenario: Media buffer staged on arrival
- **WHEN** a message containing a photo or audio arrives via `messages.upsert`
- **THEN** the system downloads and decrypts the media buffer and writes it to a local staging file before any network call to the storage microservice is attempted

### Requirement: Durable, retried upload to the storage microservice
The system SHALL upload staged media to the storage microservice through a durable RabbitMQ queue with automatic retry, rather than a single best-effort inline HTTP call, so that a temporary storage-microservice outage delays delivery instead of losing the message.

#### Scenario: Storage microservice unavailable on first attempt
- **WHEN** the upload of a staged photo or audio file to the storage microservice fails (network error, timeout, or non-2xx response)
- **THEN** the upload job is requeued for automatic retry and is not discarded, and no message data is lost

#### Scenario: Storage microservice recovers before retries are exhausted
- **WHEN** the storage microservice becomes reachable again before the upload job's retry attempts are exhausted
- **THEN** a subsequent retry succeeds, the resulting media message is saved and published exactly as it would have been on an immediate success, and no manual intervention is required

#### Scenario: Retries exhausted
- **WHEN** an upload job fails on every retry attempt up to its configured maximum
- **THEN** the job is moved to a dead-letter queue with failure metadata (last error, failure timestamp) attached, the staged file is preserved rather than deleted, and a durable failure log entry is recorded for the message

### Requirement: Text-only messages remain unaffected
The system SHALL continue processing text-only (non-media) inbound messages synchronously, without introducing a RabbitMQ round trip or additional latency for them.

#### Scenario: Text message arrives during a storage-microservice outage
- **WHEN** a text-only message arrives while the storage microservice is unreachable
- **THEN** the text message is saved and published through the existing synchronous path, unaffected by any pending or retrying media uploads

### Requirement: No silent media loss
The system SHALL NOT drop an inbound media message without a durable, inspectable trace of the failure.

#### Scenario: Upload ultimately fails after all retries
- **WHEN** a media upload job exhausts all configured retries
- **THEN** the failure is recorded in a durable, inspectable location (dead-letter queue plus failure log), and the original media content remains recoverable from the preserved staging file rather than being deleted
