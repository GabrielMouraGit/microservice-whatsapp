## Why

This service already trusts an `x-tenant-id`/`x-user-id` header pair (set by `HandlerAuth.ts`) instead of validating a JWT itself, on the assumption that Kong sits in front of it and only forwards requests that already passed JWT validation — every tenant-scoped route (`Session*`, `Message*`, `Contact*`) enforces `session.tenant_id === request.auth.tenant_id` at the use-case layer, so the isolation logic is sound *given* a trustworthy `tenant_id`. Today that header is not trustworthy: `HandlerAuth.ts` copies whatever `x-tenant-id` is present into `request.auth` with no check that the request actually came through Kong. Any caller able to reach this service directly (misconfigured route, internal network access, a bug in another service) can set `x-tenant-id` to any value and read another tenant's WhatsApp sessions, contacts, or message history. `microservices-auth` — the project this pattern is modeled on — already closes this exact gap in its own `HandlerAuth.ts` by requiring a shared `x-gateway-secret` whenever `x-auth-required: true` is present; this service should adopt the identical, already-proven pattern (as should its sibling, `microservices-ia`, via a parallel change in that repo).

## What Changes

- Harden `src/interfaces/plugins/HandlerAuth.ts` to match `microservices-auth`'s reference implementation: when the `x-auth-required: true` header is present, require `x-gateway-secret` to match the existing `GATEWAY_SECRET_AUTH` config value (reject with 401 `"Unauthorized gateway"` if it doesn't) and require `x-tenant-id` to be present (reject with 401 `"tenant_id missing"` if absent). When `x-auth-required` is not present, behavior is unchanged from today — this keeps the change deployable now, without depending on the separate, out-of-scope work of wiring Kong to actually send that header for this service's routes.
- No config/env changes needed: `GATEWAY_SECRET_AUTH` is already defined in `config/config.ts`, `.env`, `env-example`, and `docker-compose.yml`, with the same value (`token123`) as `microservices-auth`'s own secret — it's just never checked today.
- **BREAKING** (conditional): once Kong is separately configured to send `x-auth-required`/`x-gateway-secret`/`x-tenant-id` for this service's routes, requests missing a valid `x-gateway-secret` will start being rejected with 401 where they previously succeeded. Not breaking today, since nothing currently sends `x-auth-required` to this service.

## Capabilities

### New Capabilities
- `tenant-gateway-trust`: The service SHALL treat `x-tenant-id`/`x-user-id` as trustworthy only when accompanied by a valid shared gateway secret, mirroring the `microservices-auth` reference pattern.

### Modified Capabilities
(none — no existing `openspec/specs/` entries in this repo yet; this is the first openspec change here)

## Impact

- **Code**: `src/interfaces/plugins/HandlerAuth.ts` only.
- **Config**: none — `GATEWAY_SECRET_AUTH` already present everywhere it needs to be.
- **No Prisma/schema changes** — `Tenant`/`Session`/`Contact`/`Message*` are already correctly tenant-scoped; this is a request-authorization change only.
- **No changes to Kong or `microservices-auth`** — out of scope per explicit decision; this service becomes ready to enforce the gateway secret the moment Kong is wired to send it, without requiring a further app-level deploy.
- **Not in scope**: the unused `jsonwebtoken`/`jwks-rsa` dependencies in `package.json` (no usages found anywhere in `src/`) are left as-is — removing them is an unrelated cleanup, not part of this authorization fix.
- **Sibling project**: `microservices-ia` gets the identical `HandlerAuth.ts` hardening (plus a fix for one previously-ungated route) as a separate, parallel change (`harden-tenant-gateway-trust` in that repo) — the two should be reviewed together since they implement the same contract.
