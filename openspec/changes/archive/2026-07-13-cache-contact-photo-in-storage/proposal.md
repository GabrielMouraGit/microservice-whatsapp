## Why

`getContact` currently returns WhatsApp's own CDN URL (`profilePictureUrl`) as `profilePicUrl`. That URL is a signed, time-limited link — after a while it stops resolving, so any contact photo a consumer stored or displayed from a previous lookup silently breaks. The service already solves this exact problem for inbound media messages (`mediaUpload.worker.ts` re-hosts WhatsApp media through the internal storage microservice), but `getContact` never got the same treatment, and the `Contact` table that could cache the result already exists in `schema.prisma` (`url_photo`) but is unused by any code.

## What Changes

- `getContact` downloads the contact's current WhatsApp profile picture and uploads it to the storage microservice (same `MICROSERVICE_STORAGE` `/storage/api/v1/file/add-item` endpoint and header convention already used by the media upload worker), returning the storage service's durable URL as `profilePicUrl` instead of the raw WhatsApp CDN link.
- A `Contact` record (unique per `tenant_id` + `phone`) is read before calling WhatsApp and written after a successful upload, so a photo already uploaded for that contact is reused on the next lookup instead of being re-downloaded/re-uploaded on every request.
- The cached photo is refreshed automatically once it's older than 90 days (~3 months): the next lookup after that window re-downloads from WhatsApp and re-uploads, so a contact who changes their WhatsApp photo eventually shows up with the new one, without needing per-change detection.
- `tenant_id` is threaded through `RunAdapterBaileys.getContact` → `BaileysRepository.getContact` (it's already available in `ContactController`, it just isn't passed down today) so the storage upload can be tagged with `x-tenant-id`.
- If WhatsApp has no profile picture available (private settings, fetch failure, contact doesn't exist) and there is no cached `url_photo`, `profilePicUrl` stays `""`, same as today.
- If the WhatsApp fetch or storage upload fails — whether on a first-time lookup or a 90-day refresh — `getContact` falls back to any previously cached `url_photo` (even if it's past the refresh window) rather than failing the whole request or leaking a raw (soon-to-expire) WhatsApp URL. Only a contact with no cache at all and a failing first attempt gets an empty `profilePicUrl`.
- **BREAKING**: `profilePicUrl` values now point to the storage microservice's domain instead of `pps.whatsapp.net` / `mmg.whatsapp.net`. Any consumer that whitelists or pattern-matches the old WhatsApp CDN host must be updated.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `contact-profile-management`: adds a requirement that fetching a contact's profile photo returns a durable, storage-service-hosted URL (persisted and reused across lookups) instead of WhatsApp's expiring CDN URL.

## Impact

- `src/infrastructure/repositories/Baileys/BaileysRepository.ts` — `getContact` gains the download/cache/upload flow and a `tenant_id` parameter.
- `src/infrastructure/repositories/Baileys/RunAdapterBaileys.ts`, `src/domain/repositories/IWhatsappAdapter.ts` — thread `tenant_id` through the `getContact` signature.
- `src/interfaces/controllers/ContactController.ts` — pass `tenant_id` to `runAdapter.getContact`.
- New `IContactRepository` + `ContactRepositoryPrisma` (mirroring the existing `SessionRepositoryPrisma` pattern) backed by the existing `Contact` Prisma model.
- Reuses the `MICROSERVICE_STORAGE` / `MICROSERVICE_STORAGE_TOKEN` config and the multipart upload convention already implemented in `src/workers/mediaUpload.worker.ts`.
- Adds a synchronous outbound HTTP round-trip (download from WhatsApp + upload to storage) to `getContact` the first time a given contact's photo is requested, and again roughly every 90 days per contact; all other requests for the same contact hit the cached `url_photo` and skip both calls.
- `Contact` gains a `photo_synced_at` column (via migration) to track cache freshness.
