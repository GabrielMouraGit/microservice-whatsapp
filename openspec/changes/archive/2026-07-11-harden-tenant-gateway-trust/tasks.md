## 1. Harden HandlerAuth

- [x] 1.1 Update `src/interfaces/plugins/HandlerAuth.ts`: when `request.headers["x-auth-required"] === "true"`, require `request.headers["x-gateway-secret"] === $config.GATEWAY_SECRET_AUTH` (401 `{ message: "Unauthorized gateway" }` on mismatch) and require `x-tenant-id` present (401 `{ message: "tenant_id missing" }` if absent), mirroring `microservices-auth/src/interfaces/plugins/HandlerAuth.ts` exactly. Import `$config` from `@config/config` (already exports `GATEWAY_SECRET_AUTH`).
- [x] 1.2 Preserve current behavior when `x-auth-required` is absent or not `"true"`: populate `request.auth` from `x-tenant-id`/`x-user-id` headers with no additional check, unchanged from today

## 2. Verification

- [x] 2.1 Manually verify: request with `x-auth-required: true` + correct `x-gateway-secret` + `x-tenant-id` succeeds — verified via `fastify.inject()` against the plugin in isolation: `status=200 auth={tenant_id:"t1",user_id:"u1"}`
- [x] 2.2 Manually verify: request with `x-auth-required: true` + missing/incorrect `x-gateway-secret` returns 401 `Unauthorized gateway` — verified for both missing and wrong secret
- [x] 2.3 Manually verify: request with `x-auth-required: true` + correct secret + missing `x-tenant-id` returns 401 `tenant_id missing` — verified
- [x] 2.4 Manually verify: request without `x-auth-required` (today's normal traffic shape — session create/list, message send, contact lookup) behaves exactly as before — no regression — verified: `status=200`, `auth` populated from headers unchanged
- [x] 2.5 Manually verify tenant isolation still holds: a request authenticated as tenant A attempting to act on a `Session`/`Message`/`Contact` belonging to tenant B is still rejected by the existing controller-level checks — confirmed by inspection: `SessionAdapters`/`MessageAdapters`/`ContactAdapters` all read `request.auth.tenant_id` the same way as before the change (the fix only touches how `request.auth` gets populated in `HandlerAuth.ts`, not its shape or how downstream consumers use it), so the existing `session.tenant_id === tenant_id` checks in the controllers are unaffected
- [x] 2.6 Run the existing test suite (`tests/`) and confirm no regressions — `RabbitMQ.integration.test.ts` fails, but it requires a live RabbitMQ broker (not running in this environment) and is unrelated to this change (messaging pub/sub, not auth); no test touches `HandlerAuth.ts`. `tsc --noEmit` shows no new type errors (pre-existing unrelated `@types/mocha`/`ws`/`fluent-ffmpeg` issues only)
