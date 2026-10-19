# Eniac Inc. CMS — Quality Analysis Report

This document captures all findings from the full-scale codebase analysis. It is a problem report only; no fixes have been applied.

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Security Issues](#security-issues)
3. [Data Integrity & Consistency Issues](#data-integrity--consistency-issues)
4. [Frontend ↔ Backend Contract Mismatches](#frontend--backend-contract-mismatches)
5. [Bugs & Logic Errors](#bugs--logic-errors)
6. [Testing Coverage Gaps](#testing-coverage-gaps)
7. [Performance & Scalability Issues](#performance--scalability-issues)
8. [Code Quality & Maintainability Issues](#code-quality--maintainability-issues)
9. [Environment, Config & Build Issues](#environment-config--build-issues)
10. [Documentation Drift](#documentation-drift)
11. [Best Course of Action to Fix All Problems](#best-course-of-action-to-fix-all-problems)

---

## 1. Executive Summary

The codebase is a two-subsystem platform (`EMSB` Express + MongoDB backend, `CMSF` React frontend) sharing one `/api/v1` API. The invoicing module is the most developed feature and is largely consistent with its spec (`CMSB.md` / `CMSF.md`), but there are cross-cutting defects in security, audit attribution, data integrity, frontend/backend contract alignment, and build/tooling gates that would block production readiness. The companion `problems.md` (dated 2026-10-11) catalogs 9 backend issues (P1–P9); this analysis covers those plus CMSF-specific and invoice-module findings.

**Total Issues Identified:** 52 (Security: 8, Data Integrity: 10, Contract Mismatches: 5, Bugs: 7, Testing Gaps: 5, Performance: 4, Code Quality: 8, Environment/Config: 4, Documentation: 4)

---

## 2. Security Issues

| # | Severity | Issue | Evidence | Impact |
|---|----------|-------|----------|--------|
| S1 | High | **Audit log has no actor/request attribution** | `problems.md` P2; `EMSB/src/middleware/audit-context.middleware.ts` populates `req.auditContext` but nothing reads it; middleware runs before `authenticate` so `userId` would be undefined even if read; 33 `writeAuditLog` sites, only 2 pass `actorUserId`; 12 sites write `employeeId` into the `actorUserId` slot | Cannot answer "who changed what"; `actorUserId`/`requestId`/`ipAddress` are undefined on nearly every audit row; 12 sites actively misleading; `GET /api/v1/audit-log` filters match nothing |
| S2 | Medium | **Rate limiting is per-process, in-memory** | `problems.md` P4; `EMSB/src/middleware/rate-limit.middleware.ts:26-52` uses express-rate-limit default `MemoryStore` | Counters reset on restart; with N instances effective limit = N × configured; auth brute-force window is per-process/IP only |
| S3 | Low-Medium | **Search injection / ReDoS via unescaped `$regex`** | `problems.md` P6; 4 repositories build regexes directly from user input (`employee.repository.ts:53-63`, `client.repository.ts:33-34`, `document.repository.ts:44`, `onboarding.repository.ts:40`) | `.*` / `(a+)+$` can cause catastrophic backtracking; literal strings with metacharacters match incorrectly |
| S4 | Low | **Hardcoded seed passwords in source** | `problems.md` P8; `EMSB/src/scripts/seed.ts:7-11` plaintext demo passwords | Future secret leak risk if committed |
| S5 | Medium | **Invoice email failures silently swallowed** | `EMSB/src/services/invoice.service.ts:289-291` - catch all errors, log warning, return success | Caller told invoice was sent; email may never have been delivered; no retry/alerting |
| S6 | Low | **`getMailAdapter()` caches first result permanently** | `EMSB/src/integrations/mail/index.ts:17-28` `cachedAdapter` | If SMTP misconfigured at boot, process falls back to log adapter for entire lifetime |
| S7 | Low | **`SmtpMailAdapter` uses `env.MAIL_FROM` without validation** | `EMSB/src/integrations/mail/smtp.mail.adapter.ts:38` | Undefined `MAIL_FROM` can cause runtime failures |
| S8 | Low | **No CSRF protection on state-changing routes** | JWT bearer transport mitigates risk but no explicit CSRF protection | Defense-in-depth missing |

---

## 3. Data Integrity & Consistency Issues

| # | Severity | Issue | Evidence | Impact |
|---|----------|-------|----------|--------|
| D1 | High | **State machine diverges across 3 layers** | Frontend `CMSF/src/features/invoices/invoices.ts:10-12` vs Backend `EMSB/src/services/invoice.service.ts:27-35` vs Mock `CMSF/src/data/mock/repositories.ts:767-775` | Inconsistent behavior between demo/live/UI; transitions may be rejected or allow invalid moves |
| D2 | High | **Invoice number generation is not atomic** | `EMSB/src/repositories/invoice.repository.ts:26-39,84-96`; `findById` matches by `$or` of invoiceId/invoiceNumber | Race window for duplicate invoice numbers; ambiguous lookup |
| D3 | Medium | **`createInvoice` stores role, not user ID, as `createdBy`** | `EMSB/src/services/invoice.service.ts:170` | Breaks audit traceability |
| D4 | Medium | **Mock/detail page bypasses the API layer entirely** | `CMSF/src/features/invoices/InvoiceDetailPage.tsx:20-25,286-289` | In `USE_API=true` mode, sends/voids/mark-paid are local-only simulations |
| D5 | Medium | **`upsertInvoiceLocal` matches by `id` OR `invoiceNumber`** | `CMSF/src/data/mock/repositories.ts:162` | Collision risk causing wrong overwrite |
| D6 | Medium | **Tax rate unit mismatch** | Zod `taxRate: z.number().min(0).max(100)` (`invoice.schemas.ts:37`) vs computation `subtotal * taxRate` (expects 0-1) | Accepts invalid values (e.g. 50 = 5000% tax) |
| D7 | Low | **`balanceDue` can go negative** | `recompute()` functions don't guard against negative | Overpayment yields negative balance due |
| D8 | Low | **`recordPayment` asserts wrong transition target** | `EMSB/src/services/invoice.service.ts:328` | Misleading error messages |
| D9 | Low | **Dead/incorrect client address fallback** | `EMSB/src/services/invoice.service.ts:138` references non-existent `client.address` | Dead code; `clientCode` fallback may be undefined |
| D10 | Low | **Non-unique temp line-item IDs** | `tempLineId()` uses `Date.now()` + seq; service mock also uses timestamp | Collision risk on rapid successive adds |

---

## 4. Frontend ↔ Backend Contract Mismatches

| # | Severity | Issue | Evidence | Impact |
|---|----------|-------|----------|--------|
| C1 | High | **Composer never uses server `autoPopulate`** | `CMSF/src/data/invoices.api.ts:99-151` hardcodes `autoPopulate: false` | Server auto-populate path not exercised; frontend generator may drift |
| C2 | Medium | **Period picker semantics diverge** | Frontend exact match vs backend range overlap (`findOverlappingOpen`) | Duplicate guard and period suggestions disagree |
| C3 | Medium | **Resource display strings diverge** | Frontend `resourceNameOf` includes first/last name; backend auto-populate uses geography+techRole | Different strings in composer vs PDF |
| C4 | Medium | **`sendInvoice` `to` handling inconsistent** | Mock passes `"unknown"` fallback; live passes `{to}` | Demo vs live behavior differs |
| C5 | Low | **`VOID→DRAFT` in frontend only** | Backend makes VOID terminal | UI offers action API will reject |

---

## 5. Bugs & Logic Errors

| # | Severity | Issue | Evidence | Impact |
|---|----------|-------|----------|--------|
| B1 | Medium | **`pageRowLimit` and `finalPageReserve` defined but never used** | `EMSB/src/integrations/pdf/layout.ts:136,138` | Long line items may overflow page bottom |
| B2 | Medium | **PDF buffers entire document in memory** | `EMSB/src/integrations/pdf/invoice-pdf.renderer.ts:250` `bufferPages: true` | High memory usage for large invoices |
| B3 | Medium | **N+1 employee fetches in `autoPopulate`** | `EMSB/src/services/invoice.service.ts:372` | O(n) queries per auto-populate |
| B4 | Medium | **`getApprovedPeriodOptions` is O(n) in-memory over all timesheets** | `CMSF/src/data/invoices.api.ts:308-329` | Does not scale; no DB aggregation |
| B5 | Low | **`markPaid` bypasses `recompute` / allows overpayment** | `EMSB/src/services/invoice.service.ts:313-322` | Negative balance possible |
| B6 | Low | **`removeLineItem` permits empty invoice** | `EMSB/src/services/invoice.service.ts:230-236` | Invoice with zero line items can be persisted/sent |
| B7 | Low | **`nextSuffix`/`generateId` duplicate logic** | `EMSB/src/repositories/invoice.repository.ts:26-39,84-96` | Maintenance risk |

---

## 6. Testing Coverage Gaps

| # | Severity | Gap | Evidence |
|---|----------|-----|----------|
| T1 | High | **No frontend tests for the invoice module** | Missing tests for `InvoiceComposerPage`, `InvoiceDetailPage`, `invoices.api.ts`, `syncLineItems`, `previewLineItems`, `findOverlappingInvoices`, `canInvoiceTransition` |
| T2 | Medium | **Backend invoice mutation coverage thin** | Missing tests for `updateInvoice`, `updateLineItem`, `removeLineItem`, `reorderLineItems`, overlap endpoint, invoice templates |
| T3 | Medium | **No E2E test for create → send → PDF → email flow** | No integration test covering full pipeline |
| T4 | Medium | **Tests not linted** | `problems.md` P1 — `npm run lint` fails on `tests/` with 24 parsing errors |
| T5 | Low | **No test for `getMailAdapter` fallback or SMTP misconfiguration** | Untested error paths |

---

## 7. Performance & Scalability Issues

| # | Severity | Issue | Evidence |
|---|----------|-----|----------|
| PF1 | Medium | **Dashboard reads entire mock collections on every render** | `CMSF/src/features/dashboard/DashboardPage.tsx:51-56` |
| PF2 | Medium | **`loadBackendData()` hydrates 8 collections with 5s timeout each** | `CMSF/src/data/mock/index.ts:51-87` |
| PF3 | Medium | **No DB-level aggregation for invoice list/reports** | KPIs computed in frontend/backend over full arrays |
| PF4 | Low | **PDF `bufferPages: true`** | Full PDF held in memory |

---

## 8. Code Quality & Maintainability Issues

| # | Severity | Issue | Evidence |
|---|----------|-----|----------|
| Q1 | Medium | **Duplicated rate tables/helpers across subsystems** | `EMSB/src/lib/rates.ts` and `CMSF/src/lib/rates.ts` are near-identical |
| Q2 | Medium | **Monolithic files** | `invoice.service.ts` (488 lines), `InvoiceComposerPage.tsx` (799 lines) |
| Q3 | Medium | **Hardcoded demo role map** | `problems.md` P3 — `employee.service.ts:473-482` |
| Q4 | Medium | **Dead event bus / dynamic-import service instantiation** | `problems.md` P5 — zero subscribers; `await import(...)` workarounds |
| Q5 | Low | **Misplaced helmet middleware** | `problems.md` P7 — `securityHeaders` exported from `rate-limit.middleware.ts` |
| Q6 | Low | **`timesheetEligibility` hardcoded in DTO** | `problems.md` P9 — always returns `NOT_ELIGIBLE` |
| Q7 | Low | **Inconsistent lint tooling across subsystems** | EMSB uses `eslint`, CMSF uses `oxlint` |
| Q8 | Low | **Magic strings/IDs scattered** | Non-centralized ID generation |

---

## 9. Environment, Config & Build Issues

| # | Severity | Issue | Evidence |
|---|----------|-------|----------|--------|
| E1 | Medium | **`npm run lint` gate broken** | `problems.md` P1 — fails on tests/vitest.config (24 parsing errors) |
| E2 | Low | **CMSF defaults to live API with silent fallback** | `CMSF/src/lib/api.ts:3` `USE_API` defaults true; silent degradation |
| E3 | Low | **No CI configuration reviewed** | `.github/` exists but workflows not inspected |
| E4 | Low | **Stray files at repo root** | `credentials.txt`, `EMSB.zip`, `info.txt`, `onbuiflow.md`, `Hono_Migration.md`, `zoho-offer-letter.md` — potential secret risk |

---

## 10. Documentation Drift

| # | Severity | Issue | Evidence |
|---|----------|-------|----------|--------|
| Doc1 | Medium | **CMSB.md §77 says PDF download is a frontend concern; backend implements `GET /:invoiceId/pdf`** | `EMSB/src/routes/invoice.routes.ts:27`, `EMSB/src/controllers/invoice.controller.ts:71-82` |
| Doc2 | Medium | **CMSB.md §77 says email composed by CMSF, backend only records send; backend actually renders PDF + sends email** | `EMSB/src/services/invoice.service.ts:252-292` |
| Doc3 | Medium | **Tracker files status unknown** | `fix-checklist.md`, `EMSB/EMSB-Checklist.md` need reconciliation |
| Doc4 | Low | **CMSF.md §14 contradicts frontend permissions** | MANAGER granted `invoice.create/send/edit` in frontend but spec says cannot create/send |

---

## 11. Best Course of Action to Fix All Problems

### Phase 1: Unblock Quality Gates (Priority: P0, 1-2 days)
- **P1a. Fix lint gate (E1, T4)**: Create `EMSB/tsconfig.eslint.json` including `src/**/*.ts`, `tests/**/*.ts`, `vitest.config.ts`. Update `.eslintrc.cjs` `parserOptions.project` to include it. Run `npm run lint` and fix surfaced errors in tests (don’t blanket-disable). **Verification:** `npm run lint` exits 0; `npm run typecheck` still clean.
- **P1b. Reconcile tooling (Q7)**: Document lint strategy (eslint for EMSB, oxlint for CMSF). Consider aligning or documenting rationale.

### Phase 2: Security Hardening (Priority: P0, 2-3 days)
- **P2a. Audit attribution (S1)**: Create `request-context.ts` using Node `AsyncLocalStorage`; wrap request in audit-context middleware; enrich context in `authenticate()`. Update `AuditService.record()` to merge context defaults. Remove `employeeId` passed into `actorUserId` at the 12 call sites. **Add tests** asserting audit rows have `actorUserId`, `requestId`, `ipAddress`.
- **P2b. Rate limit store (S2)**: Implement MongoDB-backed `rate-limit.store.ts` with TTL index; wire to both limiters; add IP+email `keyGenerator` for auth limiter. Update `init-db.ts` with TTL index.
- **P2c. Regex escaping (S3)**: Add `escapeRegex()` to validation/utils; apply to 4 repositories; clamp search length in Zod schemas; add tests.
- **P2d. Seed passwords (S4)**: Read from env with dev-only defaults; abort in production if defaults used; update `.env.example`.
- **P2e. Email handling (S5, S6, S7)**: Don’t swallow email errors in `send()` — log context, return structured error or set `emailSent` flag; don’t permanently cache misconfigured adapter (or add `reset()` for tests); validate `MAIL_FROM`.

### Phase 3: Fix Data Integrity & Contracts (Priority: P0, 3-5 days)
- **P3a. Unify state machine (D1)**: Choose single source of truth (backend `TRANSITIONS` is authoritative). Update frontend `invoices.ts` and mock `repositories.ts` to match. Add tests.
- **P3b. Invoice number/id safety (D2)**: Use atomic generation (counters/sequence) or keep retry but remove ambiguous `$or` lookup (`findById` should match invoiceId only; add separate `findByNumber`). Fix `upsertInvoiceLocal` to match by id explicitly.
- **P3c. Fix createdBy (D3)**: Store `actorUserId` (not role) as `createdBy`. Update types, service, tests.
- **P3d. Align API usage (D4, C1)**: Make `InvoiceDetailPage` use `invoices.api.ts` (not mock) when `USE_API=true`. Either allow `autoPopulate: true` in create when appropriate, or document the preview-then-create flow and add tests.
- **P3e. Fix tax rate semantics (D6)**: Decide units (decimal 0-1) and enforce in Zod (`min(0).max(1)`, step constraint) and docs; update frontend to match.
- **P3f. Add guards (D7, B6)**: Prevent negative `balanceDue`; prevent empty invoices; fix `recordPayment` transition assertion.

### Phase 4: Correct Bugs & Performance (Priority: P1, 2-4 days)
- **P4a. PDF layout (B1)**: Use `pageRowLimit`/`finalPageReserve` to stop overflow; add test with many line items.
- **P4b. PDF memory (B2)**: Consider streaming or document size thresholds; document current behavior.
- **P4c. Eliminate N+1 (B3)**: Batch fetch employees in `autoPopulate` (e.g. `findByEmployeeIds`).
- **P4d. DB aggregation (B4)**: Move `getApprovedPeriodOptions` logic to backend or aggregate in-memory more efficiently; cache results where appropriate.
- **P4e. Event bus wiring (Q4)**: Create `event-listeners.ts`, wire subscribers at startup; replace dynamic-import workarounds with emits; add error handler; add tests.

### Phase 5: Code Quality & DTO Fixes (Priority: P1, 1-3 days)
- **P5a. Deduplicate rates (Q1)**: Extract shared rates module or generate from single source; add build check to detect drift.
- **P5b. Refactor monoliths (Q2)**: Split `invoice.service.ts` (extract email/PDF helpers) and `InvoiceComposerPage.tsx` (extract hooks/subcomponents).
- **P5c. Fix Employee DTO (Q3, Q6)**: Inject `UserRepository`, remove hardcoded role map, share helper for `timesheetEligibility`; add tests.
- **P5d. Reorganize middleware (Q5)**: Move `securityHeaders` to `security.middleware.ts`; update imports.
- **P5e. Centralize ID generation (Q8)**: Create ID generator utility used by repo/mock/frontend.

### Phase 6: Testing & Coverage (Priority: P1, 3-5 days)
- **P6a. Frontend invoice tests (T1)**: Add tests for composer, detail, API layer, sync/preview/overlap, transitions.
- **P6b. Backend invoice tests (T2)**: Cover update/add/remove/reorder line items, overlap endpoint, templates.
- **P6c. E2E flow test (T3)**: Test create→send→PDF download→email dispatch (with log adapter).
- **P6d. Mail adapter tests (T5)**: Test fallback and misconfiguration paths.

### Phase 7: Environment & Cleanup (Priority: P2, <1 day)
- **P7a. Secrets/stray files (E4)**: Remove `credentials.txt` if present; review others; add to `.gitignore` if needed.
- **P7b. Doc reconciliation (Doc1–Doc4)**: Update `CMSB.md`/`CMSF.md` to match implementation (PDF/email responsibilities, permissions); reconcile checklists.
- **P7c. API default (E2)**: Consider defaulting `USE_API=false` in dev or showing warning on fallback.

### Verification Strategy
- After each phase: `cd EMSB && npm run typecheck && npm run lint && npm test`; `cd CMSF && npm run typecheck && npm run lint && npm test`
- Run full suite before merge; add regression tests for each fixed issue
- Manual smoke: create→send invoice, download PDF, email dispatch (log), audit attribution visible
