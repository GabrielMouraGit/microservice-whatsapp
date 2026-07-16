## ADDED Requirements

### Requirement: Detect an inbound contact-card (vCard) message
The system SHALL recognize a Baileys `contactMessage` on an incoming `messages.upsert` event as a `contact`-type message, extracting the shared contact's display name, raw vCard, and a best-effort phone number.

#### Scenario: A single-contact vCard is received
- **WHEN** an inbound message contains a `contactMessage` with a `displayName` and a `vcard`
- **THEN** the system maps it to a `contact`-type message carrying that display name, the raw vcard text, and a phone number extracted from the vcard's `TEL`/`waid` field when present

#### Scenario: vCard has no extractable phone number
- **WHEN** an inbound `contactMessage`'s vcard has no `TEL` line or `waid` parameter
- **THEN** the system still maps the message using the display name and raw vcard, with an empty phone number rather than failing

#### Scenario: Multi-contact share is not handled
- **WHEN** an inbound message contains a `contactsArrayMessage` instead of a single `contactMessage`
- **THEN** the system does not treat it as a supported message type and continues to ignore it as it does today for other unsupported types

### Requirement: Persist a contact message like any other message type
The system SHALL save a mapped `contact` message through the same persistence path used for text/image/video/audio/document messages, without requiring a media URL.

#### Scenario: Contact message is saved without media staging
- **WHEN** a `contact`-type message is mapped from an inbound event
- **THEN** the system persists it directly, without waiting for or requiring a staged-media URL

#### Scenario: Contact message round-trips through storage
- **WHEN** a persisted `contact` message is later read back by id or as a chat's last message
- **THEN** the returned message includes the same display name, vcard, and phone number that were originally saved

### Requirement: Publish a contact message for downstream consumers
The system SHALL publish a persisted `contact` message to the existing message-received exchange, using the same routing key and payload shape already used for other message types.

#### Scenario: Successful persistence triggers a publish
- **WHEN** the system successfully persists an inbound `contact` message
- **THEN** it publishes that message (including its `contact` fields) to the existing `messages.exchange` under the `messages.upsert` routing key, alongside every other message type
