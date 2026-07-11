## 1. Adapter contract cleanup (prerequisite)

- [x] 1.1 Add the already-implemented-but-undeclared methods (`markChatAsRead`, `sendTyping`, `markAsRead`) to `src/domain/repositories/IWhatsappAdapter.ts` so the interface matches what `RunAdapterBaileys` implements before new methods are added.
- [x] 1.2 Confirm `tsc`/build passes with no new interface-implementation mismatches after this cleanup.

## 2. Fix message read receipts (`message-receipts`)

- [x] 2.1 In `BaileysRepository.markAsRead`, look up the stored `WAMessage` via `messageEventLogRepository.findByMessageId(messageId)` and use its `payload.key` (same pattern as `editMessage`/`forwardMessage`) when calling `sock.readMessages(...)`.
- [x] 2.2 If no stored key is found, fall back to today's synthesized key for individual chats, but return a clear error instead of a silent no-op when the target chat is a group (`@g.us`) and no stored key exists.
- [x] 2.3 Extract the "resolve chat's most recent stored `WAMessage` key + timestamp" logic already in `markChatAsRead` into a small shared helper on `BaileysRepository` (e.g. `resolveLastMessageKey(jid)`), reusing it in task 2.1's fallback and later in chat-management tasks (delete/clear chat, group 6).
- [ ] 2.4 Manually verify against a real group and a real 1:1 chat: send a message to the connected number/group, call mark-as-read, and confirm the blue double-check / read receipt appears in the WhatsApp client. *(Needs a live authenticated WhatsApp session — not available in this environment; please verify manually.)*

## 3. Message reactions (`message-reactions`)

- [x] 3.1 Add `sendReaction(sessionId, number, messageId, emoji)` and `removeReaction(sessionId, number, messageId)` to `BaileysRepository`, resolving the target message's key via `messageEventLogRepository.findByMessageId` and calling `sock.sendMessage(jid, { react: { text: emoji, key } })` (empty `text` to remove).
- [x] 3.2 Add both methods to `IWhatsappAdapter` and implement them in `RunAdapterBaileys`.
- [x] 3.3 Add `sendReaction`/`removeReaction` to `IMessage` and `MessageController` (with `validateSession`).
- [x] 3.4 Add `httpSendReaction`/`httpRemoveReaction` to `MessageAdapters` and register `POST /api/v1/message/send-reaction` and `POST /api/v1/message/remove-reaction` in `MessageRoutes`.
- [ ] 3.5 Manually verify: react to a real message from the API and confirm the emoji reaction shows in the WhatsApp client; remove it and confirm it disappears. *(Needs a live WhatsApp session; please verify manually.)*

## 4. Message actions: star, pin, delete-for-me (`message-actions`)

- [x] 4.1 Add `starMessage(sessionId, number, messageId, fromMe, star)` to `BaileysRepository` using `sock.chatModify({ star: { messages: [{ id: messageId, fromMe }], star } }, jid)`.
- [x] 4.2 Add `pinMessage(sessionId, number, messageId, pin)` resolving the message key via `messageEventLogRepository.findByMessageId`, then `sock.sendMessage(jid, { pin: key, type: pin ? proto.PinInChat.Type.PIN_FOR_ALL : proto.PinInChat.Type.UNPIN_FOR_ALL })` (confirmed against the installed `baileys` proto types: `proto.PinInChat.Type.{PIN_FOR_ALL,UNPIN_FOR_ALL}` exist).
- [x] 4.3 Add `deleteMessageForMe(sessionId, number, messageId, fromMe)` using `sock.chatModify({ deleteForMe: { key, timestamp, deleteMedia: false } }, jid)`, resolving `key`/`timestamp` from the stored message.
- [x] 4.4 Wire all three through `IWhatsappAdapter` → `RunAdapterBaileys` → `IMessage`/`MessageController` → `MessageAdapters` → `MessageRoutes` (`/api/v1/message/star-message`, `/api/v1/message/pin-message`, `/api/v1/message/delete-for-me`), following the same shape as tasks 3.2–3.4.
- [ ] 4.5 Manually verify star, pin, and delete-for-me against a real chat and confirm each reflects correctly in the WhatsApp client (star icon, pinned banner, message gone locally but still present for the other party). *(Needs a live WhatsApp session; please verify manually.)*

## 5. Presence status (`presence-status`)

- [x] 5.1 Add `sendRecording(sessionId, number)` to `BaileysRepository`, mirroring the existing `sendTyping` (composing → delay → paused, but with `"recording"`).
- [x] 5.2 Add `setOwnPresence(sessionId, presence: "available" | "unavailable")` calling `sock.sendPresenceUpdate(presence)` with no `toJid` (session-wide).
- [x] 5.3 Add `subscribePresence(sessionId, number)` calling `sock.presenceSubscribe(jid)`.
- [x] 5.4 Wire through `IWhatsappAdapter` → `RunAdapterBaileys` → `IMessage`/`MessageController` → `MessageAdapters` → `MessageRoutes` (`/api/v1/message/send-recording`, `/api/v1/session/presence`, `/api/v1/message/subscribe-presence` — the session-wide presence route was placed on `SessionRoutes` instead of `MessageRoutes` since it isn't chat-scoped).
- [ ] 5.5 Manually verify typing/recording indicators and presence subscription against a real chat. *(Needs a live WhatsApp session; please verify manually.)*

## 6. Chat-level management (`chat-management`)

- [x] 6.1 Add `archiveChat(sessionId, number, archive: boolean)` using the shared `resolveLastMessageKey` helper (task 2.3) and `sock.chatModify({ archive, lastMessages }, jid)`.
- [x] 6.2 Add `muteChat(sessionId, number, durationMs: number | null)` using `sock.chatModify({ mute: durationMs }, jid)`.
- [x] 6.3 Add `deleteChat(sessionId, number)` using the shared last-message helper and `sock.chatModify({ delete: true, lastMessages }, jid)`.
- [x] 6.4 Add `clearChat(sessionId, number)` using the shared last-message helper and `sock.chatModify({ clear: true, lastMessages }, jid)`.
- [x] 6.5 Wire all four through `IWhatsappAdapter` → `RunAdapterBaileys` → `IMessage`/`MessageController` → `MessageAdapters` → `MessageRoutes` (`/api/v1/message/archive-chat`, `/mute-chat`, `/delete-chat`, `/clear-chat`).
- [ ] 6.6 Manually verify each action against a real chat and confirm it reflects in the WhatsApp client's chat list. *(Needs a live WhatsApp session; please verify manually.)*

## 7. Rich content messages (`rich-content-messages`)

- [x] 7.1 Add `sendLocation(sessionId, number, latitude, longitude, name?, address?, quoted_id?)` to `BaileysRepository` reusing `sendMessageCore` with `{ location: { degreesLatitude, degreesLongitude, name, address } }`.
- [x] 7.2 Add `sendContact(sessionId, number, displayName, vcard, quoted_id?)` reusing `sendMessageCore` with `{ contacts: { displayName, contacts: [{ displayName, vcard }] } }`.
- [x] 7.3 Add `sendSticker(sessionId, number, url, isAnimated?, quoted_id?)` reusing `sendMessageCore` with `{ sticker: { url }, isAnimated }`.
- [x] 7.4 Add `sendPoll(sessionId, number, name, values: string[], selectableCount, quoted_id?)` reusing `sendMessageCore` with `{ poll: { name, values, selectableCount } }`.
- [x] 7.5 Wire all four through `IWhatsappAdapter` → `RunAdapterBaileys` → `IMessage`/`MessageController` → `MessageAdapters` → `MessageRoutes` (`/api/v1/message/send-location`, `/send-contact`, `/send-sticker`, `/send-poll`), each returning `{ message_id }` like the existing send-* routes.
- [ ] 7.6 Manually verify each content type renders correctly in the WhatsApp client (map preview for location, contact card, sticker tray entry, poll with selectable options). *(Needs a live WhatsApp session; please verify manually.)*

## 8. Contact and own-profile management (`contact-profile-management`)

- [x] 8.1 Add `blockContact(sessionId, number)` / `unblockContact(sessionId, number)` to `BaileysRepository` using `sock.updateBlockStatus(jid, "block" | "unblock")`.
- [x] 8.2 Add `updateProfileName(sessionId, name)`, `updateProfileStatus(sessionId, status)`, `updateProfilePicture(sessionId, url)`, and `removeProfilePicture(sessionId)` using `sock.updateProfileName`, `sock.updateProfileStatus`, `sock.updateProfilePicture(sock.user.id, { url })`, and `sock.removeProfilePicture(sock.user.id)` respectively.
- [x] 8.3 Add `getContactStatus(sessionId, number)` using `sock.fetchStatus(jid)`, returning an empty result when not visible/not set instead of throwing.
- [x] 8.4 Add these methods to `IWhatsappAdapter`, implement in `RunAdapterBaileys`, then extend `src/interfaces/interface/IContact.ts`, `ContactController`, `ContactAdapters`, and register routes on `ContactRoutes` (`/api/v1/contact/block`, `/unblock`, `/status`) and on `SessionRoutes` (`/api/v1/session/profile-name`, `/profile-status`, `/profile-picture`, `/profile-picture/remove`, `/presence`) since those act on the session's own account, not a contact.
- [ ] 8.5 Manually verify blocking/unblocking a real test contact and updating the session's own name/status/picture, confirming changes appear in the WhatsApp client. *(Needs a live WhatsApp session; please verify manually.)*

## 9. Group management (`group-management`)

- [x] 9.1 Add group methods to `BaileysRepository`: `createGroup(sessionId, subject, participantNumbers)`, `addParticipants`/`removeParticipants`/`promoteParticipants`/`demoteParticipants(sessionId, groupJid, participantNumbers)` (via `sock.groupParticipantsUpdate` with the matching `ParticipantAction`), `updateGroupSubject`, `updateGroupDescription`, `getGroupMetadata`, `getGroupInviteCode`/`revokeGroupInvite`, `joinGroupViaInvite(sessionId, code)`, `leaveGroup(sessionId, groupJid)`.
- [x] 9.2 Add all group methods to `IWhatsappAdapter` and implement in `RunAdapterBaileys`.
- [x] 9.3 Create `src/interfaces/interface/IGroup.ts`, `src/interfaces/controllers/GroupController.ts` (with the same `validateSession(tenant_id, sessionId)` guard as `MessageController`), `src/interfaces/adapters/GroupAdapters.ts`, and `src/interfaces/routes/GroupRoutes.ts`, wired the same way `MessageRoutes.ts` wires `BaileysRepository`/`RunAdapterBaileys` via `container.ts`.
- [x] 9.4 Register routes: `POST /api/v1/group/create`, `/add-participants`, `/remove-participants`, `/promote-participants`, `/demote-participants`, `/update-subject`, `/update-description`, `/metadata`, `/invite-code`, `/revoke-invite`, `/join`, `/leave`.
- [x] 9.5 Register `GroupRoutes` in `server.ts` alongside the other route modules (`MessageRoutes`, `ContactRoutes`, `SessionRoutes`, `TenantRoutes`).
- [ ] 9.6 Manually verify against a real test group: create a group, add/remove/promote/demote a participant, rename it, fetch its invite link, join a second test session via that link, and leave the group — confirming each step in the WhatsApp client. *(Needs live WhatsApp sessions; please verify manually.)*

## 10. Final verification

- [x] 10.1 Run the existing test suite (`tests/RabbitMQ.integration.test.ts` and any others) and `tsc`/lint to confirm nothing regressed. `tsc --noEmit` and `eslint` are clean on all touched files (pre-existing, unrelated errors remain: `@types/mocha` global conflicts, missing `ws`/`fluent-ffmpeg` type declarations). The RabbitMQ integration test fails the same way before and after this change — it needs a live RabbitMQ broker not present in this environment.
- [ ] 10.2 Re-run the mark-as-read manual check from task 2.4 one more time end-to-end after all other changes land, to confirm the original reported bug stays fixed. *(Needs a live WhatsApp session; please verify manually.)*
- [x] 10.3 Update `readme.md` with the new endpoints added across sections 3–9.
