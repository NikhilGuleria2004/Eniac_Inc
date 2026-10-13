# problems.md

Code review findings for the Eniac Inc. Employee Management System (`EMSB/` backend, `EMSF/` frontend).

**Analysis date:** 2026-10-11
**Method:** Full read of core layers (app, middleware, services, repositories, permissions) plus execution of the project's own gates.
**Companion file:** `fix-checklist.md` — tracks progress for every item below.

## Verification Baseline (run 2026-10-11)

| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | PASS |
| Tests | `npx vitest run` | PASS — 467 tests / 21 files, ~134s |
| Lint | `npm run lint` (`eslint . --ext .ts`) | **FAIL — 24 parsing errors** |
| Lint (scoped) | `npx eslint src --ext .ts` | PASS |

### What was verified clean (no action needed)

- Layered architecture enforced: routes → thin controllers → services → repositories → models; repositories never touch HTTP/JWT.
- Business-rule state machines (employee lifecycle, project status, review workflow, document status) enforced server-side with 422 on invalid transitions.
- Sensitive-field scoping: salary/bill-rate restricted to HR/Admin; managers/supervisors get operational-only views; employee IDOR checks in place.
- Money stored as MongoDB `Decimal128`; invitation tokens stored as SHA-256 hashes with expiry and single-use semantics.
- Zod validation on all inputs; error handler leaks internals only in development; Pino redaction for auth headers and passwords.

---

## P1 — `npm run lint` script fails (quality gate broken)

**Severity:** Medium — the linted gate claimed in `EMSB-Checklist.md` phases 3, 14, 15, 16, 17, 18 was never actually green as scripted.

**Evidence**

- `EMSB/package.json:13` — `"lint": "eslint . --ext .ts"` runs against the whole project.
- `EMSB/.eslintrc.cjs:7` — `parserOptions.project: "./tsconfig.json"` (typed linting).
- `EMSB/tsconfig.json:24` — `"include": ["src/**/*.ts"]` — tests and `vitest.config.ts` are not in the TS program.
- Result: `Parsing error: ESLint was configured to run on <file> using parserOptions.project: <tsconfigRootDir>/tsconfig.json. However, that TSConfig does not include this file.` for **all 24 files**: 21 files in `EMSB/tests/` (incl. `helpers/test-users.ts`, `setup.ts`) + `EMSB/vitest.config.ts`.
- Checklist claims such as "ESLint passes (src/)" are accurate only because linting was manually scoped to `src/`. As scripted (`npm run lint`), CI would fail.

**Impact**

- The quality gate is unusable as a script; the 7,500+ lines of test code receive no linting at all.

**Fix**

1. Create `EMSB/tsconfig.eslint.json`:
   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": { "noEmit": true, "composite": false },
     "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
   }
   ```
2. Update `EMSB/.eslintrc.cjs` `parserOptions.project` to the array `["./tsconfig.json", "./tsconfig.eslint.json"]`.
3. Run `npm run lint` until it exits 0. Fix any **real** lint errors surfaced in `tests/` (do not blanket-disable rules).

**Verification:** `npm run lint` exits 0; `npm run typecheck` still exits 0 (new tsconfig must not change build output — build uses `npm run build` → `tsc` which reads `tsconfig.json`).

---

## P2 — Audit log has no actor and no request metadata (and 12 call sites record the wrong ID)

**Severity:** High — compliance/security: the system cannot answer "who performed this change?" for most mutations.

**Evidence**

- `EMSB/src/services/audit.service.ts:46-74` — `record()` persists only what the caller passes: `actorUserId: context?.actorUserId`, `requestId: context?.requestId`, `ipAddress: context?.ipAddress`. There is no fallback to request context.
- `EMSB/src/middleware/audit-context.middleware.ts` populates `req.auditContext` (requestId, userId, role, IP, userAgent) — but **nothing ever reads it**. It runs before `authenticate` anyway (app.ts:24, before route-level auth), so `userId` would be `undefined` even if read.
- 33 `writeAuditLog` call sites across services. Only `invitation.service.ts:135` and `:199` pass `actorUserId` explicitly.
- **12 call sites pass `employeeId` into the `actorUserId` slot** (5th positional parameter of `writeAuditLog(actorRole, action, entityType, entityId, actorUserId)`), writing employee IDs (e.g. `EMP-005`) into a field that should hold user IDs (e.g. `user_employee`):
  - `EMSB/src/services/attendance.service.ts:164, 221, 266, 308, 364`
  - `EMSB/src/services/leave.service.ts:164, 207, 244`
  - `EMSB/src/services/review.service.ts:105, 160, 197`
  - `EMSB/src/services/assignment.service.ts:128, 164, 187`
- The remaining ~18 call sites (client, project, employee, document, onboarding, settings, timesheet, notification, compensation services) omit the actor entirely.

**Impact**

- Audit rows for nearly every mutation store `actorUserId: undefined`, `requestId: undefined`, `ipAddress: undefined`, `userAgent: undefined` — no attribution, no correlation to request logs, unusable for incident investigation.
- The 12 misused call sites write a wrong-namespace ID into `actorUserId`, so the data is actively misleading.
- `GET /api/v1/audit-log` supports filtering by `actorUserId` and `requestId`, but those filters match almost nothing.

**Fix**

1. Create `EMSB/src/utils/request-context.ts` using Node `AsyncLocalStorage`:
   - `RequestContext` interface: `{ requestId?, userId?, role?, ipAddress?, userAgent? }`.
   - `runRequestContext(context, callback)` and `getRequestContext()`.
2. In `audit-context.middleware.ts`, wrap the downstream chain: `runRequestContext({ requestId: req.requestId, ipAddress: req.ip, userAgent: ... }, () => next())`. (The same object reference is stored, so it can be enriched later.)
3. In `EMSB/src/middleware/auth.middleware.ts` `authenticate()` — after token verification, enrich the store: `const ctx = getRequestContext(); if (ctx) { ctx.userId = user.userId; ctx.role = user.role; }`.
4. In `AuditService.record`, merge the request context as defaults:
   - `actorUserId: context?.actorUserId ?? ctx?.userId`
   - `requestId: context?.requestId ?? ctx?.requestId`
   - `ipAddress: context?.ipAddress ?? ctx?.ipAddress`
   - `userAgent: context?.userAgent ?? ctx?.userAgent`
5. **Remove the misused 5th argument** at the 12 call sites listed above (the `employeeId` currently written into `actorUserId`). Attribution is then automatic: for employee self-service actions the acting user in context is the employee themselves — correct.
6. Extend `EMSB/tests/audit.test.ts`: after authenticated mutations (create employee, approve leave, upload document), assert the audit record for the action has a non-empty `actorUserId` equal to the acting `user_*` id, `requestId` equal to the response `X-Request-ID` header, and `ipAddress` set.
7. Note: all 33 `writeAuditLog` calls are already `await`ed inside the request lifecycle, so AsyncLocalStorage context is available; keep new call sites awaited.

**Verification:** `npm run typecheck`; `npm run lint`; `npx vitest run` (all green); manual spot-check — perform a mutation via API, then `GET /api/v1/audit-log` and confirm `actorUserId`, `requestId`, `ipAddress` are populated.

---

## P3 — Hardcoded demo-user role map in `EmployeeService`

**Severity:** Medium — wrong data returned to the frontend for all non-seeded employees.

**Evidence**

- `EMSB/src/services/employee.service.ts:473-482` — `getUserRole()` contains a hardcoded map:
  ```ts
  const roleMap: Record<string, Role> = {
    "EMP-001": "ADMIN", "EMP-002": "HR", "EMP-003": "MANAGER",
    "EMP-004": "SUPERVISOR", "EMP-005": "EMPLOYEE"
  };
  ```
- Called from `toDTO()` at `:391-394` when building list/detail responses.

**Impact**

- Every employee outside the 5 seeded demo records (including any created through the onboarding/invitation flow) gets `role: undefined` in the employee list and detail DTOs.
- Seed data leaking into production service logic; adding a real user requires a code change.

**Fix**

1. Inject `UserRepository` into `EmployeeService` (`employee.service.ts:99-102`) and update `employee.controller.ts:27-29` `getEmployeeService()` to pass it.
2. Delete `getUserRole()`. Resolve the role from data: `UserRepository.findByEmployeeId(employeeId)` already exists (`user.repository.ts:35`). For list views, add `findByEmployeeIds(ids: string[]): Promise<Map<string, Role>>` to `UserRepository` to avoid N+1 queries, and build one map per request.
3. Keep the documented fallback: employees with no linked user record → `role: undefined`.
4. Update/add tests in `EMSB/tests/employees.test.ts` asserting `role` is populated for users linked to employee records (not just `EMP-001..005`).

**Verification:** typecheck, lint, full test suite; manual: create an employee via invitation acceptance, then `GET /api/v1/employees` — `role` is `EMPLOYEE`, not `undefined`.

---

## P4 — Rate limiting uses in-memory storage (per process)

**Severity:** Medium — protection degrades with restarts and multi-instance deployments.

**Evidence**

- `EMSB/src/middleware/rate-limit.middleware.ts:26-52` — both `apiRateLimiter` (1000/15min) and `authRateLimiter` (50/15min) rely on express-rate-limit's default `MemoryStore`. No external store anywhere in the codebase.
- The project ships `Dockerfile` + `docker-compose.yml` (phase 21), which permit scaling to multiple instances.

**Impact**

- Counters reset on every deploy/restart — the brute-force window is per-process, not per-account.
- With N instances the effective limit is N × the configured value (shared-store requirement not met).
- The auth limiter keys on IP only; distributed credential stuffing across IPs is unthrottled.

**Fix** (dependency-free — reuse MongoDB, consistent with the "minimal external dependencies" decision in `Decisions.md`)

1. Create `EMSB/src/middleware/rate-limit.store.ts` implementing the express-rate-limit `Store` interface (`increment`, `decrement`, `resetKey`, `init?`) backed by a new `rate_limits` collection: documents `{ key, hits, resetAt }`; clean up via a TTL index on `resetAt`.
2. Create the index in `EMSB/src/config/init-db.ts` (`initializeIndexes()`).
3. Set `store: new MongoRateLimitStore()` on both limiters.
4. For `authRateLimiter`, add a `keyGenerator` that uses IP + lowercased `req.body.email` when present (falls back to IP).
5. Ensure tests do not trip the limiter: raise/stub limits in `tests/setup.ts`-controlled env or key by unique test IP; confirm `auth.test.ts` still verifies 429 behavior on `/auth/login` if previously covered.

**Verification:** typecheck, lint, full suite green; manual: restart the server and confirm the counter persists across the restart (hits logged in `rate_limits` collection).

---

## P5 — Event bus has zero subscribers; cross-service calls done via dynamic-import service instantiation

**Severity:** Medium — maintainability; silent failure of side effects.

**Evidence**

- `EMSB/src/services/employee.service.ts:484-514` — `emitTimesheetEligibilityChanged()` and `emitEmployeeActivated()` use `await import(...)` to construct brand-new `TimesheetService` / `NotificationService` instances (with new repositories) per call, wrapped in try/catch that only calls `logger.warn` — failures are swallowed.
- `EMSB/src/integrations/events.ts` defines `integrationEvents` with `employeeTimesheetEligibilityChanged()`, but grep shows **no `.on(...)` subscriber anywhere**. `timesheet.service.ts:191` only *emits* the event; nothing listens. The bus is effectively dead code.
- Mismatched payloads: the bus event carries `{ employeeId, eligible, occurredAt }` while the employee service needs to invoke `TimesheetService.onEligibilityChanged(employee)` with the full employee document.

**Fix**

1. Add typed events to `events.ts`: keep `employeeTimesheetEligibilityChanged`, add `employeeActivated({ employeeId, employeeName, managerId? })`.
2. Create a listener wiring module (e.g. `EMSB/src/integrations/event-listeners.ts`) that subscribes once at startup (called from `server.ts` after DB connect, and from test setup):
   - `employeeTimesheetEligibilityChanged` → `TimesheetService.onEligibilityChanged(employeeId)` (re-fetch the employee inside the handler).
   - `employeeActivated` → `NotificationService.onEmployeeActivated(employeeId, employeeName, managerId?)`.
   - Attach an `error` handler on the bus so listener failures are logged and never crash the process.
3. Replace both dynamic-import methods in `employee.service.ts` with plain `integrationEvents.*` emits (no service instantiation from the service layer).
4. Document the policy: side-effect failures (timesheet/notification) are logged, not thrown — business writes stay authoritative.
5. Add a test: activating a employee emits `employeeTimesheetEligibilityChanged` (spy on the bus) and the downstream side effect occurs (timesheet record created / notification written).

**Verification:** typecheck, lint, full suite; grep check that `src/services` no longer contains `await import(` service-instantiation workarounds; events verified firing in tests.

---

## P6 — Unescaped user input injected into `$regex` (search injection / ReDoS)

**Severity:** Low-Medium — incorrect results and pathological backtracking.

**Evidence** — 4 repositories build regexes directly from user input:

- `EMSB/src/repositories/employee.repository.ts:53-63` (`$or` over 6 fields)
- `EMSB/src/repositories/client.repository.ts:33-34`
- `EMSB/src/repositories/document.repository.ts:44`
- `EMSB/src/repositories/onboarding.repository.ts:40`

Example: `const searchRegex = { $regex: queryFilters.search, $options: "i" };`

**Impact**

- Inputs like `.*` or `(a+)+$` produce unintended matches or catastrophic backtracking; a literal search for `C++` or `[email protected]` silently fails to match anything (regex metacharacters are interpreted).

**Fix**

1. Add `escapeRegex(value: string): string` (e.g. in `EMSB/src/utils/validation.ts`): `value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`.
2. Apply it at all 4 sites before constructing the regex.
3. Clamp search length (e.g. `z.string().max(100)`) in the corresponding Zod query schemas (`employee.schemas.ts`, `client.schemas.ts`, `document.schemas.ts`, `onboarding.schemas.ts`).
4. Add tests: searching for a literal string containing regex metacharacters (`C++`, `EMP(1)`) returns the expected literal matches; overlong search is rejected with 400.

**Verification:** typecheck, lint, full suite; the two new search tests pass.

---

## P7 — Helmet security middleware misplaced in the rate-limit module

**Severity:** Low — code organization.

**Evidence**

- `EMSB/src/middleware/rate-limit.middleware.ts:1-24` exports `securityHeaders` (helmet configuration) from the rate-limit file.
- `EMSB/src/app.ts:7` imports it from `./middleware/rate-limit.middleware.js`.

**Fix**

1. Move `securityHeaders` to a new `EMSB/src/middleware/security.middleware.ts` (export the same helmet config).
2. Update the import in `app.ts`.
3. Keep `rate-limit.middleware.ts` for the two limiters only.

**Verification:** typecheck, lint, full suite; `npx tsc --noEmit` clean and no import changes beyond app.ts.

---

## P8 — Seed passwords hardcoded in source

**Severity:** Low — hygiene (no git repo currently exists, so nothing is committed yet; this prevents a future leak).

**Evidence**

- `EMSB/src/scripts/seed.ts:7-11` — five demo users with plaintext passwords (`Eniacinc1`, `Eniacinc2`, ...) inline in source.

**Fix**

1. Read seed passwords from environment with documented dev-only defaults, e.g. `SEED_ADMIN_PASSWORD`, `SEED_HR_PASSWORD`, ... (fallback to the current values only when `NODE_ENV !== "production"`; refuse to seed with default passwords in production).
2. Add the new vars to `EMSB/.env.example` with a `# dev only` comment.
3. Confirm `EMSB/.gitignore` excludes `.env` (it does) and that `.env` is never added to version control; the seed script itself must never print passwords.

**Verification:** `npm run seed` works with defaults; `SEED_*` env vars override them; `NODE_ENV=production` seed with defaults aborts.

---

## P9 — Employee DTO always reports `timesheetEligibility: "NOT_ELIGIBLE"`

**Severity:** Low — inconsistent API data (found during the P3 deep-dive).

**Evidence**

- `EMSB/src/services/employee.service.ts:378` — `toDTO()` hardcodes `timesheetEligibility: "NOT_ELIGIBLE"` for every employee, regardless of stored state.
- Meanwhile `GET /api/v1/employees/:employeeId/timesheet` (`getTimesheetStatus`, `:317-347`) computes the real status (ELIGIBLE / PROVISIONED / FAILED / ...).

**Impact**

- The frontend receives contradictory data: employee detail says `NOT_ELIGIBLE` while the timesheet endpoint says `ELIGIBLE`.

**Fix**

1. Map the stored `employee.timesheetEligibility` (and computed status) into the DTO consistently, reusing the same calculation as `getTimesheetStatus` (extract a shared private helper).
2. Add a test asserting the DTO reflects the computed status for an ACTIVE + BILLABLE + onboarded employee.

**Verification:** typecheck, lint, full suite; new assertion passes.

---

## Suggested Fix Order

1. **P1** (lint gate) — unblocks every other change; quick.
2. **P2** (audit attribution) — highest compliance value.
3. **P3** (role map) — small, data-correctness fix.
4. **P6** (regex escape) — quick security fix.
5. **P7** (file move) — trivial.
6. **P5** (event bus) — refactor, needs care.
7. **P4** (rate-limit store) — larger change.
8. **P8** (seed env) — small, independent.
9. **P9** (DTO consistency) — small, can ride along with P3.

Track progress in `fix-checklist.md`.
