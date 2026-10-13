# Implementation Errors & Technical Debt

## Phase 0

- **pino-pretty initially missing**: Attempted dev logging with `pino-pretty` transport without installing the package. Fixed by adding it as a dev dependency.
- **pino-http type import issues**: The `pino-http` ESM import caused TypeScript callable issues. Resolved by accessing the `.default` property through a type cast in `http-logger.ts`.
- **@types/bcrypt unavailable**: `@types/bcrypt` package does not exist for bcrypt v5 (bcrypt includes its own types). Removed from devDependencies.
- **@types/uuid version mismatch**: `@types/uuid@10.0.0` does not exist; corrected to `@types/uuid@^9.0.8`.
- **eslint flat config complexity**: Initial eslint config used top-level await which was problematic; simplified to a flat config without it.

## Phase 3

- **Initial DTO type reference error**: `EmployeeDetailDTO` referenced `EmployeeDTO["address"]` before `EmployeeDTO` had the `address` field. Fixed by defining `EmployeeDetailDTO` as a separate type with inline address/emergencyContact shapes.
- **Unused imports in controller**: `Permission`, `CreateEmployeeInput`, `ConflictError` were imported but unused; removed.
- **Lifecycle state transition design**: Initially had `RESIGNED → INACTIVE` only. After reviewing EMSB.md §18, added `RESIGNED → TERMINATED` to allow terminated status from resigned state, since termination is a terminal status that should be reachable from any non-terminal state.
- **Supervisor timesheet view**: SUPERVISOR has `timesheet.view` permission (via `ROLE_PERMISSIONS`), so they CAN view timesheet status. Test was updated to use `timesheet.provision` endpoint which SUPERVISOR cannot access.
- **Seed script hanging**: Sequential `insertOne` calls in seed script caused timeouts. Refactored to use `insertMany` with `{ ordered: false }` for bulk inserts.

## Phase 4

- **ADMIN wildcard not handled in authorization middleware**: `requirePermission` was using `ROLE_PERMISSIONS[role].includes(permission)` directly instead of the `hasPermission()` function. This meant ADMIN (which has `*` wildcard) could not access endpoints that required specific permissions. Fixed by using `hasPermission()` and `hasAnyPermission()` from `permissions.ts`.
- **Test parallelism conflicts**: All test files share the same MongoDB test database (`eniac_ems_test`). Running tests in parallel caused data conflicts between employee and onboarding test files. Fixed by setting `fileParallelism: false` in vitest config.

## Phase 5

- **Audit log unique index conflict**: The `audit_logs` collection has a unique index on `auditId`. Service-layer audit logging inserted documents without an `auditId` field, causing E11000 duplicate key errors (multiple docs with missing/null auditId). The error was swallowed by try/catch, so no audit logs were being written at all. Fixed by creating a shared `writeAuditLog()` helper in `src/utils/audit.ts` that generates a unique `AUD-####` id before insert. Applied to employee, onboarding, and document services.
- **Employee self-upload 404 in tests**: The employee test setup only created `EMP-DOC-*` employees, but the `employee@eniac.demo` user maps to `EMP-005` which had no employee record, causing upload/view tests to return 404. Fixed by seeding `EMP-001` through `EMP-005` employee records in the document test setup.
- **Schema file corruption**: A partial edit to `document.schemas.ts` left duplicate/broken code (a duplicated `reviewDocumentSchema` and orphaned fields). Rewrote the file cleanly.

## Phase 6

- **Non-deterministic check-in status**: Initially `checkIn` auto-derived LATE status based on current wall-clock time (>9:30am), making tests flaky (status was LATE when tests ran in the afternoon). Changed check-in to always set status `P` (present); HR sets LATE/other via the PATCH update endpoint.
- **Permission model mismatch for attendance**: EMSB.md §60 says "attendance applies to HR, Manager, Supervisor, Employee" but the §30 permission mapping only gave EMPLOYEE `attendance.mark` and HR attendance management permissions — Manager/Supervisor had no attendance permissions, causing 403 on list. Resolved by adding `attendance.view` to MANAGER and SUPERVISOR while keeping `attendance.mark` restricted to EMPLOYEE (only employees mark their own attendance; HR/Admin manage via PATCH).
- **HR cannot check in on behalf**: Initial tests assumed HR could check in on behalf of employees, but HR lacks `attendance.mark`. Rewrote tests so only the employee self-checks-in/out; HR/Admin use PATCH for management.

## Phase 7

- **HR cannot request leave**: Initial tests assumed HR could request leave on behalf of employees, but HR lacks `leave.request` (EMPLOYEE-only). Removed the HR-on-behalf test and seeded a leave request for a second employee directly in the test DB to verify IDOR (employee cannot view another's leave).
- **Route ordering for /leave**: `/leave/:requestId` would capture `/leave/balances` and `/leave/request` if registered first. Registered the static paths (`/balances`, `/balances/:employeeId`, `/request`) before the `:requestId` param route.

## Phase 8

- **ClientRepository.findMany missing industry filter**: The pre-existing `ClientRepository.findMany` only accepted `status`/`search`, but the service needed an `industry` filter. Extended the filter type and query to include `industry`.

## Phase 9

- **COMPLETED was terminal (archive failed)**: Initially `VALID_TRANSITIONS` had `COMPLETED: []`, so archiving a completed project returned 422. The checklist expects PLANNING → ACTIVE → COMPLETED → ARCHIVED, so added `CANCELLED` to COMPLETED's allowed transitions (archive = CANCELLED).
- **Employee project list 403 vs 200**: Initial test expected EMPLOYEE to get 403 on `GET /projects`, but EMPLOYEE has `project.view_self`. Fixed by allowing EMPLOYEE to list but filtering to only their assigned projects (via ACTIVE project_assignments).

## Phase 10

- **Route ordering for /assignments**: `/assignments/employee/:employeeId/allocation` must be registered before `/assignments/:assignmentId` so the static `employee` path is not captured as an `assignmentId`.
- **Unused imports**: Initial assignment routes imported `requirePermission` (unused) and service imported `toISO` (unused). Removed after typecheck flagged them.

## Phase 11

- **EMPLOYEE missing review.view_self**: The Permission type declared `review.view_self` but the EMPLOYEE role mapping did not include it, so employees got 403 on all review endpoints. Added `review.view_self` to the EMPLOYEE role in permissions.ts.

## Phase 12

- **Decimal128.isDecimal128 not available**: `Decimal128.isDecimal128()` is not a static method in the mongodb driver. Used `value instanceof Decimal128` instead for the type guard in the DTO converter.
- **Employee DTO type conflicts after Decimal128**: Widening the Employee model's `compensation.salary`/`billRate.amount` to `number | Decimal128` broke the employee service DTO (typed as `number`). Added a `moneyToNumber()` helper in the employee service to convert `Decimal128` → `number` for the DTO.
- **Bill rate unit "DAY" vs "DAILY"**: The employee seed and initial tests used unit `"DAY"`, but the compensation schema (and Employee model) use `"DAILY"`. Fixed the tests to use `"DAILY"` to match the schema contract.

## Phase 13

- **PROVISIONING missing from status enum**: The checklist status enum (NOT_ELIGIBLE/ELIGIBLE/PENDING/PROVISIONED/FAILED/DISABLED) omitted PROVISIONING, but the failure-handling section references "PROVISIONING → FAILED". Added `PROVISIONING` to the `TimesheetProvisioningStatus` union to model the transient in-flight state.
- **Employee controller timesheet methods unused**: After wiring the employee routes to the dedicated TimesheetController, the old placeholder methods (`getTimesheetStatus`, `provisionTimesheet`, `disableTimesheet`) on the employee controller became dead code. Removed them.

## Phase 14

- **z.coerce.boolean() treats "false" string as truthy**: Zod's `z.coerce.boolean()` converts any non-empty string to `true`, including `"false"`. This broke the `read=false` query filter. Fixed by using `z.enum(["true","false"]).transform(val => val === "true")` instead.
- **Test state leakage between test files**: When running the full test suite, the onboarding tests (`employees.deleteMany({})`) deleted all employee records including `EMP-005`, causing notification event tests to fail (employee not found, onboarding approval returning 422). Fixed by updating the notification test `beforeEach` to upsert EMP-005 with proper data and reset leave/onboarding collections.
- **Onboarding approve not triggering activation notification**: `approveOnboarding` and `activateOnboarding` in `OnboardingService` set employment status to ACTIVE via `EmployeeRepository.updateEmploymentStatus` (bypassing `EmployeeService.changeEmploymentStatus` which has the notification trigger). Added a dedicated `emitEmployeeActivated` helper in `OnboardingService` to fire the notification.
- **Circular dependency risk**: NotificationService is imported dynamically in event-emitting services to avoid circular imports (same pattern as Phase 13's timesheet eligibility event).
