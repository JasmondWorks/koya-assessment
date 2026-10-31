/**
 * Runs before any test file imports `app` (via vitest.config.ts's
 * `setupFiles`). Env vars must exist before `src/config/env.ts` is first
 * imported, because it validates and freezes them at module-load time —
 * see that file's own comment on why that's deliberate (fail fast at
 * boot, not deep in a request handler).
 */
process.env.API_KEY = "test-api-key-for-vitest-only";
// Tests never call app.listen() (supertest drives the app in-process),
// so this value is never actually bound to a port — it just needs to
// satisfy env.ts's validation.
process.env.PORT = "3999";
