## Why

When a message is edited on WhatsApp itself (from the linked phone or another device), Baileys emits a `messages.update` event carrying a `protocolMessage` of type `EDIT` with the new text — but `BaileysConnector.ts` never listens for it (the handler is present only as a commented-out stub that just logs the raw payload). Today the only path that reflects an edited message in `whatsapp-manager`'s UI is the *optimistic* one: the frontend already has a full `EDITED_MESSAGE` WebSocket event, a Pinia store patch, and an "Editada" badge, but that path only fires when a user edits a message from inside the manager app itself (`EditMessageCommandHandler` broadcasts locally after calling this microservice's HTTP `editMessage`). A genuine edit event coming from WhatsApp — including WhatsApp's own confirmation of an edit this microservice just sent — is silently dropped. This closes that gap so any WhatsApp-originated edit is detected, persisted, and relayed end-to-end to the already-built frontend UI.

## What Changes

- Implement the currently-commented-out `messages.update` listener in `BaileysConnector.ts`: detect updates whose `message.protocolMessage.type === proto.Message.ProtocolMessage.Type.EDIT`, extract the target message id (`key.id`) and the new text (`protocolMessage.editedMessage`), and ignore updates that aren't edits (receipts, reactions-as-update, etc. are out of scope).
- Add a new typed domain event `message.edited` to `ITypeSessionEvents`, emitted by `BaileysConnector` the same way `message.received` is today.
- Add `OnMessageEditedHandler` (registered in `session.handlers.ts`, mirroring `OnMessageReceivedHandler`) that:
  - Updates the existing `Message`/`MessageText` row's `body` and marks it edited (new `edited`/`edited_at` columns — requires a Prisma migration, following the pattern of the pending `20260716130104_add_sticker_message_type` migration).
  - Publishes the edit to a new RabbitMQ topology (`messages.edited.exchange` → `messages.edited.queue`, routing key `messages.edited`, with retry + DLQ mirroring the existing `messages.exchange` entry in `RabbitMQRegistry.ts`), reusing the existing `RabbitMQPublisher`.
- If the edited message's original id is not found locally (e.g. history not yet synced), log and skip rather than failing the whole `messages.update` batch, matching the per-message error isolation already used in `bindMessages` for `messages.upsert`.
- **Cross-repo**: `whatsapp-manager` (`/home/gabriel/Documentos/DEV/whatsapp-manager`) needs a new consumer for `messages.edited.queue` (mirroring its existing `messagesUpsert.worker.ts`) that updates its own `Message` record and broadcasts the **already-existing** `EDITED_MESSAGE` WebSocket event (`{ message_id, contact_id, new_text }`) via `SocketGateway.broadcast` — the same contract `EditMessageCommandHandler` already produces today, so no frontend Vue/store/UI changes are needed there. This half of the work is outside this planning tool's edit root and is called out explicitly in `tasks.md` as a separate implementation step in that repo.
- **BREAKING**: none — purely additive; no existing route, queue, or event shape changes.

## Capabilities

### New Capabilities
- `message-edit-detection`: The system SHALL detect when a linked WhatsApp session reports a message edit (`messages.update` with a protocol `EDIT` message), persist the updated text against the existing message record, and publish an edit event so downstream consumers can react to it.

### Modified Capabilities
(none — no existing spec in `openspec/specs/` covers inbound message receipt/update handling today, so nothing here is a requirements change to prior behavior)

## Impact

**microservice-whatsapp** (this repo):
- `src/infrastructure/repositories/Baileys/BaileysConnector.ts` — uncomment/implement the `messages.update` listener (~line 226).
- `src/domain/events/ITypeSessionEvents.ts` — add `message.edited` event shape.
- `src/infrastructure/events/implementation/session.handlers.ts` — register the new handler.
- New: `src/application/handlers/message/OnMessageEditedHandler.ts`.
- `src/domain/repositories/IMessageRepository.ts` / `src/infrastructure/repositories/MessageRepository.ts` — add an `updateMessageText`-style method (update `body` + `edited`/`edited_at`).
- `src/infrastructure/database/prisma/schema.prisma` — add `edited Boolean @default(false)` and `edited_at DateTime?` to `Message`, plus a migration.
- `src/infrastructure/messaging/rabbit/RabbitMQRegistry.ts` — add `messages.edited.exchange`/`messages.edited.queue` topology.

**whatsapp-manager** (`/home/gabriel/Documentos/DEV/whatsapp-manager`, separate repo, implemented outside this tool):
- `server/src/infrastructure/rabbit/RabbitMQRegistry.ts` — add matching `messages.edited.*` consume topology.
- New consumer/worker (mirrors `server/src/infrastructure/workers/messagesUpsert.worker.ts`) for `messages.edited.queue`.
- Reuses existing `EditMessageUseCase`'s repository update path (or a new `ReceiveEditedMessageUseCase`) plus the existing `SocketGateway.broadcast("EDITED_MESSAGE", ...)` call already used by `EditMessageCommandHandler.ts` — no changes needed to `ws/events/handlers/OnEditedMessageEvent.ts`, `store/useContactsStore.ts`, or `components/suport/Chat/message/text.vue`'s "Editada" badge, since that path already works correctly.
