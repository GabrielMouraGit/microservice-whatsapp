## Context

`BaileysRepository.getContact(sessionId, number)` calls `sock.profilePictureUrl(jid, "image")` and returns whatever Baileys hands back directly as `profilePicUrl`. That URL is a signed WhatsApp CDN link with a limited lifetime; once it expires, any photo a consumer cached or rendered from a prior response goes dead.

The service already has a working pattern for making WhatsApp media durable: `stageMessageMedia` (BaileysConnector) downloads a message's media to local disk, then `media.upload.queue` (`src/workers/mediaUpload.worker.ts`) uploads it to the storage microservice via `POST ${MICROSERVICE_STORAGE}/storage/api/v1/file/add-item` (multipart `file` + `path`, headers `x-backend-token` and `x-tenant-id`), returning `{ url }`. That flow is async (queued) because it runs off the back of an inbound message event with no caller waiting on a response.

`getContact` is different: it's a synchronous request/response endpoint (`POST /api/v1/contact/get-contact-by-id`), so the upload has to happen inline before responding — there's no natural place to defer it to a queue without either returning a stale/empty photo on the first call or making the caller poll.

The `Contact` Prisma model (`id`, `phone` unique, `name`, `url_photo`, `tenant_id`) already exists in `schema.prisma` but nothing reads or writes it today.

## Goals / Non-Goals

**Goals:**
- `getContact` responses never contain a WhatsApp CDN URL — only a storage-service URL or `""`.
- The WhatsApp→storage download/upload round trip happens at most once per contact per TTL window (not on every `getContact` call), using the `Contact` table as a cache.
- A contact's storage-hosted photo eventually reflects a real WhatsApp photo change, bounded by a fixed TTL (~3 months), without needing per-change detection.
- Reuse the existing storage upload convention (endpoint, headers, multipart shape) rather than inventing a new one.
- Graceful degradation: a storage/network failure during the refresh must not turn a working cached photo into an error or an empty result.

**Non-Goals:**
- Detecting a photo *change* without waiting for the TTL — there's no cheap way to ask WhatsApp "has this contact's picture changed" (no ETag/hash from Baileys), so freshness is time-based (see Decision 8), not change-based.
- Deleting/cleaning up the *previous* storage file when a refresh replaces it (upload path is deterministic per contact, so a refresh overwrites the same storage object rather than accumulating orphans — see Decision 7 — but if the storage service ever keys by content hash instead of path, cleanup would need revisiting).
- Changing `updateProfilePicture`/`removeProfilePicture` (the *own account* profile picture flow) — that already uploads user-supplied URLs and is unaffected.
- Backfilling `url_photo` for contacts that were looked up before this change ships.

## Decisions

**1. Cache lookup key: `(tenant_id, phone)` via the existing `Contact` model, not `jid`.**
`phone` is already the unique column and is what the controller receives from the caller before any WhatsApp round trip, so it can be checked before touching Baileys at all... but the WhatsApp `exists`/`jid` check still has to run first to know whether the contact resolves at all (existing behavior returns `exists: false` early). So the read order stays: resolve contact via Baileys → look up cached `Contact` row by `phone` (+`tenant_id`) → if present, prefer the cache and skip the download/upload entirely.
Alternative considered: key by `jid`. Rejected — `phone` is already the natural unique identifier the caller supplies and the schema already has a unique constraint on it; `jid` would require a schema change and doesn't survive number-normalization differences (`findContact`'s retry with the leading-9 stripped).

**2. Cache is a TTL-based cache, not "first write wins forever".**
If `Contact.url_photo` exists for `(tenant_id, phone)` **and** was synced within the TTL (Decision 8), return it as-is and skip calling `sock.profilePictureUrl` entirely — this also saves the WhatsApp call, not just the storage upload. If no row exists, or `url_photo` is null, or the cached row is past the TTL, fetch from WhatsApp, and if that returns a picture, download + upload + upsert the `Contact` row (resetting the TTL clock).
Alternative considered: always fetch from WhatsApp and only skip the *upload* if unchanged. Rejected — Baileys' `profilePictureUrl` gives no cheap way to detect "same photo" (no ETag/hash), so "unchanged" would require downloading the image anyway, which defeats the point of caching. A time-based TTL is a much cheaper proxy for "might have changed" and is what Decision 8 implements.

**3. Upload happens inline (synchronous), not via the `media.upload.queue`.**
`getContact` is a request/response HTTP call; the client is waiting for `profilePicUrl` in the response body, so the upload must complete (or be judged unavailable) before responding. This reuses the same storage HTTP call the worker makes, just invoked directly instead of via RabbitMQ.
Alternative considered: return the WhatsApp URL immediately and upload asynchronously, patching `Contact.url_photo` for next time. Rejected — the first response would still leak an expiring WhatsApp URL, which is exactly the bug being fixed.

**4. Download uses plain `fetch` (mirrors `sendVoiceMessage`'s `await fetch(url)` → buffer), not `downloadMediaMessage`.**
`sock.profilePictureUrl` already returns a plain HTTPS image URL (no `mediaKey`/`directPath` envelope like message attachments), so it doesn't need Baileys' encrypted-media download path — a direct `fetch` + `arrayBuffer()` is sufficient and is already an established pattern in `BaileysRepository`.

**5. Failure handling: storage upload/download errors fall back to the cached value, never throw.**
- WhatsApp fetch fails or returns nothing → return the cached `url_photo` if one exists (even if stale — a stale photo beats no photo), else `""`.
- WhatsApp fetch succeeds but the storage download/upload fails → log and return the cached `url_photo` if one exists (even if stale), else `""`. `getContact` must not fail just because the storage microservice is temporarily down.
- This means a *stale* cached row is never dropped just because a refresh attempt failed — the old (still-hosted) storage URL keeps being returned until a refresh actually succeeds. Only a brand-new contact with no cache at all and a failed first fetch/upload returns `""`.

**6. `tenant_id` threading.**
`BaileysRepository.getContact` currently only takes `(sessionId, number)`. `tenant_id` is required for both the `Contact` row (multi-tenant unique-by-phone isn't safe without it — the schema's `phone` unique constraint is actually global, see Risk below) and the storage upload's `x-tenant-id` header. It's threaded through `IWhatsappAdapter.getContact` → `RunAdapterBaileys.getContact` → `BaileysRepository.getContact`, sourced from `ContactController` where it's already available (`validateSession` already receives it).

**7. New `IContactRepository` / `ContactRepositoryPrisma`, modeled on `SessionRepositoryPrisma`.**
Two methods: `findByPhone(tenant_id, phone)` (returns `url_photo` + `photo_synced_at`) and `upsertPhoto(tenant_id, phone, name, url_photo)` (sets `photo_synced_at` to now). Kept minimal — no update/delete beyond what this flow needs.

**8. Freshness is TTL-based: `photo_synced_at` + a fixed 90-day window.**
`Contact` gets a `photo_synced_at DateTime?` column, set every time `upsertPhoto` runs. On lookup, a cached row is considered stale if `photo_synced_at` is null or older than `PROFILE_PHOTO_REFRESH_TTL_MS` (90 days, a constant on `BaileysRepository`). A stale row still triggers a refresh attempt (WhatsApp fetch → storage upload → upsert with a fresh `photo_synced_at`), but per Decision 5, a failed refresh falls back to the still-stale cached URL rather than clearing it — so a temporary WhatsApp/storage outage during the refresh window doesn't blank out an otherwise-working photo.
Alternative considered: refresh on every `getContact` call and diff against the previous upload (content hash). Rejected — same reasoning as Decision 2: no cheap way to know if the photo changed without downloading it first, which defeats the caching goal. A 90-day TTL was chosen as a reasonable "good enough, cheap enough" default (contacts rarely change their photo more often than that) rather than making it configurable up front — YAGNI until there's a concrete need to tune it per tenant.
Alternative considered: a background job that proactively refreshes all cached contacts on a schedule. Rejected for this change — adds a new scheduled-job concept to the service for a problem that lazy, on-read refresh already solves adequately (the cost of a stale photo is bounded by the TTL either way, and most contacts are looked up periodically anyway via normal traffic).

## Risks / Trade-offs

- [`Contact.phone` is `@unique` globally, not `@@unique([tenant_id, phone])`] → Two tenants messaging the same phone number would collide/overwrite each other's cached photo. Mitigation: this change updates the schema to a composite unique `@@unique([tenant_id, phone])` (migration required) since the existing global-unique constraint is a pre-existing bug that this feature would otherwise silently inherit.
- [First lookup per contact is slower — adds a WhatsApp fetch + download + storage upload to the request path] → Acceptable one-time cost; every subsequent `getContact` for that contact is now cache-only (faster than today, since it also skips the `profilePictureUrl` call).
- [Storage microservice outage during a first-time lookup] → `profilePicUrl` degrades to `""` (same as WhatsApp having no picture) rather than failing the request; logged for visibility.
- [A contact's real WhatsApp photo can change and won't be reflected until the 90-day TTL elapses] → Accepted trade-off (Decision 8); bounded staleness rather than unbounded. If a shorter window turns out to be needed for some tenants, the TTL constant is the single place to change (or promote to config later).
- [First lookup per contact — and every refresh every ~90 days — is slower, adding a WhatsApp fetch + download + storage upload to the request path] → Acceptable one-time/periodic cost; all other `getContact` calls for that contact are cache-only (faster than today, since it also skips the `profilePictureUrl` call).
- [Storage microservice outage during a first-time lookup with no prior cache] → `profilePicUrl` degrades to `""` (same as WhatsApp having no picture) rather than failing the request; logged for visibility. (An outage during a *refresh* of an already-cached contact is safe — Decision 5 falls back to the stale-but-still-hosted URL.)
- [Storage path collisions] → Use a deterministic path per contact, e.g. `public/whatsapp/contacts/{tenant_id}/{phone}`, so repeated uploads (first-time or TTL refresh) for the same contact overwrite rather than accumulate orphaned files.

## Migration Plan

1. Prisma migration: add `@@unique([tenant_id, phone])` to `Contact` (and drop the standalone `@unique` on `phone`); add `photo_synced_at DateTime?`.
2. Ship `IContactRepository` / `ContactRepositoryPrisma` and wire it into `ContactController`/`BaileysRepository` alongside the `tenant_id` threading — no data backfill needed since the table is currently empty in practice (unused).
3. No rollback complexity beyond a standard migration revert: the feature is additive to `getContact`'s response shape (`profilePicUrl` stays a `string`), so no API contract changes for consumers beyond the URL's host.

## Open Questions

- Should the 90-day TTL become tenant-configurable, or an env var, if usage shows contacts change photos more/less often than assumed? Left as a follow-up; the constant is isolated on purpose to make this cheap later.
- Should storage files ever need explicit cleanup (e.g. if the storage microservice starts keying uploads by content hash instead of a deterministic path)? Not applicable today since refreshes overwrite the same path, but worth revisiting if that assumption changes.
