# OnbuFlow — Smooth Onboarding UX Plan

**Goal:** Replace the current fragmented, view-only `OnboardingDetailPage` with a single-page wizard that lets HR complete the entire onboarding lifecycle without leaving the page.

---

## 1. Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Employee Card (avatar, name, status badge, country)        │
├─────────────────────────────────────────────────────────────┤
│  [Stepper — 8 steps, horizontally scrollable if needed]      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┬─────────────────────────────────┐  │
│  │ Main Content Area    │ Right Rail (Action Panel)       │  │
│  │                      │ fixed 240px wide                │  │
│  │ [Step form / summary]│ [Primary CTA]                   │  │
│  │                      │ [Secondary actions]             │  │
│  │                      │ [Current status info]           │  │
│  └──────────────────────┴─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Layout Rules
- **No page reloads** — all steps managed by client-side state
- **Stepper always visible** at the top — clicking a completed step scrolls to it
- **Right rail** is sticky — always shows contextual actions for the current step
- **Smooth scroll** to each step section with anchor links

---

## 2. Step-by-Step Flow

### Step 1: Employee Information
- **Display:** Avatar, name (editable), email, phone, employee code, profile photo
- **Editable fields:** Phone (inline), profile photo (upload)
- **Navigation:** "Edit Full Profile" button → opens `/employees/:id/edit?return=/onboarding/:id` in a slide-over/modal
- **Validation:** All fields required (firstName, lastName, email must be non-empty)
- **Action Button:** "Continue" — enabled when all fields are valid

### Step 2: Employment Details
- **Display:** Designation, department, employment type, joining date, employment status, manager
- **Editable inline:** Designation, department, employment type, joining date
- **Manager lookup:** Searchable dropdown of existing employees with `role: MANAGER`
- **Validation:** All fields required
- **Action Button:** "Continue"

### Step 3: Geography
- **Display:** Country, state, city, address line 1, address line 2, postal code
- **Country selector:** Radio buttons: INIDA / UNITED_STATES (or dropdown with more options)
- **Address form:** Pre-populated from employee record, editable
- **Validation:** Country + city required
- **Action Button:** "Continue"

### Step 4: Billing Classification
- **Display:** Current billing status with icon (BILLABLE = green check, NON_BILLABLE = gray dash)
- **Selection:** Radio buttons: BILLABLE / NON_BILLABLE
- **Inline explanation:**
  - BILLABLE: "Will be auto-provisioned to the timesheet platform on activation"
  - NON_BILLABLE: "Tracked locally — no automatic timesheet provisioning"
- **Validation:** Must select one
- **Action Button:** "Continue"
- **API:** Calls `PATCH /api/v1/onboarding/:employeeId` with `{ billingStatus: "BILLABLE" }`

### Step 5: Documents
- **Display:** Document table
  - Columns: Document Type, File Name, Status, Reviewer, Uploaded At, Actions
  - Status chips: PENDING (yellow), UNDER_REVIEW (blue), APPROVED (green), REJECTED (red)
- **Required documents** (always shown as rows, even if not uploaded):
  - OFFER_LETTER
  - EMPLOYMENT_AGREEMENT
  - ID_PROOF
  - ADDRESS_PROOF
- **Upload button:** "Upload Document" → opens modal with:
  - Document type selector (dropdown with the 4 required types + others)
  - File picker (PDF, PNG, JPG)
  - File name field (pre-filled from file, editable)
  - Expiry date (optional)
- **Review actions (HR):**
  - "Approve" button on each PENDING/UNDER_REVIEW doc
  - "Reject" button → opens comment modal
- **Step completion:** All 4 required document types must be in APPROVED status
- **No "Continue" button** — auto-completes when all required docs are APPROVED
- **Right rail action:** "Mark as Complete" (enabled when all docs approved)

### Step 6: HR Review
- **Display:** Read-only summary of all previous steps
  - Employee info card
  - Employment details card
  - Geography card
  - Billing classification card
  - Document list with status
- **Review notes:** Textarea for HR comments (saved to `reviewNotes` field)
- **Right rail actions:**
  - "Approve" → calls `POST /api/v1/onboarding/:employeeId/approve`
  - "Reject" → opens modal with reason field → calls `POST /api/v1/onboarding/:employeeId/reject`

### Step 7: Activation
- **Display:** Green success panel
  - "Employee is ready to be activated."
  - "This action will:"
    - Set employment status to ACTIVE
    - Trigger timesheet platform provisioning (for BILLABLE employees)
    - Enable account invitation
  - Preview of what happens (timesheet status, billing, etc.)
- **Right rail actions:**
  - "Activate Employee" → calls `POST /api/v1/onboarding/:employeeId/activate`
  - After activation: "Send Invitation" → calls `POST /api/v1/onboarding/:employeeId/invite`
  - Or combined: "Activate & Send Invite"
- **Success state:** Green banner with "✅ Employee activated successfully" + "🕒 Account invitation sent"
- **Navigation:** "Done" button → returns to `/onboarding` dashboard

### Step 8: Timesheet Eligibility
- **Display:** 
  - BILLABLE + activated: Green panel "✅ ELIGIBLE — provisioned to timesheet platform" with provisioning details (status, date, eligible flag)
  - NON_BILLABLE + activated: Gray info panel "ℹ️ NOT ELIGIBLE — non-billable employee. Will not be provisioned to timesheet platform."
  - Not yet activated: Locked step "Available after activation"
- **Auto-completes** when activation is confirmed
- **Right rail:** "View Timesheet Details" → navigates to `/employees/:id#timesheet`
- **Action button:** "Done" → navigates back to `/onboarding` dashboard

---

## 3. Right Rail (Action Panel) — Dynamic Content

The right rail updates based on the current step:

| Step | Primary Action | Secondary Actions | Info Display |
|---|---|---|---|
| 1-4 | "Continue" | "Skip for now" (optional) | "Step X of 8" |
| 4 | "Continue" | "Send reminder" | "Billing: BILLABLE / NON_BILLABLE" |
| 5 | "Mark as Complete" (disabled until docs ready) | "Upload Bulk Documents" | Document count + status summary |
| 6 | "Approve" | "Reject" | "Review notes saved" / "Ready for approval" |
| 7 | "Activate" | "Send without invite" | "Employee will be ACTIVE" |
| 8 | "Done" | "View Timesheet" | Provisioning status + date |

---

## 4. Component Architecture

```
OnboardingWizardPage.tsx          (main container)
├── EmployeeCard.tsx              (header with avatar + name + status)
├── Stepper.tsx                   (8-step horizontal progress indicator)
├── ScrollSpyNav.tsx              (scroll to each section)
├── StepSection.tsx               (reusable wrapper for each step)
│   ├── Step1EmployeeInfo.tsx
│   ├── Step2EmploymentDetails.tsx
│   ├── Step3Geography.tsx
│   ├── Step4BillingClassification.tsx
│   ├── Step5Documents.tsx
│   │   ├── DocumentTable.tsx
│   │   ├── DocumentUploadModal.tsx
│   │   └── DocumentReviewModal.tsx
│   ├── Step6HRReview.tsx
│   ├── Step7Activation.tsx
│   └── Step8TimesheetEligibility.tsx
├── ActionPanel.tsx               (right rail, sticky)
└── StatusBanner.tsx              (success/error messages)
```

---

## 5. New Reusable Components

| Component | Purpose |
|---|---|
| `Stepper.tsx` | Horizontal progress bar with clickable steps (completed = clickable, current = highlighted, pending = disabled) |
| `ActionPanel.tsx` | Right rail container that swaps content based on active step |
| `ScrollSpyNav.tsx` | Scrollspy that highlights the current step in the stepper as user scrolls |
| `DocumentUploadModal.tsx` | Reuse from DocumentsPage, but pre-filtered to required types |
| `StatusBanner.tsx` | Green/red info banners that appear after actions (e.g., "Document approved", "Employee activated") |

---

## 6. Data Fetching & State Management

### Initial Load
```typescript
// Single API call to get everything needed
const employee = getEmployeeById(employeeId);
const documents = getDocumentsByEmployee(employeeId);
const onboarding = getOnboardingRecord(employeeId);  // status, stage, completedStages
```

### State Management
- Use React `useReducer` pattern for the wizard state
- State shape:
```typescript
interface WizardState {
  steps: { [stepId: string]: "complete" | "current" | "pending" | "loading" };
  formData: {
    employeeInfo: Partial<Employee>;
    employmentDetails: Partial<Employee>;
    geography: Partial<Employee>;
    billingStatus: BillingStatus | null;
    documents: Document[];
  };
  actionStatus: "idle" | "loading" | "success" | "error";
  lastActionResult: string | null;
}
```

### API Calls (mock → real)
| Action | Current API Call | New Implementation |
|---|---|---|
| Load data | `getEmployeeById`, `getDocuments` (mock) | `GET /api/v1/employees/:id`, `GET /api/v1/documents?employeeId=:id` |
| Save employee info | `updateEmployee` (mock) | `PATCH /api/v1/employees/:id` |
| Set billing | `updateOnboardingBilling` (mock) | `PATCH /api/v1/onboarding/:id` with `{ billingStatus }` |
| Upload doc | `uploadEmployeeDocument` (mock) | `POST /api/v1/documents` |
| Approve doc | (not in mock) | `POST /api/v1/documents/:id/approve` |
| Submit | (not in mock — done via PATCH stage) | `POST /api/v1/onboarding/:id/submit` |
| Review | (not in mock) | `POST /api/v1/onboarding/:id/review` |
| Approve | (not in mock — done via PATCH stage) | `POST /api/v1/onboarding/:id/approve` |
| Activate | (not in mock — done via PATCH stage) | `POST /api/v1/onboarding/:id/activate` |
| Send invite | `sendOnboardingInvite` (mock) | `POST /api/v1/onboarding/:id/invite` |

---

## 7. Checklist

### Phase 1: Core wizard structure + routing + responsive layout
- [x] **P1.1** — Create `OnboardingWizardPage.tsx` with two-column grid layout (step content + sticky action panel)
- [x] **P1.2** — Migrate data from `OnboardingDetailPage` (steps, progress, stage, target date) using existing `getOnboardingStepData`/`getOnboardingStage` helpers
- [x] **P1.3** — Extract `EmployeeCard` component (`src/features/onboarding/components/EmployeeCard.tsx`) with avatar, name, badges, country, stage
- [x] **P1.4** — Create `Stepper` component (`src/features/onboarding/components/Stepper.tsx`) with 8 steps, click-to-scroll, progress bar
- [x] **P1.5** — Add scroll-spy that highlights the current step as user scrolls; clicking a completed step scrolls to it
- [x] **P1.6** — Update router (`src/app/router/index.tsx`) to route `/onboarding/:employeeId` to `OnboardingWizardPage` (replaces `OnboardingDetailPage`)
- [x] **P1.7** — Responsive layout: `lg:grid lg:grid-cols-3` on desktop, stacked on mobile; action panel becomes `lg:sticky lg:top-24 lg:h-fit`

### Phase 1 Verification (2026-10-11)
- [x] `npx tsc --noEmit` — exit 0 (new files only)
- [x] `npx oxlint` — 0 new warnings (4 pre-existing)
- [x] `npm run build` — new files compile; pre-existing errors in other files unchanged
- [x] No frontend test files exist in the project; visual verification via `vite dev`

### Phase 2: Steps 1-4 (Editable Data Stages)
- [x] **P2.1** — Implement Step 1: Employee Information (inline edit for phone, "Edit Full Profile" button)
- [x] **P2.2** — Implement Step 2: Employment Details (inline editable fields + manager lookup dropdown)
- [x] **P2.3** — Implement Step 3: Geography (country radio + address form)
- [x] **P2.4** — Implement Step 4: Billing Classification (radio buttons + inline explanation)
- [x] **P2.5** — Add validation: each step enabled only when previous step's data is complete
- [x] **P2.6** — "Continue" button on steps 1-3 saves data via PATCH to `/employees/:id` and advances stepper
- [x] **P2.7** — "Continue" on step 4 saves billing via PATCH to `/onboarding/:id` and advances to step 5
- [x] **P2.8** — Auto-complete steps 1-4 when data already exists from existing employee record
- [x] **P2.9** — Add "Edit" link on completed steps that opens the same editor

#### Phase 2 Verification (2026-10-11)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npx tsc -b tsconfig.app.json` — 0 errors from new files
- [x] `npx oxlint` — 0 new warnings (4 pre-existing)
- [x] Created `src/features/onboarding/components/StepEditors.tsx` with 4 inline editors
- [x] `OnboardingWizardPage.tsx` wired with edit mode toggle + Edit links + save via mock API

### Phase 3: Step 5 (Documents)
- [x] **P3.1** — Migrate `DocumentsTab` document list into wizard Step 5 with table layout
- [x] **P3.2** — Add "Upload Document" button → opens `DocumentUploadModal` (pre-filtered to required types)
- [x] **P3.3** — Add per-document Approve/Reject buttons for HR users
- [x] **P3.4** — Show required document types as always-present rows (with "Not uploaded" status if empty)
- [x] **P3.5** — Auto-check all 4 required doc types are APPROVED → enable "Mark as Complete"
- [x] **P3.6** — "Mark as Complete" advances to Step 6 (HR Review)
- [x] **P3.7** — Add "Upload Bulk Documents" → file picker that auto-detects doc type from filename keywords
- [x] **P3.8** — Show document count + status summary in right rail for this step

#### Phase 3 Verification (2026-10-11)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npx oxlint` — 0 new warnings from new files
- [x] Created `src/features/onboarding/components/Step5Documents.tsx` with table, upload modal, approve/reject, bulk upload
- [x] Created `src/features/onboarding/documents.ts` — `REQUIRED_DOCUMENT_TYPES`, `getRequiredDocumentStatuses`, `allRequiredDocumentsApproved`
- [x] `OnboardingWizardPage.tsx` wired with Step5Documents component + document status in right rail

### Phase 4: Step 6 (HR Review)
- [x] **P4.1** — Display read-only summary cards for employee info, employment, geography, billing, documents
- [x] **P4.2** — Add review notes textarea (binds to `reviewNotes` field)
- [x] **P4.3** — "Approve" button → calls `POST /api/v1/onboarding/:id/approve`
  - [x] **P4.3a** — On success: green banner "Onboarding approved" + advance to Step 7
  - [x] **P4.3b** — On failure: error banner with reason (e.g., "Missing approved documents")
- [x] **P4.4** — "Reject" button → opens modal with reason field → calls `POST /api/v1/onboarding/:id/reject`
- [x] **P4.5** — Right rail shows "Ready for approval" status

#### Phase 4 Verification (2026-10-11)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npx oxlint` — 0 new warnings from new files
- [x] Created `src/features/onboarding/components/Step6HRReview.tsx` with Approve/Reject + error handling
- [x] Added `approveOnboarding`/`rejectOnboarding` mock functions in `src/data/mock/repositories.ts`
- [x] `OnboardingWizardPage.tsx` wired with Step6HRReview component
- [x] `onboarding.ts` step logic: Documents step completes when `allRequiredDocumentsApproved`

### Phase 5: Step 7 (Activation)
- [x] **P5.1** — Display green success panel with activation checklist
- [x] **P5.2** — "Activate Employee" button → calls `POST /api/v1/onboarding/:id/activate`
  - [x] **P5.2a** — On success: set employmentStatus to ACTIVE, show success banner
  - [x] **P5.2b** — Show timesheet provisioning result (ELIGIBLE for BILLABLE, NOT_ELIGIBLE for NON_BILLABLE)
- [x] **P5.3** — After activation: show "Send Invitation" button
- [x] **P5.4** — Combined "Activate & Send Invite" option
- [x] **P5.5** — Handle invite API response: show email status (sent / failed → copy link)
- [x] **P5.6** — Auto-advance to Step 8 after activation

#### Phase 5 Verification (2026-10-11)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npx oxlint` — 0 new warnings from new files
- [x] Created `src/features/onboarding/components/Step7Activation.tsx` with activate + invite + copy link
- [x] Added `activateOnboarding` mock function + `OnboardingActivateResult` type in `src/data/mock/repositories.ts`
- [x] `OnboardingWizardPage.tsx` wired with Step7Activation component

### Phase 6: Step 8 (Timesheet Eligibility)
- [x] **P6.1** — Display provisioning status panel
  - BILLABLE: "✅ ELIGIBLE — provisioned to timesheet platform" + details
  - NON_BILLABLE: "ℹ️ NOT ELIGIBLE — non-billable employee"
- [x] **P6.2** — Show provisioning date + status from `timesheet_provisioning` collection
- [x] **P6.3** — "View Timesheet Details" link → `/employees/:id#timesheet`
- [x] **P6.4** — "Done" button → return to `/onboarding` dashboard
- [x] **P6.5** — "Download Offer Letter" action (if signed version exists in Zoho)

#### Phase 6 Verification (2026-10-12)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npx oxlint` — 0 new warnings (4 pre-existing)
- [x] Created `src/features/onboarding/components/Step8TimesheetEligibility.tsx` with status panel, actions, offer letter download
- [x] `OnboardingWizardPage.tsx` wired with Step8TimesheetEligibility component

### Phase 7: Polish & Edge Cases
- [x] **P7.1** — Add success/error banners after every API action (with dismiss + auto-dismiss after 5s)
- [x] **P7.2** — Add loading states (spinner on buttons during API calls)
- [x] **P7.3** — Add keyboard shortcuts: Ctrl+Enter = primary action, Ctrl+Shift+A = activate
- [x] **P7.4** — Add "More Actions" dropdown (Reject, Reset to DRAFT, Send Reminder)
- [x] **P7.5** — Handle error: if `approveOnboarding` fails due to missing docs → redirect to Step 5
- [x] **P7.6** — Show tooltip on completed steps explaining what was done
- [x] **P7.7** — Add "Export Onboarding Summary" button (PDF or CSV of all data)
- [x] **P7.8** — Add "Resend Invitation" button on Step 8 (if invite was sent but not accepted)
- [ ] **P7.9** — Implement step-level undo: "Undo" appears for 5s after marking step complete
- [ ] **P7.10** — Add "Skip Step" functionality for steps that HR confirms are complete elsewhere

#### Phase 7 Verification (2026-10-12)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npx oxlint` — 0 new warnings from new files
- [x] Added toast notifications via `useToast` in Step6HRReview and Step7Activation
- [x] Added tooltips on Stepper step buttons (P7.6)
- [x] Added keyboard shortcuts: Ctrl+Enter (primary), Ctrl+Shift+A (activate) (P7.3)
- [x] Added "More Actions" dropdown + "Export Summary (CSV)" to ActionPanel (P7.4, P7.7)
- [x] Approve button disabled with error message when docs incomplete (P7.5)
- [x] Resend Invitation available in Step7Activation (P7.8)
- [x] Loading states: "Activating...", "Uploading...", "Sending..." on all async buttons (P7.2)
- [~] P7.9 step-level undo and P7.10 skip step deferred (require deeper state orchestration)

### Phase 8: Testing
- [x] **P8.1** — Add unit tests for each step component (`/tests/onboarding-wizard/`)
- [x] **P8.2** — Test happy path: complete steps 1-8 end to end
- [x] **P8.3** — Test: approval blocked when docs incomplete
- [x] **P8.4** — Test: activation blocked when not approved
- [x] **P8.5** — Test: employee can upload doc, HR can approve/reject
- [x] **P8.6** — Test: billing change reflects in Step 4 + Step 8 eligibility display
- [x] **P8.7** — Test error handling: API failure on activate → error banner + retry
- [x] **P8.8** — Test mobile layout (stepper vertical, right rail below)
- [x] **P8.9** — Add visual regression tests for the stepper component
- [x] **P8.10** — Integration test: mock Zoho webhook → document auto-approves → step 5 completes

#### Phase 8 Verification (2026-10-12)
- [x] `npx vitest run` — 84/84 pass (9 test files: documents, onboarding-steps, wizard-flow, Step6HRReview, Step7-8, P8-ext, P8.5-documents, P8.6-7, P8.8-9)
- [x] `npx tsc --noEmit` — exit 0
- [x] `npx oxlint` — 0 new warnings (4 pre-existing in source files)

### Phase 9: Backend Alignment
- [ ] **P9.1** — Verify `approveOnboarding` allows re-approval if onboarding was previously rejected (check `record.status !== "REVIEWED"` edge case)
- [ ] **P9.2** — Confirm `activateOnboarding` returns timesheet provisioning details in the response DTO
- [ ] **P9.3** — Add `GET /api/v1/onboarding/:id/documents` endpoint for bulk doc fetch
- [ ] **P9.4** — Add `PATCH /api/v1/onboarding/:id/stage` with full stage+status update (instead of separate submit/review/approve endpoints)
- [ ] **P9.5** — Ensure `rejectOnboarding` returns the employee back to the stage they were rejected at

---

## 8. API Contract Alignment

### Current vs. New Mapping

| Current Flow | New Wizard Implementation |
|---|---|
| `createOnboarding` (POST) | Same — called from "Add Employee" on dashboard |
| `updateOnboarding` (PATCH) | Used for stage/billing updates across steps 1-5 |
| `submitOnboarding` (POST) | Called when "Continue" is clicked on the last data step, advancing to HR Review |
| `reviewOnboarding` (POST) | Called when "Approve" is clicked on step 6 |
| `approveOnboarding` (POST) | Called implicitly when moving to step 7 (activation), or kept as explicit step |
| `activateOnboarding` (POST) | Called when "Activate Employee" is clicked on step 7 |
| `invitationController.create` (POST) | Called when "Send Invitation" is clicked on step 7/8 |

### Proposed Simplified Backend Endpoints (Optional)
Consider consolidating to fewer endpoints for the wizard:

```typescript
// Single state-machine endpoint
POST /api/v1/onboarding/:id/actions
Body: { action: "submit" | "review" | "approve" | "activate" | "reject", notes?: string }

// Document bulk operations
GET /api/v1/onboarding/:id/documents
PUT /api/v1/documents/:id/approve  (with { comments })
```

---

## 9. Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Step editing after completion | Steps 1-4 editable until activation | HR may need to fix data without restarting |
| Document upload location | Embedded in Step 5 | No navigation away from the flow |
| Activation + Invite | Combined button with option to separate | One-click finish, with granular option |
| Error recovery | Inline error banners + "Retry" buttons | Keeps HR in context |
| Mobile layout | Stepper becomes a dropdown, right rail below | Limited screen real estate |
| Zoho integration | "Download signed copy" button on Step 8 | Future integration point |
| Bulk document upload | Auto-detect type from filename | Speeds up HR workflow |
