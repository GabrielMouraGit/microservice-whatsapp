## ADDED Requirements

### Requirement: Send typing and recording indicators
The system SHALL allow sending a "composing" (typing) or "recording" (voice-note recording) presence indicator to a chat, followed automatically by a "paused" presence, matching the behavior already implemented for typing and extending it to recording.

#### Scenario: Sending a typing indicator
- **WHEN** a client requests a typing indicator for a chat
- **THEN** the system sends a "composing" presence update to that chat, then a "paused" presence update after a short delay

#### Scenario: Sending a recording indicator
- **WHEN** a client requests a recording indicator for a chat
- **THEN** the system sends a "recording" presence update to that chat, then a "paused" presence update after a short delay

### Requirement: Set own online/offline presence
The system SHALL allow explicitly setting the session's own presence to available (online) or unavailable (offline) independent of any specific chat.

#### Scenario: Going online
- **WHEN** a client requests the session be set to available
- **THEN** the system sends an "available" presence update for the session

#### Scenario: Going offline
- **WHEN** a client requests the session be set to unavailable
- **THEN** the system sends an "unavailable" presence update for the session

### Requirement: Subscribe to a contact's presence updates
The system SHALL allow subscribing to a contact's presence (online/last-seen) updates so that subsequent presence changes for that contact are observable by the session.

#### Scenario: Subscribing to a contact's presence
- **WHEN** a client requests presence subscription for a given chat/contact
- **THEN** the system sends a presence-subscribe request for that contact's JID
