## Context

`BaileysConnector.bindMessages` already listens to `messages.upsert` and publishes a `message.received` domain event that fans out to persistence (`MessageRepository.saveMessage`, a Prisma `upsert` keyed on `id`) and to RabbitMQ (`messages.exchange` / `messages.upsert`). A `messages.update` listener exists only as a commented-out stub (`BaileysConnector.ts:226-228`) that logs the raw payload and does nothing else.

Baileys (`@whiskeysockets/baileys@7.0.0-rc13`) emits `messages.update` as an array of `{ key, update }`. When a message is edited — either by the linked device/phone directly on WhatsApp, or as WhatsApp's own confirmation of an edit this microservice itself sent via `BaileysRepository.editMessage` (`sock.sendMessage(jid, { text, edit: { id, fromMe, remoteJid } })`) — the `update` carries `message.protocolMessage` with `type === proto.Message.ProtocolMessage.Type.MESSAGE_EDIT` (`= 14`, confirmed in `WAProto/index.d.ts:8631`) and `protocolMessage.editedMessage` holding the new message content (for text, `editedMessage.conversation` or `editedMessage.extendedTextMessage.text`).

On the frontend side, `whatsapp-manager` already has a complete, working "message edited" path — `EDITED_MESSAGE` WebSocket event, `OnEditedMessageEvent` store patch, and the "Editada" badge in `text.vue` — but it is only ever triggered client-side, optimistically, when a user edits from inside the manager UI (`EditMessageCommandHandler` → `EditMessageUseCase` → HTTP call to this microservice's `editMessage` → local broadcast). There is no path today by which a real WhatsApp-originated edit reaches that same broadcast.

## Goals / Non-Goals

**Goals:**
- Detect `messages.update` events that represent a text edit, on the same per-message error-isolation model already used for `messages.upsert`.
- Persist the new text against the existing message record and mark it as edited.
- Publish a `message.edited` event over RabbitMQ using the same exchange/queue/DLQ conventions as `messages.exchange`, so `whatsapp-manager` (or any other consumer) can pick it up.
- Define the cross-repo contract (payload shape, queue name, routing key) precisely enough that `whatsapp-manager`'s consumer can reuse its existing `EDITED_MESSAGE` broadcast without any frontend Vue/store changes.

**Non-Goals:**
- Media message edits (WhatsApp does not support editing media captions/content the same way; only text messages are editable today) — out of scope, filtered out alongside unsupported types the same way `BaileysToWhatpyMapper` already does for `messages.upsert`.
- Edit history / "view previous versions" — only the current text + an `edited` flag are kept, not a version log.
- Implementing the `whatsapp-manager` consumer itself — that repo is outside this tool's edit root; this design only fixes the contract it must satisfy (see proposal's Impact section and `tasks.md`).
- Changing the existing outbound `editMessage` HTTP flow (`BaileysRepository.editMessage`) — unchanged; this is purely an inbound-detection addition.

## Decisions

**1. Reuse the `messages.exchange` pattern with a dedicated queue, not a shared routing key.**
A new `messages.edited.exchange` → `messages.edited.queue` (routing key `messages.edited`) is added to `RabbitMQRegistry.ts`, mirroring `messages.exchange`/`messages.upsert` exactly (same retry/DLQ shape). Alternative considered: reuse `messages.exchange` with a `type: "edited"` discriminator field on the existing `messages.upsert` routing key. Rejected because `whatsapp-manager`'s existing `messagesUpsert.worker.ts` consumer already has a specific, working shape (`content.message`, `content.tenant_id`, `content.session_id`) feeding straight into `ReciveNewMessageUseCase` — overloading it with a second payload shape and a branch is more fragile than a second queue with its own dedicated consumer, and matches how `messages.send.exchange`/`messages.status.exchange` were already split out as separate concerns in the prior `rabbitmq-outbound-messaging` change.

**2. Persist by direct `id` lookup + update, not upsert.**
`OnMessageEditedHandler` looks up the existing `Message` row by `id` (the Baileys `key.id`, unchanged across an edit) and updates `MessageText.body` + sets `Message.edited = true` / `edited_at = now()`. If no row is found (e.g. history not fully synced yet), the handler logs and skips rather than creating a new row — an edit without an original message is not meaningful to persist standalone.

**3. Schema: boolean flag + timestamp, no edit history table.**
Adds `edited Boolean @default(false)` and `edited_at DateTime?` to `Message`. This matches exactly what `whatsapp-manager`'s `Message` domain entity already models (`edited: z.boolean().default(false).optional()`) — no original-text history is kept on either side today, so this change doesn't need to introduce one.

**4. Payload contract published to `messages.edited.queue`:**
```json
{
  "message_id": "<baileys key.id>",
  "tenant_id": "<tenant>",
  "session_id": "<session>",
  "new_text": "<edited body>",
  "edited_at": "<ISO timestamp>"
}
```
This shape was chosen to map 1:1 onto the fields `whatsapp-manager`'s existing `SocketGateway.broadcast("EDITED_MESSAGE", tenant_id, { message_id, contact_id, new_text })` already expects — `contact_id` is resolved on the consumer side the same way `ReciveNewMessageUseCase` already resolves a contact from an inbound message, so it doesn't need to be carried in the event.

**5. Detect edits inside the existing `bindMessages` per-message try/catch, as a new `sock.ev.on("messages.update", ...)` listener alongside (not inside) the `messages.upsert` listener**, since `messages.update` is a structurally different Baileys event (array of `{key, update}`, not `{type, messages}`) and forcing it through the same handler would conflate two unrelated payload shapes.

## Risks / Trade-offs

- **[Risk]** WhatsApp's own edit confirmation for edits this microservice initiated (`BaileysRepository.editMessage`) will now also flow through this new path, potentially causing `whatsapp-manager` to receive an `EDITED_MESSAGE` broadcast for an edit it already applied optimistically. → **Mitigation**: this is idempotent (the store patch just sets the same final text/edited state again); no dedup mechanism is required for correctness, only slightly redundant network traffic.
- **[Risk]** Migration adds columns to a `Message` table that is actively written to by the live `messages.upsert` path. → **Mitigation**: additive, nullable/defaulted columns only (`edited` defaults `false`, `edited_at` nullable) — no backfill, no lock-heavy rewrite, following the same low-risk pattern as the pending `add_sticker_message_type` migration.
- **[Trade-off]** No edit-history table means the original pre-edit text is lost once overwritten. Acceptable since `whatsapp-manager`'s UI only ever needed to show a badge, not a history, and adding one is a larger, separable change if ever needed.
- **[Risk]** `whatsapp-manager`'s consumer is a separate, un-synchronized deployment — if it ships after this change, `messages.edited.queue` will simply accumulate/DLQ safely (same failure mode as any other queue with no consumer yet) with no impact on this repo's behavior.

## Migration Plan

1. Deploy the Prisma migration (`edited`/`edited_at` columns) — safe, additive, no backfill needed.
2. Deploy `RabbitMQRegistry.ts` topology addition (`messages.edited.*`) — additive, no behavior change until something publishes to it.
3. Deploy the `messages.update` listener + `OnMessageEditedHandler` — starts publishing edit events.
4. Separately, in `whatsapp-manager`: add the matching consume-side topology + worker + broadcast (tracked in that repo's own tasks; see proposal Impact).
5. Rollback: steps 2-3 can be reverted independently by re-commenting the listener; the queue/columns are inert if unused, so no rollback urgency on the schema/topology additions themselves.

## Open Questions

- Should quoted/reply-context text also be considered when detecting an edit's "new text" (e.g. `extendedTextMessage.text` vs `conversation`)? Resolved during implementation by mirroring however `BaileysToWhatpyMapper.buildMessage` already extracts text for `messages.upsert`, for consistency.
