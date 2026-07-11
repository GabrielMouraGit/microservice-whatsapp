# message-receipts Specification

## Purpose
TBD - created by archiving change expand-whatsapp-interactions. Update Purpose after archive.

## Requirements

### Requirement: Mark a single message as read using its original key
The system SHALL mark a specific inbound message as read by resolving the message's original `WAMessageKey` (as captured from the `messages.upsert` event and stored via the message event log) and passing that exact key to the WhatsApp socket's read-receipt call. The system SHALL NOT synthesize a message key from the chat's phone number when the original key is available, because a synthesized key drops the `participant` field required for group chats and can use a JID form that does not match what WhatsApp expects.

#### Scenario: Marking an individual-chat message as read
- **WHEN** a client calls mark-as-read for a `messageId` that was previously received and logged for a 1:1 chat
- **THEN** the system resolves the stored `WAMessageKey` for that `messageId` and sends a read receipt using that exact key, and the request completes successfully

#### Scenario: Marking a group message as read
- **WHEN** a client calls mark-as-read for a `messageId` that belongs to a group chat
- **THEN** the system resolves the stored key including its `participant` field and sends the read receipt with the full group key, rather than a key derived only from the group's phone-number-shaped identifier

#### Scenario: Message key not found locally
- **WHEN** a client calls mark-as-read for a `messageId` the system has no stored event log for
- **THEN** the system falls back to a best-effort single-chat key derived from the provided chat number, and does not throw for the missing-log case alone

### Requirement: Mark an entire chat as read using the true last message
The system SHALL mark an entire chat as read by resolving the true last stored message for that chat (including its original key and timestamp) before calling the WhatsApp socket's chat-modify read call, consistent with how a single message is marked as read.

#### Scenario: Marking a chat with known message history as read
- **WHEN** a client calls mark-chat-as-read for a chat that has at least one message stored in this service
- **THEN** the system uses that message's real key and timestamp when instructing the socket to mark the chat read

#### Scenario: Marking a chat with no known message history as read
- **WHEN** a client calls mark-chat-as-read for a chat with no locally stored messages
- **THEN** the system marks the chat as read without a specific last-message reference, and the request still completes successfully
