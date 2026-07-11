# chat-management Specification

## Purpose
TBD - created by archiving change expand-whatsapp-interactions. Update Purpose after archive.

## Requirements

### Requirement: Archive and unarchive a chat
The system SHALL allow archiving or unarchiving a chat on the connected WhatsApp account.

#### Scenario: Archiving a chat
- **WHEN** a client requests to archive a chat
- **THEN** the system sends an archive chat-modification for that chat

#### Scenario: Unarchiving a chat
- **WHEN** a client requests to unarchive a previously archived chat
- **THEN** the system sends an unarchive chat-modification for that chat

### Requirement: Mute and unmute a chat
The system SHALL allow muting a chat for a caller-specified duration and unmuting it immediately.

#### Scenario: Muting a chat
- **WHEN** a client requests to mute a chat for a duration
- **THEN** the system sends a mute chat-modification with the requested duration

#### Scenario: Unmuting a chat
- **WHEN** a client requests to unmute a currently muted chat
- **THEN** the system sends a mute chat-modification that clears the mute (null duration)

### Requirement: Delete a chat
The system SHALL allow deleting a chat entirely from the account's chat list, resolving the chat's most recent stored message the same way `markChatAsRead` does, so the delete request references real message data.

#### Scenario: Deleting a chat with known history
- **WHEN** a client requests to delete a chat that has locally stored messages
- **THEN** the system sends a delete chat-modification referencing the chat's most recent known message

#### Scenario: Deleting a chat with no known history
- **WHEN** a client requests to delete a chat with no locally stored messages
- **THEN** the system sends a delete chat-modification without a specific last-message reference

### Requirement: Clear chat history
The system SHALL allow clearing all messages in a chat without deleting the chat entry itself, following the same last-message resolution as chat deletion.

#### Scenario: Clearing a chat's messages
- **WHEN** a client requests to clear a chat's message history
- **THEN** the system sends a clear chat-modification for that chat, leaving the chat itself in the account's chat list
