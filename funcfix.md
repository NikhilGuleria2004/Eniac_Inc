# funcfix.md — Onboarding Flow Defects & Remediation Plan

Scope: `EMSF` (Employee Onboarding frontend) and `EMSB` (backend API) onboarding
invite + password-setup flow. Documents two reported symptoms, their root causes,
a verified fix for #2, and an actionable plan + checklist for #1 (and the
related systemic local-store problem).

---

## 1. Reported symptoms

1. **Symptom A** — Onboarding an employee (HR sends invite) succeeds on the UI,
   but the new hire does **not** appear in the Onboarding list on the dashboard.
2. **Symptom B** — When the invitee tries to set their password (accept the
   invitation), the request is rejected with **"Too many requests"** (HTTP 429)
   before the password is set.

These are **independent** defects. Symptom A is a client-side data-sync bug;
Symptom B is a server-side rate-limit mis-wiring.

---

## 2. Root-cause analysis

### 2.1 Symptom B — "Too many requests" on password setup  ✅ FIXED

The password-setup path is the invitation "accept" endpoint:

- Frontend: `EMSF/src/features/auth/AcceptInvitePage.tsx`
  `handleSubmit` → `apiFetch(\`/invitations/${token}/accept\`, {method:"POST", body:{password}})`
- Backend route: `EMSB/src/routes/invitation.routes.ts`
  `router.post("/:token/accept", authRateLimiter, invitationController.accept)` and
  `router.get("/:token", authRateLimiter, invitationController.getByToken)`

The limiter applied here is `authRateLimiter`
(`EMSB/src/middleware/rate-limit.middleware.ts:43`), which is intended for
**credential-stuffing protection on login/refresh** and is keyed by
`authKeyGenerator` (line 36):

```ts
export function authKeyGenerator(req: Request): string {
  const body = req.body as { email?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.trim().toLowerCase() : "";
  const ip = req.ip ?? "unknown-ip";
  return email ? `${ip}|${email}` : ip;   // ← IP-only when no email in body
}
```

The bug: the `/:token/accept` body is **only `{ password }`** and the `GET /:token`
has no body, so `email` is always `""`, and the key degenerates to **`ip` alone**.
`authRateLimiter` uses `max: env.AUTH_RATE_LIMIT_MAX` (default 50; see
`EMSB/src/config/env.ts:13`) over a 15-minute window, backed by the shared
`MongoRateLimitStore` (`localKeys = false`, so it is shared across processes and
the 15-min window).

Consequences:
- The whole office / NAT / VPN / mobile-carrier IP collapses into a **single 50-hit
  bucket per 15 min**.
- Every preview `GET /:token` and every accept attempt from any invitee on that IP
  consumes a slot from the same bucket.
- A few retries (e.g. a password that fails the client-side rules, link re-opened,
  colleagues on the same public IP) exhaust the IP-only bucket → the auth limiter's
  429: `{ "error": { "message": "Too many requests. Please try again later." } }`.

This limiter adds **no security value** on these endpoints because they are
authenticated by the invitation **token** (32 random bytes, `randomBytes(32)`,
`EMSB/src/services/invitation.service.ts:95`), guarded by expiry
(`INVITE_EXPIRY_DAYS=7`, `EMSB/src/config/env.ts:15`) and single-use status
(`loadValidInvitation` enforces `status === "PENDING"`). There is no password to
brute-force here (the endpoint *sets* a password).

#### Fix applied (commit this once validated)
`EMSB/src/routes/invitation.routes.ts`: remove `authRateLimiter` from both
token endpoints and its now-unused import. The global `apiRateLimiter`
(`EMSB/src/app.ts:29`, `app.use(apiRateLimiter)`, 1000/15min/IP) still provides
flood/DoS protection.

```ts
// Public endpoints — guarded by the one-time invitation token, not a session.
router.get("/:token", invitationController.getByToken);
router.post("/:token/accept", invitationController.accept);
```

#### Verification
- `cd EMSB && npm run typecheck` → exit 0
- `npx oxlint src/routes/invitation.routes.ts` → exit 0
- `npx vitest run tests/invitations.test.ts tests/rate-limit.test.ts` →
  28 passed (18 invitations + 10 rate-limit)
- No test asserted `authRateLimiter` on invitation routes (confirmed by grep).

#### Alternate / harderening option (not applied — optional future work)
If per-token protection is later desired, add a token-scoped limiter in
`rate-limit.middleware.ts` whose `keyGenerator` uses `req.params.token` (or
`hashToken(req.params.token)`) with a modest cap (e.g. 10/window), and apply it
to these two routes instead of removing protection entirely.

### 2.2 Symptom A — New employee missing from Onboarding list (local-only data)

`EMSF/src/features/onboarding/OnboardingDashboardPage.tsx:35`:

```ts
const employees = useMemo(() => getEmployees(), [forceRefresh]);
```

`getEmployees()` (`EMSF/src/data/mock/repositories.ts:5`) is:

```ts
export function getEmployees(): Employee[] {
  return [...mockEmployees];   // in-memory array, never hits the backend
}
```

`mockEmployees` is hydrated **once** at app boot by `loadBackendData()`
(`EMSF/src/data/mock/index.ts:15`, fetches `/employees?pageSize=100`).
`forceRefresh` only changes on Delete (`handleDelete`, line 65), never on Create.
Therefore the dashboard always renders the boot-time snapshot and never re-reads
the `/employees` API after a new hire is created.

`createEmployee` (`repositories.ts:21`) does call the backend (`await apiFetch("/employees", POST)`)
and only pushes to the local array on success — but that push is (a) **in-memory only**, so
any remount/reload of the dashboard discards it, and (b) not communicated back to the
dashboard's cached list. So even a successful create is invisible until a full reload
that re-runs `loadBackendData()` (which itself ran before the hire existed).

Stage derivation (`getOnboardingStage`, `onboarding.ts:164`) is local-only too and
depends on the local `getDocuments()`. A brand-new hire normally resolves to stage
`"Documents"` (not `"Completed"`), so the dashboard's
`inPipeline = records.filter((r) => r.currentStage !== "Completed")` would include them
**if** they were present in `mockEmployees`. The defect is purely that they are absent.

---

## 3. Systemic scope — frontend functions that never call the backend

Both frontends use a `*mock*/repositories.ts` layer that reads/writes in-memory
arrays; reads never hit the API and only reflect the boot-time hydration. Full
enumeration (function : line) lives in §4–§5. The headline: every `get*List`/
`get*ById` reader in EMSF (30 exported + 5 private helpers) and CMSF (32 exported)
is local-only, so **any** list page that reads them is subject to the same staleness
as the Onboarding dashboard.

---

### 2.3 Symptom A — fix applied (Approach A: reactive in-memory store)

Chosen over Approach B (live `/employees` refetch) per scope (see §6).

`EMSF/src/data/mock/index.ts`: added a tiny reactive store over the existing
`mockEmployees` array (the dashboard already reads it; it just wasn't being
re-read):
- `refreshEmployees()` — bumps an internal version counter and notifies listeners.
- `subscribeEmployees(cb)` / `getEmployeesVersion()` — `useSyncExternalStore`
  subscription + primitive version snapshot (stable reference = primitive).

`EMSF/src/data/mock/repositories.ts`:
- `createEmployee` (`:21`) now calls `refreshEmployees()` after its
  `mockEmployees.push(...)` (so the in-session list updates on invite-create).
- `updateEmployee` (`:65`) and `deleteEmployee` (`:96`) bump on success too.
- `loadBackendData()` bumps after the boot hydration.

`EMSF/src/features/onboarding/OnboardingDashboardPage.tsx`:
- replaced `useMemo(() => getEmployees(), [forceRefresh])` with
  `useSyncExternalStore(subscribeEmployees, getEmployeesVersion)` → `useMemo(...[version])`.
- removed the now-redundant `forceRefresh` state and its `setForceRefresh` in
  `handleDelete` (delete now invalidates the live read).

Because `mockEmployees` is a module singleton in the SPA bundle, a newly invited
employee (already pushed by `createEmployee` on success) is visible when the
dashboard remounts on navigation-back, and also updates live if the dashboard
stayed mounted. **Does not survive a hard browser refresh** (that needs Approach
B's `/employees` refetch) — left as a future, opt-in enhancement.

Verification (from `EMSF`):
- `npx tsc --noEmit` → 0
- `npx oxlint` on changed files → 0 (only pre-existing `const-comparisons` warnings)
- `npx vitest run` → 12 files, 92 tests pass (was 90; +2 new)

`EMSB/src/routes/invitation.routes.ts`: removed `authRateLimiter` from
`GET /:token` and `POST /:token/accept` (see §2.1). EMSB `tsc --noEmit` → 0,
`oxlint` → 0, `tests/invitations.test.ts` + `tests/rate-limit.test.ts` → 28 pass.
## 4. Fix plan (Symptom A + systemic)

Goal: list pages reflect server state after mutations, without losing offline
optimism where it already exists.

### Phase 1 — Unblock the Onboarding dashboard (P0, directly fixes Symptom A)  ✅ DONE (Approach A)
1. `EMSF/src/data/mock/index.ts`: added `refreshEmployees()` / `subscribeEmployees()` /
   `getEmployeesVersion()` reactive store over `mockEmployees`; called in `loadBackendData`.
2. `EMSF/src/data/mock/repositories.ts`: `createEmployee`/`updateEmployee`/`deleteEmployee`
   call `refreshEmployees()` after mutating `mockEmployees`.
3. `OnboardingDashboardPage.tsx`: switched from `useMemo([forceRefresh])` to
   `useSyncExternalStore(subscribeEmployees, getEmployeesVersion)`; dropped `forceRefresh`.
4. Regression test: `EMSF/tests/onboarding/onboarding-dashboard-create.test.tsx`.

### Phase 2 — Generalize the data-sync contract (P1, systemic)
3. Audit every `get*()`/`get*ById()` reader (§4–§5) and tag which must be live
   (user-mutated, HR-visible lists) vs truly seed-only.
4. For live readers, add API-backed variants (e.g. `fetchEmployees(params)`) and
   update the feature pages to use them; keep local `mockEmployees` only for offline
   fallback / boot cache.
5. Standardize mutation→read invalidation: after any `create*/update*/delete*`
   succeeds, invalidate the relevant list (invalidate-by-tag / version token) rather
   than mutating a local array the UI may not read.
6. Reconcile the `apiWrite`/`apiFetch(...).catch` fire-and-forget writers: a
   backend failure currently shows as silent success. At minimum surface a toast on
   failure (opt-in per caller).

### Phase 3 — Guardrails (P2)
7. Add a lint rule / codegen check that flags `get*()` readers that bypass the API
   in `USE_API`/`live` mode, so this bug class is caught in review.
8. Add an integration test: create employee → dashboard shows it within N ms
   without reload.

### Out of scope (not done now)
- The duplicate-email create path. `createEmployee` already `await`s the POST before
  pushing, so a 409 never corrupts the local store; the 409-specific message surface
  was added in `EmployeeFormPage.tsx` (uses `ApiRequestError`). No change required.

---

## 5. Detailed inventory (function : file : line)

### 5.1 EMSF `src/data/mock/index.ts` (reactive employee store — new)

- `refreshEmployees()` — bumps version, notifies `useSyncExternalStore` consumers.
- `subscribeEmployees(cb)` / `getEmployeesVersion()` — subscription + primitive snapshot.

### 5.2 EMSF `src/data/mock/repositories.ts` (mutators that now invalidate)

- `createEmployee` `:21`, `updateEmployee` `:65`, `deleteEmployee` `:96` → call `refreshEmployees()`
  after mutating `mockEmployees` (was: only `createEmployee` pushed, no invalidation).

Local-only readers (never call backend) — 30 exported:
- `getEmployees` :5  ← **Symptom A**
- `getEmployeeById` :13
- `getEmployeeByCode` :17
- `getClients` :184
- `getClientById` :188
- `getClientsByStatus` :192
- `getProjects` :252
- `getProjectById` :256
- `getProjectsByClient` :260
- `getProjectsByManager` :264
- `getAssignments` :318
- `getAssignmentById` :322
- `getAssignmentsByEmployee` :377
- `getAttendance` :381
- `getAttendanceByEmployee` :385
- `getLeaveRequests` :463
- `getLeaveRequestById` :467
- `getLeaveRequestsByEmployee` :471
- `getLeaveBalances` :523
- `getLeaveBalancesByEmployee` :527
- `getDocuments` :531
- `getDocumentById` :535
- `getDocumentsByEmployee` :539
- `getReviews` :606
- `getReviewById` :610
- `getReviewsByEmployee` :614
- `getReviewsByReviewer` :618
- `getNotifications` :663
- `getNotificationsByUser` :667
- `getUnreadNotificationCount` :671
- `getAuditLogs` :695
- `getTimesheetStatus` :699  *(canned "requires API integration")*
- `getSettings` :708

Private local helpers:
- `nextClientId` :196, `nextClientCode` :205, `nextProjectId` :268,
  `nextProjectCode` :277, `nextAssignmentId` :326

Fire-and-forget writers (POSTs `apiFetch(...).catch`, always mutate local):
- `createClient` :214, `updateClient` :238, `createProject` :286, `updateProject` :304,
  `createAssignment` :335, `updateAssignment` :352, `deleteAssignment` :366,
  `requestAttendanceCorrection` :440, `reviewAttendanceCorrection` :451,
  `createDocument` :543, `updateDocument` :564, `deleteDocument` :575,
  `reviewDocument` :585, `createReview` :622, `updateReview` :636, `submitReview` :647,
  `completeReview` :655, `markNotificationAsRead` :675, `markAllNotificationsRead` :683

Properly `await`ed backend mutations (still only side-effect the local array):
- `createEmployee` :21, `updateEmployee` :65, `deleteEmployee` :96,
  `createOnboardingRecord` :104, `updateOnboardingBilling` :111,
  `uploadEmployeeDocument` :151, `getCompensation` :131, `saveCompensation` :136,
  `sendOnboardingInvite` :728, `approveOnboarding` :742, `rejectOnboarding` :755,
  `activateOnboarding` :780, `checkIn` :389, `checkOut` :416,
  `createLeaveRequest` :475, `decideLeaveRequest` :503

### 5.2 CMSF `src/data/mock/repositories.ts`

Local-only readers — 32 exported:
- `getEmployees` :56, `getEmployeeById` :60, `getBillableEmployees` :64,
  `getClients` :68, `getClientById` :72, `getClientsPaginated` :76,
  `getProjects` :80, `getProjectById` :84, `getProjectsByClient` :88,
  `getProjectsByManager` :92, `getAssignments` :96, `getAssignmentById` :100,
  `getAssignmentsByEmployee` :104, `getActiveAssignmentsByEmployee` :108,
  `getAssignmentsByProject` :112, `getDailyLogs` :116, `getDailyLogsByEmployee` :120,
  `getDailyLogsByProject` :124, `getDailyLogsInPeriod` :128, `getTimesheets` :132,
  `getTimesheetById` :136, `getTimesheetsByEmployee` :140,
  `getCurrentTimesheetForEmployee` :144, `getPendingTimesheetReviews` :148,
  `getInvoices` :152, `getInvoiceById` :167, `getInvoicesByClient` :171,
  `getInvoiceTemplates` :175, `getNotificationsByUser` :179, `getAuditLogs` :183,
  `getNotifications` :187, `getApprovedTimesheetsForClient` :635

Local-only (no API) mutations:
- `upsertInvoiceLocal` :161, `markNotificationRead` :191, `markAllNotificationsRead` :199,
  `logAudit` :798

All writes route through `apiWrite()` (:30, `void apiFetch(...).catch`, gated on
`USE_API`) and mutate local arrays synchronously. Mutators: `createClient` :221,
`updateClient` :252, `createProject` :261, `updateProject` :281, `createAssignment` :290,
`updateAssignment` :315, `endAssignment` :324, `createDailyLog` :374,
`updateDailyLog` :403, `submitTimesheet` :427, `approveTimesheet` :439,
`rejectTimesheet` :453, `reviseTimesheet` :466, `markPaidTimesheet` :476,
`createTimesheet` :497, `createInvoice` :582, `updateInvoice` :662,
`addLineItem` :705, `updateLineItem` :713, `removeLineItem` :723,
`reorderLineItems` :735, `sendInvoice` :744, `voidInvoice` :755, `markPaidInvoice` :767,
`recordPartialPayment` :798, `compileTimesheet` :497.

---

## 6. API-backed reader (deferred — Approach B, optional future work)

Approach A (done above) keeps the in-memory store reactive rather than refetching
from `/employees`, so a hard page refresh still shows the boot snapshot until
`loadBackendData` re-runs. If full-reload freshness is later required, add an
API-backed reader — e.g. to a new `EMSF/src/data/api/employees.api.ts` (mirror
CMSF's `src/data/invoices.api.ts`), and let the dashboard refetch on mount:

```ts
// EMSF
export async function fetchEmployees(params: {
  page?: number; pageSize?: number;
  status?: EmploymentStatus; q?: string;
} = {}): Promise<{ data: Employee[]; pagination: Pagination }> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.status) q.set("status", params.status);
  if (params.q) q.set("q", params.q);
  const res = await apiFetch<Employee[]>(`/employees?${q.toString()}`);
  return { data: res.data, pagination: res.pagination ?? { page: 1, pageSize: params.pageSize ?? 100, total: res.data.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
}
```

Use `useSyncExternalStore` (or a React Query-style cache) so list components
re-render on mutation + invalidate on `createEmployee`/`updateEmployee`/`deleteEmployee`.

---

## P11–P13 outcomes

### P11 — Audit of live list readers (prioritized)

`OnboardingDashboardPage` is the pattern to repeat. Priority ranking of other
`getEmployees()`-backed readers in `EMSF/src/features` (all read the in-memory
seed and never re-fetch; `useMemo([...], [])` variants are stale-for-the-session,
the worst case):

**P0 — HR-visible lists that change on writes (highest value):**
- `OnboardingDashboardPage` `:35` — fixed (Approach A).
- `EmployeeDirectoryPage` `:33` (stale: `useMemo([forceRefresh])`, only bumps on delete).
- `HRDashboard` `:14`, `AdminDashboard` `:40`, `SupervisorDashboard` `:9`.
- `AnalyticsDashboardPage` `:113`, `ReviewDashboardPage` `:24`, `AssignmentsDashboardPage` `:229`,
  `DocumentListPage` `:43`, `LeaveDetailPage` `:40`, `AuditLogPage` `:21`.

**P1 — lookup/denormalization readers (correctness on rename/reassign):**
- `projects.ts` `:72/:77/:86`, `assignments.ts` `:32/:56`, `StepEditors.tsx` `:155/:206`,
  `ProjectDetailPage`/`ProjectDashboardPage` `:196/:227`, `CommandPalette` `:50`,
  `SearchBar` `:20`, `EmployeesTab`/`BalancesTab`/`RequestsTab`,
  `ReviewsTab` `:7`, `TodayTab`/`ExceptionsTab`/`ReportsTab`/`CalendarTab`.

**P2 — data-layer / non-UI helpers:** `analytics.ts:15`, `reports.ts:67/:88`,
`reviews.ts:35/:65/:70/:75`.

Note: wiring every page would force updating the per-page `vi.mock("@/data/mock/repositories")`
test factories that replace the module wholesale (they'd need to also export
`subscribeEmployees`/`getEmployeesVersion`). Recommend gating the next batch behind
a feature flag and adding the corresponding `refreshX()` bumps in each mutator.

### P12 — Fire-and-forget failure visibility  ✅ DONE (observability minimum)

Converted all 20 swallowed `.catch(() => {})` writes in
`EMSF/src/data/mock/repositories.ts` to log the rejection:
`.catch((e: unknown) => console.warn("API write failed:", e));` — matching the
`console.error` pattern already used by `checkIn`/`checkOut` and `loadBackendData`.
CMSF already logs via its `apiWrite()` helper. No return-signature/call-site
changes; existing tests unaffected (verified below). Full **toast-on-error at the
call site** still requires surfacing the write promise to the UI (e.g.
`createClient` returning `Promise<boolean>`) — a breaking change to ~17 synchronous
callers, deferred to a follow-up if UX signalling is needed.

### P13 — Lint/codegen guard  ✅ Documented (oxlint can't express it)

oxlint has no rule that detects "this function never calls the API", and a generic
"get* reader bypasses the API in live mode" check isn't expressible as a pattern
rule (it needs call-graph analysis / a custom plugin). Concrete plan:
1. **ESLint custom rule** `no-localonly-getters`: flag any `get*|get*ById|get*By*`
   exported from `*mock*/repositories.ts` whose body has no `apiFetch`/`apiWrite`.
   EMSB already runs ESLint (where this belongs first). EMSF uses oxlint; gate EMSF
   enforcement behind the next ESLint migration.
2. **vitest contract test**: `import * as repos` and assert each `get*` reader stays
   pure-local (returns empty when the mock array is empty, and never calls apiFetch) —
   a regression guard that any future reader that hits the API must ship invalidation.
(Recommended P14+; not implemented here.)

---

## 7. Checklist

- [x] P1: Root-cause Symptom B (429) — `authRateLimiter` IP-only on token endpoints
- [x] P2: Apply fix in `EMSB/src/routes/invitation.routes.ts` (remove limiter + import)
- [x] P3: Verify `tsc --noEmit` in EMSB
- [x] P4: Verify `oxlint` on changed route file
- [x] P5: Verify `invitations` + `rate-limit` tests pass
- [x] P6: Root-cause Symptom A (dashboard reads local-only `getEmployees`) — see §2.2
- [x] P7: Enumerate all backend-never-calling frontend functions (§5)
- [x] P8: Reactive in-memory employee store (`refreshEmployees`/`subscribeEmployees`/`getEmployeesVersion` in index.ts; called in `loadBackendData`)
- [x] P9: Dashboard reads via `useSyncExternalStore`; `createEmployee`/`updateEmployee`/`deleteEmployee` bump version
- [x] P10: Regression test `tests/onboarding/onboarding-dashboard-create.test.tsx` (create → appears without reload; rejected create stays hidden)
- [x] P11: Audit + prioritize live `getEmployees()` readers (§P11)
- [x] P12: Stop swallowing fire-and-forget write errors (20 sites → console.warn; toast-by-callsite deferred)
- [x] P13: Lint/codegen guard design documented (oxlint limitation; recommend ESLint custom rule + contract test)
- [x] P14: EMSF green (tsc 0, oxlint 0, 92 tests); EMSB tsc 0 + invitations/rate-limit 28 tests pass
