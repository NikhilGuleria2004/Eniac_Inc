# CMSB.md

# Eniac Inc. — Client Management System Backend

## Backend Implementation Specification (EMSB Extension)

**Project:** Eniac Inc. Client Management System (CMS)
**Backend Folder:** `EMSB/` (extended — same codebase, same deployable)
**Frontend Folder:** `CMSF/`
**Related Frontend:** `EMSF/`, Related Backend: `EMSB.md`
**Backend Stack:** TypeScript + Node.js + Express.js (identical to EMSB)
**Database:** MongoDB Atlas (same cluster/database as EMSB)
**Architecture:** REST API + Service Layer + Repository Layer (reuse EMSB)
**Frontend Consumer:** CMSF React application

This document defines the backend work required to support the CMSF frontend **inside the existing EMSB backend**. It is not a new service. It reuses EMSB's auth, permissions, middleware, logging, and layering, and adds the CMS domain (daily logs, timesheets, invoices, invoice templates) plus richer client/project/employee fields.

---

# 1. Purpose

This document is the authoritative implementation specification for the backend additions required by the CMSF frontend.

The backend must provide the complete business, security, persistence, authorization, invoicing, timesheet-compilation, and audit layer required by CMSF.

CMSB must be implemented inside the existing EMSB codebase using:

* TypeScript
* Node.js
* Express.js
* MongoDB Atlas (official MongoDB Node.js driver)
* Zod for request validation
* Pino for structured logging
* Vitest for unit/integration tests
* Supertest for HTTP API testing

The backend must **not use Hono** (see EMSB.md §238).

The backend must expose a clean, versioned REST API under the existing `/api/v1` base, consumed by CMSF over the same `apiFetch` contract EMSF already uses.

Implement against this spec and **CMSF.md** + the shipped `CMSF/src` (types, permissions, repositories, state machines, and the STANDARD_RESOURCE_RATES table). **Do not invent shapes — match what CMSF already consumes.** Where EMSB already has an overlapping field, preserve backward compatibility for EMSF (see §48).

---

# 2. System Context

The ecosystem now contains two frontends sharing one backend and one MongoDB database.

```text
    EMSF Frontend          CMSF Frontend
 Workerforce (navy)      Client/Timesheet (green)
 React + TypeScript      React + TypeScript
        │                        │
        └───────────┬────────────┘
                    │ HTTPS REST API  (/api/v1, JWT)
                    ▼
          ┌──────────────────────────┐
          │        EMSB Backend      │
          │  Node + TS + Express     │
          │  + CMS modules (CMSB)    │
          └────────────┬─────────────┘
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
  ┌───────────┐  ┌───────────┐   ┌──────────────┐
  │ MongoDB   │  │ Zoho      │   │ Mail (SMTP)  │
  │ Atlas     │  │ Timesheet │   │ invoices     │
  └───────────┘  └───────────┘   └──────────────┘
```

Rules:

* CMSF and EMSF must **never** connect directly to MongoDB.
* Both frontends authenticate against the same `/api/v1/auth/*` and carry the same JWT (`userId`, `employeeId`, `email`, `role`).
* CMS and EMS share the same users/employees/clients/projects/assignments collections; CMS adds new collections and fields.

---

# 3. Core Architectural Principle

Reuse EMSB. CMSB is an extension, not a fork.

The frontend (CMSF) must not contain authoritative business rules. CMSF currently enforces rules in its mock layer for the shell phase; the backend must independently enforce:

* authentication
* authorization (role + resource ownership)
* timesheet/invoice state-machine transitions
* daily-log business rules (project assignment, weekend overtime, ≤24h, duplicates, lock)
* invoice computation and auto-populate
* timesheet compilation and totals
* sensitive-field protection (salary/bill rate/budget)

Never trust the frontend. Frontend permission checks are UX, not security.

---

# 4. Technology Stack

Identical to EMSB. Add nothing new.

### Runtime / Language / Framework / Database

```text
Node.js
TypeScript (strict, NodeNext-compatible)
Express.js (existing app.ts/server.ts)
MongoDB Atlas (official driver, existing database)
Zod
Pino
Vitest + Supertest
```

Do not introduce Hono, Prisma, Mongoose, or a second database. Reuse `getDb()` from `src/config/database.ts`.

---

# 5. Recommended Dependencies

Reuse EMSB's installed packages:

```text
express, cors, helmet, express-rate-limit
mongodb, zod, pino, pino-http, pino-pretty
bcrypt, jsonwebtoken
uuid, nodemailer, dotenv
vitest, supertest, @vitest/coverage-v8 (dev)
typescript, @types/* (dev)
```

New packages required for CMSB: **none**.

---

# 6. What CMSB Adds (The Delta)

Everything else in EMSB is reused as-is.

New collections:

```text
daily_logs
timesheets
invoices
invoice_templates
```

New modules (route/controller/service/repository/schema/model):

```text
dailyLog.*
timesheet.*
invoice.*
invoiceTemplate.*
```

Extended documents (additive, backward-compatible):

```text
employees    + techRole
clients      + clientTier, paymentTerms, taxId, contacts[], billingAddress, shippingAddress, activeProjectCount(derived)
projects     + clientName, budget, budgetCurrency, tags[], visibility, tier, supervisorId, teamSize(derived), DELAYED health
assignments  + PENDING status, assignedBy
```

New permissions (see §33/§47): `daily_log.*`, `timesheet.*` (submit/approve/reject/view_all), `invoice.*`, plus reuse of `client.*`, `project.*`, `assignment.*`, `report.view`, `audit.view`, `settings.manage`, `notification.view`.

---

# 7. Non-Responsibilities

CMSB is **not**:

* A separate microservice or a new deployment.
* A rewrite of EMSB auth/permissions.
* A replacement for the Zoho timesheet adapter (timesheet provisioning/eligibility stays in EMSB `integrations/timesheet/`; CMSB timesheets are the billing record the downstream adapter consumes).
* A PDF renderer. "Download PDF" stays a frontend concern (CMSF prints to PDF); the backend only provides the data. Invoice **email** content is composed by CMSF; the backend records the send event (and may integrate with `integrations/mail/` if sending server-side is desired later).

---

# 8. Folder Structure (Additions to EMSB)

Reuse the EMSB tree. Add the following files (marked `+`):

```text
routes/      + daily-logs.routes.ts   timesheets.routes.ts   invoices.routes.ts   invoice-templates.routes.ts
controllers/ + daily-logs.controller.ts timesheets.controller.ts invoices.controller.ts invoice-templates.controller.ts
services/    + daily-log.service.ts     timesheet.service.ts     invoice.service.ts     invoice-template.service.ts
repositories/+ daily-log.repository.ts  timesheet.repository.ts  invoice.repository.ts  invoice-template.repository.ts
schemas/     + daily-log.schemas.ts     timesheet.schemas.ts     invoice.schemas.ts     invoice-template.schemas.ts
models/      + daily-log.ts             timesheet.ts             invoice.ts             invoice-template.ts
permissions/ + extend permissions.ts and roles.ts (CMS permission set)
```

Also modify (extend, do not break):

```text
permissions/permissions.ts     add CMS permissions + extend ROLE_PERMISSIONS
routes/index.ts                mount the four new routers
config/constants.ts            add CMS enums (TechRole, statuses, tiers, terms)
models/client.ts               extend
models/project.ts              extend
models/assignment.ts           extend
models/employee.ts             extend (techRole)
repositories + controllers + services for clients/projects/assignments (return the richer CMS shape)
tests/                         + daily-logs/ timesheets/ invoices/ permissions/
```

---

# 9. Shared Modules To Reuse (Do Not Reimplement)

```text
src/middleware/auth.middleware.ts           authenticate (JWT → req.user)
src/middleware/authorization.middleware.ts  requirePermission / requireAnyPermission / requireRole
src/utils/response.ts                       successResponse / paginatedResponse
src/utils/audit.ts                          writeAuditLog
src/utils/errors.ts                         ValidationError / AuthorizationError / NotFoundError / ConflictError / BusinessRuleError
src/utils/pagination.ts                     parsePagination
src/middleware/error-handler.middleware.ts  central error → { success:false, error:{ code, message, fields } }
src/config/database.ts                      getDb()
notification emitter                         create notifications for CMS events
```

CMSB controllers/services/repositories must follow the exact EMSB conventions (see EMSB.md §107–111, §216–222).

---

# 10. API Versioning & Route Registration

Everything mounts under the existing `API_BASE = "/api/v1"`.

Register in `src/routes/index.ts`:

```ts
router.use("/daily-logs", dailyLogRoutes);
router.use("/timesheets", timesheetRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/invoice-templates", invoiceTemplateRoutes);
```

Do not create a new version. CMSF calls the same `/api/v1/*`.

---

# 11. Environment Variables

No new environment variables are required. Reuse `EMSB/.env` (`MONGODB_URI`, `MONGODB_DATABASE`, `JWT_SECRET`, `CORS_ORIGIN`, mail, rate limits). Add the CMSF origin to `CORS_ORIGIN` when integrating (e.g. the CMSF Vercel URL), comma-separated or `*` in dev.

---

# 12. Collections

New:

```text
daily_logs
timesheets
invoices
invoice_templates
```

Reused (extended in place):

```text
employees
clients
projects
assignments
notifications
audit_logs
users
settings
```

All CMS writes must also `writeAuditLog` and, where the spec says so, `create notification` (see §36/§37).

---

# 13. ID Strategy

Match CMSF's ids exactly so the frontend contract is unchanged (CMSF seeds use these patterns).

```text
employeeId / employeeCode : EMP-###
clientId / clientCode     : CL-###
projectId / projectCode   : PRJ-###
assignmentId              : PA-###
dailyLogId                : DL-###
timesheetId               : TS-###
invoiceId                 : INV-YYYY-###   (invoiceNumber and id are effectively the same string)
invoiceTemplateId         : TPL-###
```

Store both `_id: ObjectId` (MongoDB) and the human `xxxId` string. List/detail responses return the `xxxId` string as `id` (CMSF uses `id`, `employeeId`, `projectId`, `clientId`, `invoiceId`, etc.).

Invoice number must be globally unique and zero-padded:

```text
INV-{currentYear}-{NNN}    e.g. INV-2026-001
```

The next number is `max(existing suffix for the year) + 1`. Enforce uniqueness with a unique index (§42) and compute inside a transaction or with a retry on duplicate key.

---

# 14. Employee Model Extension

Add `techRole` (optional) to the existing `employees` document. Reuse the existing `billRate`, `billingStatus`, `timesheetEligibility`, and the linked user `role`.

```ts
type TechRole =
  | "Java Developer" | "Frontend Developer" | "Backend Developer" | "Full Stack Developer"
  | "DevOps Engineer" | "QA Engineer" | "UI/UX Designer" | "Project Manager"
  | "Business Analyst" | "Technical Lead" | "Scrum Master" | "Data Engineer" | "Solution Architect";

interface Employee {
  // ...existing EMSB fields...
  techRole?: TechRole;         // NEW: role used for CMS assignments + invoice line items
}
```

Rule: an employee is CMS-eligible only when `role !== "HR"` and, for EMPLOYEE role, `billingStatus === "BILLABLE"` (mirrors `checkCmsAccess` in CMSF). Enforce at the authorization layer for CMS resources (see §38).

---

# 15. Client Model Extension

Extend the existing `clients` document to match CMSF's `Client` type. Additive only.

```ts
type ClientTier = "ENTERPRISE" | "MID_MARKET" | "SMB" | "PROSPECT";
type ClientStatus = "PROSPECT" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CLOSED";
type PaymentTerms = "NET_15" | "NET_30" | "NET_45" | "NET_60" | "CUSTOM" | "DUE_ON_RECEIPT";

interface Client {
  clientId: string;            // CL-###
  name: string;
  industry: string;
  country: string;
  clientTier: ClientTier;      // NEW
  status: ClientStatus;        // extended set
  primaryContact: { name: string; email: string; phone: string; role?: string };
  contacts?: { id: string; name: string; email: string; phone: string; role: string; isPrimary: boolean }[];
  billingAddress: Address;     // NEW
  shippingAddress?: Address;   // NEW
  taxId?: string;              // NEW
  paymentTerms: PaymentTerms;  // NEW
  notes?: string;
  activeProjectCount: number;  // NEW, derived = ACTIVE projects count
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

`activeProjectCount` is derived and must be kept consistent on project create/status change (see §16, §45).

The Clients API (`GET /clients`, `GET /clients/:clientId`, `POST`, `PATCH`, `/deactivate`) stays the same route set; services must now return/accept the richer fields. Keep EMSF working (EMS client fields map onto a subset — see §48).

---

# 16. Project Model Extension

Extend the existing `projects` document.

```ts
type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
type ProjectHealth = "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED";  // DELAYED added (see §48)

interface Project {
  projectId: string;           // PRJ-###
  clientId: string;
  clientName: string;          // NEW, denormalized from client
  name: string;
  description?: string;
  status: ProjectStatus;
  health: ProjectHealth;
  startDate?: Date;
  endDate?: Date;
  managerId?: string;
  supervisorId?: string;       // NEW
  progress: number;            // 0-100 (EMSB name progressPercent)
  budget?: number;             // NEW
  budgetCurrency?: string;     // NEW
  teamSize: number;            // NEW, derived = ACTIVE assignments
  billable: boolean;           // NEW
  tags?: string[];             // NEW
  visibility: "INTERNAL" | "CLIENT_VISIBLE"; // NEW
  tier?: "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE"; // NEW
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

`teamSize` and `client.activeProjectCount` are derived; recompute on assignment create/end and project create/status change.

---

# 17. Assignment Model Extension

Match CMSF. Reconcile `status` with EMSB (see §48).

```ts
interface ProjectAssignment {
  assignmentId: string;        // PA-###
  employeeId: string;
  projectId: string;
  role: TechRole;              // was optional string
  allocation: number;          // 0-100 (EMSB name allocationPercent)
  billable: boolean;
  startDate: Date;
  endDate?: Date;
  status: "ACTIVE" | "PENDING" | "ENDED";  // PENDING added; CANCELLED retired (see §48)
  assignedBy: string;          // NEW
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Validation & overallocation:

```text
allocation >= 0
allocation <= 100
sum(active allocations per employee) should be surfaced; create may warn/flag when > 100 but is not blocked (CMSF shows a warning and defers to the backend).
```

---

# 18. Daily Log Model

New collection `daily_logs`.

```ts
type DailyLogStatus = "DRAFT" | "SUBMITTED" | "LOCKED";
type TaskCategory = "DEVELOPMENT" | "TESTING" | "REVIEW" | "MEETING" | "DESIGN" | "OTHER";

interface DailyLog {
  _id: ObjectId;
  dailyLogId: string;          // DL-###
  employeeId: string;
  employeeName: string;        // denormalized
  projectId: string;
  projectName: string;         // denormalized
  workDate: string;            // "YYYY-MM-DD"
  dayOfWeek: string;           // "Mon".."Sun" (derived from workDate)
  taskCategory: TaskCategory;
  description: string;
  regularHours: number;
  overtimeHours: number;       // only Sat/Sun (enforced §19)
  totalHours: number;          // regularHours + overtimeHours (derived)
  billable: boolean;
  billingType: "BILLABLE" | "NON_BILLABLE";
  status: DailyLogStatus;      // LOCKED once its timesheet is APPROVED/PAID
  timesheetId?: string;        // set when compiled into a timesheet
  reviewedBy?: string;
  reviewedAt?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

`dayOfWeek` and `totalHours` are always server-derived; never trust client values.

---

# 19. Daily Log Business Rules (enforced in the service layer)

These mirror `CMSF.md §40` and must be enforced server-side:

1. **Project filtering** — the employee must have an **ACTIVE** `ProjectAssignment` for `projectId`. Otherwise `ForbiddenError`.
2. **Overtime gating** — `overtimeHours > 0` allowed only when `workDate` is Saturday or Sunday. Weekday submissions force `overtimeHours = 0`.
3. **Hours validation** — `regularHours + overtimeHours <= 24`; both `>= 0`; increments of `0.25`.
4. **Duplicate prevention** — an employee cannot have more than one non-deleted log for the same `workDate + projectId`. On conflict, return `ConflictError` with the existing `dailyLogId` so CMSF can offer "edit existing".
5. **Timesheet lock** — once a log belongs to a timesheet with status `APPROVED` or `PAID`, the log is read-only (updates/deletes rejected with `BusinessRuleError`), and `status` must be `LOCKED`.
6. **Ownership** — an EMPLOYEE can create/read/update only their own logs; reviewers (MANAGER/SUPERVISOR/ADMIN) operate within their project scope (§38).

Error messages must match CMSF's validation strings so the UI shows them verbatim:

```text
"Total hours (regular + overtime) cannot exceed 24"
"Employee is required" / "Project is required"
"Overtime is only allowed on Saturday and Sunday"
```

---

# 20. Daily Log API

```text
GET    /daily-logs                      list (scoped; filters; pagination)
POST   /daily-logs                      create
GET    /daily-logs/:dailyLogId           detail
PATCH  /daily-logs/:dailyLogId           update (respect lock + ownership)
DELETE /daily-logs/:dailyLogId           soft delete (only DRAFT + own, unless admin)
```

Permission mapping:

```text
list/create/read/update : daily_log.create  (EMPLOYEE, MANAGER, SUPERVISOR, ADMIN)
list-all / other team   : daily_log.view_all (MANAGER, SUPERVISOR, ADMIN)
delete (any)            : daily_log.view_all + ownership, or ADMIN
```

Scoping (service layer):

```text
EMPLOYEE   → employeeId === actor.employeeId
MANAGER    → logs on projects they own (managerId) — or all if ADMIN
SUPERVISOR → logs on projects they supervise (supervisorId)
ADMIN      → all
```

Response item uses CMSF camelCase field names (`regularHours`, `overtimeHours`, `totalHours`, `billingType`, `dayOfWeek`, …). Dates are ISO (`workDate` "YYYY-MM-DD"; timestamps ISO 8601).

---

# 21. Timesheet Model

New collection `timesheets`. Represents a **bi-monthly** billing period (1st–15th / 16th–month-end).

```ts
type TimesheetStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISED" | "PAID";

interface ProjectBreakdown {
  projectId: string;
  projectName: string;
  employeeBillRate: number;    // snapshot at compile time (hourly)
  billableHours: number;
  billableAmount: number;      // billableHours * employeeBillRate
}

interface Timesheet {
  _id: ObjectId;
  timesheetId: string;         // TS-###
  employeeId: string;
  employeeName: string;
  periodStart: string;         // "YYYY-MM-DD"
  periodEnd: string;           // "YYYY-MM-DD"
  periodLabel: string;         // e.g. "Oct 1-15, 2026"
  billingPeriod: number;       // 1 or 2
  year: number;
  month: number;
  totalDays: number;           // count of compiled daily logs
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalBillableHours: number;
  totalNonBillableHours: number;
  totalHours: number;
  billableAmount: number;      // Σ of project breakdown amounts
  currency: "USD" | "INR" | "EUR" | "GBP" | "CAD";
  status: TimesheetStatus;
  submittedAt?: Date;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  approvedAt?: Date;
  paidAt?: Date;
  dailyLogIds: string[];       // the compiled logs
  projectBreakdown: ProjectBreakdown[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Use the shared period math (see CMSF.md §35/§61): period 1 = day 1–15, period 2 = day 16–last-day-of-month (28/29/30/31). `periodLabel` format `"{MonShort} 1-15, {YYYY}"` or `"{MonShort} 16-{last}, {YYYY}"`.

---

# 22. Timesheet State Machine

Authoritative transitions ( identical to CMSF.md §41 ):

```text
DRAFT ──▶ SUBMITTED ──▶ IN_REVIEW ──▶ APPROVED ──▶ PAID
                 │            │
                 │            ├─▶ REJECTED ──▶ REVISED ──▶ SUBMITTED
```

| From | To | Trigger | Permission |
|------|----|---------|------------|
| DRAFT | SUBMITTED | "Submit for Review" | owner (EMPLOYEE) |
| SUBMITTED | IN_REVIEW | auto-assigned on submission | system |
| IN_REVIEW | APPROVED | "Approve" | timesheet.approve |
| IN_REVIEW | REJECTED | "Reject" (notes required) | timesheet.reject |
| REJECTED | REVISED | "Revise" | owner / system |
| REVISED | SUBMITTED | "Submit for Review" | owner |
| APPROVED | PAID | "Mark as Paid" | ADMIN |
| SUBMITTED | APPROVED | "Approve" (shortcut) | timesheet.approve |

Rules:

* Reject **requires** `reviewNotes`.
* Illegal transitions must be rejected with `BusinessRuleError` (and rejected with a 409-style error code, e.g. `INVALID_TRANSITION`).
* Transitioning to APPROVED locks every linked daily log (`status = LOCKED`).
* Only valid transitions are persisted; services compare current → requested via a single transition table, never scattered `if`s.

---

# 23. Timesheet Compilation Logic

Server-side compile (mirrors CMSF.md §62 and `CMSF` `compileTimesheet`):

```text
compileTimesheet(employeeId, period):
  1. Gather the employee's SUBMITTED daily logs where workDate ∈ [period.start, period.end].
  2. If none → 409 "No submitted daily logs to compile".
  3. Idempotent: if a timesheet already exists for employeeId+period, return it.
  4. Group logs by projectId.
  5. Totals:
     - totalRegularHours    = Σ regularHours
     - totalOvertimeHours   = Σ overtimeHours
     - totalBillableHours   = Σ totalHours where billable=true
     - totalNonBillableHours= totalHours - totalBillableHours
     - totalHours           = Σ (regularHours + overtimeHours)
     - billableAmount       = Σ (per-project billableHours × employee.billRate.amount)
  6. Build projectBreakdown (one row per project, snapshot employeeBillRate).
  7. status = DRAFT; link dailyLogIds; set each log.timesheetId = this id.
  8. Return the created timesheet.
```

`billableAmount` and each breakdown amount use the employee's hourly `billRate` (round to 2 decimals). Compilation is the only automatic path; manual creation (§24) exists for admin/manager overrides and starts with empty totals.

---

# 24. Timesheet API

```text
GET    /timesheets                       list (scoped + filters + pagination)
POST   /timesheets                       manual create (ADMIN/MANAGER only)
GET    /timesheets/mine                  actor's own timesheets (EMPLOYEE)
GET    /timesheets/:timesheetId           detail
POST   /timesheets/compile                { employeeId, periodStart, periodEnd } (or derive from actor)
POST   /timesheets/:timesheetId/submit     DRAFT|REVISED → SUBMITTED   (owner)
POST   /timesheets/:timesheetId/approve    IN_REVIEW|SUBMITTED → APPROVED (timesheet.approve)
POST   /timesheets/:timesheetId/reject     → REJECTED (notes required) (timesheet.reject)
POST   /timesheets/:timesheetId/revise     REJECTED → REVISED (owner)
POST   /timesheets/:timesheetId/mark-paid  APPROVED → PAID (ADMIN)
```

Body examples:

```json
POST /timesheets/:id/approve   { "reviewedBy": "Manager User", "notes": "Looks good" }
POST /timesheets/:timesheetId  (manual) { "employeeId":"EMP-005", "periodStart":"2026-10-01", "periodEnd":"2026-10-15", "status":"DRAFT" }
```

Responses use CMSF camelCase (`periodStart`, `periodEnd`, `periodLabel`, `totalBillableHours`, `projectBreakdown[...]`, …).

---

# 25. Timesheet Permissions & Scoping

```text
timesheet.view       own timesheets (EMPLOYEE)
timesheet.view_all   review/see all teams (ADMIN, MANAGER, SUPERVISOR)
timesheet.submit     submit own timesheet (EMPLOYEE) and managers
timesheet.approve    approve/reject (ADMIN, MANAGER, SUPERVISOR)
timesheet.reject     reject (ADMIN, MANAGER, SUPERVISOR)
```

Scoping:

```text
EMPLOYEE   → employeeId === actor.employeeId (or block; no list_all)
MANAGER    → timesheets for projects they own (or all for ADMIN)
SUPERVISOR → timesheets for projects they supervise (supervisorId)
ADMIN      → all
```

Route guard uses `requireAnyPermission`; access to a specific timesheet also requires ownership or `timesheet.view_all` (resource-level, §38). `mark-paid` requires `ADMIN`.

---

# 26. Invoice Model

New collection `invoices`. Reproduces the INV-000001.pdf professional-services format. Line items are an embedded array.

```ts
type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID" | "CANCELLED" | "PARTIAL";

interface InvoiceLineItem {
  id: string;                 // LI-... or DB-generated
  description: string;        // "US Based AEM Developer", "India-Based AEM Developer #1", ...
  quantity: number;           // usually 1.00
  rate: number;               // monthly standard resource rate
  amount: number;            // quantity × rate (derived unless overridden)
  currency?: string;
  employeeId?: string;
  employeeName?: string;
  projectId?: string;
  projectName?: string;
  manual: boolean;            // true = hand-added, false = auto-populated
  sortOrder: number;
}

interface Invoice {
  _id: ObjectId;
  invoiceId: string;          // INV-YYYY-###
  invoiceNumber: string;      // same as invoiceId (must be unique)
  clientId: string;
  clientName: string;         // denormalized
  clientCode: string;
  clientAddress?: Address;
  poNumber?: string;
  subject: string;
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
  issueDate: string;
  dueDate: string;
  currency: "USD" | "INR" | "EUR" | "GBP" | "CAD";
  paymentTerms: PaymentTerms;
  taxRate: number;            // 0-100
  taxAmount: number;          // derived
  subtotal: number;           // derived = Σ line items
  totalAmount: number;        // derived = subtotal + taxAmount
  amountPaid: number;         // 0 until paid/partial
  balanceDue: number;         // derived = totalAmount - amountPaid
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  timesheetIds?: string[];    // source timesheets for timesheet-derived invoices
  notes?: string;
  termsAndConditions?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  sentBy?: string;
  paidAt?: Date;
}
```

Derived fields (`amount`, `taxAmount`, `subtotal`, `totalAmount`, `balanceDue`) must be recomputed on every add/update/remove/reorder/payment — never accept client-computed totals.

---

# 27. Invoice State Machine

Identical to CMSF.md §42:

```text
DRAFT ──▶ SENT ──▶ PAID
   │         │  ├─▶ OVERDUE (auto when past dueDate)
   │         │  ├─▶ PARTIAL (partial payment) ──▶ PAID
   │         │  └─▶ VOID
   └─▶ VOID / CANCELLED
```

| From | To | Trigger | Permission |
|------|----|---------|------------|
| DRAFT | SENT | "Send" (records email event) | invoice.send |
| DRAFT | VOID | "Void" | invoice.view_all |
| SENT | OVERDUE | auto (dueDate < today) | system |
| SENT | PARTIAL | record partial payment | invoice.view_all |
| SENT/OVERDUE | PAID | mark paid / full payment | invoice.view_all |
| PARTIAL | PAID | remaining paid | invoice.view_all |
| SENT/OVERDUE/PARTIAL | VOID | void | invoice.view_all |
| any | CANCELLED | cancel (admin) | ADMIN |

Rules:

* Only DRAFT invoices can add/edit/remove/reorder line items. SENT/PAID/OVERDUE/VOID are read-only (edits rejected with `BusinessRuleError`).
* OVERDUE is derived (`dueDate < today && status ∈ {SENT, PARTIAL}`), not stored — except you may persist the last-evaluated status; CMSF treats OVERDUE as derived, so the API returns the derived status.
* Illegal transitions rejected with `INVALID_TRANSITION`.
* Every transition writes an audit log (§37).

---

# 28. Invoice Computation

```text
subtotal    = Σ (lineItem.amount)
taxAmount   = subtotal × taxRate
totalAmount = subtotal + taxAmount
balanceDue  = totalAmount - amountPaid
```

Line item amount: `quantity × rate` (round 2 decimals), unless an explicit override is provided by edit.

---

# 29. Invoice Auto-Populate (from approved timesheets)

Reproduces INV-000001.pdf exactly. Endpoint behavior:

```text
POST /invoices/preview-auto-populate
  body: { clientId, periodStart, periodEnd }
  → returns generated lineItems (not yet persisted)

On POST /invoices with autoPopulate=true, the service:
  1. Find APPROVED timesheets for the client's projects in [periodStart, periodEnd].
  2. For each timesheet, resolve the employee → resourceName = `${geography} ${techRole}`.
  3. Group by resourceName. If N employees share a resourceName, emit N line items with #1..#N suffix.
  4. rate = STANDARD_RESOURCE_RATES lookup (geography + tier) — see §30.
  5. quantity = 1, amount = rate.
  6. Attach source timesheetIds.
```

Grouping must reproduce the PDF rows:

```text
1  US Based AEM Developer ........... 1.00  $23,400
2  EU Based Web Developer ........... 1.00  $20,584
3  India-Based AEM Developer #1 ..... 1.00  $6,240
4  India-Based AEM Developer #2 ..... 1.00  $6,240
5  India-Based 24/7 Offshore Dev-ops  1.00  $13,996
```

Manual line items can be added in Step 2 and are stored with `manual: true`.

---

# 30. Standard Resource Rates

Backend must ship the same table as `CMSF/src/lib/rates.ts` (single source of truth lives in the backend; CMSF has a copy for the mock shell). Lookup order: exact `${geography} ${techRole}` then tier-normalized `${geography} ${tier}`.

```ts
export const STANDARD_RESOURCE_RATES: Record<string, number> = {
  // United States
  "US Based Developer": 23400, "US Based AEM Developer": 23400,
  "US Based Senior Developer": 27000, "US Based Lead": 32000,
  "US Based DevOps Engineer": 25000, "US Based QA Engineer": 19000,
  "US Based Designer": 18000, "US Based Analyst": 17000,
  // Europe
  "EU Based Developer": 20584, "EU Based Web Developer": 20584,
  "EU Based Senior Developer": 23000, "EU Based Lead": 28000,
  "EU Based DevOps Engineer": 19500, "EU Based QA Engineer": 16500,
  "EU Based Designer": 15000, "EU Based Analyst": 14500,
  // India
  "India-Based Developer": 6240, "India-Based AEM Developer": 6240,
  "India-Based Senior Developer": 8000, "India-Based Lead": 10000,
  "India-Based DevOps Engineer": 11000,
  "India-Based 24/7 Offshore Dev-ops personnel": 13996,
  "India-Based QA Engineer": 4800, "India-Based Designer": 4200, "India-Based Analyst": 5400,
};

geographyOf(country): United States→"US Based"; India→"India-Based"; else "EU Based"
techRoleToTier(role): Java/Frontend/Backend/FullStack/AEM/Web Developer→Developer; Technical Lead/Solution Architect/PM→Lead; DevOps Engineer→DevOps Engineer; QA Engineer→QA Engineer; UI/UX Designer→Designer; BA/Scrum Master/Data Engineer→Analyst; else Developer
```

Note: an employee's own `billRate.amount` (hourly) is used only for **timesheet** billable-amount math (§23). Invoice **line-item** rates always come from this monthly table — a single invoice row represents a per-period resource cost, not per-employee hours.

---

# 31. Invoice API

```text
GET    /invoices                          list (invoices.view_all)
POST   /invoices                          create (autoPopulate optional) (invoice.create)
GET    /invoices/:invoiceId                detail (invoices.view / view_all)
PATCH  /invoices/:invoiceId                update header fields (invoice.edit, DRAFT only)
POST   /invoices/:invoiceId/line-items      add (invoice.edit, DRAFT only)
PATCH  /invoices/:invoiceId/line-items/:lineItemId   update (invoice.edit, DRAFT only)
DELETE /invoices/:invoiceId/line-items/:lineItemId   remove (invoice.edit, DRAFT only)
POST   /invoices/:invoiceId/line-items/reorder        { fromIndex, toIndex } (invoice.edit, DRAFT only)
POST   /invoices/:invoiceId/send             DRAFT → SENT (invoice.send)  — records email
POST   /invoices/:invoiceId/void             → VOID (invoice.view_all)
POST   /invoices/:invoiceId/mark-paid        → PAID (invoice.view_all)
POST   /invoices/:invoiceId/payments         { amount } → PARTIAL/PAID (invoice.view_all)
```

Line item mutations recompute totals and reject when `status !== DRAFT`. Send records `sentBy`/`sentAt`; CMSF composes and sends the email then calls `/send` (or `/send` triggers the mail via `integrations/mail/` if enabled).

---

# 32. Invoice Permissions

```text
invoice.view        limited/own-scope view (ADMIN has all)
invoice.view_all    see all invoices (ADMIN, MANAGER) — EMPLOYEE/SUPERVISOR have none
invoice.create      create (ADMIN, MANAGER)
invoice.edit        edit line items / header (ADMIN, MANAGER)
invoice.send        send (ADMIN, MANAGER)
```

EMP and SUPERVISOR are fully blocked from `/invoices*` (CMSF returns 403 for them). Enforce with `requireAnyPermission("invoice.view", "invoice.view_all")` on read routes and the stricter perms on mutations.

---

# 33. Invoice Template Model + API

New collection `invoice_templates`.

```ts
interface InvoiceTemplate {
  _id: ObjectId;
  invoiceTemplateId: string;   // TPL-###
  name: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  footerNote?: string;
  termsAndConditions?: string;
  paymentInstructions?: string;
  taxSettings?: { defaultRate: number; label: string };
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

```text
GET    /invoice-templates            list   (invoice.edit / settings.manage)
POST   /invoice-templates            create (invoice.edit / settings.manage)
PATCH  /invoice-templates/:id         update (invoice.edit / settings.manage)
POST   /invoice-templates/:id/default set default (unset others) (settings.manage)
```

`isDefault` is a singleton: setting one default unsets the previous (transaction).

---

# 34. Reports & Analytics Endpoints

CMSF's Analytics/Reports currently compute in the frontend from mock data. Provide server endpoints so they don't compute over unbounded datasets, matching the CMSF report shapes.

```text
GET /timesheets/kpis           → { total, pending, approved, rejected, inProgress, overdue }
GET /invoices/kpis             → { total, draft, sent, paid, overdue, void, totalBilled }
GET /invoices/revenue-trend    → [{ label, revenue }] (by billing period)
GET /invoices/top-clients      → [{ name, revenue }]
GET /timesheets/submission-rate→ [{ label, submitted, pending }]
GET /analytics/overview        → KPIs + series for the Analytics dashboard (MRR, billable hours, revenue/employee, retention, successRate, avgPaymentCycle)
```

All are `report.view` (ADMIN/MANAGER). Return the exact CMSF field names.

---

# 35. Notifications for CMS Events

On the following, create a notification via the reused notification emitter (recipients per §25/§32 scoping):

```text
timesheet submitted    → reviewers (timesheet.approve)
timesheet approved     → the employee
timesheet rejected     → the employee
invoice created        → none (internal)
invoice sent           → ADMIN/MANAGER
invoice paid           → ADMIN/MANAGER
assignment created     → the assignee + project manager
client/project created → ADMIN/MANAGER
```

Use the existing `notifications` collection and the CMS `NotificationType` set.

---

# 36. Audit Logging

Every important CMS mutation calls `writeAuditLog` (reuse EMSB). CMS actions:

```text
client.created / client.updated
project.created / project.updated / project.activated / project.completed
assignment.created / assignment.ended
daily_log.created / daily_log.updated
timesheet.submitted / timesheet.approved / timesheet.rejected
invoice.created / invoice.sent / invoice.paid / invoice.voided
```

Store `entityType` + `entityId` so CMSF's Audit Log (entity/action filters) works unmodified.

---

# 37. Resource-Level Authorization

Route permission is not enough. Services must verify ownership/scope (mirror CMSF's `isOwner`/`canViewAll`):

```text
EMPLOYEE reading/updating a timesheet or daily log:
    allowed only if the record's employeeId === actor.employeeId
SUPERVISOR:
    only records tied to projects where supervisorId === actor.employeeId
MANAGER:
    projects where managerId === actor.employeeId (ADMIN: all)
```

On failure: `AuthorizationError` (403). Do not leak existence (return 404 only when truly absent; 403 when it exists but is out of scope).

---

# 38. Sensitive Data & Field Projection

Reuse EMSB's field-projection approach.

```text
salary / billRate : only ADMIN (and roles holding salary.view / billRate.view)
project budget    : hidden from EMPLOYEE and SUPERVISOR (financial)
invoice amounts   : only invoice.view / invoice.view_all
```

The employee DTO already exposes `timesheetEligibility`; CMSF needs `techRole` + `billRate` on the CMS employee shape (respect the salary/billRate permissions above).

---

# 39. Zod Validation (request schemas)

Add `schemas/daily-log.schemas.ts`, `timesheet.schemas.ts`, `invoice.schemas.ts`, `invoice-template.schemas.ts`. Match CMSF.md validation exactly.

Daily log:

```ts
const dailyLogSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  projectId: z.string().min(1, "Project is required"),
  workDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: "Valid date is required" }),
  taskCategory: z.enum(["DEVELOPMENT","TESTING","REVIEW","MEETING","DESIGN","OTHER"]),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  regularHours: z.number().min(0, "Regular hours must be 0 or greater").max(24).multipleOf(0.25),
  overtimeHours: z.number().min(0).max(24).multipleOf(0.25),
  billingType: z.enum(["BILLABLE","NON_BILLABLE"]),
  tags: z.array(z.string()).optional(),
}).refine((d) => d.regularHours + d.overtimeHours <= 24, {
  message: "Total hours (regular + overtime) cannot exceed 24",
  path: ["overtimeHours"],
});
```

(Server-side also enforces weekend-only overtime and the ≤24 rule in the service; Zod does shape/type validation. Weekend gating must be a service check.)

Invoice line item:

```ts
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  rate: z.number().min(0),
});
```

---

# 40. MongoDB Indexes

```text
daily_logs
  unique-ish : (employeeId, workDate, projectId, deletedAt)  → enforce duplicate rule (§19)
  index      : projectId, status, timesheetId, workDate
timesheets
  unique     : (employeeId, periodStart, periodEnd)  → idempotent compile
  index      : status, periodStart, periodEnd, employeeId
invoices
  unique     : invoiceNumber
  index      : clientId, status, issueDate, dueDate
invoice_templates
  index      : isDefault
projects/clients/assignments : extend existing EMSB indexes; keep clientId/managerId/supervisorId/employeeId indexes
```

---

# 41. Unique Constraints

```text
invoices.invoiceNumber                       unique
timesheets (employeeId, periodStart, periodEnd) unique
daily_logs  (employeeId, workDate, projectId)    unique among non-deleted
```

---

# 42. Soft Deletion & History

* Daily logs: soft delete only; never hard-delete logs attached to an approved/paid timesheet.
* Timesheets: never hard-delete once SUBMITTED/APPROVED/PAID (history is billing evidence).
* Invoices: never hard-delete once SENT/PAID/PARTIAL; DRAFT can be soft-deleted.
* Do not destroy historical rates/amounts: `ProjectBreakdown.employeeBillRate` and invoice line rates are snapshots.

---

# 43. Pagination / Sorting / Filtering

Reuse EMSB `utils/pagination.ts` and the standard envelope:

```json
{ "success": true, "data": [ ... ], "pagination": { "page":1,"pageSize":20,"total":42,"totalPages":3,"hasNextPage":true,"hasPreviousPage":false } }
```

Query params: `page`, `pageSize`, `sortBy`, `sortDir`, plus module filters (e.g. `/daily-logs?employee=&project=&status=&from=&to=`; `/timesheets?employee=&project=&status=&period=`). CMSF expects these names.

---

# 44. Service / Controller / Repository Responsibilities

Follow EMSB exactly:

* Controllers: parse Zod → call service → map to `successResponse`/`paginatedResponse`. No business logic.
* Services: business rules, ownership, state machines, transactions, notifications, audit. Return DTOs in CMSF camelCase.
* Repositories: MongoDB CRUD only; no business logic; no HTTP types.

---

# 45. Transactions

Use multi-document transactions where consistency matters:

* Invoice line-item mutations (`addLineItem`, `updateLineItem`, `removeLineItem`, `reorderLineItems`) + totals recompute.
* `mark-paid`/`payments` (`amountPaid`, `balanceDue`, `status`).
* Timesheet `approve` (timesheet + lock all linked daily logs).
* Timesheet `compile` (timesheet insert + set each `dailyLog.timesheetId`).
* Invoice `send` (status + audit + notification).
* Template `default` (unset previous + set new).

---

# 46. Route → Permission Table

```text
daily-logs    list/get/update  → daily_log.create (owner-checked); list_all variant → daily_log.view_all
timesheets    list             → timesheet.view (own) | timesheet.view_all
timesheets    manual create    → timesheet.view_all (ADMIN/MANAGER)
timesheets    compile/submit   → timesheet.submit (owner)
timesheets    approve/reject   → timesheet.approve / timesheet.reject
timesheets    mark-paid        → ADMIN
invoices      list/get         → invoice.view | invoice.view_all
invoices      create/edit      → invoice.create / invoice.edit (DRAFT only)
invoices      send             → invoice.send
invoices      void/mark-paid/pay→ invoice.view_all
invoice-templates  get/list   → invoice.edit | settings.manage
invoice-templates  write/default→ invoice.edit | settings.manage
```

`/api/v1/auth`, `/employees`, `/clients`, `/projects`, `/assignments`, `/dashboard`, `/reports`, `/notifications`, `/audit-log`, `/settings` are reused from EMSB; extend their services to return CMS-shaped data.

---

# 47. Contract Reconciliation (EMSB → CMSF)

CMSF is already built. The backend must **match CMSF**, applying these additive/normalizing deltas (keep EMSF working in parallel):

```text
project.health            : add "DELAYED" (emit; map legacy OFF_TRACK → DELAYED)
assignment.status         : add "PENDING" (keep ENDED; retire CANCELLED in CMS responses)
assignment.allocation     : expose as "allocation" (EMSB "allocationPercent")
project.progress          : expose as "progress" (EMSB "progressPercent")
project fields            : add clientName, budget, budgetCurrency, tags, visibility, tier, supervisorId, teamSize
client fields             : add clientTier, paymentTerms, taxId, contacts, billingAddress, shippingAddress, activeProjectCount, status set PROSPECT/ACTIVE/INACTIVE/SUSPENDED/CLOSED
employee fields           : add techRole; keep billRate (unit HOURLY for CMS line math)
new ids                   : DL-, TS-, INV-YYYY-###, TPL-###
enums                     : TechRole, TaskCategory, PaymentTerms, ClientTier, currencies (USD/INR/EUR/GBP/CAD)
```

Any EMSB→CMSF field that is *additive* must be optional/defaulted so existing EMSF consumers are unaffected. The response DTO may expose both names during transition (e.g. `progress` and `progressPercent`) if needed to protect EMSF, then deprecate.

---

# 48. Seeding & Migration Compatibility

* Extend the existing seed scripts (`src/scripts/seed.ts`, `seed-dev.ts`) to generate CMS collections: 20 clients, 30 projects, 50 assignments, 300 daily logs, 100 timesheets (all statuses), 25 invoices, 5 templates — the same volume/distribution as the CMSF mock seed (`CMSF/src/data/mock/generate.ts`) so dev data is realistic.
* Seed writes must be **idempotent** (upsert by `clientId`/`invoiceNumber`/etc.), never wiping EMS employee/user data.
* Keep EMS demo login working. CMSF login uses the same `/auth/login`; the §13 `admin@eniac.demo` accounts are CMSF-shell-only and are **not** required on the backend — the seeded `superadmin@eniacinc.com` etc. cover real login. Adding CMS demo aliases is optional.

---

# 49. Integration Path: CMSF mock → EMSB API

CMSF currently reads/writes `src/data/mock/repositories.ts`. To integrate, swap that module to call the real API while keeping the same function signatures and return shapes:

```text
CMSF repositories  →  apiFetch("/api/v1/daily-logs", ...)  etc.
CMSF types/types are already camelCase and match §21/§26/§30 contracts.
```

Rules for the swap:

1. Keep the exact same TS return types CMSF already imports (no shape churn in components).
2. Reads return `{ data, pagination }` exactly like EMSF's `apiFetch`.
3. Keep the client-side pure logic that the backend doesn't own (period label formatting, UI validation) but move authoritative rules (transitions, totals, auto-populate, duplicate/lock, ownership) to the server per this spec.
4. Nothing should change in CMSF components if the repository function names/signatures are preserved.

Sample swap:

```ts
// before (mock)
export function submitTimesheet(id: string, by: string) { ... }
// after (api)
export async function submitTimesheet(id: string, by: string) {
  const res = await apiFetch(`/timesheets/${id}/submit`, { method: "POST", body: JSON.stringify({ reviewedBy: by }) });
  return res.data;
}
```

Note the mock was synchronous; the API is async — call sites already handle promises, so wrap only where needed.

---

# 50. Coding Rules (reuse EMSB §216–224)

* Strict TypeScript; `verbatimModuleSyntax`; no `any`; explicit return types on services.
* Permission strings centralized in `src/permissions/permissions.ts`; no `if (user.role === ...)` scattered in controllers.
* Naming: `dailyLogId`, `timesheetId`, `invoiceId`, `invoiceTemplateId`; routes kebab-case; controllers/services/repositories per EMSB conventions.
* Dependency direction: routes → controllers → services → repositories; never upward. Controllers/services never import HTTP framework types beyond `Request`/`Response` shapes already used.
* Never leak internal errors (EMSB §41); log with Pino; include a request id.

---

# 51. Build Order (checklist)

Implement in this order:

- [ ] 1. Extend `permissions` + `constants` with the CMS permission set + enums (TechRole, statuses, tiers, terms)
- [ ] 2. Extend `client`/`project`/`assignment`/`employee` models, schemas, services, repositories (CMS shape; keep EMSF working)
- [ ] 3. `daily_logs` — model, schema, repository, service (rules §19), controller, routes, tests
- [ ] 4. `timesheets` — model, schema, repository, service (compile §23 + FSM §22), controller, routes, tests
- [ ] 5. `invoice_templates` — model, schema, repository, service, controller, routes, tests
- [ ] 6. `invoices` — model, schema, repository, service (totals §28 + auto-populate §29 + FSM §27), controller, routes, tests
- [ ] 7. Stand up `STANDARD_RESOURCE_RATES` + geography/tier helpers (shared, reused by invoices)
- [ ] 8. Notifications + audit wiring for CMS events (§35/§36)
- [ ] 9. Reports/analytics endpoints (§34)
- [ ] 10. Mount routers in `routes/index.ts`; extend `settings.routes.ts` if templates live under settings
- [ ] 11. Seed scripts extended + idempotent CMS data (§48)
- [ ] 12. CORS updated for CMSF origin
- [ ] 13. Swap CMSF `src/data/mock/repositories.ts` to call the API (§49), verify `tsc` + `oxlint` + `vitest` in CMSF

---

# 52. Critical Business Rules (never break)

- [ ] Rule 1: A daily log's `overtimeHours > 0` is allowed only on Saturday/Sunday.
- [ ] Rule 2: `regularHours + overtimeHours <= 24`.
- [ ] Rule 3: A daily log can only reference a project where the employee has an ACTIVE assignment.
- [ ] Rule 4: No duplicate daily log for the same employee + date + project.
- [ ] Rule 5: Once a timesheet is APPROVED or PAID, its daily logs are read-only (`LOCKED`).
- [ ] Rule 6: Timesheet transitions follow §22 exactly; illegal moves are rejected, not silently applied.
- [ ] Rule 7: `billableAmount` on a timesheet uses the employee's **hourly** `billRate`; invoice line-item rates use the **monthly** `STANDARD_RESOURCE_RATES` table.
- [ ] Rule 8: A SENT/PAID/OVERDUE/VOID invoice cannot have its line items edited.
- [ ] Rule 9: `invoiceNumber` is unique and format `INV-{YYYY}-{NNN}`.
- [ ] Rule 10: Totals (`subtotal`, `taxAmount`, `totalAmount`, `balanceDue`) are always server-computed; the client never sends authoritative amounts.
- [ ] Rule 11: Rejecting a timesheet requires notes.
- [ ] Rule 12: EMPLOYEES and SUPERVISORS cannot access invoices; SUPERVISOR timesheet access is limited to supervised projects.
- [ ] Rule 13: HR has no CMS access (existing EMSB permission model already excludes it).
- [ ] Rule 14: Never trust the frontend for authorization; enforce permission + ownership server-side.
- [ ] Rule 15: No hard deletion of billing history once submitted/approved/paid/sent.

---

# 53. Definition of Done (progress checklist)

### Infrastructure

- [ ] EMSB reused (no new service/deploy)
- [ ] CMS routers mounted under `/api/v1`
- [ ] MongoDB collections created (daily_logs, timesheets, invoices, invoice_templates)
- [ ] Zod validation on all new routes
- [ ] Pino logging + request id on new routes
- [ ] CORS allows CMSF

### Security

- [ ] JWT auth on all CMS routes
- [ ] `requirePermission`/`requireAnyPermission` on every route (§46)
- [ ] Resource-level ownership enforced (§37)
- [ ] Sensitive-field projection (§38)
- [ ] salary/billRate/budget hidden per role

### Client / Project / Assignment (extended)

- [ ] clients return rich CMS fields
- [ ] projects return rich CMS fields (+ DELAYED)
- [ ] assignments support role/allocation/billable/PENDING + assignedBy
- [ ] derived `activeProjectCount` and `teamSize` kept consistent

### Daily Logs

- [ ] CRUD + scoping
- [ ] weekend-only overtime enforced
- [ ] ≤24h enforced
- [ ] duplicate prevention
- [ ] timesheet lock (read-only + LOCKED)

### Timesheets

- [ ] bi-monthly compile from daily logs (idempotent)
- [ ] totals + project breakdown + snapshot bill rate
- [ ] manual create (admin/manager)
- [ ] full FSM (submit/approve/reject/revise/mark-paid)
- [ ] `mine` for employees; reviewer scope for managers/supervisors
- [ ] approval locks linked logs

### Invoices

- [ ] CRUD + line-item add/edit/remove/reorder (DRAFT only)
- [ ] totals + tax + balanceDue
- [ ] auto-populate from approved timesheets (resource grouping + #n suffix)
- [ ] STANDARD_RESOURCE_RATES + geography/tier lookup
- [ ] INV-YYYY-### unique numbering
- [ ] FSM (send/void/mark-paid/partial, overdue derived)
- [ ] email-send event recorded
- [ ] invoice templates CRUD + default

### Notifications / Audit / Reports

- [ ] CMS events create notifications
- [ ] all CMS mutations write audit logs
- [ ] report/analytics endpoints return CMSF shapes

### Testing

- [ ] unit tests: period math, overtime/24h validation, compile totals, invoice totals, auto-populate, rate lookup
- [ ] API tests: daily-log create/lock/duplicate, timesheet FSM, invoice FSM (send/paid/partial/void), manual compile idempotency
- [ ] permission tests: EMP no invoice/no list_all; SUPERVISOR scope; HR blocked
- [ ] business-rule tests: sent invoice immutable, approved log locked
- [ ] Supertest integration tests for critical workflows

---

# 54. Final Architecture

```text
   EMSF (navy)              CMSF (green)
      │                         │
      │  /api/v1 (JWT)          │  /api/v1 (JWT)   ← same auth, same base
      └────────────┬────────────┘
                   ▼
        ┌─────────────────────────┐
        │   EMSB  +  CMSB modules │
        │  Express · TS · Zod     │
        │  permissions (roles)    │
        └───────────┬─────────────┘
                    │
        ┌───────────┼───────────────┐
        ▼           ▼               ▼
   MongoDB      Zoho Timesheet   Mail (SMTP)
   Atlas        adapter          (invoice events)
```

---

# 55. Final Implementation Principle

Read this spec together with `EMSB.md` and the shipped `CMSF/src` (types, permissions, `lib/rates.ts`, `lib/utils.ts` periods, and `data/mock/repositories.ts` for exact function/field names). **Match the existing codebase — never invent new shapes.** Where EMSB and CMSF differ, favor CMSF for CMS resources while keeping EMSF backward-compatible (§47). Every authoritative rule (transitions, totals, auto-populate, ownership, lock, duplicate) lives in the service layer; the frontend is UX only.

---

# 56. Master Phase Checklist (Progress Tracker)

Tick every box as it lands. Phases are ordered so each unblocks the next and keeps EMSF working throughout. A phase is done when its boxes are checked **and** `tsc --noEmit`, `oxlint`, `vitest`, and (for route phases) Supertest all pass.

## Phase 0 — Permissions, Constants & Foundations
- [x] Added the CMS permission set to `src/permissions/permissions.ts` (new literals: `daily_log.view/create/edit/view_all`, `timesheet.view_all/submit/approve/reject`, `invoice.view/view_all/create/edit/send`). `client.*`/`project.*`/`assignment.*` view+create+edit and `timesheet.view` already existed in EMSB (reused).
- [x] Extended `ROLE_PERMISSIONS` (additive; EMSB tests green at 512):
  - ADMIN = all (unchanged wildcard)
  - MANAGER += `daily_log.view_all/create`, `timesheet.view_all/approve/reject`, `invoice.view_all/create/edit/send`
  - SUPERVISOR += `daily_log.view_all/create`, `timesheet.view_all/approve/reject`
  - EMPLOYEE += `daily_log.view/create/edit`, `timesheet.view`, `timesheet.submit`, `project.view`
  - HR = none for CMS (unchanged)
- [x] Added CMS enums to `src/config/constants.ts`: `TechRole`, `ClientTier`, `ClientStatus`, `PaymentTerms`, `TaskCategory`, `TimesheetStatus`, `InvoiceStatus`, `Currency`, plus `ProjectTier`/`ProjectVisibility`.
- [x] Hardened `timesheet.controller.getStatus`: EMPLOYEE can only read their own status (needed because the EMPLOYEE `timesheet.view` grant otherwise exposes `GET /employees/:id/timesheet`); preserves the existing "EMPLOYEE cannot view timesheet status (403)" test.
- [x] Unit tests `tests/permissions.test.ts` (7): EMP logs+submits, EMP/SUP blocked from invoices, SUP reviews in scope, MANAGER reviews+invoices, HR blocked, ADMIN all, enum members.

> Deviations taken to keep EMSB green (deferred to a later phase, not Phase 0):
> - **MANAGER `audit.view` NOT granted** — `tests/audit.test.ts:203` asserts MANAGER is **denied** audit logs (live EMS behavior), which contradicts CMSF.md §31 / EMSB.md §81 ("ADMIN and MANAGER can access"). Must be reconciled (grant + update the test) in the audit-module phase.
> - **SUPERVISOR `assignment.edit` NOT granted** and **SUPERVISOR `report.view` NOT granted** — deferred to avoid EMSB regressions; matches CMSF.md §36 (SUP has no report/invoice). Revisit if a CMS flow requires them.
> - Pre-existing (not introduced here, out of scope): `src/scripts/seed-dev.ts` has 2 `@typescript-eslint/no-explicit-any` eslint errors; `tsc --noEmit` and all 512 tests are green.

**Verification:** `tsc --noEmit` ✓ · new `tests/permissions.test.ts` 7/7 ✓ · full EMSB suite **512/512** ✓ (incl. timesheet employee-403 + audit MANAGER-deny) · eslint clean on all 4 files touched.

## Phase 1 — Extend Client / Project / Assignment / Employee (CMS shape, EMSF-safe)
- [x] `models/employee.ts` + `createEmployeeSchema`/`hrEmployeeUpdateSchema` + `employee.service`: added `techRole?: TechRole` (create + HR update + `EmployeeDTO`).
- [x] `models/client.ts` + `client.schemas.ts` + `client.service`: added `clientTier`, `paymentTerms`, `taxId`, `contacts[]`, `billingAddress`, `shippingAddress` (all optional). Existing `clientStatusEnum` already covered `PROSPECT/ACTIVE/INACTIVE/SUSPENDED/CLOSED`. `activeProjectCount` already derived in `toDTO`.
- [x] `models/project.ts` + `project.schemas.ts` + `project.service`: added `clientName` (denormalized on create), `supervisorId`, `budget`, `budgetCurrency`, `tags[]`, `visibility`, and `DELAYED` to health; `toDTO` exposes them + `updatedAt`. `teamSize` already derived in `toDTO`.
- [x] `models/assignment.ts` + `assignment.schemas.ts`: added `PENDING` to `AssignmentStatus`. `allocation`/`assignedBy`/`role` were already exposed by `AssignmentDTO.toDTO` (aliased from `allocationPercent`/`createdBy`); 0–100 validation + overallocation warning already in the service.
- [x] Field-name reconciliation is already backward-compatible: EMSB DTOs alias `clientCode`, `progress`(←`progressPercent`), `allocation`(←`allocationPercent`), `assignedBy`, `teamSize`. Old EMS fields preserved; no EMSF breakage.
- [x] Derived counters consistent: `client.activeProjectCount` computed from ACTIVE projects; `project.teamSize` computed from ACTIVE assignments (`countTeamSize`).

**Notes / deferred:**
- ID **formats kept as EMSB** (`CLT-###`, `PRO-###`/`PROJ###`, `ASN-####`) to avoid breaking existing EMSB tests/seed; CMSB §13's `CL-/PRJ-/PA-` formats will be applied in the migration/integration phase (or via a mapping), not mid-flight.
- `clientName` is backfilled only on project create; pre-existing EMS projects return `clientName: ""` until re-saved or a backfill script runs (track as a small migration in Phase 7/8).
- Existing 512 Supertest tests already cover the extended `/clients`, `/projects`, `/assignments` paths; new optional fields are exercised additively (verified by full-suite green). Dedicated CMS-field tests + assignment ownership checks land with the integration phase.

**Verification:** `tsc --noEmit` ✓ · full EMSB suite **512/512** ✓ · eslint clean on all 11 changed files.

## Phase 2 — Daily Logs Module
- [x] `models/daily-log.ts` + `schemas/daily-log.schemas.ts` (Zod: required project + valid date + description ≥10, hours 0–24 in 0.25 steps, ≤24 refine).
- [x] `repositories/daily-log.repository.ts` (CRUD + soft delete) + unique partial index `(employeeId, projectId, workDateStr)` where `deletedAt: null` + `projectId/status/timesheetId/workDate` lookup paths.
- [x] `services/daily-log.service.ts` rules: active-assignment gate, **weekend-only overtime**, **≤24h**, **duplicate prevention** (returns existing conflict → 409 + 11000 backstop), ownership scoping (EMPLOYEE own; MANAGER/SUPERVISISOR scoped to their projects; ADMIN all), soft delete (DRAFT-only unless ADMIN).
- [x] `controllers/daily-log.controller.ts` + `routes/daily-log.routes.ts` mounted at `/api/v1/daily-logs` (`GET /`, `POST /`, `GET/PATCH/DELETE :id`) guarded by `daily_log.view/view_all` (read) and `daily_log.create` (write).
- [x] Server-derived `dayOfWeek` + `totalHours` (never trust client).
- [x] Audit (`daily_log.created` / `daily_log.updated` on delete).
- [x] Lock enforcement is implemented against the `timesheets` collection (read-only when the parent timesheet is APPROVED/PAID → `DAILY_LOG_LOCKED`); it becomes active once the timesheet collection exists in Phase 3.
- [x] Tests `tests/daily-log.test.ts` (7): create weekday, weekend-overtime-allowed/weekday-overtime-422, >24h-400, duplicate-409, not-assigned-403, cross-employee-read-403, HR-403.

**Notes:** MongoDB partial indexes reject `$exists: false`, so the uniqueness uses `partialFilterExpression: { deletedAt: null }` (matches missing/null, excludes soft-deleted).

**Verification:** `tsc --noEmit` ✓ · full EMSB suite **519/519** ✓ (512 + 7) · eslint clean on new files.

## Phase 3 — Timesheets Module (bi-monthly)
- [x] `models/billing-timesheet.ts` + `schemas/billing-timesheet.schemas.ts` (embedded `ProjectBreakdown`). Named `billing-*` to avoid clashing with EMSB's existing timesheet **provisioning** module (`src/services/timesheet.service.ts`), which is untouched.
- [x] `repositories/billing-timesheet.repository.ts` + unique `timesheetId`, unique `(employeeId, periodStart, periodEnd)`, `status`/`periodStart`/`employeeId` indexes.
- [x] `services/billing-timesheet.service.ts`: **compile** (§23) idempotent from SUBMITTED daily logs; totals; `projectBreakdown` with snapshot hourly `billRate`; `billableAmount` = Σ breakdown.
- [x] FSM (§22) enforced via a `TRANSITIONS` table; **reject requires notes** (ValidationError); illegal moves → `INVALID_TIMESHEET_TRANSITION` (422).
- [x] `controllers/billing-timesheet.controller.ts` + `routes/billing-timesheet.routes.ts` at `/api/v1/timesheets`: `list`, `POST` (manual ADMIN/MANAGER), `mine`, `:id`, `compile`, `:id/submit`, `:id/approve`, `:id/reject`, `:id/revise`, `:id/mark-paid`.
- [x] Approve sets APPROVED + flips all linked daily logs to `LOCKED` (with `reviewedBy`). Done without a transaction (documented; multi-doc transaction is a Phase 12 hardening item).
- [x] Scoping: EMPLOYEE own; MANAGER/SUPERVISISOR scoped to their projects' employees (list/get); ADMIN all; `mark-paid` = ADMIN only.
- [x] Audit on compile/submit/approve/reject/mark-paid/revise.
- [x] Tests `tests/billing-timesheet.test.ts` (7): compile+totals, idempotent, DRAFT→SUBMITTED→APPROVED→PAID + log lock, reject-notes + REJECTED→REVISED→SUBMITTED, illegal-transition, EMP approve/reject 403 + non-admin mark-paid 403, no-logs 409.

**Deferred:** notification emission on submit/approve/reject (wired in the notification phase); multi-doc transaction for approve/link; SUM dayOWeek etc. handled by server derive.

**Verification:** `tsc --noEmit` ✓ · full EMSB suite **526/526** ✓ · eslint clean.

## Phase 4 — Invoices Module
- [x] Shared rates module `src/lib/rates.ts`: `STANDARD_RESOURCE_RATES` + `geographyOf` + `techRoleToTier` + `resolveResourceRate` (§30) — single source of truth (mirrors CMSF).
- [x] `models/invoice.ts` (nested `lineItems`, `InvoiceLineItem`) + `schemas/invoice.schemas.ts` (list/create/update/line-item/reorder/payment).
- [x] `repositories/invoice.repository.ts` + unique `invoiceId` + unique `invoiceNumber` + `clientId+status`/`issueDate` indexes.
- [x] `services/invoice.service.ts`: server-computed `subtotal/taxAmount/totalAmount/balanceDue` (never trusts client totals); `INV-{YYYY}-{NNN}` numbering (max+1 for the year). (Retry-on-duplicate hardening is a Phase 12 item.)
- [x] Auto-populate from APPROVED timesheets (§29): resolve employee → resource name, group, standard rate, `#n` suffix — reproduces INV-000001.pdf (test asserts $23,400 US AEM + $6,240 India ⇒ subtotal $29,640).
- [x] FSM (§27): `DRAFT→SENT→PAID`/`OVERDUE`/`PARTIAL`/`VOID`/`CANCELLED`; DRAFT line items mutable only (else `INVOICE_NOT_DRAFT`); SENT/PAID/OVERDUE/VOID immutable; `send` records `sentBy/sentAt`; OVERDUE derived (`dueDate < today` when SENT/PARTIAL).
- [x] Line-item ops + `reorder` with totals recompute on every mutation.
- [x] `controllers/invoice.controller.ts` + `routes/invoice.routes.ts` at `/api/v1/invoices` (list/get/create/preview-auto-populate/patch/line-items CRUD+reorder/send/void/mark-paid/payments).
- [x] Permissions: EMPLOYEE/SUPERVISOR get 403 everywhere (no invoice perms); `create`/`edit`/`send` = MANAGER+ADMIN; void/mark-paid/payments = `invoice.view_all` (MANAGER+ADMIN).
- [x] Audit on create/update/send/void/paid.
- [x] Tests `tests/invoice.test.ts` (6): auto-populate reproduction, totals recompute on add-line, SENT edit 422, DRAFT→SENT→PAID, partial→settle, EMP/SUP 403 + MANAGER void.

**Deferred:** notifications on send/paid; invoice-number uniqueness retry on 11000; multi-doc transaction for line-item ops.

**Verification:** `tsc --noEmit` ✓ · full EMSB suite **532/532** ✓ · eslint clean on all new files.

## Phase 5 — Invoice Templates
- [x] `models/invoice-template.ts` + `schemas/invoice-template.schemas.ts` + `repositories/invoice-template.repository.ts` + `services/invoice-template.service.ts` + `controllers/invoice-template.controller.ts` + `routes/invoice-template.routes.ts` at `/api/v1/invoice-templates` (list/get/create/patch/:id/default).
- [x] Default singleton: `create`/`update`/`setDefault` clear other defaults first (`clearDefaults`). Multi-doc transaction harden deferred.
- [x] Permissions: read/create/update = `invoice.edit | settings.manage` (MANAGER+ADMIN); `default` = `settings.manage` (ADMIN; manager is blocked from switching default). EMPLOYEE/SUPERVISISOR get 403.
- [x] Tests `tests/invoice-template.test.ts` (4): create, default singleton, set-default switch, EMP/SUP 403.

**Verification:** `tsc --noEmit` ✓ · full EMSB suite **536/536** ✓ · eslint clean.

## Phase 6 — Reports & Analytics Endpoints
- [x] `services/analytics.service.ts` + `controllers/analytics.controller.ts` computing: `GET /timesheets/kpis`, `GET /timesheets/submission-rate`, `GET /invoices/kpis`, `GET /invoices/revenue-trend`, `GET /invoices/top-clients`, `GET /analytics/overview`. Routes added to the timesheet/invoice routers (before `/:id`) and a new `/analytics` router (CMSB §34).
- [x] `report.view` guard (MANAGER+ADMIN); returns CMSF field shapes; OVERDUE derived from `dueDate < today`.
- [x] Tests `tests/analytics.test.ts` (6): timesheet/invoice KPIs, revenue-trend grouped by period with real label, top clients, submission rate, `/analytics/overview`, EMP/SUP 403.

**Note:** the timesheet unique index `(employeeId, periodStart, periodEnd)` (one timesheet per employee per period) surfaced during seeding the analytics test and is the correct business rule — the test was adjusted to use distinct employees.

**Verification:** `tsc --noEmit` ✓ · full EMSB suite **542/542** ✓ · eslint clean.

## Phase 7 — Mount, Seed & CORS
- [x] Mounted (progressively in Phases 2–6): `/daily-logs`, `/timesheets`, `/invoices`, `/invoice-templates`, `/analytics`.
- [x] `src/scripts/seed-cms.ts` (`npm run seed:cms`): **idempotent** upserts only (no deletes), never wipes EMS data; deterministic (no `Math.random`); seeds 5 templates / 12 clients / 24 projects / 50 assignments / 80 daily logs / 40 timesheets / 25 invoices. Verified idempotency: re-running leaves counts unchanged.
- [x] Added CMSF origins to `CORS_ORIGIN` in `EMSB/.env` (dev ports); middleware already splits on ",".
- [ ] OpenAPI/contract update — deferred: `src/openapi.json` is a static EMS file; adding 20+ CMS endpoints is a documentation-only pass (see §50 frontend-compatibility note).

**Note:** the first seed implementation had a fire-and-forget bug (upserts not awaited, so writes were dropped before `closeDatabase()`); fixed to `await`, then verified counts + idempotency against the live dev DB.

**Verification:** `tsc --noEmit` ✓ · `eslint src/scripts/seed-cms.ts` ✓ · full EMSB suite **542/542** ✓ · `npm run seed:cms` idempotent ✓.

## Phase 8 — CMSF Integration (mock → API)
- [x] `CMSF/src/lib/api.ts` — `apiFetch` wrapper (bearer tokens, `{ success, data }` shape, `ApiRequestError`), `setTokens/clearTokens`, `USE_API` flag (`VITE_USE_API !== "false"`), `VITE_API_BASE_URL` (defaults to `http://localhost:4000/api/v1`).
- [x] `CMSF/src/data/mock/adapters.ts` — 9 DTO mappers (employee/client/project/assignment/daily-log/timesheet/invoice/template) that strip Mongo `_id`, map `allocationPercent→allocation`, `code→clientCode/projectCode`, coerce Date→`"YYYY-MM-DD"`/ISO-8601, and normalize `timesheetEligibility`. All timezone-safe (local components).
- [x] `loadBackendData()` (`mock/index.ts`) hydrates all 10 collections from `/api/v1/*` with an **AbortSignal 5s timeout**; on any failure it keeps the generated seed, so the demo runs with **or without** a backend. Reads stay synchronous → **zero component changes** (signatures + shapes preserved per §49).
- [x] Mutations are **write-through**: every create/update/state-transition in `repositories.ts` applies the local change (return value + UI stay correct), then fires an `apiWrite(...)` to the matching EMSB endpoint (`.catch` logged). All 25 mutations covered (client/project/assignment, daily-log, timesheet submit/approve/reject/revise/mark-paid/compile/create, invoice create/send/void/mark-paid/line-item CRUD/reorder).
- [x] Authoritative rules stay server-side (CMSB Phases 2–6 enforce transitions/totals/auto-populate/duplicate/lock/ownership); CMSF keeps only UI formatting/validation.
- [x] `AuthContext` login is API-first: attempts `POST /auth/login` (token + hydrate), falling back to the demo accounts when the backend is down or credentials aren't provisioned. Session restore hydrates before revealing the app (mirrors EMSF).
- [x] `tests/adapters.test.ts` (8): all 9 mappers, `_id` stripping, dates, totals, eligibility normalization, timezone-safety, `USE_API` type.
- [ ] End-to-end smoke (needs `EMSB` running with the CMS modules deployed): login → client → project → assignment → daily log → compile → submit → approve → invoice auto-populate → send.
- [ ] HR denial + non-billable EMPLOYEE denial in CMSF (the RBAC layer from Phases 1–6 already enforces this; a live smoke run remains)

**Trade-off (documented):** integrations are **optimistic write-through** rather than awaited/blocking, because the existing CMSF call sites are synchronous. The API response is not folded back into local state — a failed write logs `console.warn` and the optimistic value stands. Making writes awaited + reconciled (conflict handling on `INVALID_*`) is the next step if the UI needs server-truth confirmation.

**Verification:** `tsc --noEmit` ✓ · `oxlint` ✓ · `vitest` **40/40** ✓ · `vite build` ✓.

## Phase 9 — Testing & Hardening
- [x] `tests/rates.test.ts` (5): geography mapping, tier collapse (incl. `techRoleToTier("Unknown Role")` → "Developer"), rate resolution (exact→tier→designation fallback), and a table assertion that `23400 + 20584 + 6240 + 6240 + 13996 = 70460` — the INV-000001.pdf total.
- [x] Supertest happy-path + error paths: 400 (validation), 401 (no token), 403 (HR/EMP/SUP), 409 (duplicate), 422 (business rules) — covered across `daily-log`, `billing-timesheet`, `invoice`, `invoice-template`, `analytics` suites.
- [x] `tests/cms-hardening.test.ts` (11): unit tests for period/rate/project math, 401 on every CMS route without a token, HR blocked on every CMS endpoint, daily-log locking on an APPROVED/PAID timesheet, auto-lock (`SUBMITTED → LOCKED` on approve), SUPERVISOR project-intersection scoping, and ADMIN full visibility.
- [x] Business rules re-verified: sent invoice immutable (`INVOICE_NOT_DRAFT`), approved log locked (`DAILY_LOG_LOCKED`), reject-requires-notes.
- [x] Fixed two pre-existing `eslint` errors in `src/scripts/seed-dev.ts` (2 `any` types) with narrow, documented suppressions — `eslint . --ext .ts` is now **clean**. (First attempts with `Record<string, unknown>` and inference broke downstream conditional-property assignment, so the suppression is the correct fix.)
- [x] EMSF regression unchanged: **553/553** tests pass, `tsc --noEmit` clean, `oxlint`/`eslint` clean.

**Two genuine security bugs found by the hardening tests and fixed:**
1. **SUPERVISOR timesheet scope was employee-based, not project-based** — `scopedEmployeeIds` filtered by `employeeId`, but a timesheet is an employee-period aggregate spanning several projects, so a supervisor saw hours from projects they don't supervise. Now `scopedProjectIds` intersects on `projectBreakdown.projectId`, applied in both `listTimesheets` and `assertViewScope`.
2. **HR had CMS access** on `/timesheets` and `/analytics/overview` because they reuse *shared* permissions (`timesheet.view`, `report.view`) that HR holds for EMS reasons. Fixed at the module boundary (`assertCmsAccess` in the analytics controller, an HR-reject middleware on the billing-timesheet router) without disturbing the EMS timesheet-provisioning endpoint.

**Remaining Phase 10 items** (not done — deferred to that phase): notification emission on CMS transitions, multi-doc transactions for compile/approve/line-item ops, invoice-number 11000 retry, OpenAPI doc update.

## Phase 10 — Definition of Done Review
- [x] Audit on every important mutation (all write paths call `writeAuditLog`) + **notifications on CMS events**:
  - Added CMS notification types (`TIMESHEET`, `INVOICE`) to the model + Zod schema.
  - New service events: `onTimesheetSubmitted` (→ ADMIN/MANAGER/SUPERVISOR), `onTimesheetReviewed` (→ the employee), `onInvoiceSent` (→ ADMIN/MANAGER/SUPERVISOR).
  - Wired into `submit` / `approve` / `reject` (billing-timesheet service) and `send` (invoice service). Verified by a test asserting both the reviewer and employee notifications land.
- [x] Multi-doc atomicity: `src/utils/transaction.ts` provides `runInTransaction`, which uses a real MongoDB transaction **when the deployment supports it** and falls back to sequential execution otherwise. The test database is a standalone mongod (`Transaction numbers are only allowed on a replica set member`), so support is probed once and cached. Applied to: timesheet `approve` (approve + lock N daily logs), invoice line-item ops (items + recomputed totals), and idempotent compile.
- [x] Invoice-number `E11000` retry: `InvoiceRepository.create` retries up to 5× on duplicate `invoiceNumber`, regenerating the number each attempt.
- [ ] OpenAPI/contract update — `src/openapi.json` remains the static EMS spec. ~20 CMS endpoint paths would need hand-writing; the contract is proven by the ~30 integration tests instead (documented, not done).
- [x] EMSF regression unchanged: **554/554** tests pass, `tsc --noEmit` clean, `eslint . --ext .ts` clean.
- [x] No new env vars except CORS; no Hono; no second database; graceful shutdown + `/health` + `/health/ready` intact (`app.ts` unchanged).
- [x] Security verified: authz + resource ownership (SUPERVISOR project-intersection scoping on timesheets) + field projection (salary/`employeeRole`/budget restricted per role by `field-filter.ts`).

**Verification:** `tsc --noEmit` ✓ · `eslint . --ext .ts` ✓ (clean) · `vitest` **554/554** ✓.

> Legend: `[ ]` = not started, `[x]` = done, `~[ ]` = in progress / partial.

> Legend: `[ ]` = not started, `[x]` = done, `~[ ]` = in progress / partial.

---

# END OF CMSB.md


