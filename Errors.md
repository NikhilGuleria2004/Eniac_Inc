# Errors.md

## Technical Debt & Potential Issues

### Debt 1: Mock Authentication Replacement
**Issue:** The current mock authentication system will need to be replaced with real authentication when integrating the Hono backend.
**Risk:** Medium — The role context and permission system are designed with this in mind, but the login flow and session management will need careful refactoring.
**Mitigation:** Keep auth logic isolated in the `features/auth/` module. The permission helpers and role context should remain unchanged; only the auth provider needs replacement.
**Date Logged:** 2026-10-07

### Debt 2: Mock Data to API Migration
**Issue:** All data currently comes from mock repository functions. These will need to be replaced with actual API calls.
**Risk:** Medium — Repository pattern was chosen specifically to make this easier, but TypeScript interfaces must match backend schemas exactly.
**Mitigation:** Keep repository functions as the sole data access layer. When backend is ready, replace function bodies with API calls without changing component code.
**Date Logged:** 2026-10-07

### Debt 3: Date Handling
**Issue:** Mock data uses ISO strings internally. The UI displays dates as "07 Oct 2026" format. Timezone handling is not fully implemented.
**Risk:** Low-Medium — The spec mentions timezone display (section 114) but the initial shell may not fully address all timezone edge cases.
**Mitigation:** Use a consistent date formatting utility. When integrating with backend, ensure dates are stored and transmitted in UTC.
**Date Logged:** 2026-10-07

### Debt 4: Large Component Files
**Issue:** Some feature modules (e.g., employee profile with 9 tabs, onboarding with 8-step stepper) may result in large component files if not carefully split.
**Risk:** Low — Can be addressed during refactoring.
**Mitigation:** Extract tab content into separate files early. Keep container components small.
**Date Logged:** 2026-10-07

### Debt 5: Table Component Complexity
**Issue:** The DataTable component must support sorting, filtering, pagination, search, column visibility, row selection, bulk actions, empty states, loading states, error states, and responsive behavior.
**Risk:** Medium — This is a complex reusable component that could become difficult to maintain if not well-structured.
**Mitigation:** Build incrementally. Start with core features and add capabilities as needed by each module.
**Date Logged:** 2026-10-07

### Debt 6: Permission Boundary Enforcement
**Issue:** The spec has strict permission boundaries (e.g., salary visible only to ADMIN/HR, bill rates protected, audit logs admin-only).
**Risk:** Medium-High — A missed permission check in one component could expose sensitive data.
**Mitigation:** Centralize all permission checks. Use TypeScript types to restrict data access where possible. Perform thorough permission audits (Phase 22).
**Date Logged:** 2026-10-07

### Debt 7: Responsive Design Completeness
**Issue:** Mobile and tablet responsive behavior is secondary to desktop. Some complex pages (employee profile, onboarding detail) may not have fully optimized mobile layouts.
**Risk:** Low — The spec accepts that mobile doesn't need to replicate desktop density exactly (section 94).
**Mitigation:** Ensure core functionality works on all screen sizes. Polish mobile experience in Phase 21.
**Date Logged:** 2026-10-07

### Debt 8: State Management Scaling
**Issue:** React context is used for global state. As the app grows, context re-renders could become a performance concern.
**Risk:** Low — The initial shell is manageable with context. If performance issues arise, migrate to a more scalable solution.
**Mitigation:** Split contexts by domain (auth, notifications, ui) to minimize unnecessary re-renders.
**Date Logged:** 2026-10-07

### Debt 9: Timesheet Integration Boundary
**Issue:** The Timesheet platform is a separate application. The EMS must show Timesheet eligibility/provisioning status without implementing the Timesheet platform itself.
**Risk:** Medium — The boundary between EMS and Timesheet must remain clean.
**Mitigation:** Keep Timesheet-related UI as read-only status panels. Do not create any Timesheet CRUD operations in the EMS.
**Date Logged:** 2026-10-07

### Debt 10: Form Validation Consistency
**Issue:** Forms must have labels, required indicators, validation, helper text, error states, success states, disabled states, and loading states.
**Risk:** Low — Requires discipline to implement consistently across all forms.
**Mitigation:** Build form components with all states built-in. Reuse components rather than building custom forms per page.
**Date Logged:** 2026-10-07

### Debt 11: Recharts TypeScript Integration
**Issue:** Recharts v3 has strict TypeScript types for Tooltip formatters and Pie label functions. The formatter functions expect `ValueType | undefined` but the implementation used `number`. Pie label props have optional `percent` property.
**Risk:** Low — Build-time type errors that blocked compilation.
**Resolution:** Used `unknown` type with type assertions in formatter functions, and `any` for Pie label callback to match Recharts' internal `PieLabelRenderProps` type structure. Added eslint-disable comments for explicit any usage.
**Date Logged:** 2026-10-07

### Debt 12: Chart Component Reusability
**Issue:** Multiple chart components (WorkforceChart, StatusDistributionChart, EmployeeDistributionChart, LeaveStatusChart, DocumentStatusChart) have similar patterns but are implemented separately. This creates code duplication for Tooltip styling, Legend configuration, and ResponsiveContainer setup.
**Risk:** Low — Maintainability concern as chart requirements grow.
**Mitigation:** Consider extracting common chart configuration into shared utilities or a base chart component in future phases. Current separation keeps each chart focused on its specific data visualization needs.
**Date Logged:** 2026-10-07

### Debt 13: Audit Log Filtering for Activity Feeds
**Issue:** The Recent Client Activity feed in Manager Dashboard uses audit logs filtered by entity type (CLIENT, PROJECT, EMPLOYEE). This approach may not scale well when more entity types are added, and the filter logic is duplicated across dashboards (Admin Dashboard also uses audit logs).
**Risk:** Low — Current implementation works but could become inconsistent.
**Mitigation:** Consider creating a centralized activity feed utility or repository function that handles filtering and sorting of audit logs for different dashboard contexts.
**Date Logged:** 2026-10-07

### Debt 14: Supervisor Dashboard Entity Name Resolution
**Issue:** The Supervisor Dashboard uses inline helper functions (getEmployeeName, getProjectName, getClientName) to resolve IDs to display names. This pattern is duplicated across dashboards and should be centralized.
**Risk:** Low — Code duplication and inconsistent naming patterns across components.
**Mitigation:** Create a centralized entity resolution utility or extend the repository pattern to include name lookup functions. Consider React hooks for entity resolution.
**Date Logged:** 2026-10-07

### Debt 15: Employee Dashboard Attendance State Management
**Issue:** The Employee Dashboard's check-in/check-out state is managed locally with `useState` and does not persist across page refreshes or sync with the mock repository. In a real implementation, this would require API calls to record attendance.
**Risk:** Low — This is expected for the mock implementation. The UI demonstrates the interaction pattern correctly.
**Mitigation:** When replacing mock repositories with real API calls, the check-in/check-out actions will call the attendance API endpoints. The local state is sufficient for the frontend shell demonstration.
**Date Logged:** 2026-10-07

### Debt 16: Employee Dashboard Week Calculation Logic
**Issue:** The current week attendance calculation uses a simplified date offset approach that may not correctly handle week boundaries (e.g., month/year transitions). It assumes Monday as the first day of the week.
**Risk:** Low — Works for the mock demonstration. Real implementation would use proper date libraries or backend-computed attendance summaries.
**Mitigation:** Replace with a proper date utility (e.g., date-fns) or backend-provided weekly attendance data when integrating real APIs.
**Date Logged:** 2026-10-07

### Debt 17: Client Management Edit Flow
**Issue:** The Client Management module uses a modal for create/edit in the Dashboard page, but the Client Detail page does not have an edit action. Users must return to the dashboard to edit a client. This is a UX inconsistency.
**Risk:** Low — The modal-based edit works correctly from the dashboard. The detail page is primarily for viewing.
**Mitigation:** Consider adding an edit modal to the Client Detail page or a drawer-based edit in future phases. Current implementation follows the pattern established in Employee Management (edit in directory, view in profile).
**Date Logged:** 2026-10-08

### Debt 18: Client Detail Missing Project Assignment Action
**Issue:** The Client Detail page's Projects tab shows projects but lacks an "Assign Project" action to create new projects for that client. Users must navigate to the Projects module.
**Risk:** Low — Project creation is handled in the Projects module with client selection.
**Mitigation:** Add a "Create Project for this Client" action in the Projects tab that pre-fills the client ID in the project creation form. This would improve workflow efficiency.
**Date Logged:** 2026-10-08

### Debt 19: Project Detail Missing Milestone Data
**Issue:** The Project Progress tab mentions milestones but there is no milestone data in the mock data layer. The current implementation shows placeholder text.
**Risk:** Low — This is a placeholder for future milestone tracking. The mock data layer would need a `Milestone` type and repository function.
**Mitigation:** Add milestone data to the mock data layer and update the Progress tab to display actual milestones when the feature is needed.
**Date Logged:** 2026-10-08

### Debt 20: Project Detail Missing Recent Updates Data
**Issue:** The Project Progress tab mentions recent updates but there is no dedicated updates data source. The current implementation shows placeholder text.
**Risk:** Low — Could be addressed by filtering audit logs for project update actions.
**Mitigation:** Use audit logs filtered to PROJECT entity with UPDATE action to populate recent updates in the Progress tab.
**Date Logged:** 2026-10-08

### Debt 21: Project Assignment Auto-Save Pattern
**Issue:** The `createAssignment`, `updateAssignment`, and `deleteAssignment` repository functions automatically update the parent project's `teamSize` field. This works correctly for the mock implementation but could be inconsistent in a real API where the backend calculates teamSize.
**Risk:** Low — The repository layer should mirror what the backend does. When integrating with a real API, the backend may or may not update teamSize automatically.
**Mitigation:** Consider removing the teamSize auto-update from repository functions and computing it dynamically in the UI instead, to keep the mock layer closer to a real API contract.
**Date Logged:** 2026-10-08

### Debt 22: Review Create Flow — No Edit After Creation
**Issue:** The Review Management module only supports creating new reviews via modal. There is no edit-in-place flow for an existing review (e.g., updating rating or feedback after scheduling).
**Risk:** Low — The current scope covers review scheduling and acknowledgement. Editing review feedback after creation can be added later.
**Mitigation:** Add an edit modal to the Review Dashboard (similar to Client/Project edit patterns) and an acknowledge/edit button on the Review Detail page for reviewers.
**Date Logged:** 2026-10-08

### Debt 23: Review Acknowledgement Uses Page Reload
**Issue:** The Review Detail page's "Acknowledge Review" action calls `updateReview` and then `navigate(0)` (full page reload) to reflect the updated status. This is a coarse refresh pattern rather than optimistic UI updates.
**Risk:** Low — Functionally correct. The reload ensures the acknowledged state is reflected.
**Mitigation:** Use React Query or a state management hook to trigger optimistic updates and re-fetch review data without a full page reload.
**Date Logged:** 2026-10-08

### Debt 24: Reports Module — Mock Export Only
**Issue:** The Reports module's export functionality uses `alert()` to simulate CSV/PDF download. There is no actual file generation or download in the mock implementation.
**Risk:** Low — This is expected for a frontend shell. The export UI pattern is demonstrated but no actual file is produced.
**Mitigation:** Integrate with a real export library (e.g., `json2csv` for CSV, `jsPDF` for PDF) and backend export endpoints when moving to production.
**Date Logged:** 2026-10-08

### Debt 25: Reports — Limited Chart Coverage
**Issue:** The report chart view only supports Workforce (pie chart via StatusDistributionChart) and Leave (bar chart via LeaveStatusChart) categories. All other categories display a "Chart view available for Workforce and Leave reports" placeholder.
**Risk:** Low — Chart coverage can be expanded as needed. Table view is available for all reports.
**Mitigation:** Add bar/pie chart components for attendance, documents, projects, and assignments categories in a future iteration.
**Date Logged:** 2026-10-08

### Debt 26: Reports — No Date Range Parameter
**Issue:** The report data generation functions do not accept date range parameters. All reports return the full dataset without filtering by period.
**Risk:** Low — For a mock implementation this is acceptable. Real reports would need server-side date range filtering.
**Mitigation:** Add date range filters to the ReportDetailModal and pass them to `generateReportData` when integrating with real API endpoints.
**Date Logged:** 2026-10-08

### Debt 27: Notifications — Page Reload for State Updates
**Issue:** The Notification Center uses `window.location.reload()` after `markNotificationAsRead` and `markAllNotificationsAsRead` calls to sync with mock repository mutations. This is a coarse refresh pattern.
**Risk:** Low — Functionally correct and consistent with the Review module's acknowledge pattern.
**Mitigation:** Use React Query or a state management hook to trigger optimistic updates and re-fetch notification data without a full page reload.
**Date Logged:** 2026-10-08

### Debt 28: Notifications — No Persistence for Mark All As Read
**Issue:** The `markAllNotificationsAsRead` function mutates the mock array in-place but lacks an audit log entry. The action is not recorded in the audit trail.
**Risk:** Low — Notifications are ephemeral system-generated records. Audit logging is a nice-to-have enhancement.
**Mitigation:** Add an `addAuditLog` call in repository functions when critical notification state changes occur, consistent with other write operations.
**Date Logged:** 2026-10-08

### Debt 29: Audit Log — No Audit Write Operations
**Issue:** The Audit Log page is read-only. There is no `addAuditLog` repository function in `repositories.ts`. Audit entries are only present as static mock data and are never created during mock operations (e.g., employee updates, document approvals, assignment changes).
**Risk:** Low — The mock data demonstrates the audit trail UI correctly. Real implementation backends would generate audit entries.
**Mitigation:** Add an `addAuditLog` repository function and call it from other repository write functions (createEmployee, updateEmployee, approveLeave, etc.) to generate real-time audit entries.
**Date Logged:** 2026-10-08

### Debt 30: Settings — Mock Configuration Only
**Issue:** All settings sections (Users, Roles, Leave Types, Document Types, etc.) are mock configuration UIs with no persistence. Changes made via add/edit/delete buttons are not saved or reflected in mock data. There is no `updateSettings` or `createSetting` repository function.
**Risk:** Low — §61 explicitly states these can be "functional mock configuration pages" for the initial frontend shell.
**Mitigation:** Implement repository functions for settings management and connect them to actual backend API endpoints. Use a settings store or context to manage changes in memory.
**Date Logged:** 2026-10-08

### Debt 31: Settings — Demo Users Passwords Visible
**Issue:** The Users section in Settings displays a note about the demo password (`demo123`) for all accounts. In a real implementation, passwords should never be displayed or stored in plain text.
**Risk:** Low — This is a demo/development environment with mock data. Production systems use hashed passwords and never expose them.
**Mitigation:** Remove the password hint from the UI in production and use proper password hashing in the backend. The demo credentials note should only appear in development environments.
**Date Logged:** 2026-10-08

### Debt 32: Notifications/Reviews — Page Reload Pattern
**Issue:** The Notification Center and Review Detail page use `window.location.reload()` after state mutations to sync with mock repository data. This causes a full page refresh which is not optimal UX.
**Risk:** Low — Functionally correct but suboptimal user experience (loses scroll position, full re-render).
**Mitigation:** Implement a state management solution (React Query, Zustand, or Context API) to trigger optimistic UI updates without full page reloads.
**Date Logged:** 2026-10-08

### Debt 33: Phase 22 — Assignments & Profile Pages Are Placeholders
**Issue:** The `/assignments` and `/profile` routes are minimal placeholder pages. The Assignments page shows only a title; the Profile page shows only a title. These were added with `PermissionGuard` wrappers during the Phase 22 audit but lack functional content.
**Risk:** Low — The routes exist and are protected, but users navigating to them see empty pages.
**Mitigation:** Implement full assignment dashboard (list of assignments with status, employee/project info, dates) and profile page (user details, password change, notification preferences) as feature modules in subsequent phases.
**Date Logged:** 2026-10-08
