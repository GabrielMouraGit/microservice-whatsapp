# rich-content-messages Specification

## Purpose
TBD - created by archiving change expand-whatsapp-interactions. Update Purpose after archive.

## Requirements

### Requirement: Send a location message
The system SHALL allow sending a location message to a chat given latitude and longitude (and optional name/address), following the same quoting and typing-simulation behavior already used for other message sends.

#### Scenario: Sending a location
- **WHEN** a client requests a location send with valid coordinates for a chat
- **THEN** the system sends a location message to that chat and returns the resulting message id

### Requirement: Send a contact card
The system SHALL allow sending one or more contact cards (vCard) to a chat.

#### Scenario: Sending a contact card
- **WHEN** a client requests a contact-card send with a display name and vCard payload
- **THEN** the system sends a contact message to the target chat and returns the resulting message id

### Requirement: Send a sticker
The system SHALL allow sending a sticker (static or animated) to a chat from a media URL, mirroring the existing image/video/document send pattern.

#### Scenario: Sending a static sticker
- **WHEN** a client requests a sticker send from a media URL
- **THEN** the system sends a sticker message to the target chat and returns the resulting message id

### Requirement: Send a poll
The system SHALL allow creating and sending a poll message with a question, a list of option values, and a selectable-count setting.

#### Scenario: Sending a single-answer poll
- **WHEN** a client requests a poll send with a question, at least two options, and a selectable count of one
- **THEN** the system sends a poll message to the target chat and returns the resulting message id
