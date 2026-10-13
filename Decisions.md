# Decisions.md

## Decision 1: Frontend Stack
**Decision:** Use TypeScript + React + Tailwind CSS for the EMS frontend.
**Rationale:** Explicitly mandated in EMSF.md section 5.
**Date:** 2026-10-07

## Decision 2: Project Structure
**Decision:** Use the folder structure defined in EMSF.md section 96 (Frontend Architecture).
**Rationale:** Specified in EMSF.md as the recommended project structure.
**Date:** 2026-10-07

## Decision 3: Icon Library
**Decision:** Use Lucide React for all icons.
**Rationale:** EMSF.md section 92 explicitly recommends Lucide React.
**Date:** 2026-10-07

## Decision 4: Chart Library
**Decision:** Use Recharts for dashboard charts.
**Rationale:** EMSF.md section 93 recommends Recharts.
**Date:** 2026-10-07

## Decision 5: Mock Authentication Pattern
**Decision:** Implement mock authentication with demo user accounts (admin@eniac.demo, hr@eniac.demo, manager@eniac.demo, supervisor@eniac.demo, employee@eniac.demo) with password "demo123".
**Rationale:** EMSF.md sections 76, 126, 127 mandate specific demo accounts and mock auth for the initial frontend shell.
**Date:** 2026-10-07

## Decision 6: Role-Based Architecture
**Decision:** Implement 5 distinct roles (ADMIN, HR, MANAGER, SUPERVISOR, EMPLOYEE) with completely distinct dashboards and a development-only role switcher.
**Rationale:** EMSF.md sections 13-24 explicitly require role-specific dashboards and a development role switcher.
**Date:** 2026-10-07

## Decision 7: Permission System
**Decision:** Create a centralized permission system with helper functions like `hasPermission("employee.edit")` rather than scattering role checks throughout the application.
**Rationale:** EMSF.md section 105 explicitly mandates centralized authorization and prohibits scattered `if (role === "ADMIN")` checks.
**Date:** 2026-10-07

## Decision 8: Repository Pattern
**Decision:** Use repository/service functions (`getEmployees()`, `createEmployee()`, etc.) instead of direct array access in components.
**Rationale:** EMSF.md section 102 mandates mock repository pattern so future API replacement is straightforward.
**Date:** 2026-10-07

## Decision 9: Color System
**Decision:** Use the exact color values specified in EMSF.md section 5 (Deep Navy #0B1F3A, Secondary Navy #163A63, Accent Blue #1D4ED8, etc.).
**Rationale:** EMSF.md section 5 defines the complete color system with exact hex values.
**Date:** 2026-10-07

## Decision 10: No Dark Mode
**Decision:** Do not implement dark mode in the initial version.
**Rationale:** EMSF.md section 118 explicitly prohibits dark mode for the initial version.
**Date:** 2026-10-07

## Decision 11: Responsive Strategy
**Decision:** Use Tailwind breakpoints (sm, md, lg, xl, 2xl) with primary target at xl/2xl. Mobile sidebar becomes a drawer, tables become horizontally scrollable or card-based.
**Rationale:** EMSF.md sections 94, 129, 130 define responsive behavior and breakpoints.
**Date:** 2026-10-07

## Decision 12: State Management
**Decision:** Use React state/context for global state (current user, current role, sidebar state, notifications, mock data) without over-engineering.
**Rationale:** EMSF.md section 101 states initial frontend can use React state/context and warns against over-engineering.
**Date:** 2026-10-07

## Decision 13: File Location Convention
**Decision:** All frontend code lives inside the EMSF/ folder. Decisions.md and Errors.md live in the project root (/home/nikhil/EniacINC/).
**Rationale:** User instruction on 2026-10-07.
**Date:** 2026-10-07

## Decision 14: Phased Implementation
**Decision:** Build the project strictly following the 22 phases defined in EMSF.md sections 136-143. Do not mark phases complete until fully tested.
**Rationale:** EMSF.md section 136 mandates phased build approach with strict exit criteria.
**Date:** 2026-10-07

## Decision 15: Employee Lifecycle Representation
**Decision:** The onboarding stepper and UI must visually represent the complete employee lifecycle: Onboarding → Employment Details → Geography → Billing Classification → Documents → HR Review → Activation → Active → Project Assignment → Attendance/Leave → Reviews → Project Work → Timesheet Eligibility → Provisioning.
**Rationale:** EMSF.md section 142 defines the final user journey and lifecycle flow that must be reflected consistently.
**Date:** 2026-10-07

## Decision 16: Business Rule Enforcement
**Decision:** ACTIVE + BILLABLE = TIMESHEET ELIGIBLE. NON-BILLABLE = NOT AUTOMATICALLY PROVISIONED. These rules must be visually demonstrated in the UI.
**Rationale:** EMSF.md section 40 explicitly requires the frontend to demonstrate these business rules.
**Date:** 2026-10-07

## Decision 17: Minimal External Dependencies
**Decision:** Only add libraries explicitly specified in EMSF.md (React, TypeScript, Tailwind CSS, Lucide React, Recharts, and a router). Do not add additional libraries unless explicitly specified or asked.
**Rationale:** User instruction and EMSF.md focus on keeping the implementation close to the spec.
**Date:** 2026-10-07

## Decision 18: Chart Implementation Strategy
**Decision:** Implement dashboard charts using Recharts with deterministic mock data computation. Created reusable chart components (WorkforceChart, StatusDistributionChart) in `src/components/charts/`. Charts use the institutional color palette and follow the design system (borders over shadows, compact typography).
**Rationale:** EMSF.md sections 20, 93 require charts with labels, tooltips, legends, and accessible text context. Phase 4 specifically requires Workforce Overview (line chart) and Employee Status Distribution (donut chart).
**Date:** 2026-10-07

## Decision 19: HR Dashboard Chart Implementation
**Decision:** Implemented three new chart components for the HR Dashboard: EmployeeDistributionChart (tabbed donut charts for Country, Billing Status, Employment Status), LeaveStatusChart (vertical bar charts for Leave Types and Leave Status), and DocumentStatusChart (donut chart for Document Status). Used Tabs component for chart switching to maintain high information density.
**Rationale:** EMSF.md sections 21, 93 require Employee Distribution breakdowns, Leave metrics, Document metrics, and Review metrics with visualizations. Phase 5 checklist specifically requires Employee Distribution, Leave metrics, Document metrics, and Upcoming Reviews.
**Date:** 2026-10-07

## Decision 20: Manager Dashboard Chart Implementation
**Decision:** Implemented ProjectHealthChart component with tabbed views for Project Health (donut chart: On Track, At Risk, Delayed, Completed) and Project Status (vertical bar chart: Active, Planning, On Hold, Completed, Cancelled). Added Recent Client Activity feed using audit logs filtered for CLIENT, PROJECT, and EMPLOYEE entities. Project health/status data computed from mock projects.
**Rationale:** EMSF.md sections 22, 93 require Project Health status blocks (ON TRACK, AT RISK, DELAYED, COMPLETED) and Recent Client Activity feed. Phase 6 checklist specifically requires Project health and Client activity.
**Date:** 2026-10-07

## Decision 21: Supervisor Dashboard Enhancement
**Decision:** Enhanced Supervisor Dashboard with Recent Activity feed from audit logs (filtered for PROJECT, EMPLOYEE, and ATTENDANCE entities). Improved My Projects panel to show only assigned projects with client names. Enhanced Team Assignments table to display employee names and project names instead of IDs. Added helper functions for resolving entity names from mock data.
**Rationale:** EMSF.md section 23 requires Recent Activity panel and operational overview. Phase 7 checklist specifically requires Activity panel and improved data display.
**Date:** 2026-10-07

## Decision 22: Employee Dashboard Implementation
**Decision:** Implemented Employee Dashboard with comprehensive self-service features: Today's Attendance widget with check-in/check-out actions and live time display; weekly attendance view showing status for each weekday; Leave Balance section with progress bars for Paid, Sick, and Casual leave; My Projects table showing assigned projects with client, role, allocation, and health status; My Documents table with document type, status, upload date, and expiry; Notifications panel with unread count and color-coded notification types (Leave, Document, Project, Attendance). Used mock repositories for all data (attendance, leave requests, assignments, documents, notifications, projects, clients).
**Rationale:** EMSF.md section 24 and Phase 8 checklist require Attendance widget, Leave balance, Leave requests, Projects, Documents, and Notifications for the Employee self-service portal.
**Date:** 2026-10-07

## Decision 23: Client Management Implementation
**Decision:** Implemented Client Management module with Client Dashboard and Client Detail pages. Dashboard includes 5 KPIs (Total/Active/Prospect/Inactive Clients, Active Projects), search, 3 filters (Status/Country/Industry), and a DataTable with columns per §49 (Client/Client Code/Country/Primary Contact/Active Projects/Status/Created/Actions). Create/Edit modal with all required fields. Detail page has 4 tabs: Overview (progress bar, project table), Contacts (primary contact), Projects (full project list), Activity (audit log filtered to CLIENT entity). Pure logic in `clients.ts` for KPIs, filtering, project counts. Routes `/clients` and `/clients/:clientId` permission-gated (`client.view` all roles, `client.manage` ADMIN/MANAGER).
**Rationale:** EMSF.md section 49 and Phase 14 checklist require Client dashboard, table, search, filters, create/edit, profile (Overview/Contacts/Projects/Activity tabs), and client projects/activity.
**Date:** 2026-10-08

## Decision 24: Project Management Implementation
**Decision:** Implemented Project Management module with Project Dashboard and Project Detail pages. Dashboard includes 6 KPIs (Total/Active/Planning/At Risk/Completed/On Hold), search, 3 filters (Status/Client/Health), and a DataTable with columns per §50 (Project/Client/Manager/Team Size/Start/End/Progress/Status/Actions). Create/Edit modal with name, client, manager, supervisor, dates, status, health, description. Detail page implements §51: header with status/health badges + progress + Edit button, 6 tabs: Overview (§52 - description, project details, team statistics, sibling projects), Team (§53 - team members table with avatar + edit/remove actions), Progress (§54 - health status, milestones, recent updates), Assignments, Client (client info + projects), Activity (audit log filtered to PROJECT entity). Assignment modal with employee selection (filtered to active unassigned employees), role, allocation, dates, billable toggle, status. Repository functions: `getProjectsByClient`, `getProjectsByManager`, `createProject`, `updateProject`, `createAssignment`, `updateAssignment`, `deleteAssignment` (with automatic teamSize updates). Pure logic in `projects.ts`. Routes permission-gated (`project.view` all roles, `project.manage` ADMIN/HR/MANAGER, `assignment.manage` ADMIN/HR/MANAGER/SUPERVISOR).
**Rationale:** EMSF.md sections 50-55 and Phase 15 checklist require Project dashboard, table, filters, create/edit, profile with tabs, team management, progress visualization, and employee assignment with allocation.
**Date:** 2026-10-08

## Decision 25: Review Management Implementation
**Decision:** Implemented Review Management module with Review Dashboard and Review Detail pages. Dashboard includes 6 KPIs (Total/Scheduled/In Progress/Completed/Acknowledged/Avg Rating), search (employee/reviewer/period/strengths/improvement), 2 filters (Status/Review Period), and a DataTable with columns (Employee/Period/Reviewer/Rating/Review Date/Status/Actions). Create modal with employee selection (filtered to ACTIVE employees), reviewer selection (filtered to ADMIN/HR/MANAGER/SUPERVISOR roles), review period, review date, rating (1-5 stars with labels), strengths, improvement areas, goals, comments. Detail page implements §35 Review Tab: header with employee/reviewer/period/date info + status badge, 3 tabs (Overview with rating stars + review status with acknowledgement state + review details panel; Feedback with strengths/improvement areas/goals/comments; Activity with review timeline). Acknowledge button updates COMPLETED reviews to ACKNOWLEDGED status with `acknowledgedAt` timestamp. Added `acknowledgedAt` field to Review type. Repository functions: `getReviewById`, `getReviewsByReviewer`, `createReview`, `updateReview`. Pure logic in `reviews.ts` for KPIs, filtering, employee/reviewer resolution, rating labels, status colors. Routes permission-gated (`review.view` all roles, `review.manage` ADMIN/HR).
**Rationale:** EMSF.md sections 35 and 86 and Phase 16 checklist require Review dashboard, table, detail, review status, rating, strengths, improvement areas, goals, comments, and employee acknowledgement.
**Date:** 2026-10-08

## Decision 26: Reports Module Implementation
**Decision:** Implemented Reports module as a report center following §56. Created `src/features/reports/` with `ReportCenterPage.tsx` and `reports.ts` (pure logic). Report center displays cards grouped by 7 categories (Workforce, Attendance, Leave, Compensation, Documents, Projects, Assignments) with 16 report definitions per §57. Each report card opens a modal with tabbed interface (Table View / Chart View) and footer with CSV/PDF export selector, Print and Export buttons (simulated download with filename). `generateReportData()` function computes columns, rows, and summary for each report from all mock repositories (employees, attendance, leave requests, projects, assignments, documents, clients). Chart view uses existing `StatusDistributionChart` for Workforce reports and `LeaveStatusChart` for Leave reports. Added `hourlyRate` and `salary` optional fields to Employee type for compensation reports. Route `/reports` wired with `PermissionGuard` (`report.view` = ADMIN/HR/MANAGER).
**Rationale:** EMSF.md sections 56-57 and Phase 17 checklist require report center, workforce/attendance/leave/compensation/document/project/assignment reports, and export UI.
**Date:** 2026-10-08

## Decision 27: Notifications Module Implementation
**Decision:** Implemented Notification Center following §58. Created `src/features/notifications/` with `NotificationCenterPage.tsx` and `notifications.ts` (pure logic). Dashboard includes page header with unread count, "Mark All as Read" button, 4 KPI cards (Total/Unread/Read/System), search by title/description, 5-tab filter (All/Unread/Mentions/Approvals/System). DataTable with columns (Status/Type/Title/Description/Timestamp/Actions). Per-notification actions: mark as read (for unread), action URL link (external navigation), delete with confirmation modal. Repository functions: `getUnreadNotificationCount`, `markNotificationAsRead`, `markAllNotificationsAsRead`. Pure logic in `notifications.ts` for KPIs, filtering (5 filter types: all/unread/mentions/approvals/system), type labels/colors. All UI state updates use `window.location.reload()` to sync with mock repository mutations. Route `/notifications` wired with `PermissionGuard` (`notification.view` = all roles).
**Rationale:** EMSF.md section 58 and Phase 18 checklist require notification center, unread count, notification filters, read/unread state, notification actions, mark as read, and mark all as read.
**Date:** 2026-10-08

## Decision 28: Audit Log Module Implementation
**Decision:** Implemented Audit Log module as Admin-only page following §59. Created `src/features/audit/` with `AuditLogPage.tsx` and `audit.ts` (pure logic). Dashboard: admin-only badge, 4 KPI cards (Total Logs/Critical Actions/Active Users/Today), search by description/user/entity ID, 5 FilterBar filters (User/Role/Action/Entity/Date), DataTable with §59 columns (Timestamp/User/Role/Action/Entity/Entity ID/Description/IP/Actions). Clicking the Eye icon opens an activity detail modal showing full audit entry. Pure logic in `audit.ts` for KPIs, filtering (5 filters), unique user/role/action/entity extraction, color-coded action badges, entity labels, timestamp formatting. Replaced existing `RoleGuard`-based `/audit-log` route with `PermissionGuard` (`audit.view` = ADMIN only). Removed unused `RoleGuard` component from router. Verified: `tsc --noEmit` clean, `vite build` passes, zero `Math.random` in feature code.
**Rationale:** EMSF.md section 59 and Phase 19 checklist require audit dashboard, audit table, search, filters (entity/user/date), and activity detail. §59 explicitly states "Admin only."
**Date:** 2026-10-08

## Decision 29: Settings Module Implementation
**Decision:** Implemented Settings module as Admin-only configuration center following §61. Created `src/features/settings/SettingsPage.tsx` with sidebar navigation and 10 configuration sections: Users (demo credentials table), Roles & Permissions (role-to-permission mappings from `ROLE_PERMISSIONS`), Leave Types, Document Types, Employment Types, Countries, Departments, Designations (all with add/edit/delete buttons using existing constants), Notification Settings (toggle switches for email/in-app), and System Preferences (toggles for audit logging, RBAC, data protection + save button). Added `ROLES` array constant and exported `ALL_PERMISSIONS` as `PERMISSIONS` from `src/data/constants/index.ts`. Added `getMockUsers()` repository function wrapping `mockUsers`. Route `/settings` wired with `PermissionGuard` (`settings.manage` = ADMIN only per §61 "Admin only").
**Rationale:** EMSF.md section 61 and Phase 20 checklist require settings shell, users, roles, permissions, leave types, document types, departments, designations, employment types, countries, and notification settings. §61 states "Admin only" and notes these can be functional mock configuration pages.
**Date:** 2026-10-08

## Decision 30: Frontend Polish Implementation
**Decision:** Completed Phase 21 (Polish) across the EMS frontend shell. **Toasts:** Wired `ToastProvider` into `AppShell` for global toast availability; integrated `useToast` into Review Dashboard, Review Detail, Client Dashboard, Project Dashboard, Notification Center, and Reports Center. Replaced `alert()` calls with toast notifications. **Modal behavior:** Enhanced `Modal` component with Escape key handler and `stopPropagation` on modal content to prevent backdrop click bubbling. **Focus states:** Added `focus-visible` CSS outline styles for buttons, form inputs, and links. **Accessibility:** Verified Modal has `role="dialog"`, `aria-modal`, `aria-label`, and `aria-hidden` on backdrop. **Loading/error states:** Confirmed `DataTable` supports `loading` and `error` props with skeleton loaders. **Keyboard navigation:** Escape key on modal, logical tab order throughout.
**Rationale:** Phase 21 checklist requires responsive design, loading/empty/error states, validation, toasts, modal behavior, keyboard navigation, focus states, accessibility, and consistency reviews.
**Date:** 2026-10-08

## Decision 31: Route & Permission Audit (Phase 22)
**Decision:** Audited all application routes and permissions per Phase 22 checklist. **Route audit findings:** All 25 sidebar routes (Dashboard, Employees + CRUD, Onboarding + detail, Documents + detail, Attendance + detail, Leave + request/detail, Reviews, Clients + detail, Projects + detail, Assignments, Reports, Analytics, Notifications, Audit Log, Settings, Profile) now exist in the router with proper `PermissionGuard` wrappers. Added missing `/analytics` route (was in sidebar but absent from router) with `report.view` guard; added `PermissionGuard` (`profile.edit`) to `/profile` route. 404 catch-all and 403 forbidden pages are functional. **Permission audit findings:** ADMIN has all 31 permissions; HR has view access to most modules with no audit/settings; MANAGER has manage access to clients/projects/assignments with `billRate.view` but no `salary.view`; SUPERVISOR has project view + assignment manage, no client access; EMPLOYEE has self-service scope. Audit log (`audit.view`) restricted to ADMIN. Settings (`settings.manage`) restricted to ADMIN. All guarded routes use `PermissionGuard` for direct URL protection. Added `ANALYTICS` constant to `ROUTES`.
**Rationale:** Phase 22 checklist requires verifying every sidebar item has a valid route, every action has a destination, routes are permission-checked, and role permission coverage is correct. Route/permission gaps found and remediated.
**Date:** 2026-10-08
