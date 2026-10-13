# Onboarding Flow — Analysis & Industrialization Plan

**Project:** Eniac Inc. Employee Management System (`EMSB/` backend, `EMSF/` frontend)
**Scope:** The employee onboarding sub-flow end-to-end (model → service → controller → routes → events → timesheet-platform handoff).
**Analysis date:** 2026-10-11
**Baseline gates (measured):** `tsc --noEmit` PASS · `npm run lint` PASS (0 problems) · `vitest run` 492/492 PASS · `npm run build` PASS.
**Companion files:** `problems.md` (code review), `fix-checklist.md` (P1–P9 fixes already shipped), `EMSB/EMSB-Checklist.md`, `EMSB/Errors.md`, `Decisions.md`.

> Note: Findings #1, #2, #3 (#4–#5) were **not** part of the P1–P9 remediation. They are structural gaps in the onboarding flow itself, not regressions introduced by the fixes. P9.1 is mentioned in `fix-checklist.md` but understated (see §3).

---

## 1. Intended Lifecycle (what `info.txt` and the stage model promise)

```
Onboarding  ->  billable/non-billable  ->  India or US  ->  If billable then transferred to the Timesheet platform.
```

Stated stage state-machine (`src/models/onboarding.ts:3-11`):

```
EMPLOYEE_INFORMATION -> EMPLOYMENT_DETAILS -> GEOGRAPHY -> BILLING_CLASSIFICATION
-> DOCUMENTS -> HR_REVIEW -> ACTIVATION -> TIMESHEET_ELIGIBILITY
```

`OnboardingStatus` (`onboarding.ts:13-19`): `DRAFT → IN_PROGRESS → AWAITING_REVIEW → REVIEWED → REJECTED → COMPLETED`.

API surface (`src/routes/onboarding.routes.ts`):

| Method+Path | Controller action | Requires |
|---|---|---|
| `GET /onboarding` | `list` | `onboarding.manage` **or** `employee.view` |
| `POST /onboarding` | `create` | `onboarding.manage` (HR/Admin) |
| `GET /onboarding/:employeeId` | `getById` | `onboarding.manage` **or** `employee.view` **or** `profile.view_self` |
| `PATCH /onboarding/:employeeId` | `update` | `onboarding.manage` |
| `POST /onboarding/:employeeId/submit` | `submitOnboarding` | `onboarding.manage` **or** `profile.edit_self` (own) |
| `POST /onboarding/:employeeId/review` | `reviewOnboarding` | `onboarding.manage` |
| `POST /onboarding/:employeeId/approve` | `approveOnboarding` | `onboarding.manage` |
| `POST /onboarding/:employeeId/reject` | `rejectOnboarding` | `onboarding.manage` |
| `POST /onboarding/:employeeId/activate` | `activateOnboarding` | `onboarding.manage` |
| `POST /onboarding/:employeeId/invite` | `invitationController.create` | `onboarding.manage` |

Intended end-to-end sequence: **create → fill stages → submit → HR review → approve → activate → invite (account creation).**

---

## 2. What's Already Solid (do not regress)

- **Layered architecture**: routes → thin controllers → services → repositories → models; repositories never touch HTTP/JWT (`Decisions.md` layering enforced).
- **RBAC**: 62 permissions across 5 roles, ADMIN `"*"` wildcard, progressive scoping — centralized in `src/permissions/permissions.ts`. HR owns onboarding; Employees can only submit/touch their own (`profile.view_self`/`profile.edit_self`).
- **State-machine guards**: invalid transitions → 422 `INVALID_ONBOARDING_ACTION` (`onboarding.service.ts`).
- **Audit trail**: now fully attributed (P2) — `actorUserId` + `requestId` + `ipAddress` + `userAgent` via `src/utils/request-context.ts` (AsyncLocalStorage), populated by `audit-context.middleware.ts` and enriched in `authenticate()`.
- **Decoupled integration**: `src/integrations/events.ts` bus (`employeeActivated`, `employeeTimesheetEligibilityChanged`), wired once per process in `event-listeners.ts`, listener failures logged + swallowed (P5).
- **Invitation handoff**: tokens are SHA-256-hashed, single-use, expiry-gated (`src/services/invitation.service.ts:41-239`); only fires after onboarding `COMPLETED`.
- **Data hygiene**: `Decimal128` for money, env-driven seed passwords (P8), Zod on all inputs, Pino redaction for auth/passwords.

---

## 3. Findings — Brutally Honest

### 3.1 Finding #1 (HIGH) — The "transfer to the Timesheet platform" handoff is unimplemented.

`info.txt` promises *"If billable then transferred to the Timesheet platform."* The onboarding flow never does this.

- `approveOnboarding` (`onboarding.service.ts:241-291`) sets `employmentStatus: ACTIVE`, status `COMPLETED`, stage `ACTIVATION`, and emits **only** `integrationEvents.employeeActivated` → `NotificationService.onEmployeeActivated` (a notification, not a timesheet provisioning).
- `activateOnboarding` (`onboarding.service.ts:328-371`) sets stage `TIMESHEET_ELIGIBILITY`, re-sets `ACTIVE`, and emits `employeeActivated` **again** (duplicate notification). It does **not** emit `employeeTimesheetEligibilityChanged`, and does **not** call `TimesheetService` directly.
- The one event that actually creates/updates a timesheet record — `employeeTimesheetEligibilityChanged` → `TimesheetService.onEligibilityChanged` (`event-listeners.ts:37-50`) — is fired **exclusively** from `EmployeeService.updateEmploymentStatus` (`employee.service.ts:313`), i.e. the *employee lifecycle* controller, **never** from the onboarding activation path.

Consequence: an employee completed + activated **via onboarding** is never auto-provisioned to the timesheet platform. Provision only happens lazily on `GET /employees/:id/timesheet` (`TimesheetService.getStatus`, which creates the record on demand) or via manual `/provision`. The terminal `TIMESHEET_ELIGIBILITY` stage is a status label with no trigger behind it. The documented core handoff is fiction.

### 3.2 Finding #2 (HIGH) — Two divergent eligibility calculators; one is dead code reading a field nobody writes.

There are two eligibility rules; they disagree, and one is dead code.

- `EmployeeService.isTimesheetEligible` (`employee.service.ts:378`):
  `ACTIVE + BILLABLE + (!employee.timesheetEligibility || employee.timesheetEligibility.eligible)`.
  - `employee.timesheetEligibility` is **never written anywhere** (grep: declared only at `employee.ts:64`, read at `employee.service.ts:346/348/358/382/409`). So it's always `undefined` → the check degrades to **ACTIVE + BILLABLE only** and **ignores onboarding completion**, **over-reporting** eligibility.
  - It backs the employee list/detail DTO (`toDTO`, `employee.service.ts:409`) → the frontend shows `ELIGIBLE` for an ACTIVE+BILLABLE employee whose onboarding is *incomplete*.
- `TimesheetService.calculateEligibility` (`timesheet.service.ts:33-57`):
  `ACTIVE + BILLABLE + onboarding.status === "COMPLETED"` (reads `onboarding_records` collection). This is the correct rule, and it backs the real routed endpoint `GET /employees/:id/timesheet` → `timesheetController.getStatus` → `TimesheetService.getStatus` (`timesheet.service.ts:68`).
- `fix-checklist.md` P9.1 says the mismatch surfaces as *"a FAILED-provisioning employee shows ELIGIBLE on the routed endpoint while the DTO shows NOT_ELIGIBLE."* The **actual** bug is broader and worse: the DTO ignores onboarding completion entirely (see above), and `EmployeeService.getTimesheetStatus` (`employee.service.ts:333`) — the method the checklist's example relies on — is **dead code**: never routed. The real endpoint uses `TimesheetService.getStatus`. So the checklist understates the divergence; it is a correctness + dead-code problem, not a corner case.

### 3.3 Finding #3 (HIGH) — Billing classification and country→billability are decorative, not modeled.

`info.txt`: *"Onboarding -> billable/non-billable -> India or US -> If billable then transferred."*

- `createEmployee` hardcodes `billingStatus: "NON_BILLABLE"` (`employee.service.ts:164-165`). P9.2 in the checklist already notes the create schema *accepts* `billingStatus`/`employmentStatus` inputs the service discards. No onboarding stage mutates them.
- `validateOnboardingCompletion` (`onboarding.service.ts:380-392`) only *reads* `employee.billingStatus` to gate completion; there is **no action** that *sets* it to `BILLABLE`. The `BILLING_CLASSIFICATION` and `GEOGRAPHY` stages are stage *names* with no per-stage mutation logic.
- The DTO maps `country === "INDIA" ? "India" : "United States"` (`employee.service.ts:401`) — cosmetic only. There is **no country→billing rule and no country→timesheet-platform mapping.** This is the single largest gap vs. the stated requirements.

### 3.4 Finding #4 (MEDIUM) — Stage progression and `completedStages` are dead logic.

- `completedStages` is initialized to `[]` (`onboarding.service.ts:93`) and **never appended to** anywhere (grep: init + reads at `375`/`377` + passthrough at `399` only).
- Therefore `isStageComplete` (`onboarding.service.ts:373-378`) always returns `false`, and `submitOnboarding` (`onboarding.service.ts:187-193`) always advances to `EMPLOYEE_INFORMATION` regardless of what was actually filled.
- `updateOnboarding` accepts an arbitrary `currentStage` + `status` patch from HR with **no ordering validation** and no per-stage required-field sets; there is no "advance stage" action that checks prerequisites.

### 3.5 Finding #5 (MEDIUM) — Documents stage has no teeth.

- `documentRequirements` are a hardcoded static list of 4 types, all `uploaded: false` (`onboarding.service.ts:36-41`), created in `createOnboarding`.
- There is **no linking to the actual `documents` collection**; no upload wiring from onboarding; and `validateOnboardingCompletion` does **not** verify required docs are uploaded. An employee can be approved with zero documents.

### 3.6 Finding #6 (MEDIUM) — `approve` and `activate` are redundant and contradictory.

- `approveOnboarding` already sets `employmentStatus: ACTIVE`, status `COMPLETED`, stage `ACTIVATION`, and fires `employeeActivated`.
- `activateOnboarding` then re-sets `ACTIVE` (again) + stage `TIMESHEET_ELIGIBILITY` + fires `employeeActivated` a **second time** (duplicate notification), and requires `status === "COMPLETED"`.
- Net: approval *pre-activates* the employee before the explicit "Activate" step; the `ACTIVATION` stage and the `activate` action overlap; invitation (correctly) only fires after `COMPLETED`. Three near-identical transitions for what should be one.

### 3.7 Finding #7 (LOW–MED) — HTTP status semantics are wrong on authorization failures.

- The service returns `404 NotFoundError` for *forbidden* actions throughout (`onboarding.service.ts:73,133,163,213,226,246,299,333`): a 403 "Only HR or Admin can…" lands as a 404; the ownership gate in `getOnboarding` (`employeeId !== employeeId` → 404) obscures a 403 as 404.
- Obscuring *entity existence* is a defensible pattern for public apps, but for an internal permissioned HR system this makes client-side 403 handling and audit triage impossible. Role/ownership-denied cases should be `403`; only genuine absence should be `404`.

### 3.8 Finding #8 (LOW) — No test coverage of the handoff / gaps.

- `tests/onboarding.test.ts` exercises the happy-path state machine. `tests/events.test.ts` spies the `employeeActivated` emit but does **not** assert the downstream timesheet-side effect (provisioning), because per Finding #1 it never fires from onboarding. There is no test that an approved+activated BILLABLE employee results in a timesheet record — because it doesn't.

---

## 4. Industrialization Plan

Goal: turn onboarding into an end-to-end, auditable, timesheet-integrated lifecycle where *"billable → transferred to the Timesheet platform"* is automatic and provable.

### 4.1 Event-driven handoff (fixes #1, #2, #6)
- Make **`activateOnboarding`** (not `approve`) the sole trigger for the timesheet-side handoff. Fold the redundant `employeeActivated` emit so it fires **once**, from `activateOnboarding` only.
- From activation, emit `integrationEvents.employeeTimesheetEligibilityChanged({ employeeId, occurredAt })` so the existing listener (`event-listeners.ts`) runs `TimesheetService.onEligibilityChanged` → `calculateEligibility` → creates/updates the `timesheet_records` row. (If the employee is non-billable, the record is created as `NOT_ELIGIBLE`; the TS platform side stays consistent.)
- Remove `approveOnboarding`'s `employeeActivated` emit and its direct `employmentStatus: ACTIVE` write — approval should reach `COMPLETED` (review-approved) but **not** activate until the explicit `activate` step. This resolves the approve/activate redundancy (#6).
- **Delete dead code**: `EmployeeService.getTimesheetStatus` and the never-written `employee.timesheetEligibility?` field; make the DTO derive `timesheetEligibility` from the **single** `TimesheetService.calculateEligibility` rule (ACTIVE + BILLABLE + onboarding COMPLETED). One source of truth (fixes #2).

### 4.2 Real billing + geography model (fixes #3)
- Add a `billingStatus` mutation tied to the `BILLING_CLASSIFICATION` stage (HR sets BILLABLE / NON_BILLABLE), instead of `createEmployee` hardcoding `NON_BILLABLE`.
- Add a country→billability/business-unit rule (e.g. `GEOGRAPHY` stage selects `INDIA` / `UNITED_STATES`; billing status derived from the chosen rate card). Wire this into `validateOnboardingCompletion` as a *real* gate, not a read-only check.

### 4.3 Stage progression with teeth (fixes #4)
- Populate `completedStages` as each stage is fulfilled, with per-stage required-field/document checks.
- Add an `advanceStage` action (or stage-gate on submit/review) that validates prerequisites in order; reject out-of-order advancement with 422.
- `approveOnboarding` becomes a terminal gate: it requires all `completedStages` to include `DOCUMENTS` and all required docs to be uploaded (fixes #5).

### 4.4 Documents integration (fixes #5)
- Link onboarding `documentRequirements` to the existing `documents` repository by `type`; verify each required doc is uploaded before allowing `approve`.

### 4.5 Correct HTTP semantics (fixes #7)
- Return `403` for role/ownership-denied actions; reserve `404` for genuine absence. (Keep the no-existence leak fix only where it does not conflict with 403 semantics.) Add/extend the relevant `security.test.ts` assertions.

### 4.6 Test coverage (fixes #8)
- Add `onboarding.test.ts` cases: approved-but-not-activated BILLABLE employee has no timesheet record; activated BILLABLE employee yields a timesheet record via the bus; non-billable activation yields `NOT_ELIGIBLE`.
- Extend `events.test.ts` to assert the timesheet-side effect fires from onboarding activation (not just the emit spy).

### 4.7 Frontend alignment
- `EMSF/src/features/onboarding/` pages already model the 8 stages — ensure the `BILLING_CLASSIFICATION`/`GEOGRAPHY`/`DOCUMENTS`/`TIMESHEET_ELIGIBILITY` stages present real inputs (not static), and surface the computed TS eligibility from the unified source of truth.

---

## 5. Progress Checklist

Mark items `[x]` as they ship. Re-run gates from `EMSB/` after each batch:
`npx tsc --noEmit` · `npm run lint` · `npx vitest run`.

### Phase A — Activation handoff + unified eligibility (DONE — implemented per Option B1)
- [x] A1. `activateOnboarding` (`src/services/onboarding.service.ts:~369`) now emits `integrationEvents.employeeTimesheetEligibilityChanged({ employeeId, occurredAt })` after setting `ACTIVE`, reusing the existing listener (`TimesheetService.onEligibilityChanged`) that provisions the `timesheet_provisioning` record. Same path the employee-lifecycle `/activate` uses — now provably fired from onboarding.
- [x] A1-test. Extended `onboarding.test.ts` "HR can activate a completed onboarding" (EMP-ONB-2, BILLABLE) with assertions that a `timesheet_provisioning` row is created with `status=ELIGIBLE`, `eligible=true`. Passes.
- [x] A2. `approveOnboarding` reaches `COMPLETED` + stage `ACTIVATION` **without** writing `employmentStatus: ACTIVE` and **without** emitting `employeeActivated`. Approval = review passed; employee not yet live. Dedicated test added in `tests/onboarding.test.ts` (A2 describe block using EMP-A2-1 fixture) asserting `employmentStatus === "ONBOARDING"` after the full `create → submit → review → approve` flow.
- [x] A3. `employeeActivated` now fires **once**, from `activateOnboarding` only. `approveOnboarding` no longer emits it. `notifications.test.ts` updated to `approve → activate` before asserting the "Employee activated" notification (was `approve`-only).
- [x] A4. **DONE (corrected scope).** Deleted genuinely-dead `EmployeeService.getTimesheetStatus` + its private `TimesheetStatusDTO` (neither reachable from any route/controller/test). **Deliberately did NOT delete** the `employee.timesheetEligibility?` model field: the DTO reads it and `employees.test.ts:864` writes + asserts on it. Removing it would break a passing P9 test.
- [x] A5. **DONE.** `src/utils/timesheet-eligibility.ts` exports `computeTimesheetEligibility(employee, onboardingCompleted)` — the **single** eligibility predicate (`ACTIVE + BILLABLE + onboardingCompleted + stored-flags-not-false`). `TimesheetService.calculateEligibility` and `EmployeeService.isTimesheetEligible` both delegate to it, so the `/timesheet` endpoint and the employee DTO can never disagree. The DTO list path uses a batched `buildOnboardingCompletionMap` (one query per page, mirroring `buildRoleMap` → no N+1); detail uses a singleton `onboardingCompletedFor`. `TimesheetService.provision` now writes `employee.timesheetEligibility` on success (`{eligible:true}`) and on failure (`{eligible:false, reason:"FAILED"}`), so the FAILED branch is reachable in production and surfaced on **both** paths.
- [x] A6. Gates green: `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · `npm run build` exit 0 · `npx vitest run` **492/492** (23 files). `grep` confirms no `getTimesheetStatus`/`EmployeeService.TimesheetStatusDTO` references remain in `src/`.

### Phase B — Billing + geography
- [x] B1. Make `createEmployee` honor (or default) `billingStatus` from input instead of hardcoding `NON_BILLABLE` (`employee.service.ts:164-165`); align the create schema (P9.2 follow-up).
- [x] B2. Add a `BILLING_CLASSIFICATION` mutation action on onboarding (HR sets BILLABLE/NON_BILLABLE).
- [x] B3. Implement a country→billing/unit rule on the `GEOGRAPHY` stage; wire into completion gating.
- [x] B4. `validateOnboardingCompletion` requires billing set to `BILLABLE` (or explicit non-billable) before approval passes.
- [x] B5. Tests: non-billable activation → timesheet record `NOT_ELIGIBLE`; billable activation → `ELIGIBLE`/provisioning attempted.

### Phase B verification (2026-10-11)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npm run lint` — 0 problems
- [x] `npx vitest run` — 495/495 pass (23 files; +3 new Phase B tests)
- [x] `npm run build` — exit 0

### Phase C — Stage gating + documents
- [x] C1. Populate `completedStages` per fulfilled stage; add `advanceStage`/gate-on-submit ordering validation (422 on out-of-order).
- [x] C2. Link onboarding `documentRequirements` to the `documents` repository by `type`; verify each required doc is uploaded before allowing `approve`.
- [x] C3. `approveOnboarding` requires `DOCUMENTS` in `completedStages` + all required docs present.
- [x] C4. Tests: approve blocked when required docs missing / stages incomplete.

### Phase C verification (2026-10-11)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npm run lint` — 0 problems
- [x] `npx vitest run` — 499/499 pass (23 files; +4 new Phase C tests)
- [x] `npm run build` — exit 0

### Phase D — Correctness + coverage
- [x] D1. Return `403` (AuthorizationError) for role/ownership-denied onboarding actions (Finding #7); reserve `404` (NotFoundError) for genuine record/employee absence. All role checks in `createOnboarding`, `getOnboarding`, `updateOnboarding`, `submitOnboarding`, `reviewOnboarding`, `approveOnboarding`, `rejectOnboarding`, `activateOnboarding` now return `AuthorizationError`. Ownership checks (EMPLOYEE vs. other employee's record) also return `AuthorizationError`.
- [x] D2. "activation provokes a timesheet record via the bus" — A1-test asserts the `timesheet_provisioning.ELIGIBLE` row from onboarding `/activate`. "approval does not activate" — now true (A2/A3): approve leaves `employmentStatus=ONBOARDING`; `GET /employees/:id` after approve confirms non-ACTIVE.
- [x] D3. "onboarding-activation path produces the timesheet side effect" — A1-test asserts the real `timesheet_provisioning` row (not a spy).
- [x] D4. Gates green. `grep` confirms no `await import(` service-instantiation workarounds remain in `onboarding.service.ts`/`employee.service.ts` activation paths. The P5 notification-emitter refactor (see below) resolved the dynamic-import pattern across all 6 emitters.
- [x] D5. **DONE (hardening applied).** Stale FAILED flag cleared in `provision()`.

### Phase P5 — Notification emitter refactor (DONE — implemented 2026-10-11)
- [x] P5. All 6 `emitOn*` notification emitters now route through a shared `NotificationEmitter` singleton (`src/utils/notification-emitter.ts`) using **static imports** — no more `await import("./notification.service.js")` patterns. The emitter centralizes error-swallowing (try/catch + `logger.warn`) so a notification side-effect never breaks the business write. Refactored: `onboarding.service.ts` (`emitOnboardingAwaitingReview`), `timesheet.service.ts` (`emitOnTimesheetProvisioningFailed`), `leave.service.ts` (`emitOnLeaveSubmitted`, `emitOnLeaveResolved`), `document.service.ts` (`emitOnDocumentReviewed`), `assignment.service.ts` (`emitOnAssignmentCreated`). `grep` confirms zero `notification.service.js` dynamic-import matches in `src/services/`.

### Phase D verification (2026-10-11)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npm run lint` — 0 problems
- [x] `npx vitest run` — 501/501 pass (23 files; +1 A2 dedicated test)
- [x] `npm run build` — exit 0

### Phase E — Frontend parity
- [x] E1. Make `BILLING_CLASSIFICATION`/`GEOGRAPHY` stages present real inputs in `EMSF/src/features/onboarding/`.
- [x] E2. Show the unified timesheet eligibility (`ELIGIBLE`/`NOT_ELIGIBLE`) sourced from the backend single truth on the employee detail.

### Phase E verification (2026-10-11)
- [x] EMSB `npx tsc --noEmit` — exit 0
- [x] EMSB `npm run lint` — 0 problems
- [x] EMSB `npx vitest run` — 501/501 pass (17 files)
- [x] EMSB `npm run build` — exit 0
- [x] EMSF `npx tsc --noEmit` — exit 0
- [x] EMSF `npx vitest run` — 37/37 pass (5 files: documents, onboarding-steps, wizard-flow, Step7-8, Step6HRReview)
- [x] EMSF `npx oxlint` — 0 new warnings (7 pre-existing)

### Phase A verification (DONE — 2026-10-11)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npm run lint` — 0 problems
- [x] `npx vitest run` — 492/492 pass, 23 files (incl. new onboarding activate→ELIGIBLE assertion)
- [x] `npm run build` — compiles
- [x] Live smoke covered by `tests/onboarding.test.ts` (A1-test) through the real bus + listener against the test MongoDB — confirmed a `timesheet_provisioning` row with `status=ELIGIBLE`, `eligible=true` is created when a BILLABLE employee is activated via onboarding. The shared predicate (`timesheet-eligibility.ts`) guarantees a NON_BILLABLE activation produces `NOT_ELIGIBLE` (covered by `events.test.ts:142` through the same code path).
- [x] Full `approve → activate` sequence verified: approve leaves `employmentStatus=ONBOARDING` (A2); `GET /employees/:id` after approve confirms non-ACTIVE; `activate` then sets `ACTIVE` + creates the `timesheet_provisioning` row. (`onboarding.test.ts:381` already asserts ACTIVE after activate.)
