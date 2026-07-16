## ADDED Requirements

### Requirement: Detect a WhatsApp-originated message edit
The system SHALL listen for Baileys `messages.update` events and treat an update whose `message.protocolMessage.type` is `EDIT` as an edit of the message identified by that update's key, extracting the new text from `protocolMessage.editedMessage`.

#### Scenario: A linked-device edit is detected
- **WHEN** the linked WhatsApp session reports a `messages.update` event whose `protocolMessage.type` is `EDIT` for a message with a known `key.id`
- **THEN** the system extracts the new text from `protocolMessage.editedMessage` and treats it as an edit of that message

#### Scenario: A non-edit update is ignored
- **WHEN** a `messages.update` event is received whose `message.protocolMessage` is absent or whose `protocolMessage.type` is not `EDIT`
- **THEN** the system does not treat it as a message edit and takes no persistence or publishing action for it

#### Scenario: One malformed update does not abort the batch
- **WHEN** a `messages.update` batch contains multiple updates and processing one of them throws an error
- **THEN** the system logs the failure for that update and continues processing the remaining updates in the same batch

### Requirement: Persist an edited message's new text
The system SHALL update the existing persisted message's text and mark it as edited when a detected edit's target message id matches a message already stored for that tenant/session.

#### Scenario: Edited text is saved against the original message
- **WHEN** a detected edit's message id matches an existing persisted message
- **THEN** the system updates that message's text body to the new text and sets its edited flag to true with an edited timestamp

#### Scenario: Edit target not found locally
- **WHEN** a detected edit's message id does not match any persisted message for that tenant/session
- **THEN** the system logs the mismatch and skips persistence for that edit without creating a new message record

### Requirement: Publish an edit event for downstream consumers
The system SHALL publish a message-edited event to a dedicated RabbitMQ exchange/queue whenever it successfully persists an edit, carrying the message id, tenant id, session id, new text, and edit timestamp.

#### Scenario: Successful edit persistence triggers a publish
- **WHEN** the system successfully updates a persisted message's text for a detected edit
- **THEN** it publishes an event containing the message id, tenant id, session id, new text, and edit timestamp to the message-edited queue

#### Scenario: Edit publish failure is retried, not dropped
- **WHEN** publishing the message-edited event fails transiently
- **THEN** the standard queue retry/DLQ mechanism (matching the existing message-received publish path) applies instead of the edit being silently lost
