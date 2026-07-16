## Why

Baileys emits a `contactMessage` (a shared vCard, e.g. `displayName: 'Alexandre Metro Pcas'` with a `BEGIN:VCARD...END:VCARD` payload) when a contact card is received from a customer. `BaileysToWhatpyMapper.buildMessage` has no branch for `msg.message.contactMessage`, so `buildMessage` returns `null` and `BaileysConnector` logs `⚠️ tipo de mensagem não suportado, ignorando` and drops the message entirely — it is never persisted, never published to RabbitMQ, and never shown in `whatsapp-manager`. This is asymmetric with outbound behavior: sending a contact card already works today (`sendContactCard` in `IMessage.ts`/`IWhatsappAdapter.ts`, part of the `rich-content-messages` capability) — only *receiving* one is unhandled.

## What Changes

- Add a `contact` message type end-to-end in this repo's inbound pipeline: `MessageType` Prisma enum, a new `MessageContact` Prisma model + domain value object, a `_contact` field/getter on the `Message` entity, and a `WhatsAppMessageContact` interface + `contact` field on `WhatsAppMessage` in `IWhatsappAdapter.ts`.
- `BaileysToWhatpyMapper.buildMessage`: new branch for `m.contactMessage`, mapping `displayName` and `vcard` directly (no media staging/URL needed — unlike image/video/audio/document/sticker, a vCard has no binary attachment).
- `WhatsappMessageMapper.toDomain` and `MessageRepository` (`saveMessage`, `getMessagesById`, `getMessagesLastMessageByChatId`): thread the new `contact` field through persistence and reads, following the exact pattern already used for `document`.
- **Cross-repo [whatsapp-manager]** (`/home/gabriel/Documentos/DEV/whatsapp-manager`, separate repo, implemented outside this tool): mirror the same `contact` type addition on the consumer side (`MessageFactory`, Prisma schema/migration, `Message` entity/VO, `MessageRepository`), and wire the chat UI to render it — this app already has an unused, orphaned `components/suport/Chat/message/contact.vue` + `contactDetailsModal.vue` bubble (a fully-styled WhatsApp-style contact card) that was never connected to the message-type dispatcher (`components/suport/Chat/message/index.vue`) or the `messages.upsert` factory switch; this change wires it up rather than building a new template.
- **Non-goals**: `contactsArrayMessage` (multiple contacts shared in one message) — only the single-contact `contactMessage` shape from the sample payload is handled; a composer flow for *sending* a saved contact from `whatsapp-manager`'s attachment menu (the commented-out `contact` entry in `menu.vue`) — sending is already supported at the API level via `sendContactCard`, but building that picker UI is a separable, larger feature.
- **BREAKING**: none — purely additive; existing message types and queue payload shapes are unchanged.

## Capabilities

### New Capabilities
- `contact-message-ingestion`: The system SHALL detect an inbound WhatsApp contact-card (vCard) message, map it to a domain message, persist it, and publish it for downstream consumers — mirroring the existing handling of text/image/video/audio/document messages.

### Modified Capabilities
(none — `rich-content-messages` only covers outbound sending, and `contact-profile-management` covers the `Contact` directory record/profile sync, not messages; neither's requirements change here)

## Impact

**microservice-whatsapp** (this repo):
- `src/infrastructure/database/prisma/schema.prisma` — add `contact` to `MessageType`, add `MessageContact` model + `Message.contact` relation, new migration.
- `src/domain/repositories/IWhatsappAdapter.ts` — add `WhatsAppMessageContact` interface, `"contact"` to `WhatsAppMessage.type`, `contact?: WhatsAppMessageContact` field.
- `src/infrastructure/repositories/Baileys/BaileysToWhatpyMapper.ts` — new `buildContactMessage`/branch for `m.contactMessage`.
- `src/domain/value-objects/Message/MessageContact.ts` — new value object.
- `src/domain/entities/Message.ts` — add `_contact` field, constructor wiring, `message` getter case, `toDTO()` field.
- `src/application/usecase/WhatsappMessageMapper.ts` — pass `msg.contact` through.
- `src/infrastructure/repositories/MessageRepository.ts` — persist/read `contact` in all three query paths.

**whatsapp-manager** (`/home/gabriel/Documentos/DEV/whatsapp-manager`, separate repo):
- `prisma/schema.prisma` — same `contact` enum value + `MessageContact` model + migration.
- `server/src/domain/value-objects/Message/MessageContact.ts`, `server/src/domain/entities/Message.ts` — same VO/entity additions.
- `server/src/application/factorys/MessageFactory.ts` — new `case "contact":` branch.
- `server/src/infrastructure/repositories/MessageRepository.ts` — persist/read `contact` in `saveMessage`, `getMessagesByContactId`, `getAfter`, `getMessagesById`, `mapToDomain`.
- `components/suport/Chat/message/index.vue` — new `<SuportChatMessageContact v-if="message.type == 'contact'">` branch.
- `components/suport/Chat/message/contact.vue` — adapt from its current standalone `contactName`/`contactPhone`/`avatarUrl` props to the `:message="message"` pattern used by `document.vue` (reads from `message.toDTO().contact`), and wrap it with `SuportChatMessageGroup`'s slot machinery so it gets the forward/menu/quoted-message/edited-badge behavior other bubbles have for free.
