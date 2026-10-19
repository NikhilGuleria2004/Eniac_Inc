# QA Checklist — Eniac Inc. CMS

This checklist tracks progress for all issues identified in QA.md. Mark [ ] as pending, [x] as complete, [~] as in progress. Include verification steps for each item.

## Phase 1: Unblock Quality Gates (P0)

- [x] **P1a. Fix lint gate (E1, T4)** — Create `EMSB/tsconfig.eslint.json` including `src/**/*.ts`, `tests/**/*.ts`, `vitest.config.ts`; update `.eslintrc.cjs` `parserOptions.project`; fix lint errors in tests.  
  **Verify:** `cd EMSB && npm run lint` exits 0; `npm run typecheck` still clean.
- [x] **P1b. Reconcile tooling (Q7)** — Document lint strategy (eslint for EMSB, oxlint for CMSF).  
  **Verify:** Strategy documented in README or QA.md updates; no regressions.

## Phase 2: Security Hardening (P0)

- [x] **P2a. Audit attribution (S1)** — Create `EMSB/src/utils/request-context.ts` (AsyncLocalStorage); wrap in `audit-context.middleware.ts`; enrich in `authenticate()`; update `AuditService.record()` to merge defaults; remove 12 `employeeId→actorUserId` misuses. Add tests.  
  **Verify:** Mutation produces audit row with non-empty `actorUserId`, `requestId`, `ipAddress`.
- [x] **P2b. Rate limit store (S2)** — Implement MongoDB-backed `rate-limit.store.ts` with TTL index; wire to both limiters; IP+email keyGenerator for auth; add TTL index in `init-db.ts`.  
  **Verify:** Counters persist across server restart; auth limiter keys by IP+email.
- [x] **P2c. Regex escaping (S3)** — Add `escapeRegex()` in utils; apply to 4 repositories; clamp search length in Zod schemas; add tests.  
  **Verify:** Literal metacharacters match correctly; long search rejected (400).
- [x] **P2d. Seed passwords (S4)** — Read from env with dev-only defaults; abort in production if defaults; update `.env.example`.  
  **Verify:** `npm run seed` honors env vars; production with defaults aborts.
- [x] **P2e. Email handling (S5,S6,S7)** — Don’t swallow email errors; don’t permanently cache misconfigured adapter (or add reset); validate `MAIL_FROM`.  
  **Verify:** Failed email propagates error/flag; misconfig doesn’t permanently cache bad adapter.

## Phase 3: Fix Data Integrity & Contracts (P0)

- [x] **P3a. Unify state machine (D1)** — Make backend `TRANSITIONS` authoritative; align frontend `invoices.ts` and mock `repositories.ts`; add tests.  
  **Verify:** State machine tests pass; no layer divergence.
- [x] **P3b. Invoice number/id safety (D2)** — Use atomic generation or keep retry; `findById` matches invoiceId only (separate `findByNumber`); fix `upsertInvoiceLocal` to match by id.  
  **Verify:** No ambiguous lookups; concurrent creates don’t produce duplicates.
- [x] **P3c. Fix createdBy (D3)** — Store `actorUserId` (not role); update types, service, tests.  
  **Verify:** `createdBy` is a user ID.
- [x] **P3d. Align API usage (D4,C1)** — Make `InvoiceDetailPage` use `invoices.api.ts` when `USE_API=true`; decide re autoPopulate; add tests.  
  **Verify:** Detail actions hit backend in live mode; preview/create flow consistent.
- [x] **P3e. Fix tax rate semantics (D6)** — Decide units (decimal 0-1); enforce in Zod (`min(0).max(1)`) and docs; update frontend.  
  **Verify:** Validation matches computation.
- [x] **P3f. Add guards (D7,B6)** — Prevent negative `balanceDue`; prevent empty invoices; fix `recordPayment` transition assertion.  
  **Verify:** Guards enforced; correct errors.

## Phase 4: Correct Bugs & Performance (P1)

- [x] **P4a. PDF layout (B1)** — Use `pageRowLimit`/`finalPageReserve`; add test with many line items.  
  **Verify:** No overflow with 20+ line items; test passes.
- [x] **P4b. PDF memory (B2)** — Document/consider streaming; add size thresholds if needed.  
  **Verify:** Behavior documented; no regressions.
- [x] **P4c. Eliminate N+1 (B3)** — Batch fetch employees in `autoPopulate`.  
  **Verify:** Single/batched query; performance improved.
- [x] **P4d. DB aggregation (B4)** — Move/optimize `getApprovedPeriodOptions` to avoid full array scan where appropriate.  
  **Verify:** Reduced work per call.
- [x] **P4e. Event bus wiring (Q4)** — Create `event-listeners.ts`; wire at startup; replace dynamic-imports with emits; add error handler; add tests.  
  **Verify:** Subscribers wired; no dynamic-import workarounds.

## Phase 5: Code Quality & DTO Fixes (P1)

- [x] **P5a. Deduplicate rates (Q1)** — Extract single source of truth; add drift check.  
  **Verify:** No duplicate copies; build/check passes.
- [x] **P5b. Refactor monoliths (Q2)** — Split `invoice.service.ts` and `InvoiceComposerPage.tsx` into smaller modules.  
  **Verify:** Reduced file sizes; same behavior.
- [x] **P5c. Fix Employee DTO (Q3,Q6)** — Inject `UserRepository`; remove hardcoded role map; share `timesheetEligibility` helper; add tests.  
  **Verify:** DTO reflects correct role/eligibility.
- [x] **P5d. Reorganize middleware (Q5)** — Move `securityHeaders` to `security.middleware.ts`.  
  **Verify:** Clean imports; behavior unchanged.
- [x] **P5e. Centralize ID generation (Q8)** — Create ID generator utility.  
  **Verify:** Single generator used across repo/mock/frontend.

## Phase 6: Testing & Coverage (P1)

- [x] **P6a. Frontend invoice tests (T1)** — Add tests for composer, detail, API, sync/preview/overlap, transitions.  
  **Verify:** CMSF invoice tests added/passing.
- [x] **P6b. Backend invoice tests (T2)** — Cover update/add/remove/reorder, overlap endpoint, templates.  
  **Verify:** EMSB invoice tests expanded/passing.
- [x] **P6c. E2E flow test (T3)** — Test create→send→PDF→email flow (log adapter).  
  **Verify:** E2E test passes.
- [x] **P6d. Mail adapter tests (T5)** — Test fallback/misconfig paths.  
  **Verify:** Mail adapter tests passing.

## Phase 7: Environment & Cleanup (P2)

- [x] **P7a. Secrets/stray files (E4)** — Review `credentials.txt`, `EMSB.zip`, etc.; remove/secure as appropriate; update `.gitignore`.  
  **Verify:** No secrets exposed; repo clean.
- [x] **P7b. Doc reconciliation (Doc1–Doc4)** — Update `CMSB.md`/`CMSF.md` to match implementation; reconcile checklists.  
  **Verify:** Docs consistent with code.
- [x] **P7c. API default (E2)** — Decide `USE_API` default; document behavior.  
  **Verify:** Documented; no surprise fallbacks.
