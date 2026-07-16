## Context

`BaileysConnector.bindMessages` listens to `messages.upsert`, calls `BaileysToWhatpyMapper.map()` per message, and — if a mapping is produced — emits `message.received`, which `OnMessageReceivedHandler` persists via `MessageRepository.saveMessage` (a Prisma `upsert` keyed on `id`) and republishes to `messages.exchange`/`messages.upsert` over RabbitMQ. `BaileysToWhatpyMapper.buildMessage` is a chain of `if (m.<xMessage>) return {...}` branches; every branch that carries binary media (`imageMessage`, `videoMessage`, `audioMessage`, `documentMessage`, `stickerMessage`) is additionally guarded by `&& url`, because those messages only get mapped once `BaileysConnector` has staged the media and obtained a public `url` (see the `staged`/`stageMediaIfNeeded` flow around the `messages.upsert` listener). `conversation` and `extendedTextMessage` (plain text) have no such guard, since there's no binary payload to stage.

A Baileys `contactMessage` (shared vCard) looks like:
```js
contactMessage: ContactMessage {
  displayName: 'Alexandre Metro Pcas',
  vcard: 'BEGIN:VCARD\nVERSION:3.0\nN:Pcas;Alexandre;Metro;;\nFN:Alexandre Metro Pcas\nitem1.TEL;waid=554396066529:+55 43 9606-6529\nitem1.X-ABLabel:Celular\nX-WA-BIZ-NAME:Alexandre Metro Pcas\nEND:VCARD'
}
```
There is no attached file and no `url` — the entire payload is inline text, so it belongs alongside `conversation`/`extendedTextMessage` as an unguarded branch, not alongside the media types.

Today `buildMessage` falls through all branches and returns `null` for `contactMessage`, so `BaileysConnector` logs `⚠️ tipo de mensagem não suportado, ignorando` and the message is dropped — never saved, never published, never seen downstream in `whatsapp-manager`.

The pending (uncommitted) `sticker` work in this repo (`schema.prisma`'s `MessageType` enum already has `sticker`, `BaileysToWhatpyMapper` already has a `buildStickerMessage`) is a useful, directly analogous precedent for "add a new message type end-to-end," but it is *incomplete* on its own (no `MessageSticker` Prisma model, no domain VO, no `Message` entity field, no repository wiring) — this design does **not** fix or depend on that work; `contact` is added as a fully-wired type on its own, following the *pattern* the sticker enum value hints at, not its current unfinished state.

## Goals / Non-Goals

**Goals:**
- Detect a Baileys `contactMessage`, extract `displayName` and `vcard` (and a best-effort phone number for display convenience), and treat it as a first-class message type through the same persistence + publish path every other type already uses.
- Keep the change additive and low-risk: new enum value, new 1:1 table, no changes to existing message-type behavior or to the `messages.exchange` RabbitMQ contract (`whatsapp-manager`'s existing `messagesUpsert.worker.ts` consumer needs no topology change — only its `MessageFactory` switch needs a new case).
- Give `whatsapp-manager` enough of a defined contract (field names/shapes) that it can reuse its own already-built (but disconnected) `contact.vue` bubble rather than designing a new one.

**Non-Goals:**
- `contactsArrayMessage` (WhatsApp's "share multiple contacts at once" message) — a structurally different payload (an array of vcards); out of scope, and `buildMessage` will continue to fall through to `null` for it exactly as today.
- Parsing/validating the vCard beyond extracting a display phone number — the raw `vcard` string is stored as-is so any richer future use (e.g. "save to my contacts") isn't blocked.
- A composer UI in `whatsapp-manager` for *sending* a saved contact (the commented-out `contact` entry in `menu.vue`) — outbound contact-card sending already exists via `sendContactCard` (`rich-content-messages` spec); building a contact picker is a separable feature.
- Any change to the `messages.exchange`/`messages.upsert` RabbitMQ topology — `contact` rides the existing queue exactly like every other type.

## Decisions

**1. Treat `contactMessage` as a text-like (unguarded) branch in `BaileysToWhatpyMapper.buildMessage`, not a media-like one.**
It's inserted alongside the `conversation`/`extendedTextMessage` branches (no `&& url` guard), since there's no file to stage. Alternative considered: routing it through the same media-staging path "for consistency" — rejected as pure unneeded complexity; staging exists specifically to turn Baileys' encrypted media into a downloadable `url`, which a vCard message has no need for.

**2. Store `display_name` + raw `vcard` + a best-effort extracted `phone`, mirroring `MessageDocument`'s shape (a flat 1:1 table with primitive fields).**
`phone` is derived once at ingestion time (regex: prefer `waid=(\d+)` from the vCard's `TEL` line, falling back to the digits after the last `:` on any `TEL` line, else empty string) and persisted alongside the raw `vcard`, rather than re-parsed on every read/render. This matches how other types precompute display-relevant fields at ingestion (e.g. `MessageImage.width/height`, `MessageAudio.seconds`) instead of deriving them downstream.
Alternative considered: store only the raw `vcard` and parse phone client-side in `whatsapp-manager`. Rejected — it would duplicate the same regex in two repos and two languages' worth of vCard-quirk handling for no benefit, since the extraction is trivial and belongs at the point where the raw wire format is first parsed.

**3. No new RabbitMQ topology.**
`contact` messages flow through the exact same `message.received` → `OnMessageReceivedHandler` → `messages.exchange`/`messages.upsert` path as every other type. `whatsapp-manager`'s `messagesUpsert.worker.ts` → `ReciveNewMessageUseCase` → `MessageFactory.build()` pipeline is unchanged in shape; only `MessageFactory`'s `switch (message.type)` needs a new `case "contact"`, matching the `case "document"` pattern exactly (currently it `throw`s a `DomainError` for any unhandled type, which is why this must be added rather than silently defaulting).

**4. `whatsapp-manager`'s UI reuses and adapts the existing `contact.vue`/`contactDetailsModal.vue` pair rather than building a new bubble.**
That component already exists, is fully styled to match the other WhatsApp-style bubbles, and already has a "Ver contato" detail modal — but it takes standalone `contactName`/`contactPhone`/`avatarUrl` props and isn't wrapped in `SuportChatMessageGroup`, so it has none of the forward/action-menu/quoted-message/edited-badge behavior the wired-up bubbles (`text.vue`, `document.vue`, etc.) get for free. It's adapted to the `:message="message"` prop pattern (reading `message.toDTO().contact?.display_name` / `.phone`) and wrapped with `SuportChatMessageGroup`, matching `document.vue`'s structure. No avatar photo is available from a vCard message (WhatsApp doesn't send one), so `avatarUrl` is left undefined and `UtilsAvatar`'s existing name-initial fallback applies, same as anywhere else in the app that has no photo yet.

## Risks / Trade-offs

- **[Risk]** The `waid=`/`TEL` regex extraction is best-effort against a loosely-specified vCard text format; some vCards may have no `TEL` line, multiple, or an unusual label. → **Mitigation**: extraction failure just yields an empty `phone` string (never throws), and the UI already handles a missing phone gracefully (`contact.vue:12` — `v-if="contactPhone"`).
- **[Risk]** Migration adds a new enum value + a new table referencing the actively-written `Message` table, in both repos. → **Mitigation**: additive only (new enum value, new nullable 1:1 relation) — no backfill, no lock-heavy rewrite, same low-risk shape as the pending `add_sticker_message_type` migration in this repo.
- **[Trade-off]** `whatsapp-manager`'s `contact.vue` currently has no support for the forward/menu/quoted-message machinery `SuportChatMessageGroup` provides — wrapping it means restyling parts of the standalone bubble markup rather than a drop-in prop rename. Accepted since matching the other bubbles' behavior (forward, delete, reply) is the whole point of wiring it into the real dispatcher instead of leaving it orphaned.
- **[Risk]** `whatsapp-manager` ships on its own schedule, separate from this repo. → **Mitigation**: no coupling at deploy time — until its `MessageFactory` gets the new case, `contact` messages arriving on `messages.exchange` will hit its existing `default: throw new DomainError(...)` per-message (caught by that consumer's existing error handling), the same safe failure mode as any other currently-unsupported type there; nothing in this repo depends on `whatsapp-manager` being updated first.

## Migration Plan

1. Deploy the Prisma migration (`contact` enum value + `MessageContact` table) in this repo — additive, no backfill.
2. Deploy the `IWhatsappAdapter`/`BaileysToWhatpyMapper`/`WhatsappMessageMapper`/`MessageRepository` changes — starts detecting, persisting, and publishing `contact` messages.
3. Separately, in `whatsapp-manager`: apply the matching migration, `MessageFactory` case, repository wiring, and frontend dispatcher/bubble changes (tracked in that repo's own tasks; see proposal Impact and this change's `tasks.md`).
