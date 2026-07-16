Tasks prefixed **[whatsapp-manager]** apply to the separate repo at `/home/gabriel/Documentos/DEV/whatsapp-manager`, which is outside this OpenSpec planning tool's edit root and must be implemented there directly (this tasks.md is the shared contract reference for that work). All other tasks apply to this repo (`microservice-whatsapp`).

## 1. Schema

- [x] 1.1 Add `contact` to the `MessageType` enum in `src/infrastructure/database/prisma/schema.prisma`
- [x] 1.2 Add a `MessageContact` model (`id`, `message_id` unique FK, `display_name`, `vcard`, `phone`, `tenant_id`/`tenant` relation) mirroring `MessageDocument`'s shape, and add `contact MessageContact?` to the `Message` model
- [x] 1.3 Generate and apply the Prisma migration, following the naming pattern of the pending `20260716130104_add_sticker_message_type` migration

## 2. Domain layer

- [x] 2.1 Add `WhatsAppMessageContact` interface (`id`, `display_name`, `vcard`, `phone`) to `src/domain/repositories/IWhatsappAdapter.ts`, add `"contact"` to `WhatsAppMessage.type`, and add `contact?: WhatsAppMessageContact` to `WhatsAppMessage`
- [x] 2.2 Add `src/domain/value-objects/Message/MessageContact.ts` (zod schema + class + `toDTO()`), following `MessageDocument.ts`'s pattern exactly
- [x] 2.3 In `src/domain/entities/Message.ts`: add `"contact"` to `messageTypeSchema`, add `contact: messageContactSchema.optional()` to `messageSchema`, add `_contact` field + constructor wiring + `case "contact": return this._contact;` in the `message` getter + `contact: this._contact?.toDTO()` in `toDTO()`

## 3. Ingestion mapping (Baileys → domain)

- [x] 3.1 In `src/infrastructure/repositories/Baileys/BaileysToWhatpyMapper.ts`, add a `buildContactMessage(contact: proto.Message.IContactMessage): WhatsAppMessageContact` helper that maps `displayName` → `display_name`, passes `vcard` through as-is, and extracts `phone` via `waid=(\d+)` first, falling back to the last `:`-delimited token on any `TEL` line, else `""`
- [x] 3.2 In `buildMessage`, add an unguarded `if (m.contactMessage) { return { ...base, type: "contact", contact: this.buildContactMessage(m.contactMessage) }; }` branch alongside the `conversation`/`extendedTextMessage` branches (no `url` required, unlike the media branches)
- [x] 3.3 In `src/application/usecase/WhatsappMessageMapper.ts`, pass `contact: msg.contact` through in `Message.create(...)`

## 4. Persistence

- [x] 4.1 In `src/infrastructure/repositories/MessageRepository.ts`, add `contact: true` to the `include` clauses in `getMessagesById` and `getMessagesLastMessageByChatId`, and map `msg.contact` into the `Message.restore(...)` call in both (`display_name`, `vcard`, `phone`)
- [x] 4.2 In `saveMessage`'s `create` block, add a `contact: dto.contact ? { create: { ...dto.contact, tenant: { connect: { id: tenant_id } } } } : undefined` clause, matching the `document`/`image` pattern

## 5. [whatsapp-manager] Schema

- [x] 5.1 Add `contact` to the `MessageType` enum in `prisma/schema.prisma`, add a `MessageContact` model (same shape as this repo's, FK'd to `Message.uuid` per this repo's existing `message_id` → `references: [uuid]` convention), add a `vcard MessageContact?` relation field on `Message` (named `vcard` not `contact` — `contact` was already taken by the CRM `Contact` relation), and generate the migration. **Migration file written but not applied**: the dev DB has pre-existing schema drift from an untracked `20260619193555_add_internal_chat` migration unrelated to this change; user chose to leave the DB as-is rather than reset it — apply manually once that drift is resolved.

## 6. [whatsapp-manager] Domain layer

- [x] 6.1 Add `server/src/domain/value-objects/Message/MessageContact.ts` (zod schema with `tenant_id`, class, `toDTO()`), mirroring `MessageDocument.ts`
- [x] 6.2 In `server/src/domain/entities/Message.ts`: add `"contact"` to `messageTypeSchema`, add `contact` to `messageSchema`, add `_contact` field + constructor wiring + `case "contact": return this._contact;` in the `message` getter + `contact` in `toDTO()`
- [x] 6.3 Add `contact?: WhatsAppMessageContact` and `"contact"` to the `WhatsAppMessage.type` union in `server/src/domain/gateways/WhatsapGateway.ts` (matching the shape this repo's `IWhatsappAdapter.ts` now publishes)

## 7. [whatsapp-manager] Ingestion mapping and persistence

- [x] 7.1 In `server/src/application/factorys/MessageFactory.ts`, add a `case "contact":` branch before `default:` that builds `Message.create({ ...base, type: "contact", contact: { tenant_id, id: message.contact?.id || "", display_name: message.contact?.display_name || "", vcard: message.contact?.vcard || "", phone: message.contact?.phone || "" } })`
- [x] 7.2 In `server/src/infrastructure/repositories/MessageRepository.ts`, add `contact` handling alongside every existing `document` reference: the `include` clauses in `getMessagesByContactId`, `getAfter`, `getMessagesById`, the `create` block in `saveMessage`, and the private `mapToDomain` helper (Prisma relation field is named `vcard`, not `contact`, since `Message.contact` was already the CRM-contact relation; DTO/domain layer still exposes it as `contact`)

## 8. [whatsapp-manager] Frontend rendering

- [x] 8.1 Adapt `components/suport/Chat/message/contact.vue` to accept the same props as `document.vue` (`message: Message`, `sender`, `indexCurrent`, `firstIndex`, `isVizualization`, `vizualization`, `lstMenuOptions`) instead of standalone `contactName`/`contactPhone`/`avatarUrl`; read `message.contact?.toDTO().display_name` / `.phone` internally, and add `SuportChatMessageMarkedMessageActionsMenu` + forward button/badge + quoted-message preview + edited badge, following `document.vue`'s structure (the outer `SuportChatMessageGroup` row wrapper is already applied to every message-type child by `index.vue`, so no change was needed there)
- [x] 8.2 Update `components/suport/Chat/message/contactDetailsModal.vue`'s invocation inside `contact.vue` to pass the same derived `contactName`/`contactPhone` (its own internal props/behavior are unchanged)
- [x] 8.3 In `components/suport/Chat/message/index.vue`, add a `<SuportChatMessageContact v-if="message.type == 'contact'">` branch (after the `document` branch) passing the same prop set as the `document` branch, plus `@forward="openFowardModal(message)"`

## 9. Verification

- [ ] 9.1 Send a WhatsApp contact card from a linked phone to a session connected to this microservice and confirm the console no longer logs `tipo de mensagem não suportado` for it, and that a `Message` row with a `MessageContact` child is created
- [ ] 9.2 Confirm the persisted message is published to `messages.exchange`/`messages.upsert` with `type: "contact"` and a populated `contact` object
- [ ] 9.3 [whatsapp-manager] Confirm the consumer persists the message via `MessageFactory`'s new `case "contact":` without throwing, and that `MessageContact` is saved
- [ ] 9.4 [whatsapp-manager] Confirm the contact card renders in the chat UI via the wired-up `contact.vue` bubble, showing the shared contact's name and phone, with a working "Ver contato" modal, forward action, and delete action like other bubbles
- [ ] 9.5 [whatsapp-manager] Send a vCard whose `TEL` line has no `waid=` parameter (or none at all) and confirm the bubble still renders using just the display name, without the phone line, and without any console error
