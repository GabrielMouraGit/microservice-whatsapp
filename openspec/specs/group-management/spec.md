# group-management Specification

## Purpose
TBD - created by archiving change expand-whatsapp-interactions. Update Purpose after archive.

## Requirements

### Requirement: Create a group
The system SHALL allow creating a new WhatsApp group with a subject and an initial list of participant numbers, returning the resulting group's metadata.

#### Scenario: Creating a group with initial participants
- **WHEN** a client requests group creation with a subject and one or more participant numbers
- **THEN** the system creates the group and returns its group JID and metadata

### Requirement: Manage group participants
The system SHALL allow adding, removing, promoting to admin, and demoting from admin for one or more participants of an existing group.

#### Scenario: Adding participants
- **WHEN** a client requests to add one or more participant numbers to an existing group
- **THEN** the system adds those participants and returns the per-participant result status

#### Scenario: Removing a participant
- **WHEN** a client requests to remove a participant from a group
- **THEN** the system removes that participant and returns the result status

#### Scenario: Promoting a participant to admin
- **WHEN** a client requests to promote a participant to admin in a group
- **THEN** the system promotes that participant and returns the result status

#### Scenario: Demoting an admin
- **WHEN** a client requests to demote a participant from admin in a group
- **THEN** the system demotes that participant and returns the result status

### Requirement: Update group subject and description
The system SHALL allow updating a group's subject (name) and description.

#### Scenario: Updating the group subject
- **WHEN** a client requests to update a group's subject
- **THEN** the system updates the group's subject to the requested value

#### Scenario: Updating the group description
- **WHEN** a client requests to update a group's description
- **THEN** the system updates the group's description to the requested value

### Requirement: Fetch group metadata
The system SHALL allow fetching a group's current metadata, including its subject, description, and participant list with roles.

#### Scenario: Fetching metadata for an existing group
- **WHEN** a client requests metadata for a group the session participates in
- **THEN** the system returns the group's subject, description, and participants with their admin status

### Requirement: Manage the group invite link
The system SHALL allow generating (or fetching) the current invite code for a group and revoking it to invalidate previously shared links.

#### Scenario: Fetching the invite link
- **WHEN** a client requests the invite code for a group
- **THEN** the system returns the group's current invite code

#### Scenario: Revoking the invite link
- **WHEN** a client requests to revoke a group's invite code
- **THEN** the system invalidates the previous code and returns the newly generated one

### Requirement: Join a group via invite code and leave a group
The system SHALL allow the session to join a group using an invite code, and to leave a group it currently participates in.

#### Scenario: Joining via invite code
- **WHEN** a client requests to join a group using a valid invite code
- **THEN** the system joins the group and returns the resulting group JID

#### Scenario: Leaving a group
- **WHEN** a client requests to leave a group the session currently participates in
- **THEN** the system removes the session's account from that group
