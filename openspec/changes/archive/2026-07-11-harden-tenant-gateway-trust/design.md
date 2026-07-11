## Context

This service manages multi-tenant WhatsApp sessions (via `@whiskeysockets/baileys`) behind Kong, mounted at `/whatsapp-service`. It's already fully tenant-scoped at the data and use-case layers: every `Session`/`Message*`/`Contact` row carries `tenant_id`, and controllers (`SessionController`, `MessageController`, `ContactController`) explicitly check `session.tenant_id === tenant_id` before acting. The one missing piece is that `request.auth.tenant_id` — the value all of that isolation logic depends on — currently comes from an unverified `x-tenant-id` header, set by `src/interfaces/plugins/HandlerAuth.ts`:

```ts
fastify.addHook("preHandler", async (request: FastifyRequest) => {
  const tenant_id = request.headers["x-tenant-id"] as string;
  const user_id = request.headers["x-user-id"] as string;
  request.auth = { tenant_id, user_id };
});
```

Anyone able to reach this service directly can set that header to any value and the tenant-isolation checks downstream will faithfully enforce isolation — for the wrong tenant.

The reference implementation for "trust Kong, but verify the request actually came through Kong" already exists in the sibling project `/home/gabriel/Documentos/DEV/microservices-auth`, in its own `src/interfaces/plugins/HandlerAuth.ts` — it checks `x-auth-required === "true"`, then requires `x-gateway-secret === $config.GATEWAY_SECRET_AUTH`, then requires `x-tenant-id` present, rejecting with 401 otherwise. This service already has `GATEWAY_SECRET_AUTH` defined in `config/config.ts` and `.env` (value `token123`, matching `microservices-auth`'s own secret) — it's simply never read anywhere in `src/`.

Kong's `my-auth` Lua plugin (which sets these headers after validating a Keycloak JWT) is currently applied only to the auth service's own route, not to this service's routes — wiring that is explicitly out of scope for this change, per prior decision. `microservices-ia` has the byte-identical unhardened `HandlerAuth.ts` and gets the same fix as a parallel, separately-tracked change in that repo.

## Goals / Non-Goals

**Goals:**
- Close the header-spoofing gap: a request setting `x-auth-required: true` must also present a correct `x-gateway-secret` to be trusted, exactly matching the auth service's own pattern.
- Make the fix safe to deploy immediately, independent of Kong wiring status.

**Non-Goals:**
- Wiring Kong's `my-auth` plugin (or any Kong config) to this service's routes — separate, explicitly deferred effort.
- Validating JWTs directly in this service, or doing anything with the installed-but-unused `jsonwebtoken`/`jwks-rsa` packages.
- Changing the `Tenant`/`Session`/`Message*`/`Contact` Prisma schema or the existing per-request `session.tenant_id === tenant_id` isolation checks — they're already correct given a trustworthy `tenant_id`.

## Decisions

**1. Port the auth service's exact conditional pattern (`if x-auth-required` then enforce) rather than making the gateway-secret check unconditional.**
Kong does not currently send `x-auth-required` for this service's routes. Unconditional enforcement would immediately 401 all current production traffic (QR pairing, message sending, session management) the moment this deploys, since nothing today sends that header. The conditional form is non-breaking today and activates automatically, with no further app deploy, the instant Kong is wired to send `x-auth-required`/`x-gateway-secret` for these routes — and it keeps this service byte-for-byte consistent with the auth service's reference pattern and with the identical fix being applied to `microservices-ia`.

**2. No config changes needed here, unlike the `microservices-ia` counterpart change.**
`GATEWAY_SECRET_AUTH` is already wired end-to-end in this repo (`config/config.ts`, `.env`, `env-example`, `docker-compose.yml`) with a value matching `microservices-auth`. The only gap is that `HandlerAuth.ts` never reads it.

**3. Leave the unused `jsonwebtoken`/`jwks-rsa` dependencies alone.**
They're vestigial (likely from an earlier self-validating-JWT design) but removing them is unrelated dependency cleanup, not an authorization fix, and risks scope creep into something the user didn't ask for. Flagged in the proposal's Impact section for visibility.

## Risks / Trade-offs

- [Conditional check means "hardening" has zero effect until Kong is separately wired] → Accepted: the alternative (unconditional) breaks production today. This is explicitly a "ready, not yet active" change; the proposal calls out the follow-up dependency.
- [Someone could still bypass by simply not sending `x-auth-required: true`, and today nothing forces it to be sent] → Accepted as within the stated non-goal boundary: closing that requires the deferred Kong wiring work, tracked separately, not this change.
- [Duplicating the exact `HandlerAuth.ts` logic across three repos instead of a shared package] → Accepted, matching the existing project convention (no shared auth package exists across these services today).

## Migration Plan

1. Update `HandlerAuth.ts` with the conditional gateway-secret + tenant_id-presence check (no config changes required).
2. Deploy — no behavior change expected in production immediately (Kong doesn't send `x-auth-required` to this service yet).
3. Rollback: revert the one file; no data migration involved.
