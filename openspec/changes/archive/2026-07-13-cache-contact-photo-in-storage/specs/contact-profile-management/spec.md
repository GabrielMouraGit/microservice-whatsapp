## ADDED Requirements

### Requirement: Contact profile photo is hosted on the storage service
When a client fetches a contact's details, the system SHALL return a `profilePicUrl` that points to the tenant's storage microservice rather than WhatsApp's own CDN, so the URL does not expire after a period of time.

#### Scenario: First lookup of a contact with a WhatsApp profile picture
- **WHEN** a client requests contact details for a phone number that has a WhatsApp profile picture and has never been looked up before for this tenant
- **THEN** the system downloads the picture from WhatsApp, uploads it to the storage microservice, persists the resulting URL for that tenant and phone number, and returns that storage URL as `profilePicUrl`

#### Scenario: Repeat lookup of a previously cached contact within the refresh window
- **WHEN** a client requests contact details for a phone number that already has a stored photo URL for this tenant, uploaded less than 90 days ago
- **THEN** the system returns the previously stored storage URL as `profilePicUrl` without re-downloading the picture from WhatsApp or re-uploading it

#### Scenario: Contact has no WhatsApp profile picture and no cached photo
- **WHEN** a client requests contact details for a phone number with no visible WhatsApp profile picture and no previously stored photo for this tenant
- **THEN** the system returns an empty `profilePicUrl`

#### Scenario: Storage upload fails on a first-time lookup
- **WHEN** the system successfully fetches a contact's picture from WhatsApp but the upload to the storage microservice fails
- **THEN** the system returns the previously stored storage URL for that contact if one exists, or an empty `profilePicUrl` otherwise, and does not fail the contact lookup request

#### Scenario: Same phone number used by two different tenants
- **WHEN** two different tenants each look up a contact that shares the same phone number
- **THEN** each tenant's stored and returned photo URL is independent of the other tenant's

### Requirement: Contact profile photo is refreshed on a time-based schedule
The system SHALL treat a stored contact photo as stale once it is older than 90 days and SHALL attempt to refresh it from WhatsApp the next time that contact is looked up, so a contact's storage-hosted photo eventually reflects a real change to their WhatsApp photo.

#### Scenario: Lookup of a contact whose cached photo has passed the refresh window
- **WHEN** a client requests contact details for a phone number whose stored photo was last synced more than 90 days ago
- **THEN** the system re-downloads the current picture from WhatsApp, re-uploads it to the storage microservice, updates the stored URL and sync time for that tenant and phone number, and returns the new storage URL as `profilePicUrl`

#### Scenario: Refresh fails for a contact with a stale cached photo
- **WHEN** the system attempts to refresh a stale cached photo but the WhatsApp fetch or the storage upload fails
- **THEN** the system returns the previously stored (now stale) storage URL as `profilePicUrl` rather than failing the request or returning an empty result

#### Scenario: WhatsApp picture is no longer available for a contact with a stale cached photo
- **WHEN** the system attempts to refresh a stale cached photo but the contact no longer has a visible WhatsApp profile picture
- **THEN** the system returns the previously stored (now stale) storage URL as `profilePicUrl` rather than clearing it
