Tasks prefixed **[whatsapp-manager]** apply to the separate repo at `/home/gabriel/Documentos/DEV/whatsapp-manager`, which is outside this OpenSpec planning tool's edit root and must be implemented there directly (this tasks.md is the shared contract reference for that work). All other tasks apply to this repo (`microservice-whatsapp`).

## 1. Schema

- [x] 1.1 Add `edited Boolean @default(false)` and `edited_at DateTime?` to the `Message` model in `src/infrastructure/database/prisma/schema.prisma`
- [x] 1.2 Generate and apply the Prisma migration (`prisma migrate dev`), following the naming pattern of the existing `20260716130104_add_sticker_message_type` migration

## 2. RabbitMQ topology

- [x] 2.1 Add `messages.edited.exchange` → `messages.edited.queue` (routing key `messages.edited`) with retry queue + DLQ to `src/infrastructure/messaging/rabbit/RabbitMQRegistry.ts`, mirroring the existing `messages.exchange` entry

## 3. Event plumbing

- [x] 3.1 Add `message.edited: { sessionId: string; tenantId: string; messageId: string; newText: string; editedAt: Date }` to `src/domain/events/ITypeSessionEvents.ts`
- [x] 3.2 Implement the `sock.ev.on("messages.update", ...)` listener in `BaileysConnector.bindMessages` (`src/infrastructure/repositories/Baileys/BaileysConnector.ts`, replacing the commented-out stub around line 226): iterate updates, skip any whose `message?.protocolMessage?.type !== proto.Message.ProtocolMessage.Type.MESSAGE_EDIT`, extract new text from `protocolMessage.editedMessage` (mirroring how `BaileysToWhatpyMapper` extracts text for `messages.upsert`), and emit `this.events.emit("message.edited", {...})` per detected edit
- [x] 3.3 Wrap each update's processing in its own try/catch (matching the per-message isolation already used in the `messages.upsert` listener) so one malformed update doesn't abort the batch

## 4. Persistence + publish handler

- [x] 4.1 Add `updateMessageText(messageId: string, tenantId: string, sessionId: string, newText: string): Promise<boolean>` to `IMessageRepository` and implement it in `MessageRepository.ts` (Prisma `update` on `Message`/`MessageText`, setting `edited: true`, `edited_at: now()`; return `false`/throw a distinguishable not-found error when no row matches so the handler can skip cleanly)
- [x] 4.2 Add `src/application/handlers/message/OnMessageEditedHandler.ts` (mirrors `OnMessageReceivedHandler.ts`): calls `messageRepo.updateMessageText(...)`, and on success publishes `{ message_id, tenant_id, session_id, new_text, edited_at }` to `messages.edited.exchange` / routing key `messages.edited` via the existing `RabbitMQPublisher`; on not-found, logs and returns without publishing
- [x] 4.3 Register the handler in `src/infrastructure/events/implementation/session.handlers.ts`: `eventBus.on("message.edited", (e) => onMessageEditedHandler.handle(e))`

## 5. [whatsapp-manager] Consume-side topology

- [x] 5.1 Add `messages.edited.exchange` → `messages.edited.queue` entry to `server/src/infrastructure/rabbit/RabbitMQRegistry.ts` (consume target; same topology as this repo's registry for consistency)

## 6. [whatsapp-manager] Edited-message consumer and broadcast

- [x] 6.1 Add a new worker `server/src/infrastructure/workers/messagesEdited.worker.ts` (mirrors `messagesStatus.worker.ts`) that consumes `messages.edited.queue`
- [x] 6.2 Resolve `contact_id` directly from the updated `Message` row (`IMessageRepository.applyRemoteEdit` selects `contact_id` off the existing FK and returns it alongside the update, mirroring `updateMessageStatus`'s `{ contact_id } | null` pattern) rather than a separate contact lookup — simpler than going through `ReciveNewMessageUseCase`'s phone-based resolution since the message row already carries its `contact_id`
- [x] 6.3 Update the local `Message` record's text and `edited` flag via the new `IMessageRepository.applyRemoteEdit` method (added alongside, not replacing, the existing `updateMessageText` used by `EditMessageUseCase`, to avoid changing that method's throw-on-not-found contract)
- [x] 6.4 Broadcast the existing `EDITED_MESSAGE` event via `SocketGateway.broadcast("EDITED_MESSAGE", tenant_id, { message_id, contact_id, new_text })` — the exact contract `EditMessageCommandHandler.ts` already produces, so no changes were needed in `ws/events/handlers/OnEditedMessageEvent.ts`, `store/useContactsStore.ts`, or `components/suport/Chat/message/text.vue`
- [x] 6.5 Wired the new worker's startup into `websocket.bootstrap.ts` alongside `startMessagesStatusWorker`

## 7. Verification

- [ ] 7.1 Manually edit a message from the linked WhatsApp phone app (not from the manager UI) and confirm this repo logs the detected edit, updates the `Message` row, and publishes to `messages.edited.queue`
- [ ] 7.2 [whatsapp-manager] Confirm the new consumer picks up that event and the manager UI shows the updated text with the "Editada" badge in real time, without a page refresh
- [ ] 7.3 Edit a message from inside the manager UI itself and confirm the WhatsApp-side edit confirmation (now flowing through this new path too) does not cause any visible glitch or duplicate badge, per the idempotency note in design.md
- [ ] 7.4 Edit a message whose original was not found locally (e.g. simulate by editing a message older than the sync window) and confirm the system logs and skips without error, and without publishing a malformed event
- [ ] 7.5 Confirm a single `messages.update` batch containing one malformed/unsupported update alongside a valid edit still processes the valid edit correctly
