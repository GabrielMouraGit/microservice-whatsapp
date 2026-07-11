# contact-profile-management Specification

## Purpose
TBD - created by archiving change expand-whatsapp-interactions. Update Purpose after archive.

## Requirements

### Requirement: Block and unblock a contact
The system SHALL allow blocking or unblocking a contact by number for a given session.

#### Scenario: Blocking a contact
- **WHEN** a client requests to block a contact number
- **THEN** the system updates the contact's block status to blocked for that session

#### Scenario: Unblocking a contact
- **WHEN** a client requests to unblock a previously blocked contact number
- **THEN** the system updates the contact's block status to unblocked for that session

### Requirement: Update own profile name, status, and picture
The system SHALL allow updating the connected account's own display name, status ("about") text, and profile picture, and removing the profile picture.

#### Scenario: Updating profile name
- **WHEN** a client requests to update the session's profile name
- **THEN** the system updates the account's display name to the requested value

#### Scenario: Updating status text
- **WHEN** a client requests to update the session's status/about text
- **THEN** the system updates the account's status text to the requested value

#### Scenario: Updating profile picture
- **WHEN** a client requests to set the session's profile picture from a media URL
- **THEN** the system uploads and sets that image as the account's profile picture

#### Scenario: Removing profile picture
- **WHEN** a client requests to remove the session's profile picture
- **THEN** the system removes the account's current profile picture

### Requirement: Fetch a contact's status text
The system SHALL allow fetching a contact's visible status ("about") text by number, when available.

#### Scenario: Fetching an available status
- **WHEN** a client requests the status text for a contact who has one visible to this account
- **THEN** the system returns that contact's status text

#### Scenario: Status not visible or not set
- **WHEN** a client requests the status text for a contact with no visible status
- **THEN** the system returns an empty result rather than an error
