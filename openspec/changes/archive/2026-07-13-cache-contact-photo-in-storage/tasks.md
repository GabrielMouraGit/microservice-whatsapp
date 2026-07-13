## 1. Data model

- [x] 1.1 Update `Contact` in `schema.prisma`: replace the standalone `@unique` on `phone` with `@@unique([tenant_id, phone])`, and generate/apply the Prisma migration.
- [x] 1.2a Add `photo_synced_at DateTime?` to `Contact` in `schema.prisma`, and a migration for it.
- [ ] 1.2b Regenerate the Prisma client (`prisma generate`) so the new composite unique and `photo_synced_at` are available to TypeScript. — **blocked**: `node_modules/.prisma/client` is root-owned in this environment (`EACCES` on `prisma generate`); needs `sudo chown -R $USER:$USER node_modules && npm run prisma:generate` or a container-based regenerate.

## 2. Contact repository

- [x] 2.1 Add `IContactRepository` (domain layer) with `findByPhone(tenant_id, phone)` returning the cached photo + `photo_synced_at` (or null) and `upsertPhoto(tenant_id, phone, name, url_photo)`.
- [x] 2.2 Implement `ContactRepositoryPrisma` (infrastructure layer), modeled on `SessionRepositoryPrisma`, using the `(tenant_id, phone)` composite unique for `findUnique`/`upsert`, setting `photo_synced_at` to now on every `upsertPhoto`.

## 3. Thread tenant_id into the WhatsApp adapter chain

- [x] 3.1 Update `IWhatsappAdapter.getContact` signature to accept `tenant_id`.
- [x] 3.2 Update `RunAdapterBaileys.getContact` to accept and forward `tenant_id`.
- [x] 3.3 Update `ContactController.getContact` to pass `tenant_id` through to `runAdapter.getContact`.

## 4. Durable photo lookup in BaileysRepository

- [x] 4.1 Update `BaileysRepository.getContact` to accept `tenant_id` and, after resolving the contact's `jid`/`exists`, look up a cached `Contact` row via `ContactRepositoryPrisma.findByPhone(tenant_id, number)` before calling `sock.profilePictureUrl`.
- [x] 4.2 If a cached `url_photo` exists **and is within the refresh TTL** (see section 7), return it as `profilePicUrl` directly and skip the WhatsApp `profilePictureUrl` call entirely.
- [x] 4.3 If no cached photo exists (or it's past the TTL), call `sock.profilePictureUrl(jid, "image")`; if it returns a URL, download it with `fetch` (mirroring the buffer pattern already used in `sendVoiceMessage`) and upload the buffer to the storage microservice using the same `POST ${MICROSERVICE_STORAGE}/storage/api/v1/file/add-item` multipart convention (`x-backend-token`, `x-tenant-id` headers) as `mediaUpload.worker.ts`, using a deterministic storage path such as `public/whatsapp/contacts/{tenant_id}/{phone}`.
- [x] 4.4 On a successful upload, upsert the `Contact` row with the returned storage URL (and a fresh `photo_synced_at`) and return that URL as `profilePicUrl`.
- [x] 4.5 On any failure fetching from WhatsApp or uploading to storage, log the error and fall back to the cached `url_photo` if one exists (even if it's the stale row that triggered the refresh attempt), otherwise return `""` — never throw out of `getContact` for this reason.
- [x] 4.6 Confirm the "no cached photo and no WhatsApp picture" path still returns `profilePicUrl: ""`, matching current behavior.

## 5. Tests

- [x] 5.1 Unit test: first-time lookup with a WhatsApp picture downloads, uploads, persists, and returns the storage URL.
- [x] 5.2 Unit test: repeat lookup within the TTL with an existing cached `Contact.url_photo` returns the cached URL and does not call `sock.profilePictureUrl` or the storage upload.
- [x] 5.3 Unit test: no WhatsApp picture and no cache returns `profilePicUrl: ""`.
- [x] 5.4 Unit test: storage upload failure on a first-time lookup (no prior cache) returns `""`, and does not throw.
- [x] 5.5 Unit test: two tenants looking up the same phone number get independent cached/returned photo URLs.

(Added `vitest.config.ts` with `@`/`@config` path-alias resolution — no test previously exercised a module importing those aliases, so this was needed for the suite above to run at all.)

## 6. Verification

- [ ] 6.1 Manually exercise `POST /api/v1/contact/get-contact-by-id` against a real session/contact and confirm the returned `profilePicUrl` resolves to the storage microservice's domain, not `pps.whatsapp.net`/`mmg.whatsapp.net`. — **not run**: no live WhatsApp session or reachable storage microservice in this environment; needs manual verification once 1.2b is unblocked.
- [ ] 6.2 Confirm a second call for the same contact returns the same URL without a new upload appearing in storage. — same blocker as 6.1.

## 7. Periodic photo refresh (TTL)

- [x] 7.1 Add `photo_synced_at` to `IContactRepository.findByPhone`'s return type and have `ContactRepositoryPrisma.upsertPhoto` set it to `new Date()` on every write.
- [x] 7.2 Add a `PROFILE_PHOTO_REFRESH_TTL_MS` constant (90 days) to `BaileysRepository` and an `isPhotoStale(photo_synced_at)` helper treating `null`/older-than-TTL as stale.
- [x] 7.3 In `resolveDurableProfilePicUrl`, only short-circuit on the cached `url_photo` when the cache exists **and is not stale**; a stale (or missing) cache falls through to the WhatsApp fetch + storage upload + re-upsert path, resetting `photo_synced_at`.
- [x] 7.4 On a failed refresh (WhatsApp fetch fails/empty, or storage upload fails) of a *stale* cached contact, fall back to the existing (stale) `url_photo` instead of clearing it or throwing.
- [x] 7.5 Unit test: a cached photo older than the TTL is refreshed from WhatsApp and re-cached with a new `photo_synced_at`.
- [x] 7.6 Unit test: a failed refresh of a stale cached photo falls back to the old cached URL and does not call `upsertPhoto`.
- [x] 7.7 Unit test: a stale cached photo whose WhatsApp picture has disappeared (contact removed/hid their photo) falls back to the old cached URL without attempting a storage call.
