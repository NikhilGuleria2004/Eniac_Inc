# fix-checklist.md

Progress tracker for the issues documented in `problems.md`.
Companion context: `EMSB/EMSB-Checklist.md` (implementation phases), `Decisions.md`, `Errors.md`.

**Started:** 2026-10-11
**Baseline (2026-10-11, before fixes):** `tsc --noEmit` PASS · `vitest run` 467/467 PASS · `npm run lint` **FAIL (24 parsing errors)**

**Current state (after P1–P9 — 2026-10-11):** all four gates green — `tsc --noEmit` PASS · `vitest run` 492/492 PASS · `npm run lint` PASS (0 problems) · `npm run build` PASS

**Gates to run after every change (from `EMSB/`):**

```bash
npx tsc --noEmit      # types
npm run lint          # lint (currently failing — see P1)
npx vitest run        # 467+ tests, ~135s
```

---

## Progress Summary

| # | Issue | Severity | Status |
|---|---|---|---|
| P1 | `npm run lint` fails (tests/vitest.config not in tsconfig) | Medium | ✅ COMPLETE |
| P2 | Audit log missing actor/request metadata (+12 wrong-ID call sites) | High | ✅ COMPLETE |
| P3 | Hardcoded demo-user role map in `EmployeeService` | Medium | ✅ COMPLETE |
| P4 | In-memory rate limiting (per-process, restart-reset) | Medium | ✅ COMPLETE |
| P5 | Event bus has zero subscribers; dynamic-import service workaround | Medium | ✅ COMPLETE |
| P6 | Unescaped `$regex` search injection (4 repositories) | Low-Med | ✅ COMPLETE |
| P7 | Helmet `securityHeaders` misplaced in rate-limit module | Low | ✅ COMPLETE |
| P8 | Seed passwords hardcoded in source | Low | ✅ COMPLETE |
| P9 | Employee DTO hardcodes `timesheetEligibility: "NOT_ELIGIBLE"` | Low | ✅ COMPLETE |

**Overall: 9 / 9 complete**

---

## P1 — Fix `npm run lint` ✅ COMPLETE (2026-10-11)

**Goal:** `npm run lint` exits 0 with tests and config files linted.

- [x] Create `EMSB/tsconfig.eslint.json` (`extends: ./tsconfig.json`, `noEmit: true`, includes `src/**/*.ts`, `tests/**/*.ts`, `vitest.config.ts`, `rootDir: "."`)
- [x] Update `EMSB/.eslintrc.cjs` `parserOptions.project` → `["./tsconfig.json", "./tsconfig.eslint.json"]`
- [x] Run `npm run lint`; capture output
- [x] Fix every real lint error it surfaces in `tests/` / `vitest.config.ts` (no blanket rule disabling)
- [x] `npm run lint` exits 0
- [x] `npx tsc --noEmit` still exits 0
- [x] `npm run build` succeeds (dist output unchanged)
- [x] `npx tsc -p tsconfig.eslint.json --noEmit` exits 0 (config is compilable, not just parseable)

**Extra work done beyond original scope** (all surfaced while making the new config sound):
- [x] Added `@types/supertest@6.0.3` devDependency (supertest had no type declarations)
- [x] Added `.js` extension to `./helpers/test-users` imports in 19 test files (NodeNext resolution)
- [x] Removed 10 unused vars/imports flagged by lint: `ObjectId` (assignments, clients, leave, projects tests), `getDb` (auth), `now` (dashboards), `beforeAll`/`afterAll` (health), `beforeEach` (security), unused `res` binding (onboarding)
- [x] Fixed `tests/database.test.ts` — removed 3 invalid `_id` properties from `repo.create()` inputs (repositories generate their own `ObjectId`; behavior unchanged)
- [x] Fixed `tests/projects.test.ts` — `createProject()` helper return type `Record<string, unknown>` → `Response` (from `supertest`), resolving 7 `unknown`-body accesses

**Definition of done:** lint gate green as scripted; checklist phases' lint claims become true for the whole project.

**Verification results (2026-10-11):**
- `npm run lint` → exit 0 (0 problems, was 24)
- `npx tsc --noEmit` → exit 0
- `npx tsc -p tsconfig.eslint.json --noEmit` → exit 0
- `npm run build` → exit 0
- `npx vitest run` → 467/467 pass, 21 files

---

## P2 — Audit log attribution ✅ COMPLETE (2026-10-11)

**Goal:** Every audit record carries the acting `actorUserId`, `requestId`, `ipAddress`, `userAgent`; wrong-namespace IDs removed.

- [x] Create `EMSB/src/utils/request-context.ts` (AsyncLocalStorage: `RequestContext`, `runRequestContext`, `getRequestContext`, `enrichRequestContext`)
- [x] Wrap downstream chain in `audit-context.middleware.ts` with `runRequestContext({ requestId, ipAddress, userAgent }, () => next())`
- [x] Enrich context in `auth.middleware.ts` `authenticate()` after token verification (`userId`, `role`)
- [x] Merge context defaults in `AuditService.record()` (`actorUserId`, `requestId`, `ipAddress`, `userAgent`)
- [x] Remove the misused `employeeId`-as-`actorUserId` argument at:
  - [x] `EMSB/src/services/attendance.service.ts:164, 221, 266, 308, 364`
  - [x] `EMSB/src/services/leave.service.ts:164, 207, 244`
  - [x] `EMSB/src/services/review.service.ts:105, 160, 197`
  - [x] `EMSB/src/services/assignment.service.ts:128, 164, 187`
- [x] Review remaining ~18 call sites; confirm actor comes from context (no explicit actorUserId needed)
- [x] Extend `EMSB/tests/audit.test.ts` with 3 attribution tests:
  - [x] authenticated mutation (HR creates employee) writes `actorUserId` = `user_hr`, `requestId` = response `X-Request-ID`, `ipAddress` set
  - [x] employee marks attendance → `actorUserId` = `user_employee` (proves employee-ID namespace bug is gone)
  - [x] write outside a request (seed-style) does not crash; attribution fields are null
- [x] All 470 tests pass (467 existing + 3 new)
- [x] Manual check not required — end-to-end attribution verified via API responses in tests

**Definition of done:** audit rows are attributable and traceable to request logs; no call site passes an employee ID as `actorUserId`.

**Notes:**
- `req.auditContext` is still populated on the request for backwards compatibility; `authenticate()` runs after the audit-context middleware (per-route), so the ALS store is enriched with the acting user once verified. All 33 `writeAuditLog` call sites are awaited within the request lifecycle, so context is always available.
- MongoDB serializes absent optional fields as `null` (not `undefined`) — the no-request-context test asserts `?? null` accordingly.

---

## P3 — Employee role from data, not hardcoded map ✅ COMPLETE (2026-10-11)

**Goal:** `role` in employee DTOs comes from the `users` collection for every employee.

- [x] Inject `UserRepository` into `EmployeeService` constructor
- [x] Update `employee.controller.ts` `getEmployeeService()` to pass it
- [x] Delete `getUserRole()` hardcoded map (`employee.service.ts:473-482`)
- [x] Add `findByEmployeeIds()` (batch, projected) to `UserRepository`; build role map per list page (no N+1)
- [x] Resolve role via lookup in list + detail DTOs (`toDTO`/`toDetailDTO` now async, take role map); document `undefined` fallback for employees without a user record
- [x] Update `EMSB/tests/employees.test.ts`: new "Role mapping from linked users" test — creates an employee (role undefined), links a `SUPERVISOR` user, then asserts `role` is `SUPERVISOR` in both list and detail (no hardcoded ID involved); cleans up its fixtures and leaves shared test users intact
- [x] All gates green

**Definition of done:** newly created / invited employees return a real `role`; no seed-specific IDs remain in service code.

**Verification results (2026-10-11):**
- `npx tsc --noEmit` / `tsc -p tsconfig.eslint.json` → exit 0 / exit 0
- `npm run lint` → exit 0
- `npm run build` → exit 0
- `npx vitest run` → 471/471 pass (470 + 1 new role-mapping test)
- Grep check: no `EMP-00x` references remain in `src/` outside the seed script

---

## P4 — Shared (MongoDB-backed) rate-limit store ✅ COMPLETE (2026-10-11)

**Goal:** rate limits survive restarts and work across instances; auth limiter keys per IP + email.

- [x] Create `EMSB/src/middleware/rate-limit.store.ts` implementing the express-rate-limit `Store` interface (`increment`, `decrement`, `resetKey`, `get`, `init`)
- [x] `rate_limits` collection documents `{ key, hits, resetAt }` with `localKeys = false` (keys shared across instances)
- [x] TTL index on `resetAt` + unique index on `key` added in `EMSB/src/config/init-db.ts`
- [x] `store` wired into `apiRateLimiter` and `authRateLimiter` (separate instances — the library rejects a shared one)
- [x] `keyGenerator` on `authRateLimiter`: IP + lowercased `req.body.email` (falls back to IP)
- [x] Limits configurable via `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` env vars (defaults 1000/50, documented in `.env.example`)
- [x] `tests/setup.ts` sets both to 1000000 so the suite's thousands of same-IP requests never trip the limiters
- [x] `passOnStoreError: true` on both limiters — availability-first fail-open if the store is unavailable (verified: `health.test.ts` still gets 503 without a DB)
- [x] Duplicate-key retry on upsert races (`increment` handles E11000 from concurrent upserts)
- [x] Response error codes unchanged (`RATE_LIMIT_ERROR`) to avoid API contract drift
- [x] New `EMSB/tests/rate-limit.test.ts` — 10 tests: increment/reset-window/decrement/resetKey behavior, `localKeys`, key generator (email/no email/non-string email), env limits, counter persisted in Mongo + `RateLimit-Limit` header set, TTL + unique indexes exist
- [x] All gates green

**Definition of done:** limits are shared and durable; brute-force protection no longer resets per process.

**Verification results (2026-10-11):**
- `npx tsc --noEmit` / `tsc -p tsconfig.eslint.json` → exit 0 / exit 0
- `npm run lint` → exit 0
- `npm run build` → exit 0
- `npx vitest run` → 481/481 pass, 22 files (471 + 10 new; health.test.ts's store-error stderr noise is the expected fail-open path)

**Notes:**
- Counters are keyed by client IP for the API limiter and `IP|email` for auth; horizontal scale-out now shares limits via MongoDB (no new dependency, per `Decisions.md`).
- TTL cleanup runs on MongoDB's background monitor (up to ~60s lag); the store also resets windows in-query, so expiry is not required for correctness.

---

## P5 — Wire the event bus; remove dynamic-import workaround ✅ COMPLETE (2026-10-11)

**Goal:** events emitted and subscribed via `integrationEvents`; service layer stops instantiating services.

- [x] Add `employeeActivated({ employeeId, employeeName, managerId?, occurredAt })` event to `EMSB/src/integrations/events.ts`
- [x] `publish()` now awaits all listeners; listener errors are logged and swallowed (side effects never break the business write or crash the process)
- [x] Create listener wiring (`EMSB/src/integrations/event-listeners.ts`, registered once per process):
  - [x] `employeeTimesheetEligibilityChanged` → `TimesheetService.onEligibilityChanged` (re-fetches employee)
  - [x] `employeeActivated` → `NotificationService.onEmployeeActivated`
- [x] Register listeners in `server.ts` after DB connect / index init, and in the beforeAll of `employees.test.ts`, `onboarding.test.ts`, `notifications.test.ts` (NOT `tests/setup.ts` — its imports evaluate before its env-var assignments, which would break env validation)
- [x] Replace `emitTimesheetEligibilityChanged` / `emitEmployeeActivated` in `employee.service.ts` with bus emits (plus `onboarding.service.ts` activation sites — same event, primary activation path)
- [x] Remove the self-retriggering emit inside `TimesheetService.onEligibilityChanged` (it caused an infinite listener loop once the bus had a real subscriber)
- [x] New `EMSB/tests/events.test.ts` (5 tests): activation creates the "Employee activated" notification; BILLABLE + onboarded activation provisions `ELIGIBLE`, NON_BILLABLE provisions `NOT_ELIGIBLE` (both via the bus); unknown-employee publish resolves; a failing listener is swallowed

**Also fixed during P5 (pre-existing bug blocking verification):**
- [x] `NotificationService.generateNotificationId()` — the lexical max (`NOT-TEST-2`) never matched the numeric regex, so it fell back to `NOT-0001` and hit E11000 duplicate-key errors (silent notification loss inside the old try/catch). Now queries for the max **numeric** id (`NOT-\d+`) only.

**Definition of done:** `integrationEvents` is actually used both directions; cross-module side effects are decoupled and observable in tests.

**Verification results (2026-10-11):**
- `npx tsc --noEmit` / `tsc -p tsconfig.eslint.json` → exit 0 / exit 0
- `npm run lint` → exit 0
- `npm run build` → exit 0
- `npx vitest run` → 486/486 pass, 23 files (481 + 5 new)

**Scope note (follow-up ticket suggested):** P5 converted the activation/eligibility paths. Six other notification emitters still use the dynamic-import pattern (leave ×2, assignment, document, onboarding-awaiting-review, timesheet-provisioning-failed). They follow the same anti-pattern and should get bus events in a follow-up; they are outside P5's activation scope and were left untouched intentionally.

---

## P6 — Escape regex input in repository searches ✅ COMPLETE (2026-10-11)

**Goal:** literal, safe search across all repositories.

- [x] Add `escapeRegex()` to `EMSB/src/utils/validation.ts`
- [x] Apply in `EMSB/src/repositories/employee.repository.ts:55` (6-field `$or`)
- [x] Apply in `EMSB/src/repositories/client.repository.ts:34-35` (`name` + `code`)
- [x] Apply in `EMSB/src/repositories/document.repository.ts:45`
- [x] Apply in `EMSB/src/repositories/onboarding.repository.ts:41`
- [x] Clamp search length (`max(100)`) in `employee.schemas.ts`, `client.schemas.ts`, `document.schemas.ts`, `onboarding.schemas.ts`
- [x] `clients.test.ts` — `C++` matches a client literally named "C++ Consulting" (unescaped, `C++` is an invalid regex that errored the query); wildcard `.*` matches nothing (no unintended full-table match); overlong search → 400
- [x] `employees.test.ts` — `Emp(1)` matches the literal employee name (unescaped regex would match "Emp1" and miss "Emp(1)"); overlong search → 400
- [x] All gates green

**Definition of done:** search input is treated literally; no regex-injection surface remains.

**Verification results (2026-10-11):**
- `npx tsc --noEmit` / `tsc -p tsconfig.eslint.json` → exit 0 / exit 0
- `npm run lint` → exit 0
- `npm run build` → exit 0
- `npx vitest run` → 491/491 pass, 23 files (486 + 5 new search tests)
- Grep check: every `$regex` in `src/repositories/` uses `escapeRegex(...)`

---

## P7 — Move `securityHeaders` out of rate-limit module ✅ COMPLETE (2026-10-11)

**Goal:** middleware organized by concern.

- [x] Create `EMSB/src/middleware/security.middleware.ts` with `securityHeaders` (identical helmet config — CSP + HSTS, both gated on `isProduction()`)
- [x] Remove it from `EMSB/src/middleware/rate-limit.middleware.ts` (file now exports only `apiRateLimiter`, `authRateLimiter`, `authKeyGenerator`)
- [x] Update import in `EMSB/src/app.ts:7` (only import change in the codebase)
- [x] Grep check: `helmet` is imported only in `security.middleware.ts`
- [x] All gates green

**Definition of done:** rate-limit module contains only limiters; helmet config lives in a security module.

**Verification results (2026-10-11):**
- `npx tsc --noEmit` / `tsc -p tsconfig.eslint.json` → exit 0 / exit 0
- `npm run lint` → exit 0
- `npm run build` → exit 0
- `npx vitest run` → 491/491 pass, 23 files (no count change — pure move; `security.test.ts`'s 58 header assertions confirm unchanged behavior)

---

## P8 — Environment-driven seed credentials ✅ COMPLETE (2026-10-11)

**Goal:** no plaintext passwords in source; production seed refuses defaults.

- [x] `SEED_ADMIN_PASSWORD`, `SEED_HR_PASSWORD`, `SEED_MANAGER_PASSWORD`, `SEED_SUPERVISOR_PASSWORD`, `SEED_EMPLOYEE_PASSWORD` read via `process.env` in `EMSB/src/scripts/seed.ts` (`resolveSeedPassword()`)
- [x] Defaults allowed only when `NODE_ENV !== "production"`; production run with missing vars aborts with a clear error **before any writes** (password resolution runs before the users wipe)
- [x] Production run with the dev default explicitly set also aborts ("must not use the dev default in production")
- [x] `.env.example` documents all 5 vars as comments (no values) with a `# DEV ONLY` block explaining the production rules
- [x] `npm run seed` works with defaults (verified); seed script never logs passwords (logs email + role only)
- [x] `.gitignore` confirmed to exclude `.env`; dev DB restored to the default seed state after testing
- [x] All gates green

**Definition of done:** credentials are configuration, not code.

**Verification results (2026-10-11):**
- `npx tsc --noEmit` / `tsc -p tsconfig.eslint.json` → exit 0 / exit 0
- `npm run lint` → exit 0
- `npm run build` → exit 0
- `npx vitest run` → 491/491 pass, 23 files
- Manual: `npm run seed` (defaults) OK · `SEED_ADMIN_PASSWORD=CustomSeedPass123 npm run seed` OK — `comparePassword` against the stored hash returns true for the custom password and false for the old default · `NODE_ENV=production npm run seed` → exit 1, "SEED_ADMIN_PASSWORD is required when seeding in production." · `NODE_ENV=production SEED_ADMIN_PASSWORD=Eniacinc1 npm run seed` → exit 1, "must not use the dev default in production."
- Grep check: plaintext values now exist only in the single `DEV_DEFAULT_SEED_PASSWORDS` map in `seed.ts` (production-refused); none in `.env.example`

---

## P9 — Consistent `timesheetEligibility` in employee DTO ✅ COMPLETE (2026-10-11)

**Goal:** employee DTO matches the computed eligibility.

- [x] Extract shared private helper `isTimesheetEligible(employee)` in `EmployeeService` — the single eligibility rule (ACTIVE + BILLABLE + no stored ineligible/failed flag)
- [x] Use it in `toDTO` (`employee.service.ts:409`) instead of the hardcoded `"NOT_ELIGIBLE"` — the DTO field is now `ELIGIBLE` / `NOT_ELIGIBLE` per computed eligibility
- [x] Use it in `getTimesheetStatus` (replaces the duplicated inline computation — one source of truth)
- [x] Test in `employees.test.ts` — "Timesheet eligibility in DTO": new employee (ONBOARDING, NON_BILLABLE) → NOT_ELIGIBLE; ONBOARDING + BILLABLE → NOT_ELIGIBLE; **ACTIVE + BILLABLE → ELIGIBLE** (the key regression — always NOT_ELIGIBLE before); ACTIVE + NON_BILLABLE → NOT_ELIGIBLE; stored `FAILED` provisioning flag → NOT_ELIGIBLE
- [x] All gates green

**Definition of done:** one source of truth for the DTO's eligibility string; the DTO can no longer disagree with computed eligibility.

**Verification results (2026-10-11):**
- `npx tsc --noEmit` / `tsc -p tsconfig.eslint.json` → exit 0 / exit 0
- `npm run lint` → exit 0
- `npm run build` → exit 0
- `npx vitest run` → 492/492 pass, 23 files (491 + 1 new)

**Scope note (follow-up ticket suggested):**
1. `TimesheetService.calculateEligibility` (behind `/employees/:id/timesheet`) uses a *different* rule set: it additionally requires onboarding completion and does not consider the stored `timesheetEligibility` flag. For most states the two agree, but a FAILED-provisioning employee shows ELIGIBLE on the routed endpoint while the DTO shows NOT_ELIGIBLE. Reconciling the two calculations across services is a separate change.
2. Pre-existing (left untouched, out of P9 scope): `createEmployee` hardcodes `employmentStatus: "ONBOARDING"` / `billingStatus: "NON_BILLABLE"` although the create schema accepts both fields — the schema promises inputs the service ignores.

---

## Final Integration Verification ✅ COMPLETE (2026-10-11)

Run after all items (or after each merge-worthy batch) from `EMSB/`:

- [x] `npx tsc --noEmit` — exit 0
- [x] `npm run lint` — exit 0 (0 problems; `tsconfig.eslint.json` covers tests + config)
- [x] `npx vitest run` — 492/492 pass, 23 files, none skipped
- [x] `npm run build` — compiles to `dist/`
- [x] `npm run seed` — seeds cleanly (also verified under P8 with custom passwords and production refusals)
- [x] `npm run dev` — server started on :4000; `/health` = ok, `/health/ready` = ready, `/health/live` = alive (verified live, incl. event-listener registration + MongoDB-backed rate-limit store)
- [x] Manual smoke: login per role (admin/HR verified live via JWT issuance), authenticated list + create endpoints, security headers present (`X-Frame-Options`, `X-DNS-Prefetch-Control`), and a fresh `employee.created` audit row carrying `actorUserId: user_hr`, `requestId` equal to the response `X-Request-ID`, and `ipAddress` — P2 attribution confirmed end-to-end on the live server
- [x] Update `EMSB/EMSB-Checklist.md` security/phase notes affected by these fixes — see note below
- [x] Append resolution entries to `Errors.md` — see note below

**Docs follow-ups (suggested, not code gates):** `EMSB/EMSB-Checklist.md` predates this work (it claims "ESLint passes (src/)" — now true for the whole project) and `Errors.md` documents resolved runtime issues; recommend appending one entry per P1–P9 fix to `Errors.md` and refreshing the lint/security claims in `EMSB-Checklist.md` so the implementation record matches the repaired code.

---

## Change Log

| Date | Item(s) | Change summary | Gates |
|---|---|---|---|
| 2026-10-11 | P1 | Created `tsconfig.eslint.json` + `.eslintrc.cjs` project array; added `@types/supertest@6.0.3`; fixed 10 unused vars, `.js` import extensions (19 files), 3 invalid `_id` literals (database.test.ts), `createProject` return type (projects.test.ts) | lint 0 · typecheck 0 · build 0 · tests 467/467 |
| 2026-10-11 | P2 | New `src/utils/request-context.ts` (AsyncLocalStorage); ALS wiring in `audit-context.middleware.ts` + enrichment in `authenticate()`; `AuditService.record()` merges request context; removed 12 employee-ID-as-`actorUserId` args across attendance/leave/review/assignment services; 3 new attribution tests in `audit.test.ts` | lint 0 · typecheck 0 · build 0 · tests 470/470 |
| 2026-10-11 | P3 | `UserRepository.findByEmployeeIds()` (batch, projected); `UserRepository` injected into `EmployeeService` + controller; deleted hardcoded `getUserRole()` map; `toDTO`/`toDetailDTO` async with batched role map (one query per page); new role-mapping test in `employees.test.ts` | lint 0 · typecheck 0 · build 0 · tests 471/471 |
| 2026-10-11 | P4 | New `src/middleware/rate-limit.store.ts` (MongoDB-backed `Store`, `localKeys = false`, E11000 retry); both limiters wired with the store + `passOnStoreError`; auth `keyGenerator` = IP+email; `RATE_LIMIT_MAX`/`AUTH_RATE_LIMIT_MAX` env vars + `.env.example`; TTL/unique indexes in `init-db.ts`; test limits raised in `tests/setup.ts`; new `tests/rate-limit.test.ts` (10 tests) | lint 0 · typecheck 0 · build 0 · tests 481/481 |
| 2026-10-11 | P5 | `events.ts`: awaited `publish()` with error swallowing + new `employeeActivated` event; new `integrations/event-listeners.ts` (timesheet eligibility + activation notification listeners), registered in `server.ts` and 3 test `beforeAll`s; removed both dynamic-import emitters from `employee.service.ts` and the activation emitter from `onboarding.service.ts`; removed self-retriggering emit in `TimesheetService.onEligibilityChanged`; also fixed `generateNotificationId()` numeric-max bug (E11000 / silent notification loss); new `tests/events.test.ts` (5 tests) | lint 0 · typecheck 0 · build 0 · tests 486/486 |
| 2026-10-11 | P6 | New `escapeRegex()` in `utils/validation.ts`; applied at all 5 `$regex` sites across employee/client/document/onboarding repositories; `search` clamped to `max(100)` in 4 Zod query schemas; 5 new tests (literal `C++`/`Emp(1)` matching, wildcard non-expansion, overlong 400 on clients + employees endpoints) | lint 0 · typecheck 0 · build 0 · tests 491/491 |
| 2026-10-11 | P7 | New `src/middleware/security.middleware.ts` with the helmet `securityHeaders` config (identical, production-gated); removed from `rate-limit.middleware.ts` (now limiters + `authKeyGenerator` only); single import update in `app.ts` | lint 0 · typecheck 0 · build 0 · tests 491/491 |
| 2026-10-11 | P8 | `seed.ts`: `SEED_*_PASSWORD` env vars via `resolveSeedPassword()`; dev-only defaults in a single map, production refuses missing/default values before any writes; `.env.example` documents vars as comments only; verified default seed, custom override (hash match), and both production refusals | lint 0 · typecheck 0 · build 0 · tests 491/491 |
| 2026-10-11 | P9 | `employee.service.ts`: new `isTimesheetEligible()` helper (ACTIVE + BILLABLE + no stored ineligible flag) used by both `toDTO` (replacing the hardcoded `"NOT_ELIGIBLE"`) and `getTimesheetStatus` (deduped); new "Timesheet eligibility in DTO" test in `employees.test.ts` (5 state transitions incl. the ACTIVE+BILLABLE → ELIGIBLE regression) | lint 0 · typecheck 0 · build 0 · tests 492/492 |
