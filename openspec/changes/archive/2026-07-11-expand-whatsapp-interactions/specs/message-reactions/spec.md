## ADDED Requirements

### Requirement: Send an emoji reaction to a message
The system SHALL allow a tenant-authenticated session to send an emoji reaction to a previously sent or received message, identified by its `messageId`, by resolving that message's original `WAMessageKey` and sending a reaction message referencing it.

#### Scenario: Reacting to a message with an emoji
- **WHEN** a client requests to react to an existing `messageId` in a chat with an emoji (e.g. "👍")
- **THEN** the system resolves the target message's original key and sends a reaction message containing that emoji, and returns success once the socket confirms the send

#### Scenario: Reacting to an unknown message
- **WHEN** a client requests to react to a `messageId` that has no stored event log entry
- **THEN** the system rejects the request with a clear error instead of sending a reaction against a guessed key

### Requirement: Remove a reaction from a message
The system SHALL allow removing a previously sent reaction from a message by sending an empty-text reaction referencing the same message key, matching how the WhatsApp client removes a reaction.

#### Scenario: Removing an existing reaction
- **WHEN** a client requests to remove the reaction previously placed on a `messageId`
- **THEN** the system sends a reaction message with an empty emoji body referencing that message's original key, clearing the reaction on the recipient's client
