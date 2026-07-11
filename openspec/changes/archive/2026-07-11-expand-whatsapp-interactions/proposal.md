## Why

The service already sends media, deletes/edits/forwards messages, and reports typing/read state, but one of the features the client actively depends on — marking a message as read — does not work: `BaileysRepository.markAsRead` fabricates a `WAMessageKey` from the raw `number` parameter instead of reusing the key captured off the wire when the message arrived. That synthetic key strips `@g.us` for group chats (the digit-only regex used everywhere else in the file destroys the JID suffix) and can diverge from the exact JID Baileys expects for LID-mapped contacts, so WhatsApp silently drops the read receipt. Every other mutation on an existing message (`editMessage`, `forwardMessage`, `markChatAsRead`) already resolves the original key via `MessageEventLogRepository.findByMessageId(...).payload.key` — `markAsRead` is the one outlier that doesn't follow that pattern.

Beyond the fix, the business goal is for this microservice to cover as much of native WhatsApp's interaction surface as Baileys 7.0.0-rc.9 exposes — starting with reactions ("preciso poder reagir") and extending to presence, chat management, rich content, contact/profile actions, and group administration — all delivered through the same layered pattern already established (`Routes` → `Adapters` → `Controller` → `IMessage`/`IWhatsappAdapter` → `RunAdapterBaileys` → `BaileysRepository` → Baileys socket).

## What Changes

- Fix `markAsRead` to resolve the original message key from `MessageEventLogRepository` (same lookup `editMessage`/`forwardMessage` already use) instead of reconstructing a JID from `number`, so it works for both individual and group chats; harden `markChatAsRead`'s existing fallback the same way.
- Add message reactions: send an emoji reaction to a message and remove a reaction (`sock.sendMessage(jid, { react: { text, key } })`).
- Add message-level actions available in the WhatsApp client but missing here: star/unstar a message, pin/unpin a message inside a chat, delete-a-message-for-me.
- Add presence beyond typing: recording indicator, explicit online/offline presence, and subscribing to a contact's presence/last-seen updates.
- Add chat-level management: archive/unarchive, mute/unmute, delete chat, clear chat history.
- Add rich content sends: location, contact card (vCard), sticker, poll creation.
- Add contact/profile management: block/unblock a contact, update own profile name/status/picture, remove own profile picture.
- Add group management: create group, add/remove/promote/demote participants, update subject/description, fetch metadata, generate/revoke invite link, join via invite code, leave group.
- All new endpoints follow the existing per-tenant session validation (`validateSession`) and HTTP route conventions already used in `MessageRoutes`/`ContactRoutes`.

## Capabilities

### New Capabilities
- `message-receipts`: reliable single-message and whole-chat "mark as read" behavior, backed by the original captured message key instead of a synthesized one.
- `message-reactions`: send and remove emoji reactions on a message.
- `message-actions`: star/unstar, pin/unpin, and delete-for-me actions on an existing message.
- `presence-status`: composing/recording/paused/available/unavailable presence updates and presence subscription.
- `chat-management`: archive/unarchive, mute/unmute, delete, and clear operations on a whole chat.
- `rich-content-messages`: sending location, contact card, sticker, and poll messages.
- `contact-profile-management`: blocking/unblocking contacts and managing the session's own profile name/status/picture.
- `group-management`: creating and administering WhatsApp groups (participants, subject/description, invite links, leave).

### Modified Capabilities
(none — no capabilities have been archived to `openspec/specs/` yet, so the read-receipt fix is tracked as the new `message-receipts` capability rather than a delta.)

## Impact

- `src/infrastructure/repositories/Baileys/BaileysRepository.ts`: fix `markAsRead`, and add the Baileys socket calls backing every capability above (`sendMessage` with `react`/`location`/`contacts`/`sticker`/`poll`/`pin`, `chatModify` for star/archive/mute/delete/clear, `sendPresenceUpdate`/`presenceSubscribe`, `updateBlockStatus`/`updateProfile*`, and the `group*` socket methods).
- `src/infrastructure/repositories/Baileys/RunAdapterBaileys.ts` and `src/domain/repositories/IWhatsappAdapter.ts`: extend the adapter contract with the new operations (including the currently-missing `markChatAsRead`/`sendTyping`/`markAsRead` entries that `RunAdapterBaileys` implements but the interface never declared).
- `src/interfaces/interface/IMessage.ts`, `src/interfaces/controllers/MessageController.ts`, `src/interfaces/adapters/MessageAdapters.ts`, `src/interfaces/routes/MessageRoutes.ts`: new methods/handlers/routes for reactions, message actions, presence, and chat management (same tenant/session-validated pattern as today).
- New controller/adapter/route trio for groups (e.g. `GroupController`/`GroupAdapters`/`GroupRoutes`) and profile/contact additions to the existing `ContactController`/`ContactRoutes`, wired the same way `MessageRoutes` wires `BaileysRepository` today via `container.ts`.
- No Prisma schema changes are required — every new action is a live pass-through to the Baileys socket; existing lookups (`MessageEventLogRepository`, `MessageRepository`) already hold the data needed to resolve original message keys.
- Dependency: `@whiskeysockets/baileys` stays at `^7.0.0-rc.9` (already installed); all new calls use socket methods already present in the installed type definitions.
