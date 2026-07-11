# message-actions Specification

## Purpose
TBD - created by archiving change expand-whatsapp-interactions. Update Purpose after archive.

## Requirements

### Requirement: Star and unstar a message
The system SHALL allow starring or unstarring a specific message, identified by `messageId` and its `fromMe` orientation, using the chat's star modification call, so the message is flagged/unflagged as starred on the WhatsApp account exactly as the native client would.

#### Scenario: Starring a message
- **WHEN** a client requests to star a `messageId` in a given chat
- **THEN** the system sends a star-chat-modification marking that message as starred

#### Scenario: Unstarring a message
- **WHEN** a client requests to unstar a previously starred `messageId`
- **THEN** the system sends a star-chat-modification marking that message as not starred

### Requirement: Pin and unpin a message inside a chat
The system SHALL allow pinning or unpinning a specific message inside a chat, resolving the message's original key first, so the pinned-message banner shown by WhatsApp reflects the pinned message accurately.

#### Scenario: Pinning a message
- **WHEN** a client requests to pin a `messageId` in a chat
- **THEN** the system resolves that message's original key and sends a pin-message action referencing it, using a supported pin duration

#### Scenario: Unpinning a message
- **WHEN** a client requests to unpin a currently pinned message
- **THEN** the system sends an unpin-message action referencing the same message key

### Requirement: Delete a message for me only
The system SHALL allow removing a message from the local chat view only (without notifying the other participant), separate from the existing tenant-visible delete-for-everyone behavior.

#### Scenario: Deleting a message for me
- **WHEN** a client requests a delete-for-me action on a `messageId`
- **THEN** the system sends a delete-for-me chat modification referencing that message's key and timestamp, without affecting the recipient's copy of the message
