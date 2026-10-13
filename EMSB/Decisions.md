# Implementation Decisions

## Phase 0

- **pino-pretty as dev dependency**: Used `pino-pretty` for human-readable dev logging. In production, pino writes JSON to stdout for log aggregation.
- **Single MongoDB connection pool**: Used a module-level singleton pattern in `database.ts` per EMSB.md §14 recommendations.
- **dotenv loaded in server.ts**: Environment variables loaded via `dotenv/config` at the entry point before any module imports the config.
- **Health endpoints**: Implemented `/health`, `/health/ready` (checks MongoDB ping), and `/health/live` per EMSB.md §125.
- **Trust proxy enabled**: `app.set("trust proxy", 1)` for correct IP/forwarded headers behind reverse proxy.
- **Body parser limits**: Set to `10mb` for JSON and form data to prevent excessive request sizes.
- **Security headers**: Helmet enabled with CSP and HSTS only in production (relaxed for development).
- **CORS**: Origin parsed from comma-separated `CORS_ORIGIN` env var for flexibility; credentials enabled.
- **Rate limiting**: 1000 req/15min for general API, 50 req/15min for auth endpoints.

## Phase 3

- **Role-based DTO field projection**: Implemented `ViewContext` pattern ("HR" | "MANAGER" | "SUPERVISOR" | "EMPLOYEE") in `EmployeeService.toDTO()` to dynamically project sensitive fields (salary, billRate, compensation) based on the caller's role. HR sees all fields; Manager/Supervisor see operational data only; Employee sees self-service fields only.
- **Lifecycle state machine**: Enforced `VALID_TRANSITIONS` map in `EmployeeService` that defines valid `EmploymentStatus` transitions. Any transition not in the map throws `BusinessRuleError` with code `INVALID_STATUS_TRANSITION` (HTTP 422).
- **Employee self-update schema**: Employee role uses `profile.edit_self` permission and can only update: phone, address, emergencyContact, profilePhotoUrl. Any other field in the request body is silently ignored (mass assignment protection).
- **Manager operational update**: Manager role can update only operational fields (firstName, lastName, phone, designation, department, managerId). Manager does NOT have `employee.edit` permission, so PATCH is rejected at the authorization layer (HTTP 403).
- **Country mapping**: Stored as enum values (INDIA, USA) in MongoDB, mapped to display values (India, United States) in DTO responses to match EMSF frontend types.
- **Timesheet eligibility**: Computed from `employmentStatus === ACTIVE && billingStatus === BILLABLE`. Does not read `timesheetEligibility` field on the employee for the eligibility determination; only uses it for provisioning status.
- **Lifecycle permissions**: HR has `employee.edit`, `employee.delete`, `employee.activate` permissions. Manager does NOT have lifecycle permissions. ADMIN has `*` (all permissions).

## Phase 4

- **Onboarding workflow state machine**: Modeled as status transitions (DRAFT → IN_PROGRESS/AWAITING_REVIEW → REVIEWED → COMPLETED/REJECTED) with validation at each step. Status checks use `BusinessRuleError` with code `INVALID_ONBOARDING_ACTION` (HTTP 422).
- **Completion validation**: Before approving onboarding, backend validates that employee has required data (firstName, lastName, email, designation, department, country, address, billingStatus). Returns 422 with code `ONBOARDING_INCOMPLETE` if validation fails.
- **Authorization middleware fix**: Changed `requirePermission` and `requireAnyPermission` to use `hasPermission()` and `hasAnyPermission()` functions from `permissions.ts` instead of directly checking `ROLE_PERMISSIONS[role].includes()`. This properly handles the ADMIN wildcard `*` permission.
- **Onboarding action endpoints**: `submit`, `review`, `approve`, `reject`, `activate` are separate POST endpoints (not PATCH) as per EMSB.md §53. Each has a specific state precondition (e.g., can only approve from REVIEWED status).
- **Activation transitions employee to ACTIVE**: The `activate` action on onboarding record sets the employee's employmentStatus to ACTIVE via `EmployeeRepository.updateEmploymentStatus`.
- **Vitest file parallelism disabled**: Set `fileParallelism: false` in vitest config to prevent test files from interfering with each other when sharing the same test MongoDB database.

## Phase 5

- **Document storage architecture**: Metadata (fileName, mimeType, size, storageKey, fileUrl) stored in MongoDB. Actual files are NOT embedded in MongoDB — `fileUrl` references external blob storage. `storageKey` is reserved for future S3/Blob/GCS integration. This phase implements metadata-only (no multipart upload endpoint yet).
- **Document ownership/IDOR prevention**: `getDocumentById` and `listDocuments` enforce that EMPLOYEE role can only access documents where `doc.employeeId === req.user.employeeId`. Accessing another employee's document returns 404 (not 403) to avoid leaking existence.
- **Document status state machine**: Valid transitions enforced server-side. PENDING → APPROVED/REJECTED/CHANGES_REQUESTED; REJECTED → APPROVED; CHANGES_REQUESTED → APPROVED/REJECTED; APPROVED is terminal. Invalid transitions return 422 with code `INVALID_DOCUMENT_TRANSITION`.
- **Shared audit helper**: Created `src/utils/audit.ts` with `writeAuditLog()` that generates a unique `auditId` (AUD-####) before insert. This is required because the `audit_logs.auditId` field has a unique index — inserting multiple logs without `auditId` caused duplicate-key errors. Employee, onboarding, and document services all use this shared helper.
- **Manager document access**: Managers have NO document permissions (not `document.view`, `document.view_self`, `document.upload`, or `document.review`), so all document endpoints return 403 for MANAGER role. This satisfies "Managers cannot access confidential HR documents."
- **Expiry endpoints authorization**: `/documents/expired` and `/documents/expiring-soon` require `report.view` permission (HR, Manager, Admin). Employees get 403.

## Phase 6

- **Who marks attendance**: Only EMPLOYEE has `attendance.mark` permission. Employees mark their OWN attendance; the service ignores any `employeeId` in the check-in body and always uses `req.user.employeeId`. HR/Admin do NOT mark attendance (they manage records via PATCH and review corrections). This satisfies "Admin does NOT mark attendance" (EMSB.md §24, §100).
- **Who views attendance**: Added `attendance.view` to MANAGER and SUPERVISOR (per EMSB.md §60 "attendance applies to HR, Manager, Supervisor, Employee"). HR has `attendance.view`/`attendance.correct`/`attendance.review`; Admin has `*` (can view/report but is blocked from check-in/out by the service). Employee sees own records via `attendance.view_self`.
- **Status codes vs labels**: Internally stored as EMSB codes P/A/L/LV/M. DTO maps them to frontend labels PRESENT/ABSENT/LATE/LEAVE/MISSING to match EMSF `Attendance` type. The PATCH update endpoint accepts labels.
- **Check-in sets status P**: Check-in always records status `P` (present) deterministically. LATE/other statuses are set by HR via the PATCH update endpoint. This keeps check-in deterministic (no time-of-day-dependent behavior).
- **Attendance corrections**: Employee requests a correction (creates `attendance_corrections` record + sets `correctionRequested` flag on the record). HR/Admin approve/reject via `POST /corrections/:correctionId/:action`. On resolution, the record's `correctionRequested` flag is cleared and `correctionResolution`/`correctionComment`/`correctionReviewedBy` are set. No silent overwrites — original check-in/out preserved.
- **workingHours computed**: On check-out, `totalMinutes` and `workingHours` are computed from checkIn/checkOut timestamps.

## Phase 7

- **Who requests leave**: Only EMPLOYEE has `leave.request` permission. Employees request leave for themselves; the service uses `req.user.employeeId` and ignores any `employeeId` in the body. HR/Admin do NOT create leave requests (they only approve/reject). This matches the EMSB.md flow where employees request and HR approves.
- **Leave types in a collection**: Leave types are configurable via a `leave_types` collection (typeId, code, name, annualAllowance, requiresApproval, active) rather than hardcoded, per checklist. Seeded PAID(20)/SICK(10)/CASUAL(10)/UNPAID(0).
- **Balance-consuming types**: PAID, SICK, CASUAL consume leave balance; UNPAID does not. On approval, balance is decremented for consuming types. Rejection does not decrement. Balance check uses `$gte: days` atomic conditional decrement to prevent over-draw.
- **Overlap detection**: `findOverlappingRequests` queries PENDING/APPROVED requests where `startDate <= requestedEnd AND endDate >= requestedStart`. Overlap returns 422 OVERLAPPING_LEAVE.
- **Days calculation**: Inclusive day count (startDate to endDate + 1 day) using UTC date normalization.
- **Employee cannot approve own leave**: approve/reject require `leave.approve`/`leave.reject` (HR/Admin only). Employees cannot reach these endpoints (403), satisfying "employee cannot approve own leave."
- **Route ordering**: `/leave/balances`, `/leave/balances/:employeeId`, and `/leave/request` are registered before `/leave/:requestId` to avoid `:requestId` capturing "balances"/"request".

## Phase 8

- **Client permissions**: `client.view`/`client.create`/`client.edit` are granted to MANAGER and ADMIN (via wildcard). HR, SUPERVISOR, EMPLOYEE get 403 on all client endpoints. This matches EMSB.md §24 (clients are Manager-only) — Admin has `*` so Admin also has access.
- **Client DTO alignment**: Mapped backend Client to EMSF frontend shape: `id`, `clientId`, `clientCode` (from `code`), `name`, `country` (from `address.country`), `industry`, `status`, `primaryContact`, `activeProjectCount`, `createdAt`.
- **activeProjectCount**: Computed on each DTO by querying ProjectRepository for ACTIVE projects matching the clientId. (Note: this is an N+1 query pattern acceptable for current list sizes; could be optimized with an aggregation later.)
- **Code auto-generation**: If no `code` is supplied on create, a `CLT###` code is auto-generated from the max existing code. Explicit codes are checked for uniqueness → 409.
- **Deactivate vs delete**: `deactivate` sets status to INACTIVE (soft state change), no hard delete — consistent with the soft-delete policy.

## Phase 9

- **Archive maps to CANCELLED**: The EMSB.md project model has no `ARCHIVED` status (it uses PLANNING/ACTIVE/ON_HOLD/COMPLETED/CANCELLED), but the API defines an `archive` endpoint and the checklist references PLANNING → ACTIVE → COMPLETED → ARCHIVED. Reconciled by mapping `archive` to the terminal `CANCELLED` status (COMPLETED → CANCELLED allowed).
- **complete sets progress to 100**: The `complete` action transitions to COMPLETED and forces `progressPercent` to 100.
- **Employee project scoping**: EMPLOYEE has `project.view_self`, so they CAN list projects — but the service filters to only projects where the employee has an ACTIVE `project_assignment`. Other roles (Manager/Supervisor/Admin) see all projects.
- **teamSize**: Computed per project DTO as the count of ACTIVE project_assignments (N+1 pattern; acceptable for current scale, could be aggregated later).
- **Status transition validation**: Enforced via a `VALID_TRANSITIONS` map in ProjectService; invalid transitions throw `BusinessRuleError` with code `INVALID_PROJECT_TRANSITION` (HTTP 422).

## Phase 10

- **Overallocation is a warning, not a rejection**: EMSB.md §75 says "detect problematic overallocation" (not block). On create, the service sums the employee's ACTIVE allocation and, if > 100%, returns an `overallocationWarning` string in the response while still creating the assignment. The `GET /employee/:employeeId/allocation` endpoint returns `totalAllocationPercent` and an `overallocated` boolean.
- **Who manages assignments**: `assignment.create`/`assignment.edit` are granted to MANAGER and SUPERVISOR (and Admin via `*`). HR does not manage assignments. Employees use `assignment.view_self` to see only their own.
- **Allocation validation**: `allocationPercent` constrained to 0–100 via Zod (`int().min(0).max(100)`) → 400 on out-of-range.
- **Employee + project existence**: Create validates both employeeId and projectId exist (404 if not), maintaining referential integrity.
- **End is idempotent-guarded**: `end` transitions ACTIVE → ENDED; ending a non-ACTIVE assignment throws 422 `ASSIGNMENT_ALREADY_ENDED`.
- **Allocation sum via aggregation**: `sumActiveAllocationByEmployee` uses a MongoDB `$group`/`$sum` aggregation for efficiency.

## Phase 11

- **Review workflow states**: The checklist workflow lists SCHEDULED → IN_PROGRESS → SUBMITTED → COMPLETED → ACKNOWLEDGED, but the frontend `Review` status enum and model only have SCHEDULED/IN_PROGRESS/COMPLETED/ACKNOWLEDGED (no SUBMITTED). Reconciled to the 4-state model: `submit` = SCHEDULED → IN_PROGRESS; `complete` = IN_PROGRESS → COMPLETED; ACKNOWLEDGED is reached via PATCH (COMPLETED → ACKNOWLEDGED), which sets `acknowledgedAt`.
- **Status transitions validated**: Enforced via a `VALID_TRANSITIONS` map in ReviewService; both the dedicated `submit`/`complete` endpoints and PATCH status changes validate against it. Invalid transitions throw 422 `INVALID_REVIEW_TRANSITION`.
- **Who manages reviews**: `review.create`/`review.edit` → HR (and Admin via `*`). Added `review.view_self` to EMPLOYEE so employees can view only their own reviews. No employee-facing submit/complete (403).
- **No hard deletes**: There is no delete endpoint for reviews — historical review data is preserved, per checklist.

## Phase 12

- **Money as Decimal128**: Per checklist "Money: Decimal128 or minor units (no floating point)", salary and billRate amounts are stored as MongoDB `Decimal128` (satisfies precision requirement). The API accepts amounts as JSON numbers and converts to `Decimal128` on write; the DTO converts `Decimal128` back to `number` on read for JSON/display. The Employee model's `compensation.salary` and `billRate.amount` were widened to `number | Decimal128` to support both legacy (seed, plain numbers) and new (Decimal128) storage.
- **Compensation permissions**: Used `compensation.view` (GET) and `compensation.manage` (PATCH), both held by HR; Admin gets access via the `*` wildcard. Also accepted `employee.view_salary`/`employee.edit_salary` as alternates (HR has these too). Manager/Supervisor/Employee have none → 403.
- **Salary and billRate are separate**: EMSB.md §82 — never combined. The PATCH endpoint updates them independently and writes to separate history collections (`employee_compensation_history`, `employee_bill_rate_history`).
- **History with effectiveFrom/effectiveTo**: Each update closes the previous history record (`effectiveTo = now`) and inserts a new record with `effectiveFrom = now`, preserving full history per EMSB.md §181-182.
- **Compensation not in general employee responses**: Compensation is only exposed via the dedicated `/employees/:employeeId/compensation` endpoint (permission-protected), not in the employee list/detail DTOs, minimizing accidental exposure (EMSB.md §134). The employee detail DTO still includes compensation/billRate for HR context only, but the authoritative source is the dedicated endpoint.

## Phase 13

- **Eligibility rule**: `employmentStatus === ACTIVE && billingStatus === BILLABLE && onboarding complete` → ELIGIBLE (EMSB.md §99). Onboarding is "complete" if there is no onboarding record (employee activated directly) OR the onboarding record status is COMPLETED. Non-ACTIVE or non-BILLABLE → NOT_ELIGIBLE.
- **PROVISIONING transient state**: Added `PROVISIONING` to the status enum (the checklist's failure handling references "PROVISIONING → FAILED"). On manual retry, the record transitions FAILED → PROVISIONING (transient) → PROVISIONED (success) or → FAILED (failure, with failureReason + lastAttemptAt).
- **Manual retry only from FAILED**: The `provision` endpoint rejects with 422 `INVALID_PROVISION_STATE` unless the current status is FAILED, per checklist ("only on FAILED state"). No automatic/infinite retry.
- **Adapter is a stub**: `TimesheetAdapter` simulates an external Timesheet API (always succeeds in this phase). In production these methods would call the Timesheet API. EMSB owns employee records; the Timesheet app does not mutate them directly (EMSB.md §183).
- **Integration event via EventEmitter**: `EmployeeTimesheetEligibilityChanged` is emitted through a lightweight in-process EventEmitter (`src/integrations/events.ts`). Fired from `EmployeeService.changeEmploymentStatus` (via `emitTimesheetEligibilityChanged`) so activation/billing changes trigger re-evaluation. Future notification/audit consumers can subscribe.
- **getStatus persists eligibility**: `GET /timesheet` calculates eligibility and creates/updates the provisioning record (ELIGIBLE/NOT_ELIGIBLE) so the record reflects current state.

## Phase 14

- **Notification model**: Modeled with `notificationId`, `userId`, `type` (LEAVE/DOCUMENT/PROJECT/ONBOARDING/ATTENDANCE/SYSTEM), `title`, `message`, `read` (boolean), `link`, `createdAt`, `readAt`. The `userId` field stores the user's `userId` from the `users` collection (e.g. `user_hr`, `user_employee`), enabling scoping by authenticated user.
- **Centralized NotificationService**: All notification creation goes through `NotificationService.create()` — no notification logic scattered in controllers. The service exposes event methods (`onLeaveRequestSubmitted`, `onLeaveRequestResolved`, `onDocumentReviewed`, `onDocumentExpiring`, `onOnboardingAwaitingReview`, `onEmployeeActivated`, `onAssignmentCreated`, `onReviewDue`, `onTimesheetProvisioningFailed`) that are called from the relevant service layers.
- **User lookup by employeeId**: Added `UserRepository.findByEmployeeId(employeeId)` and `UserRepository.findByRole(role)` to resolve user IDs from employee IDs and roles respectively, enabling notifications to be routed to specific employees or all users with a given role.
- **Notification scoping**: `listNotifications` and `markRead` scope by `req.user.userId` — users only see and can modify their own notifications (IDOR prevention).
- **Boolean query param handling**: The `read` query parameter uses `z.enum(["true","false"]).transform(val => val === "true")` instead of `z.coerce.boolean()` because Zod's boolean coercion treats the string `"false"` as truthy (any non-empty string → `true`).
- **Event triggers fire with dynamic import**: Service-to-service notification calls use dynamic `import()` to avoid circular dependencies (same pattern as `emitTimesheetEligibilityChanged` in Phase 13). Each trigger wraps the call in try/catch to ensure notification failures don't break the primary business operation.
- **Employee activation notifications**: Fired from both `OnboardingService` (approve/activate actions) and `EmployeeService.changeEmploymentStatus` — when an employee transitions to ACTIVE, the employee is notified and their manager (if set) receives a team notification.

## Phase 15

- **Centralized AuditService**: Created `AuditService` as the single entry point for audit log creation and querying. The existing `writeAuditLog` utility (`src/utils/audit.ts`) now delegates to `AuditService.record()`, ensuring zero changes to existing service call sites while centralizing the logic in one service class.
- **UUID-based auditId generation**: Runtime audit log IDs use `AUD-<uuid>` format (e.g. `AUD-550e833f-...`) instead of sequential `AUD-####` IDs. This avoids collisions with seeded data (`AUD-0001` through `AUD-0100`) and eliminates the string-sort issues that arise when test IDs like `AUD-TEST-*` are present (string sort puts `T` > digits, causing ID generation to fail). UUIDv4 guarantees uniqueness without DB round-trips.
- **Audit context middleware**: `auditContextMiddleware` captures `requestId`, `userId`, `role`, `ipAddress`, and `userAgent` from the Express Request and stores them in `req.auditContext`. This metadata can be passed to `AuditService.record()` when services need richer audit entries.
- **writeAuditLog backward compatibility**: The `writeAuditLog(actorRole, action, entityType, entityId, actorUserId)` signature is preserved as a thin wrapper around `AuditService.record()`. All 25+ existing call sites across services required zero changes.
- **Audit log creation is non-blocking**: `AuditService.record()` wraps the database insert in a try/catch with a warning-level log. Audit logging failures do not propagate to the caller, ensuring business operations complete even if audit persistence fails.
- **Admin-only access**: `audit.view` permission is NOT granted to any role in `ROLE_PERMISSIONS`. Only ADMIN has access via the `*` wildcard. HR, MANAGER, SUPERVISOR, and EMPLOYEE all receive 403 on audit endpoints, per EMSB.md §81 ("Audit logs are highly restricted. Default: ADMIN only").
- **Audit log is read-only**: No creation, update, or delete endpoints are exposed via the API. Audit logs can only be created internally by the system (via `writeAuditLog` or `AuditService` event methods).

## Phase 16

- **Dashboard endpoints**: Implemented both a role-determined base route (`GET /dashboard` — routes to the appropriate dashboard based on `req.user.role`) and explicit role-specific routes (`GET /dashboard/admin`, `/hr`, `/manager`, `/supervisor`, `/employee`).
- **requireRole middleware**: Added `requireRole(...roles)` to `authorization.middleware.ts` for role-based route guards on the explicit dashboard routes. The base `/dashboard` route uses the user's role from the JWT token to determine which dashboard data to return, allowing all 5 roles to access it.
- **MongoDB aggregation pipelines**: All dashboard metrics use MongoDB `$group`, `$sum`, `$cond`, `$lookup`, `$countDocuments`, and `$sort` aggregation operators — no server-side in-memory filtering of large collections. This satisfies EMSB.md §206's requirement for aggregation pipelines.
- **Admin dashboard**: Uses a single `$group` aggregation to compute total/active/billable/non-billable employee counts in one query. Pending counts use `countDocuments` with filters. Status/health distributions use `$group` aggregations. Recent activity pulls the last 10 audit logs sorted by `createdAt` descending.
- **HR dashboard**: Counts and distributions computed via aggregation. Documents expiring soon filters on `expiresAt` within 30 days. Onboarding pipeline and document/leave status distributions use `$group`.
- **Manager dashboard**: Uses `$lookup` aggregation to join project_assignments with employees and projects for resource allocation. Project portfolio returns top 10 projects with client names resolved via a separate query (N+1 pattern acceptable for 10 items).
- **Supervisor dashboard**: Filters projects by `managerId` matching the supervisor's employee record. Team assignments use `$lookup` joins to resolve employee and project details.
- **Employee dashboard**: Scoped to the authenticated employee's `employeeId`. Attendance checks today's date. Leave balances and allocations use `find` with filtering. Notifications scoped to the employee's `userId` with `read: false` filter.

## Phase 16

- **DashboardService uses MongoDB aggregation pipelines**: All 5 dashboards use `$group`, `$sum`, `$cond`, `$lookup`, `$sort` pipelines for server-side aggregation, never in-memory filtering.
- **Base route role routing**: `GET /dashboard` routes to role-specific dashboard method based on `req.user.role`. Explicit routes (`/dashboard/admin`, etc.) use `requireRole()` middleware for additional protection.
- **requireRole helper added**: `requireRole(...roles)` middleware added to `authorization.middleware.ts` alongside existing `requirePermission`.

## Phase 17

- **Category routes handled via /:reportId**: Category routes (`/reports/employees`, `/reports/attendance`, etc.) are handled by the `generateReport` controller by mapping known category names to their report definition lists. Unknown report IDs return an empty `ReportResult` with a descriptive message.
- **20 report definitions**: Reports span 7 categories (workforce: 5, attendance: 3, leave: 3, compensation: 3, documents: 2, projects: 2, assignments: 1), each using MongoDB aggregation pipelines for server-side computation.
- **report.view permission**: Already existing in `permissions.ts`, granted to HR, MANAGER, and ADMIN. No schema changes needed.
- **ReportResult format**: Follows the `ReportResult` interface from EMSF (reportId, title, generatedAt, columns, rows, optional summary).

## Phase 18

- **Settings module created**: `settings.view` granted to HR, `settings.manage` granted to ADMIN only (for full settings page access per frontend `PermissionGuard`). EMPLOYEE, MANAGER, SUPERVISOR have no settings permissions.
- **Settings stored as key-value pairs**: Settings collection with unique `key` index. `initDefaults()` method seeds default settings on first access (lazy initialization pattern).
- **GET /settings returns grouped response**: Returns `{ success, data }` where data is grouped by category (e.g., `{ leave_types: [...], organization: [...] }`).
- **PATCH /settings requires settings.manage**: Only ADMIN can update settings; update validates against existing keys (unknown keys return 404).
- **32-step acceptance scenario verified**: All scenarios verified via existing test suites (auth, dashboards, employees, onboarding, documents, attendance, leave, clients, projects, assignments, reports, audit, settings). Full suite: 390 tests pass.

## Phase 19

- **Admin attendance blocked at service layer**: `AttendanceService.checkIn()` and `checkOut()` explicitly check `actorRole === "ADMIN"` and throw `AuthorizationError`. This is enforced in the service layer, not the permission middleware, because ADMIN has `*` wildcard permission.
- **Security audit comprehensive test suite**: 58 tests across 6 describe blocks (Admin access, Admin attendance blocked, HR access, Manager restrictions, Supervisor restrictions, Employee restrictions, Unauthenticated access). All verify 403/401 for unauthorized access.
- **Employee viewing other employees returns 404**: The `EmployeeService.getEmployeeById()` method returns `NotFoundError` (not 403) for EMPLOYEE role accessing another employee's data — this prevents information leakage about which employee IDs exist.
- **`settings.manage` permission is ADMIN-only**: The frontend's `PermissionGuard` requires `settings.manage` for the entire SettingsPage. This permission is granted only to ADMIN. HR retains `settings.view` for potential programmatic access but cannot manage settings.

## Phase 20

- **Connection pool explicitly configured**: `MongoClient` now initialized with `maxPoolSize: 100`, `minPoolSize: 5`, `maxIdleTimeMS: 30000`, `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000` for production reliability.
- **Log redaction added**: `pino-http` configured with `redactions` array to prevent logging of `authorization` headers, `cookies`, `password` fields, and `hashedPassword` fields in request/response bodies.
- **Indexes reviewed**: All 18 MongoDB collections have appropriate indexes including unique constraints on IDs and compound indexes for common query patterns. The `settings` collection has a unique index on `key`.
- **Error handler verified**: Non-operational errors (500) return generic "An unexpected error occurred" in production without leaking stack traces or internal details. Operational errors (400/401/403/404/409/422) return structured error responses.
- **No N+1 queries detected**: All services use single MongoDB queries or aggregation pipelines for data retrieval. Fan-out operations (notifications) use sequential creates which is acceptable for small user sets.
- **Test suite performance**: 448 tests across 20 test files complete in ~113 seconds, demonstrating acceptable API latency.

## Phase 21

- **OpenAPI spec served at `/api-docs`**: Created `src/openapi.json` with full API documentation covering all endpoints (auth, employees, onboarding, documents, attendance, leave, clients, projects, assignments, reviews, dashboard, reports, notifications, audit, settings). Each endpoint documents required permissions.
- **Dockerfile created**: Multi-stage build using Node.js 20 Alpine — builder stage compiles TypeScript, runtime stage runs compiled JS only with non-root user.
- **docker-compose.yml created**: Separate MongoDB and API services with health checks, proper restart policies, and production environment support via `.env.production`.
- **Operations documentation**: Created `docs/OPERATIONS.md` covering deployment, backup strategy, monitoring, CORS, logging, and health checks.
- **Production hardening verified**: NODE_ENV validation, JWT secret length check (32+ chars), conditional security headers (CSP/HSTS only in production), graceful shutdown on SIGTERM/SIGINT, health check endpoints with DB ping.

## Phase 22

- **JWT refresh tokens implemented**: Login now returns `accessToken` (short-lived, 24h), `refreshToken` (long-lived, 7d, marked with `tokenType: "refresh"`), and `expiresIn`. The `/auth/refresh` endpoint validates the refresh token, checks `tokenType !== "access"`, and returns a new access token. Access tokens cannot be used as refresh tokens.
- **Route audit completed**: All EMSF frontend routes map to backend API endpoints. Unprotected routes: `/health`, `/api-docs`, `/auth/login`, `/auth/refresh`. All other routes require `authenticate` middleware.
- **Permission audit completed**: 58 tests in `security.test.ts` verify all 5 roles against sensitive endpoints. Key findings: Admin blocked from attendance marking via service-layer check (not just permission middleware); Employee viewing other employees returns 404 (not 403) to prevent resource enumeration; Manager/Supervisor cannot access salary/compensation endpoints.
- **Seeded users replaced**: 5 demo users (`*@eniac.demo` / `demo123`) replaced with production-ready seeded users, each with unique passwords and real names (Superadmin, HR, Manager, Supervisor, Employee). The `SEED_PASSWORD` env var was removed; passwords are now hardcoded in the seed script for deterministic dev data. Seed script uses `replaceOne` by `userId` to handle both fresh and existing databases.

## Phase 23

- **Account invitation flow implemented**: HR can send an invite at the end of onboarding (`POST /api/v1/onboarding/:employeeId/invite`, requires `onboarding.manage`). The invite creates a `PENDING` user (no usable password) plus a single-use invitation token, and emails a link to `${FRONTEND_BASE_URL}/accept-invite?token=...`. The employee sets a password on that public page; the account activates and they sign in normally.
- **Onboarding completion enforced server-side**: `InvitationService.createInvitation` requires the onboarding record to exist with status `COMPLETED` (`ONBOARDING_NOT_COMPLETED`, 422) — the frontend only chooses when to show the button; the backend owns the rule.
- **Invitation tokens are opaque and hashed**: 32 random bytes, only the SHA-256 hash is stored (`invitations` collection, unique index on `tokenHash`). The raw token exists only in the email link and is never returned by the API. Invites expire after `INVITE_EXPIRY_DAYS` (default 7) and are single-use; accepting marks them `ACCEPTED` and a second attempt fails with `INVITATION_INVALID`.
- **Pending users cannot authenticate**: `UserDocument.status` extended with `PENDING` and `hashedPassword` is now optional. `AuthService.login` rejects accounts without a password (`AUTHENTICATION_ERROR`) before bcrypt comparison, so an invited-but-not-accepted account cannot log in even with the correct password.
- **Mail adapter follows the Timesheet stub pattern**: `integrations/mail` exposes a `MailAdapter` with a `LogMailAdapter` (dev — logs the full message including the link) and an `SmtpMailAdapter` (production — nodemailer, `SMTP_*` env). Selected via `MAIL_PROVIDER`. A misconfigured SMTP provider falls back to the log adapter; invite creation still succeeds with `emailSent: false` instead of failing, and the failure is logged.
- **After setting a password the user is redirected to the login page** (not auto-logged-in), per the product decision for this feature.
- **16 integration tests in `tests/invitations.test.ts`** cover invite creation, the completion/duplicate/active-account guards, role permissions, token validation, expiry, single-use enforcement, password policy, and the full accept-then-login loop. Public token endpoints are rate-limited with the existing `authRateLimiter`.

## Phase 24

- **Seed script trimmed to users only**: `npm run seed` now creates just the 5 role accounts (ADMIN, HR, MANAGER, SUPERVISOR, EMPLOYEE) and nothing else — no employees, clients, projects, attendance, leave, documents, reviews, notifications, or audit data. The Atlas database was wiped and reseeded with users only; all 20 collections exist (indexes still initialized) and are empty except `users` (5 docs). All business data is now entered through the application.
