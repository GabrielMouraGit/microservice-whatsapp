## ADDED Requirements

### Requirement: Bounded publish-confirm waits
The system SHALL bound every RabbitMQ publish-confirm wait (`waitForConfirms()`) with a timeout, and SHALL close or discard the associated channel and raise an error when that timeout elapses, rather than waiting indefinitely.

#### Scenario: Publish confirm never arrives
- **WHEN** a message is published to an exchange or queue and the broker never sends a publish confirm within the configured timeout
- **THEN** the publish call rejects with a clear timeout error, the channel used for the publish is closed, and the caller's existing error handling runs instead of the call hanging forever

#### Scenario: Publish confirm arrives before the timeout
- **WHEN** a message is published and the broker confirms it within the configured timeout
- **THEN** the publish call resolves normally with no behavior change from today

### Requirement: Bounded consumer handler execution
The system SHALL bound execution of a queue consumer's message handler with a timeout, and SHALL treat a timed-out handler the same way it treats a handler that throws: routing the message through the existing retry-count/backoff path and eventually to the queue's dead-letter queue if retries are exhausted.

#### Scenario: Handler hangs past the timeout
- **WHEN** a consumer's handler for a message does not resolve or reject within the configured handler timeout
- **THEN** the message is treated as a handler failure, is requeued onto the queue's retry queue with an incremented retry count (or dead-lettered if retries are exhausted), and the consumer's prefetch credit for that message is released

#### Scenario: Handler completes normally
- **WHEN** a consumer's handler resolves or rejects before the configured handler timeout
- **THEN** the message is acknowledged, retried, or dead-lettered exactly as it is today, with no behavior change

### Requirement: Broker flow-control visibility
The system SHALL log when the RabbitMQ connection enters and exits a broker-initiated blocked (flow-control) state, so that a broker resource alarm is visible instead of being indistinguishable from an unexplained hang.

#### Scenario: Broker blocks the connection
- **WHEN** the RabbitMQ broker sends a `connection.blocked` notification (e.g. due to a memory or disk resource alarm)
- **THEN** the system logs the blocked state and the reason reported by the broker

#### Scenario: Broker unblocks the connection
- **WHEN** the RabbitMQ broker sends a `connection.unblocked` notification after a prior blocked state
- **THEN** the system logs that the connection is unblocked and normal publish/consume throughput resumes without requiring a restart
