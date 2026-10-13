# CMSF.md

# Eniac Inc. — Client Management System + Timesheet Platform

## Frontend Shell & Mock Data Specification

**Document Type:** Frontend implementation specification
**Application:** Eniac Inc. Client Management System + Timesheet Platform (CMS)
**Version:** 1.0
**Status:** Implementation Ready
**Primary Objective:** Build a complete, production-quality frontend shell using mock data for the Client Management and Timesheet Platform.
**Frontend Stack:** TypeScript + React + Tailwind CSS
**Backend:** EMSB API (shared — same backend serves EMS and CMS)
**Database:** MongoDB Atlas (shared with EMS)

---

# 1. PURPOSE OF THIS DOCUMENT

This document is the authoritative frontend specification for the Eniac Inc. Client Management System + Timesheet Platform.

The coding agent implementing this specification MUST follow the layouts, information architecture, visual language, routes, role permissions, components, mock data structures, interactions, and phased implementation plan defined here.

The agent SHOULD NOT invent major UI patterns, navigation structures, pages, modules, workflows, or visual systems that are not defined in this document.

If a minor implementation detail is required but is not explicitly specified, choose the option that is:

1. Consistent with the existing EMSF design system.
2. Consistent with enterprise/government portal conventions.
3. Accessible.
4. Reusable.
5. Appropriate for a future production B2B SaaS / ERP platform.
6. Easy to replace with real API data later.

---

# 2. PRODUCT OVERVIEW

The Eniac Inc. Client Management System (CMS) is a professional B2B platform for client lifecycle management and employee time tracking.

The CMS manages:

* Client onboarding and lifecycle
* Project creation and management
* Project team assignments (billable employees)
* Daily work log entry (hours, description, overtime)
* Bi-monthly timesheet compilation and review
* Invoice generation from timesheet data
* Employee self-service for daily logs and timesheet status
* Manager/Admin review of timesheets
* Supervisor project progress monitoring

The CMS is one part of a larger Eniac Inc. ecosystem.

```text
                   ENIAC INC. ECOSYSTEM
                          |
        +------------------+----------------------------------+
        |                                                       |
        v                                                       v
EMPLOYEE MANAGEMENT (EMS)         CLIENT MANAGEMENT (CMS)
        |                          Timesheet Platform
        +-------------+-------------+
                      |
                Shared Data Layer
                 MongoDB Atlas
                      |
                      v
               EMSB Backend
        (Single backend serves both)
```

The frontend being built now is ONLY the CMS (Client Management + Timesheet).

The EMS frontend (EMSF) is a separate application on a different domain.

---

# 3. PRIMARY DESIGN PHILOSOPHY

The visual style MUST NOT be minimalist.

The application should feel like:

* A serious government procurement portal
* A large enterprise professional services automation system
* A mature consulting/client management platform
* A system used by an organization managing hundreds of clients and projects
* A system handling financial invoicing and time tracking

The design should communicate:

* Trust
* Authority
* Stability
* Precision
* Organization
* Security
* Professionalism

However, it must NOT feel:

* Old-fashioned
* Ugly
* Visually chaotic
* Overly decorative
* Like a legacy 1990s government website
* Like a consumer productivity app

The target aesthetic is:

> **Modern Government Portal + Enterprise PSA + Professional Services Dashboard**

The application should share the same design DNA as the EMS frontend (EMSF) — same color system, typography, spacing, and component language — but with a distinct visual identity that reflects its client/project/timesheet focus.

---

# 4. VISUAL DIRECTION

## 4.1 Design Density

Use a relatively high information density.

The interface should make efficient use of screen space.

Do NOT create:

```text
Huge whitespace
Huge cards
Large empty dashboard areas
Oversized typography
Minimal navigation
Single-metric dashboards
```

Instead use:

```text
Information-rich dashboards
Dense data tables
Compact cards
Clear sections
Tabs
Status badges
Summary panels
Side navigation
Contextual actions
Utility controls
```

The interface should look "full" but still be organized.

---

# 5. COLOR SYSTEM

Use a restrained institutional palette. The CMS adopts a distinct but related color scheme to the EMS — green-accented institutional palette instead of blue.

## Primary (Green Accents)

Deep forest green:
```text
#0F2B1D
```

Secondary green:
```text
#1A5F43
```

Accent green:
```text
#1A8A5A
```

Light institutional green:
```text
#E3F2E8
```

## Neutral Colors

Background:
```text
#F7F8FA
```

Surface:
```text
#FFFFFF
```

Border:
```text
#D7DCE3
```

Muted text:
```text
#667085
```

Primary text:
```text
#17202A
```

## Semantic Colors

Success:
```text
#16803C
```

Warning:
```text
#B7791F
```

Danger:
```text
#C53030
```

Information:
```text
#2563EB
```

Use semantic colors primarily for:

* Status badges
* Alerts
* Validation
* Progress states
* Notifications

Do NOT make the entire interface brightly colored.

---

# 6. TYPOGRAPHY

Use a highly readable enterprise UI font.

Preferred:
```text
Inter
```

Fallback:
```text
system-ui
sans-serif
```

Typography should be compact and professional.

Recommended hierarchy:
```text
Page title:        24px / 28px / 700
Section title:     17px / 22px / 650
Card title:        14px / 20px / 650
Body:              14px / 20px / 400
Small:             12px / 16px / 400
Table text:        13px / 18px / 400
Labels:            12px / 16px / 600
```

Avoid extremely large headings.

---

# 7. BORDER AND SHADOW SYSTEM

The platform should rely more heavily on borders than dramatic shadows.

Default border:
```text
1px solid #D7DCE3
```

Card shadow:
```text
0 1px 2px rgba(16, 24, 40, 0.04)
```

Hover shadow:
```text
0 2px 8px rgba(16, 24, 40, 0.08)
```

Border radius should remain conservative.

Preferred:
```text
4px
6px
8px
```

Use pill shapes primarily for status badges.

---

# 8. APPLICATION SHELL

The main application shell MUST have four structural areas:

```text
+-------------------------------------------------------------+
| GLOBAL HEADER                                                |
+----------------+--------------------------------------------+
|                |                                            |
|                |                                            |
| SIDEBAR        |              MAIN CONTENT                   |
|                |                                            |
|                |                                            |
|                |                                            |
+----------------+--------------------------------------------+
| STATUS / FOOTER BAR                                         |
+-------------------------------------------------------------+
```

---

# 9. GLOBAL HEADER

The header should remain visible throughout authenticated pages.

Height:
```text
64px
```

Background:
```text
#FFFFFF
```

Bottom border:
```text
1px #D7DCE3
```

Header contents:

### Left

* CMS logo/wordmark
* "Eniac Inc."
* "Client Management System"

### Center / flexible

Global search.

Search placeholder:
```text
Search clients, projects, invoices, timesheets...
```

### Right

* Notifications
* Help
* Current environment indicator
* User avatar
* User name
* Role
* Dropdown

Example:

```text
ENIAC INC.
Client Management System

[ Search clients, projects, invoices, timesheets... ]

                     [Bell] [Help] [DEMO]
                     [NI] Nikhil
                         Administrator v
```

For mock data, use:
```text
Environment: DEMO
```

rather than Production.

---

# 10. SIDEBAR

Width:
```text
248px
```

Collapsed width:
```text
68px
```

The sidebar should support:

* Expanded mode
* Collapsed mode

The sidebar should be dark forest green.

Suggested:
```text
#0F2B1D
```

Navigation text:
```text
#D9E2F0
```

Active item:
```text
#FFFFFF
```

Active background:
```text
#1A5F43
```

Accent indicator:
```text
#4CAF50
```

---

# 11. SIDEBAR STRUCTURE

The sidebar MUST change depending on the logged-in role.

Navigation sections should use uppercase small section labels.

Example:

```text
OVERVIEW

Dashboard

CLIENTS

Clients

PROJECTS

Projects
Assignments

TIMESHEETS

Daily Logs
Timesheets
My Timesheets

INVOICING

Invoices

REPORTING

Reports
Analytics

SYSTEM

Notifications
Audit Log
Settings

```

Not every role sees every section. The exact sidebar contents for each role are defined in §14-18.

---

# 12. GLOBAL TOP-LEVEL ROUTES

The frontend should support the following routes.

```text
/login

/dashboard

/clients
/clients/:clientId
/clients/:clientId/projects

/projects
/projects/:projectId
/projects/:projectId/assignments

/assignments

/timesheets
/timesheets/:timesheetId
/timesheets/my

/daily-logs
/daily-logs/new
/daily-logs/:logId
/daily-logs/:employeeId

/invoices
/invoices/:invoiceId
/invoices/new

/reports

/analytics

/notifications

/audit-log

/settings

/profile
```

Additional nested routes can be implemented where useful.

---

# 13. ROLE MODEL

The CMS shares the same 5 roles as EMS, but only certain roles are active participants:

| Role | CMS Access | Notes |
|------|-----------|-------|
| ADMIN | Full access | All capabilities, including invoice creation |
| HR | No access | HR is EMS-only; no CMS access |
| MANAGER | Full access | Client creation, project management, timesheet review |
| SUPERVISOR | Read/partial | Project progress, assignment management, timesheet review |
| EMPLOYEE | Self-service only | Daily logs, own timesheets, own projects |

Admin, Managers, Supervisors, and billable employees can access the CMS platform.

Non-billable employees cannot access the CMS (timesheet functionality is for billable employees only).

## Authentication

Same credentials work on both EMS and CMS:

* The EMSB backend issues JWT tokens valid for both platforms
* Login endpoint: POST https://eniac-inc-api.vercel.app/api/v1/auth/login
* CORS_ORIGIN must include the CMS frontend URL

For mock data, use the same demo accounts:

```text
admin@eniac.demo / demo123        → ADMIN
hr@eniac.demo / demo123            → HR (no CMS access)
manager@eniac.demo / demo123       → MANAGER
supervisor@eniac.demo / demo123    → SUPERVISOR
Employee@eniac.demo / demo123      → EMPLOYEE
```

HR users receive an "access denied" message if they attempt to access the CMS.

---

# 14. ROLE PERMISSION MATRIX

## ADMIN

Full access. Can do everything MANAGER can do, plus:

* Manage clients (create, edit, deactivate)
* Manage projects (create, edit, complete, cancel)
* Assign employees to projects
* Review daily logs
* Review and approve timesheets
* Create and send invoices
* View all timesheets
* View all assignments
* Generate reports
* View audit logs
* Manage system settings

## MANAGER

Can:

* View all clients
* Create clients
* Edit clients
* View all projects
* Create projects
* Edit projects
* Assign employees to projects (billable only)
* View all assignments
* View daily logs for their projects' employees
* Review daily logs
* Review and approve timesheets for their projects' employees
* View project progress
* View operational employee information (no salary/bill rate)
* Generate reports
* View notifications

Manager cannot:

* Create invoices
* Send invoices
* View audit logs
* Manage system settings
* View salary or bill rates

## SUPERVISOR

Can:

* View assigned projects
* View assigned team members
* Review project progress
* Assign employees to projects where permitted
* View daily logs for assigned projects
* Review daily logs
* Review timesheets for assigned projects
* View own profile
* View own notifications

Supervisor cannot:

* Create clients
* Create projects
* Create/invoice
* View audit logs
* Manage system settings
* View salary or bill rates
* Access other teams' data

## EMPLOYEE (Billable Only)

Can:

* View own dashboard
* View own profile
* Mark daily work logs (hours, description, overtime)
* View own daily logs
* View own timesheets
* Submit timesheets for review
* View assigned projects
* View notifications

Employee cannot:

* View other employees' logs
* View other employees' timesheets
* Create/edit clients
* Create/edit projects
* Create invoices
* Approve timesheets
* View reports
* View audit logs
* Manage settings

**NON-BILLABLE EMPLOYEES:** Cannot access the CMS at all. They remain EMS-only.

---

# 15. ROLE-SPECIFIC DASHBOARDS

Each role MUST have a distinct homepage.

Do NOT create one dashboard with only minor text changes.

The dashboards should reflect the role's responsibilities in the CMS context.

---

# 16. ADMIN DASHBOARD

Route:
```text
/dashboard
```

for ADMIN.

Page title:
```text
Administration Dashboard
```

Subtitle:
```text
Client management, projects, timesheets and financial overview
```

## Dashboard Layout

### Row 1 — KPI Cards

Six cards:

```text
Active Clients
Active Projects
Total Employees
Billable Employees
Unbilled Hours
Outstanding Invoices
```

Each card should include:

* Label
* Number
* Small trend indicator
* Supporting text
* Icon

### Row 2

Left:
```text
Client Distribution by Industry
```

Right:
```text
Project Health Overview
```

Use charts.

### Row 3

Three panels:

```text
Pending Invoice Actions
Recent Timesheet Submissions
Client Activity Feed
```

### Row 4

Large:
```text
Billable Resource Allocation
```

Columns:

```text
Employee
Current Project
Allocation
Bill Rate
Hours This Period
Status
```

### Row 5

```text
Recent System Activity
```

---

# 17. MANAGER DASHBOARD

Title:
```text
Manager Workspace
```

Subtitle:
```text
Your clients, projects and team timesheet status
```

## KPI row

```text
My Clients
Active Projects
Team Members
Unbilled Hours
Pending Timesheet Reviews
Projects At Risk
```

## Main sections

### My Projects

Large table:

```text
Project
Client
Team Size
Progress
Status
Health
Hours (Period)
Actions
```

### Team Timesheet Status

```text
Employee
Project
Billable Hours
Submitted
Status
Actions
```

Shows timesheet submission status for team members. Color-coded by overdue/on-time.

### Recent Client Activity

```text
Client
Action
Date
Status
```

### Resource Allocation

```text
Employee
Current Project
Allocation
Role
Billable
```

### Project Health

Status blocks:
```text
ON TRACK
AT RISK
DELAYED
COMPLETED
```

---

# 18. SUPERVISOR DASHBOARD

Title:
```text
Supervisor Workspace
```

Subtitle:
```text
Project oversight and operational monitoring
```

KPI cards:

```text
Assigned Projects
Team Members
Daily Logs Pending Review
Timesheets Needing Review
Projects Requiring Attention
```

Main panels:

```text
My Projects
Daily Logs Requiring Review
Team Timesheets
Recent Activity
Project Health
```

Supervisor should see operational information but NOT financial data (no invoicing, no rates).

---

# 19. EMPLOYEE DASHBOARD

Title:
```text
Timesheet & Project Portal
```

Subtitle:
```text
Welcome back, [Employee Name]
```

## Top section

```text
Today's Date
Week: Oct 13-19, 2026
```

## My Current Projects

Cards/table:

```text
Project
Client
Role
Allocation
Progress
Health
```

## Quick Log Entry

A prominent "Log Hours" button that opens a daily log entry modal for the current date.

## My Timesheet Status

```text
Current Period: Oct 1-15, 2026
Status: Draft
Logged Hours: 42 / 80
Billable Hours: 42
```

Progress bar showing progress toward the bi-monthly period.

## Recent Daily Logs

Table:

```text
Date
Project
Hours
Description
Overtime
Status
Actions
```

## My Notifications

```text
Type
Title
Message
Time
```

---

# 20. CLIENT MANAGEMENT MODULE

Route:
```text
/clients
```

## Client Dashboard

Page header:
```text
Client Management
```

Actions:
```text
+ New Client
Import
Export
Filters
```

Search:
```text
Search clients by name, code, industry, contact...
```

Filters:
```text
Status
Country
Industry
Client Tier
Created Date
```

KPI row:

```text
Total Clients
Active Clients
Prospects
Inactive Clients
Active Projects
```

## Client Table

```text
Client
Client Code
Country
Industry
Primary Contact
Active Projects
Status
Created
Actions
```

Each row includes:

* Client name with avatar/icon
* Status badge
* Action menu (View, Edit, Deactivate, More)

## Client Detail

Route:
```text
/clients/:clientId
```

Header:
```text
[Avatar]

Client Name

Client Code

ACTIVE / PROSPECT / INACTIVE

[Edit]
[New Project]
[More]
```

### Tabs

```text
Overview
Contacts
Projects
Invoices
Timesheets
Activity
```

#### Overview Tab

```text
Client Information
  Name
  Client Code
  Industry
  Country
  Client Tier
  Status
  Created Date

Client Status Progress
  Bar showing onboarding → active → inactive progression

Primary Contact
  Name, Email, Phone, Role

Active Projects
  List with project name, status, progress, team size

Financial Summary
  Total Invoiced
  Outstanding Balance
  Pending Invoices
  This Period Hours
```

#### Contacts Tab

Table:

```text
Name
Email
Phone
Role/Title
Department
Actions
```

#### Projects Tab

Table showing all projects under this client.

```text
Project
Code
Status
Progress
Team Size
Start Date
End Date
Budget
Actions
```

#### Invoices Tab

Table:

```text
Invoice
Period
Amount
Status
Issued Date
Due Date
Actions
```

#### Timesheets Tab

Table showing all timesheets for projects under this client.

```text
Employee
Period
Hours
Billable Amount
Status
Reviewed
Actions
```

#### Activity Tab

Audit-style feed filtered to CLIENT and related PROJECT entities.

```text
Timestamp
User
Action
Description
```

## Create/Edit Client Modal

Fields:

```text
Client Name
Client Code (auto-generated or manual)
Industry (dropdown)
Country (dropdown)
Client Tier (dropdown: ENTERPRISE, MID_MARKET, SMB, PROSPECT)
Primary Contact Name
Primary Contact Email
Primary Contact Phone
Primary Contact Role
Billing Address (line1, line2, city, state, postal code, country)
Shipping Address (optional, same as billing toggle)
Tax ID / VAT Number
Payment Terms (dropdown: NET_15, NET_30, NET_45, CUSTOM)
Status (dropdown: PROSPECT, ACTIVE, INACTIVE, SUSPENDED, CLOSED)
Notes
```

---

# 21. PROJECT MANAGEMENT MODULE

Route:
```text
/projects
```

## Project Dashboard

Page header:
```text
Project Management
```

Actions:
```text
+ New Project
Import
Export
Filters
```

Search:
```text
Search projects by name, code, client, manager...
```

Filters:
```text
Status
Client
Health
Manager
Start Date
End Date
```

KPI row:

```text
Total Projects
Active Projects
On Track
At Risk
Delayed
Completed
```

## Project Table

```text
Project
Client
Manager
Team Size
Start Date
End Date
Progress
Status
Health
Actions
```

Progress should use compact progress bars.

## Project Detail

Route:
```text
/projects/:projectId
```

Header:
```text
[Project Icon]

Project Name

Project Code

ACTIVE / PLANNING / ON_HOLD

ON TRACK / AT RISK / DELAYED

Progress: 65%

[Edit]
[New Assignment]
[More]
```

### Tabs

```text
Overview
Team
Assignments
Timesheets
Invoices
Activity
```

#### Overview Tab

```text
Project Information
  Name, Code, Client, Manager, Supervisor
  Start Date, End Date, Status, Health
  Progress, Budget, Description

Project Health
  Status blocks: ON TRACK, AT RISK, DELAYED, COMPLETED
  Timeline visualization

Milestones
  Table: Milestone, Target Date, Status, Owner

Recent Updates
  Table: Date, User, Action, Description
```

#### Team Tab

Table:

```text
Employee
Avatar + Name + Employee ID
Role on Project
Billable
Allocation %
Start Date
End Date
Actions
```

"Add Team Member" button opens an assignment modal.

#### Assignments Tab

```text
Employee
Role
Allocation %
Billable
Start Date
End Date
Status
Actions
```

Table of all project assignments with status management.

#### Timesheets Tab

Table:

```text
Employee
Period
Hours
Billable Amount
Status
Reviewed By
Actions
```

Shows all timesheet submissions for this project.

#### Invoices Tab

Table:

```text
Invoice
Period
Amount
Status
Issued Date
Due Date
Actions
```

#### Activity Tab

```text
Timestamp
User
Action
Entity
Description
```

Project-related audit log entries.

## Create/Edit Project Modal

Fields:

```text
Project Name
Project Code (auto or manual)
Client (dropdown — required)
Manager (dropdown — employee with MANAGER role)
Supervisor (dropdown — employee with SUPERVISOR role, optional)
Description (textarea)
Start Date
End Date
Status (dropdown: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED)
Health (dropdown: ON_TRACK, AT_RISK, DELAYED — auto-computed option)
Budget (number + currency)
Project Tier (dropdown: SMALL, MEDIUM, LARGE, ENTERPRISE)
Tags (multi-select or input)
Visibility (dropdown: INTERNAL, CLIENT_VISIBLE)
```

## Assignment Modal

Fields:

```text
Employee (searchable dropdown — filtered to ACTIVE billable employees)
Role on Project (autocomplete with tech roles: Java Developer, Frontend Developer, etc.)
Allocation % (0-100, with overallocation warning)
Billable (toggle — default true for CMS)
Start Date
End Date
Status (dropdown: ACTIVE, PENDING, ENDED)
Notes
```

---

# 22. ASSIGNMENTS MODULE

Route:
```text
/assignments
```

Page header:
```text
Project Assignments
```

Actions:
```text
Filters
```

Search:
```text
Search by employee, project, role, client...
```

Filters:
```text
Employee
Project
Client
Role
Status
Billable
```

Table:

```text
Employee
Project
Client
Role
Allocation %
Billable
Start Date
End Date
Status
Actions
```

---

# 23. TIMESHEET MODULE

Route:
```text
/timesheets
```

## Timesheet Dashboard

Page header:
```text
Timesheet Management
```

Actions:
```text
+ New Manual Entry
Filters
```

Search:
```text
Search timesheets by employee, project, period, status...
```

Filters:
```text
Employee
Project
Client
Period
Status
Reviewer
```

KPI row:

```text
Total Timesheets
Pending Review
Approved
Rejected
In Progress
Overdue
```

## Timesheet Table

```text
Employee
Period (e.g., Oct 1-15, 2026)
Project
Total Hours
Billable Hours
Status
Submitted Date
Reviewed By
Actions
```

Status can be:
```text
DRAFT
SUBMITTED
IN_REVIEW
APPROVED
REJECTED
REVISED
PAID
```

### Status transitions for the timesheet state machine:

```text
DRAFT → SUBMITTED → IN_REVIEW → APPROVED → PAID
                ↘ REJECTED → DRAFT (revised)
```

## Timesheet Detail

Route:
```text
/timesheets/:timesheetId
```

This is one of the most detailed pages in the CMS.

Header:
```text
[Timesheet Icon]

Timesheet #TS-XXXX

Employee Name (EMP-XXX)

Period: Oct 1-15, 2026

Status: SUBMITTED

[Approve]
[Reject]
[Download PDF]
[More]
```

### Tabs

```text
Overview
Daily Logs
Summary
Activity
```

#### Overview Tab

```text
Timesheet Information
  Employee
  Period (Start - End)
  Billing Period
  Total Days in Period
  Status
  Submitted Date
  Reviewed By
  Reviewed Date

Project Summary
  Project Name
  Client
  Bill Rate (if authorized)
  Total Billable Hours
  Total Billable Amount
```

#### Daily Logs Tab

Table showing all daily logs compiled into this timesheet:

```text
Date
Day
Project
Work Description
Regular Hours
Overtime Hours (Sat/Sun)
Total Hours
Billable
Billable Amount
Status
```

#### Summary Tab

```text
Hours Summary
  Regular Hours: XX
  Overtime Hours: XX
  Total Hours: XX

Financial Summary
  Total Billable Hours: XX
  Total Billable Amount: $XX.XX
  Currency: USD

Hourly Breakdown
  [Chart showing hours distribution across projects/days]
```

#### Activity Tab

```text
Timestamp
User
Action
Description
```

Timesheet-specific audit entries.

## Create/Edit Timesheet Modal

Only visible for MANUAL timesheet creation (typically Admin/Manager override).

Fields:

```text
Employee (dropdown)
Period Start (date picker — 1st of month or 16th)
Period End (date picker — 15th or month end)
Status (dropdown)
Notes
```

---

# 24. DAILY LOGS MODULE

Route:
```text
/daily-logs
```

## Daily Logs Dashboard

Page header:
```text
Daily Work Logs
```

Actions:
```text
+ New Log Entry
Filters
```

Search:
```text
Search logs by employee, project, date, description...
```

Filters:
```text
Employee
Project
Client
Date Range
Status
Billable
```

KPI row:

```text
Today's Logs
Pending Review
Week-to-Date Hours
Overtime Today
Missing Logs
```

## Daily Logs Table

```text
Employee
Date
Day
Project
Work Description
Regular Hours
Overtime Hours
Total Hours
Billable
Status
Actions
```

Day column shows weekday abbreviation (Mon, Tue, Wed, etc.).
Overtime applies only to Saturday and Sunday.

## Daily Log Entry Modal / Page

Route:
```text
/daily-logs/new
/daily-logs/:logId
```

Fields:

```text
Employee (dropdown — only self for EMPLOYEE role)
Date (date picker — defaults to today)
Day (auto-computed from date — Mon, Tue, etc.)
Project (dropdown — filtered to assigned projects)
Work Date (date)
Work Description (textarea — required, rich text optional)
Task Category (dropdown: Development, Testing, Review, Meeting, Design, Other)
Regular Hours (number — 0.25 increments, max 24)
Overtime Hours (number — only enabled if Saturday/Sunday; 0.25 increments)
Billing Type (dropdown: BILLABLE, NON_BILLABLE)
Status (dropdown: DRAFT, SUBMITTED — draft for EMPLOYEE self, submitted auto on submit)
Tags (optional)
Attachments (file upload — optional)
```

### Business Rules for Daily Logs:

1. An employee can only log hours for projects they are assigned to.
2. Overtime is only allowed on Saturdays and Sundays.
3. An employee cannot log more than 24 hours in a single day.
4. If the same employee has already submitted a log for the same date+project, prevent duplicate (merge or warn).
5. Once a timesheet containing this log is APPROVED, the log cannot be edited.
6. A log in a timesheet with status APPROVED or PAID is read-only.
7. Employees can edit their own DRAFT logs.
8. Reviewers can only edit logs via rejection (return to employee for revision).

## Daily Log Detail

Route:
```text
/daily-logs/:logId
```

Full detail view with edit capability (if editable), approval actions (if reviewer), and activity history.

---

# 25. MY TIMESHEETS (Employee Self-Service)

Route:
```text
/timesheets/my
```

Employee-facing page showing their own timesheets.

Page header:
```text
My Timesheets
```

Subtitle:
```text
View and submit your timesheet entries
```

## Timesheet List

```text
Period
Start - End
Total Hours
Billable Hours
Billable Amount
Status
Submitted Date
Actions
```

Each period shows:
```text
Oct 1-15, 2026
80 hours
72 billable
$1,440.00
SUBMITTED
Oct 16
[View]
```

## Current Timesheet Widget

A prominent widget showing the current billing period:

```text
Current Period: Oct 1-15, 2026

Days Remaining: 2

[ View Daily Logs ]
[ Submit for Review ] (if all daily logs complete and timesheet is DRAFT)
```

Progress bar showing days in period.

---

# 26. INVOICING MODULE

Route:
```text
/invoices
```

**Admin-only functionality.**

## Invoice Dashboard

Page header:
```text
Invoice Management
```

Actions:
```text
+ New Invoice
Import
Export
Filters
```

Search:
```text
Search invoices by number, client, period, status, amount...
```

Filters:
```text
Client
Status
Issue Date
Due Date
Period
PO Number
```

KPI row:

```text
Total Invoices
Draft
Sent
Paid
Overdue
Void
Total Billed (Period)
```

## Invoice Table

```text
Invoice #
Client
Invoice Date
Due Date
PO#
Subtotal
Tax
Total
Status
Actions
```

Status can be:
```text
DRAFT
SENT
PAID
OVERDUE
VOID
CANCELLED
PARTIAL
```

## Invoice Detail

Route:
```text
/invoices/:invoiceId
```

Header:
```text
Invoice #INV-000001

Client: SIE

Period: Oct 1-15, 2026

Status: DRAFT

Due Date: Oct 25, 2026

Balance Due: $70,460.00

[Send]
[Download PDF]
[Edit]
[More]
```

### Tabs

```text
Overview
Line Items
Source Data
Activity
```

#### Overview Tab

```text
[From Block (top right)]
Eniac Inc.
California
U.S.A
hr@eniacinc.com

[Large "INVOICE" header centered]

# INV-000001

[Bill To (left)]
Bill To:
SIE
2207 Bridgepointe Parkway
San Mateo
94404 CA
U.S.A

[Invoice Details (right)]
Invoice Date:  01 Jul 2026
Terms:         Due on Receipt
Due Date:      01 Jul 2026
P.O.#:         6300006436

Subject:
Professional Consulting

Financial Summary
  Sub Total:     $70,460.00
  Tax:           $0.00
  Total:         $70,460.00
  Balance Due:   $70,460.00

Payment Status
  Amount Paid:   $0.00
```

#### Line Items Tab

The line items table follows the professional services invoice format from the PDF:

```text
#
Item & Description
Qty
Rate
Amount
Actions
```

Each line item displays:

1. US Based AEM Developer — Qty: 1.00 — Rate: $23,400.00 — Amount: $23,400.00
2. EU Based Web Developer — Qty: 1.00 — Rate: $20,584.00 — Amount: $20,584.00
3. India-Based AEM Developer #1 — Qty: 1.00 — Rate: $6,240.00 — Amount: $6,240.00
4. India-Based AEM Developer #2 — Qty: 1.00 — Rate: $6,240.00 — Amount: $6,240.00
5. India-Based 24/7 Offshore Dev-ops personnel — Qty: 1.00 — Rate: $13,996.00 — Amount: $13,996.00

Below the table, totals summary (right-aligned):

```text
Sub Total:   $70,460.00
Total:      $70,460.00
Balance Due: $70,460.00
```

"Add Line Item" button for manual additions. Line items can be reordered via drag handle.

Line item editing uses an inline editor with:
```text
Description (text input)
Qty (number input, min 0, step 0.01)
Rate (number input, min 0, step 0.01, with currency)
Amount (auto-calculated = Qty × Rate, editable override)
```

#### Source Data Tab

Table showing the source timesheets that the invoice was generated from (for timesheet-derived invoices):

```text
Employee
Project
Period
Billable Hours
Bill Rate
Billable Amount
Timesheet Status
Actions
```

The "Pick from Timesheets" button opens a selector for choosing which approved timesheets to include.

For manually-created invoices, this tab shows the resource descriptions and their rates with an explanation of how rates were computed.

#### Activity Tab

```text
Timestamp
User
Action
Description
```

Invoice-related actions (created, sent, paid, voided, line item added, etc.).

## Create/Edit Invoice Wizard

A multi-step wizard that produces invoices matching the professional services format (see INV-000001.pdf).

### Step 1: Client & Period

```text
From (Company):
  Eniac Inc.  (non-editable — company info from settings)
  California
  U.S.A
  hr@eniacinc.com

Bill To:
  [Search client or select...]  ▼

Invoice Details:
  Invoice Number: [INV-2026-001]  (auto-generated / editable)
  P.O.#:         [                ]  (optional)
  Invoice Date:   [01 Jul 2026]  [Calendar]
  Terms:         [Due on Receipt ▼]
  Due Date:      [01 Jul 2026]  (auto-calculated from terms, editable)
  Subject:       [Professional Consulting]

Currency:         [USD ▼]
Tax Rate:         [  0] %   (default 0 — most professional services invoices have no tax)

Billing Period (optional — for timesheet-derived invoices):
  [ ] Auto-populate from timesheets
  Period Start: [       ]  (only shown if auto-populate enabled)
  Period End:   [       ]  (only shown if auto-populate enabled)

Notes:
  [                         ]

Terms & Conditions:
  [                         ]

[Auto-Populate from Timesheets]
[Continue]
```

The "Auto-Populate from Timesheets" button finds all approved timesheets for the selected client within the period and generates resource-type line items by grouping resources by geography + role (US Based Developer, EU Based Developer, India-Based Developer, etc.).

Manual line items can also be created directly in Step 2.

### Step 2: Line Items

Table of line items following the invoice format (# / Item & Description / Qty / Rate / Amount):

```text
#   Item & Description                    Qty    Rate       Amount     Actions
1   US Based AEM Developer                1.00   $23,400    $23,400    [✎] [✕]
2   EU Based Web Developer                1.00   $20,584    $20,584    [✎] [✕]
3   India-Based AEM Developer #1          1.00   $6,240     $6,240     [✎] [✕]
4   India-Based AEM Developer #2          1.00   $6,240     $6,240     [✎] [✕]
5   India-Based 24/7 Offshore Dev-ops     1.00   $13,996    $13,996    [✎] [✕]
                                                                  [+ Add Line Item]

  Sub Total:     $70,460.00
  Tax (0%):      $0.00
  Total:         $70,460.00
```

Row actions: Edit (✎), Remove (✕).
"Add Line Item" creates a blank row with editable Description, Qty, Rate fields; Amount auto-calculates.

Each line item row can be manually reordered by dragging.

### Step 3: Review & Send

Full invoice preview matching the PDF layout:

```text
[From block top-right]

[Large INVOICE header]

# INV-2026-001

[Bill To]
SIE
2207 Bridgepointe Parkway
...

[Invoice Details table]
Invoice Date:  01 Jul 2026
Terms:         Due on Receipt
Due Date:      01 Jul 2026
P.O.#:         6300006436

Subject: Professional Consulting

[Line items table]
#  Item & Description         Qty   Rate      Amount
1  US Based AEM Developer     1.00  $23,400   $23,400
2  EU Based Web Developer     1.00  $20,584   $20,584
3  India-Based AEM Developer #1  1.00  $6,240    $6,240
4  India-Based AEM Developer #2  1.00  $6,240    $6,240
5  India-Based 24/7 Dev-ops    1.00  $13,996   $13,996
                                            ---------
Sub Total:                              $70,460.00
Tax:                                    $0.00
Total:                                  $70,460.00
Balance Due:                            $70,460.00

Notes: Thanks for your business.

Actions:
[Save as Draft]  [Send via Email]  [Download PDF]
```

Actions:

```text
Save as Draft
Send via Email
Download PDF
```

Email composition modal (pre-populated with client contact, invoice attachment, standard template — includes From block, Bill To, line items, totals, and Notes).

---

# 27. TIMESHEET ELIGIBILITY & PROVISIONING PANEL

The CMS should display Timesheet eligibility status derived from the EMS backend.

Route:
```text
/employees/:employeeId#timesheet
```

Panel:

```text
Timesheet Integration

Eligibility:
ELIGIBLE / NOT_ELIGIBLE

Provisioning:
PROVISIONED / NOT_PROVISIONED

Last Sync:
07 Oct 2026, 09:42 AM

External Employee ID:
TS-20491
```

For mock data, show multiple states:

```text
Not Eligible
Eligible
Pending Provisioning
Provisioned
Provisioning Failed
```

The CMS uses the same eligibility rule as EMS: `ACTIVE + BILLABLE + onboarding complete`.

---

# 28. NOTIFICATIONS MODULE

Route:
```text
/notifications
```

## Notification Center

Dashboard KPIs:

```text
Total
Unread
Read
System
Mentions
Approvals
```

Search:
```text
Search notifications by title, description...
```

Tabs/Filters:

```text
All
Unread
Approvals
Timesheet
Project
System
```

Table:

```text
Status
Type
Title
Description
Timestamp
Actions
```

Notification types specific to CMS:

* `TIMESHEET_SUBMITTED` — a timesheet needs your review
* `TIMESHEET_APPROVED` — your timesheet was approved
* `TIMESHEET_REJECTED` — your timesheet was rejected
* `DAILY_LOG_REMINDER` — don't forget to log today
* `INVOICE_SENT` — invoice sent to client
* `INVOICE_PAID` — invoice payment received
* `PROJECT_ASSIGNED` — you've been assigned to a project
* `ASSIGNMENT_CREATED` — employee assigned to your project
* `CLIENT_CREATED` — new client onboarded

---

# 29. REPORTS MODULE

Route:
```text
/reports
```

Report center displaying cards grouped by category.

Categories:

```text
Workforce
Projects
Timesheets
Attendance
Invoices
Financial
Clients
Assignments
```

### Report Definitions

Each report card opens a modal with tabbed interface (Table View / Chart View).

**Workforce reports:**
```text
billable-utilization — Billable vs non-billable employee distribution
team-capacity — Resource allocation by project
project-staffing — Headcount per project
```

**Projects reports:**
```text
project-health — Project status and health distribution
project-progress — Progress by project
project-budget — Budget vs. logged hours
```

**Timesheets reports:**
```text
timesheet-submission-rate — Timesheet submission and approval rates
timesheet-hours — Total hours by period/employee/project
overtime-analysis — Overtime hours by period/day
```

**Attendance reports:**
```text
attendance-patterns — Attendance by day/employee
late-arrivals — Late arrival frequency
```

**Invoices reports:**
```text
invoice-status — Invoices by status
revenue-by-client — Revenue breakdown by client
revenue-by-project — Revenue breakdown by project
invoice-aging — Overdue invoice aging
```

**Financial reports:**
```text
payable-amounts — Total billable amounts per employee
billing-rate-summary — Average/lowest/highest bill rates
```

**Clients reports:**
```text
client-size-distribution — Project count or revenue by client tier
```

**Assignments reports:**
```text
resource-utilization — Allocation percentage by employee
overallocated-employees — Employees over 100% allocation
```

---

# 30. ANALYTICS DASHBOARD

Route:
```text
/analytics
```

High-level visualizations across clients, projects, timesheets, and financials.

## KPI Cards

```text
Monthly Recurring Revenue (MRR)
Total Billable Hours
Revenue Per Employee
Client Retention Rate
Project Success Rate
Average Payment Cycle (days)
```

## Charts

```text
Revenue Trend (line chart) — monthly revenue over time
Project Distribution (donut) — by status/health
Timesheet Submission Rate (bar) — by period/employee
Top Clients by Revenue (bar) — ranked
Resource Utilization (bar) — allocation heatmaps
```

---

# 31. AUDIT LOG MODULE

Route:
```text
/audit-log
```

Admin-only (ADMIN and MANAGER can access).

Same structure as EMS audit log but includes CMS-specific actions:

Additional audit actions:
```text
client.created
client.updated
project.created
project.activated
project.completed
invoice.created
invoice.sent
invoice.paid
invoice.voided
assignment.created
assignment.ended
timesheet.submitted
timesheet.approved
timesheet.rejected
daily_log.created
daily_log.updated
```

---

# 32. SETTINGS MODULE

Route:
```text
/settings
```

Admin-only. Same structure as EMS settings, with CMS additions:

```text
Users
Roles & Permissions
Leave Types
Document Types
Employment Types
Countries
Departments
Designations
Industries
Client Tiers
Project Tiers
Billing Periods
Payment Terms
Invoice Templates
Notification Settings
System Preferences
```

### Invoice Templates

Configure:
```text
Logo Upload
Primary Color
Secondary Color
Footer Note
Terms & Conditions
Payment Instructions
Tax Settings
```

### Billing Periods

Configure:
```text
Period Type (BI_MONTHLY)
First Period Start: Oct 1
Second Period Start: Oct 16
Cut-off day for submission
Auto-generation schedule
```

### Payment Terms

Configure:
```text
Name (e.g., Net 15, Net 30)
Days
Description
Default
```

---

# 33. PROFILE MODULE

Route:
```text
/profile
```

Same structure as EMS profile, with CMS-specific additions:

Tabs:
```text
Profile
Security
Notifications
CMS Preferences
```

### CMS Preferences Tab

```text
Default Dashboard View
Timesheet Period Default
Daily Log Reminders
Notification: Timesheet Due
Notification: Invoice Sent
Display Mode (Light only in v1 — no dark mode per EMSF.md §118)
```

---

# 34. DATA TYPES

Type definitions for the CMS frontend. These extend the shared EMS types and add CMS-specific entities.

```typescript
// Tech roles for assignments (from info.txt: "assigned a tech role")
export type TechRole =
  | "Java Developer"
  | "Frontend Developer"
  | "Backend Developer"
  | "Full Stack Developer"
  | "DevOps Engineer"
  | "QA Engineer"
  | "UI/UX Designer"
  | "Project Manager"
  | "Business Analyst"
  | "Technical Lead"
  | "Scrum Master"
  | "Data Engineer"
  | "Solution Architect";

// Shared EMS employee fields (mirrors EMSF src/types/index.ts Employee and
// EMSB src/models/employee.ts), so the CMS type system is self-contained
// without importing the EMS frontend types.
export interface BaseEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  workMail?: string;
  phone: string;
  avatar?: string;
  designation: string;
  department: string;
  country: string;
  state?: string;
  city: string;
  employmentStatus: "ONBOARDING" | "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "RESIGNED" | "TERMINATED" | "INACTIVE";
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  billingStatus: "BILLABLE" | "NON_BILLABLE";
  hourlyRate?: number;
  salary?: number;
  compensation?: { currency?: string; salary?: number; payFrequency?: "MONTHLY" | "YEARLY" | "HOURLY" };
  joiningDate: string;
  managerId?: string;
  supervisorId?: string;
  timesheetEligibility: "NOT_ELIGIBLE" | "ELIGIBLE" | "PENDING_PROVISIONING" | "PROVISIONED" | "PROVISIONING_FAILED";
  role: "ADMIN" | "HR" | "MANAGER" | "SUPERVISOR" | "EMPLOYEE";
  createdAt: string;
  updatedAt: string;
}

// Extends the EMS Employee type with techRole
export interface Employee extends BaseEmployee {
  techRole?: TechRole;
  billRate?: {
    currency: string;
    amount: number;
    unit: "HOURLY";
  };
}

// Client
export interface Client {
  id: string;
  clientCode: string;
  name: string;
  country: string;
  industry: string;
  clientTier: "ENTERPRISE" | "MID_MARKET" | "SMB" | "PROSPECT";
  status: "PROSPECT" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CLOSED";
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    role?: string;
  };
  contacts?: Contact[];
  billingAddress: Address;
  shippingAddress?: Address;
  taxId?: string;
  paymentTerms: "NET_15" | "NET_30" | "NET_45" | "NET_60" | "CUSTOM";
  notes?: string;
  activeProjectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

// Project (extends EMS Project with budget + client info)
export interface Project {
  id: string;
  projectCode: string;
  name: string;
  clientId: string;
  clientName: string;
  managerId: string;
  supervisorId?: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED";
  budget?: number;
  budgetCurrency?: string;
  teamSize: number;
  billable: boolean;
  tags?: string[];
  visibility: "INTERNAL" | "CLIENT_VISIBLE";
  createdAt: string;
  updatedAt: string;
}

// ProjectAssignment (extends EMS with techRole + billRate)
export interface ProjectAssignment {
  id: string;
  employeeId: string;
  projectId: string;
  role: TechRole;
  allocation: number;
  startDate: string;
  endDate?: string;
  billable: boolean;
  status: "ACTIVE" | "PENDING" | "ENDED";
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

// DailyLog — NEW to CMS
export interface DailyLog {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  workDate: string;
  dayOfWeek: string; // "Mon", "Tue", ...
  taskCategory: "DEVELOPMENT" | "TESTING" | "REVIEW" | "MEETING" | "DESIGN" | "OTHER";
  description: string;
  regularHours: number;
  overtimeHours: number; // Only Sat/Sun
  totalHours: number;
  billable: boolean;
  billingType: "BILLABLE" | "NON_BILLABLE";
  status: "DRAFT" | "SUBMITTED" | "LOCKED";
  timesheetId?: string; // Parent timesheet once compiled
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

// Timesheet — NEW to CMS
export interface Timesheet {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: string; // 1st of month or 16th
  periodEnd: string;   // 15th or last day
  periodLabel: string; // "Oct 1-15, 2026"
  billingPeriod: number; // 1 or 2
  year: number;
  month: number;
  totalDays: number;
  totalBillableHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalNonBillableHours: number;
  totalHours: number;
  billableAmount: number;
  currency: string;
  status: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISED" | "PAID";
  submittedAt?: string;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedAt?: string;
  paidAt?: string;
  dailyLogIds: string[];
  projectBreakdown: TimesheetProjectBreakdown[];
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetProjectBreakdown {
  projectId: string;
  projectName: string;
  employeeBillRate: number;
  billableHours: number;
  billableAmount: number;
}

// Invoice — NEW to CMS
// Matches the professional services invoice format (see INV-000001.pdf):
// resource-type line items with Qty × Rate = Amount, optional tax, no tax by default.
export interface Invoice {
  id: string;
  invoiceNumber: string;     // INV-2026-001
  clientId: string;
  clientName: string;
  clientCode: string;
  clientAddress?: Address;   // from client record
  poNumber?: string;         // Purchase order number
  subject: string;           // e.g. "Professional Consulting"
  periodStart?: string;      // optional — for timesheet-derived invoices
  periodEnd?: string;        // optional — for timesheet-derived invoices
  periodLabel?: string;      // optional — e.g. "Oct 1-15, 2026"
  issueDate: string;
  dueDate: string;
  currency: "USD" | "INR" | "EUR" | "GBP" | "CAD";
  paymentTerms: "NET_15" | "NET_30" | "NET_45" | "NET_60" | "CUSTOM" | "DUE_ON_RECEIPT";
  taxRate: number;           // percentage, e.g. 10; defaults to 0 (no tax)
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID" | "CANCELLED" | "PARTIAL";
  lineItems: InvoiceLineItem[];
  timesheetIds?: string[];   // Source timesheets (for timesheet-derived invoices)
  notes?: string;
  termsAndConditions?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  sentBy?: string;
  paidAt?: string;
}

// Line items follow the professional services invoice format:
// # | Item & Description | Qty | Rate | Amount
// Qty typically represents the time period (e.g., 1.00 = one month/period)
export interface InvoiceLineItem {
  id: string;
  description: string;       // e.g. "US Based AEM Developer"
  quantity: number;          // e.g. 1.00
  rate: number;              // e.g. 23400.00
  amount: number;            // quantity × rate
  currency?: string;
  employeeId?: string;       // linked employee (if resource-based)
  employeeName?: string;
  projectId?: string;        // linked project (if resource-based)
  projectName?: string;
  manual: boolean;           // true if added manually, false if auto-generated
  sortOrder: number;         // line item ordering
}

// InvoiceTemplate
export interface InvoiceTemplate {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  footerNote?: string;
  termsAndConditions?: string;
  paymentInstructions?: string;
  taxSettings?: {
    defaultRate: number;
    label: string;
  };
  isDefault: boolean;
}
```

---

# 35. MOCK DATA STRATEGY

All CMS data uses the same mock repository pattern as EMSF.

Create `src/data/mock/repositories.ts` with functions returning typed data arrays.

Key principle: **mock data must demonstrate the full range of states** — not just happy-path "everything approved."

Data files:
```text
src/data/mock/
  index.ts
  clients.ts
  projects.ts
  assignments.ts
  dailyLogs.ts
  timesheets.ts
  invoices.ts
  invoiceTemplates.ts
  constants.ts
  repositories.ts
```

Seed data should include:

* 20 clients (mix of PROSPECT, ACTIVE, INACTIVE)
* 30 projects (mix of PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED)
* 50 assignments (across projects and employees)
* 300 daily logs (covering multiple periods, days, overtime on weekends)
* 100 timesheets (mix of DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, PAID)
* 25 invoices (mix of DRAFT, SENT, PAID, OVERDUE, VOID)
* 5 invoice templates

### Bi-monthly timesheet period logic

Periods defined:
* Period 1: 1st - 15th of month
* Period 2: 16th - last day of month (28/29/30/31)

```typescript
function getBillingPeriod(date: Date): { start: string; end: string; period: number } {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  if (day <= 15) {
    return {
      start: `${year}-${String(month + 1).padStart(2, "0")}-01`,
      end: `${year}-${String(month + 1).padStart(2, "0")}-15`,
      period: 1
    };
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      start: `${year}-${String(month + 1).padStart(2, "0")}-16`,
      end: `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
      period: 2
    };
  }
}
```

---

# 36. PERMISSION SYSTEM

Same centralized permission pattern as EMSF. Create `src/lib/permissions.ts` with:

```typescript
export const PERMISSIONS = [
  "client.view",
  "client.create",
  "client.edit",
  "project.view",
  "project.create",
  "project.edit",
  "assignment.view",
  "assignment.create",
  "assignment.edit",
  "daily_log.view",
  "daily_log.create",
  "daily_log.edit",
  "daily_log.view_all",
  "timesheet.view",
  "timesheet.view_all",
  "timesheet.submit",
  "timesheet.approve",
  "timesheet.reject",
  "invoice.view",
  "invoice.create",
  "invoice.edit",
  "invoice.send",
  "invoice.view_all",
  "report.view",
  "audit.view",
  "settings.manage",
  "notification.view",
  "profile.edit",
  "profile.view_self",
  "attendance.view",  // shared with EMS
] as const;

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [/* all permissions */],
  HR: [/* no CMS access — handled as access denied at the login/shell level */],
  MANAGER: [
    "client.view", "client.create", "client.edit",
    "project.view", "project.create", "project.edit",
    "assignment.view", "assignment.create", "assignment.edit",
    "daily_log.view_all", "daily_log.create",
    "timesheet.view_all", "timesheet.approve", "timesheet.reject",
    "invoice.view_all",
    "report.view",
    "audit.view",
    "notification.view",
    "profile.edit",
    "attendance.view",
  ],
  SUPERVISOR: [
    "project.view",
    "assignment.view", "assignment.edit",
    "daily_log.view_all", "daily_log.create",
    "timesheet.view_all", "timesheet.approve", "timesheet.reject",
    "notification.view",
    "profile.edit",
    "attendance.view",
  ],
  EMPLOYEE: [
    "daily_log.create", "daily_log.view", "daily_log.edit",
    "timesheet.view", "timesheet.submit",
    "project.view",
    "notification.view",
    "profile.edit",
    "attendance.view",
  ],
};
```

HR users are blocked at the login/shell level with an access-denied message — they have no CMS permissions.

---

# 37. COMPONENT ARCHITECTURE

```text
src/
├── App.tsx
├── main.tsx
├── index.css
├── app/
│   ├── router/
│   │   └── index.tsx
│   └── layouts/
│       └── AppShell.tsx
├── features/
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   ├── LoginPage.tsx
│   │   └── AccessDeniedPage.tsx
│   ├── dashboard/
│   │   ├── DashboardRouter.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── SupervisorDashboard.tsx
│   │   └── EmployeeDashboard.tsx
│   ├── clients/
│   │   ├── ClientDashboardPage.tsx
│   │   ├── ClientDetailPage.tsx
│   │   └── components/
│   │       ├── ClientForm.tsx
│   │       └── ClientStatusPanel.tsx
│   ├── projects/
│   │   ├── ProjectDashboardPage.tsx
│   │   ├── ProjectDetailPage.tsx
│   │   └── components/
│   │       ├── ProjectForm.tsx
│   │       ├── AssignmentModal.tsx
│   │       └── ProjectHealthChart.tsx
│   ├── assignments/
│   │   └── AssignmentsDashboardPage.tsx
│   ├── daily-logs/
│   │   ├── DailyLogsPage.tsx
│   │   ├── DailyLogFormPage.tsx
│   │   └── components/
│   │       ├── DailyLogForm.tsx
│   │       ├── DailyLogTable.tsx
│   │       └── DailyLogDetail.tsx
│   ├── timesheets/
│   │   ├── TimesheetsPage.tsx
│   │   ├── TimesheetDetailPage.tsx
│   │   ├── MyTimesheetsPage.tsx
│   │   └── components/
│   │       ├── TimesheetDetail.tsx
│   │       ├── TimesheetReviewModal.tsx
│   │       ├── TimesheetSummary.tsx
│   │       └── DailyLogsTable.tsx
│   ├── invoices/
│   │   ├── InvoicesPage.tsx
│   │   ├── InvoiceDetailPage.tsx
│   │   ├── InvoiceWizardPage.tsx
│   │   └── components/
│   │       ├── InvoiceForm.tsx
│   │       ├── LineItemsTable.tsx
│   │       ├── TimesheetPicker.tsx
│   │       ├── InvoicePreview.tsx
│   │       └── EmailComposeModal.tsx
│   ├── reports/
│   │   ├── ReportCenterPage.tsx
│   │   └── components/
│   │       └── ReportDetailModal.tsx
│   ├── analytics/
│   │   └── AnalyticsDashboardPage.tsx
│   ├── notifications/
│   │   └── NotificationCenterPage.tsx
│   ├── audit/
│   │   └── AuditLogPage.tsx
│   ├── settings/
│   │   ├── SettingsPage.tsx
│   │   └── components/
│   │       ├── InvoiceTemplateForm.tsx
│   │       ├── BillingPeriodConfig.tsx
│   │       └── PaymentTermsConfig.tsx
│   └── profile/
│       ├── ProfilePage.tsx
│       └── components/
│           └── CmsPreferencesTab.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── MobileSidebar.tsx
│   ├── navigation/
│   │   └── MobileSidebar.tsx
│   ├── tables/
│   │   └── DataTable.tsx
│   ├── forms/
│   │   ├── FormField.tsx
│   │   ├── Select.tsx
│   │   ├── DatePicker.tsx
│   │   ├── Textarea.tsx
│   │   └── FileUpload.tsx
│   ├── feedback/
│   │   ├── Toast.tsx
│   │   ├── Badge.tsx
│   │   ├── ProgressBar.tsx
│   │   └── StatusIndicator.tsx
│   ├── modals/
│   │   └── Modal.tsx
│   ├── charts/
│   │   ├── WorkforceChart.tsx
│   │   ├── ProjectHealthChart.tsx
│   │   ├── TimesheetSubmissionChart.tsx
│   │   └── RevenueTrendChart.tsx
│   └── ui/
│       ├── IconButton.tsx
│       ├── Dropdown.tsx
│       ├── Tabs.tsx
│       └── Tooltip.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useRole.ts
│   ├── usePermissions.ts
│   ├── useToast.ts
│   └── usePagination.ts
├── data/
│   ├── constants/
│   │   └── index.ts
│   └── mock/
│       ├── index.ts
│       ├── clients.ts
│       ├── projects.ts
│       ├── assignments.ts
│       ├── dailyLogs.ts
│       ├── timesheets.ts
│       ├── invoices.ts
│       └── repositories.ts
├── lib/
│   ├── permissions.ts
│   ├── auth.ts
│   └── utils.ts
└── types/
    └── index.ts
```

---

# 38. MOCK REPOSITORY FUNCTIONS

Each feature module accesses data through repository functions that mirror the future API contract.

```typescript
// Timesheet repositories
export function getTimesheets(
  filters?: TimesheetFilters
): Promise<{ data: Timesheet[]; pagination: Pagination }>

export function getTimesheetById(id: string): Promise<Timesheet | null>
export function getMyTimesheets(employeeId: string): Promise<Timesheet[]>
export function createTimesheet(input: CreateTimesheetInput): Promise<Timesheet>
export function submitTimesheet(id: string): Promise<Timesheet>
export function approveTimesheet(id: string, notes?: string): Promise<Timesheet>
export function rejectTimesheet(id: string, notes: string): Promise<Timesheet>
export function deleteTimesheet(id: string): Promise<void>

// Daily log repositories
export function getDailyLogs(
  filters?: DailyLogFilters
): Promise<DailyLog[]>

export function getDailyLogById(id: string): Promise<DailyLog | null>
export function getDailyLogsByEmployee(employeeId: string, dateRange?: DateRange): Promise<DailyLog[]>
export function createDailyLog(input: CreateDailyLogInput): Promise<DailyLog>
export function updateDailyLog(id: string, input: UpdateDailyLogInput): Promise<DailyLog>
export function submitDailyLogsForPeriod(employeeId: string, periodStart: string, periodEnd: string): Promise<Timesheet>
export function deleteDailyLog(id: string): Promise<void>

// Invoice repositories
export function getInvoices(filters?: InvoiceFilters): Promise<{ data: Invoice[]; pagination: Pagination }>
export function getInvoiceById(id: string): Promise<Invoice | null>
export function createInvoice(input: CreateInvoiceInput): Promise<Invoice>
export function updateInvoice(id: string, input: UpdateInvoiceInput): Promise<Invoice>
export function sendInvoice(id: string, email: SendInvoiceEmail): Promise<Invoice>
export function downloadInvoicePdf(id: string): Promise<Blob>
export function voidInvoice(id: string): Promise<Invoice>
export function deleteInvoice(id: string): Promise<void>

// Client repositories (shared with EMS)
export function getClients(filters?): Promise<{ data: Client[]; pagination }>
export function getClientById(id: string): Promise<Client | null>
export function createClient(input: CreateClientInput): Promise<Client>
export function updateClient(id: string, input: UpdateClientInput): Promise<Client>

// Project repositories (shared with EMS)
export function getProjects(filters?): Promise<{ data: Project[]; pagination }>
export function getProjectById(id: string): Promise<Project | null>
export function createProject(input: CreateProjectInput): Promise<Project>
export function updateProject(id: string, input: UpdateProjectInput): Promise<Project>

// Assignment repositories (shared with EMS)
export function getAssignments(filters?), Promise<{ data: Assignment[]; pagination }>
export function getAssignmentById(id: string): Promise<Assignment | null>
export function createAssignment(input: CreateAssignmentInput): Promise<Assignment>
```

---

# 39. INVOICE AUTOMATION LOGIC

The invoice auto-generation logic produces professional services-style line items grouped by resource geography + role (matching INV-000001.pdf format), where each line item represents a developer/resource type with Qty × Rate = Amount.

When auto-populating from timesheets, the logic:
1. Finds all approved timesheets for the selected client within the billing period
2. Groups resources by geography (US Based, EU Based, India-Based) and role (Developer, Dev-ops, etc.)
3. For each group, calculates the total billable hours and applies the standard resource rate
4. Qty = 1.00 (representing one time period), Rate = monthly/resource rate, Amount = Rate

The auto-populate should produce line items like the PDF example:

```text
#  Item & Description                    Qty    Rate        Amount
1  US Based AEM Developer              1.00   $23,400.00  $23,400.00
2  EU Based Web Developer              1.00   $20,584.00  $20,584.00
3  India-Based AEM Developer #1        1.00   $6,240.00   $6,240.00
4  India-Based AEM Developer #2        1.00   $6,240.00   $6,240.00
5  India-Based 24/7 Offshore Dev-ops   1.00   $13,996.00  $13,996.00
```

Resource rate lookup is based on:
* Geographic location (US, EU, India)
* Role (Developer, Senior Developer, Lead, Dev-ops, QA, Designer, etc.)
* Monthly rate (standardized per resource type)

Manual line items use the same format: enter a description, quantity, and rate; the amount auto-calculates.

```typescript
interface InvoiceGenerationInput {
  clientId: string;
  clientAddress?: Address;
  poNumber?: string;
  subject?: string;
  issueDate: string;
  dueDate: string;
  currency: "USD" | "INR" | "EUR" | "GBP" | "CAD";
  paymentTerms: string;
  taxRate?: number;
  notes?: string;
  termsAndConditions?: string;
  periodStart?: string;    // for timesheet-derived
  periodEnd?: string;      // for timesheet-derived
  autoPopulate?: boolean;  // whether to pull from approved timesheets
}

interface InvoiceGenerationResult {
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  sourceTimesheetIds: string[];
}

function generateInvoiceFromTimesheets(input: InvoiceGenerationInput): InvoiceGenerationResult {
  // 1. If autoPopulate, find all approved timesheets for this client's projects in the period
  // 2. For each timesheet, determine the employee's resource type (geography + role)
  // 3. Get the resource name: `${country} ${techRole}` (e.g., "US Based AEM Developer")
  // 4. If same resource type exists, aggregate into one line item with Qty=1.00
  // 5. For standalone resources (no timesheet link): create manual line items
  // 6. Rate comes from employee.billRate (or a standard resource rate table)
  // 7. Amount = quantity × rate
}
```

**Resource name format** (matching the PDF):
```text
${geography} ${role}
```

Where geography is one of: "US Based", "EU Based", "India-Based"
And role is the tech role (e.g., "AEM Developer", "Web Developer", "Dev-ops personnel")

When multiple employees have the same resource type, they may share a line item with an incremented suffix (e.g., "India-Based AEM Developer #1", "#2").

### Standard Resource Rates

Invoice line-item **Rate** is a standardized monthly resource rate keyed by `${geography} ${roleTier}`. The table below reproduces the line items in INV-000001.pdf exactly (Qty = 1.00 representing one billing period):

```text
US Based AEM Developer              → $23,400.00   (US Based Developer)
EU Based Web Developer              → $20,584.00   (EU Based Developer)
India-Based AEM Developer #1 / #2   → $6,240.00    (India-Based Developer)
India-Based 24/7 Offshore Dev-ops   → $13,996.00   (24/7 shift premium)
```

> Note: `employee.billRate` (hourly) is used to compute a timesheet's **billable amount** (`billRate × billableHours`, see §52 sample). It is *not* the invoice line-item rate — the invoice uses the standard monthly resource rate above, so a single line item can represent a per-period resource cost rather than per-employee hours.

```typescript
// Standard monthly resource rates, keyed by the resource name produced by
// generateResourceName (`${geography} ${role}`). Exact PDF names are included
// so auto-populate reproduces INV-000001.pdf deterministically, with
// tier-normalized keys as fallbacks for the generic TECH_ROLES set.
export const STANDARD_RESOURCE_RATES: Record<string, number> = {
  // United States
  "US Based AEM Developer": 23400,
  "US Based Developer": 23400,
  "US Based Senior Developer": 27000,
  "US Based Lead": 32000,
  "US Based DevOps Engineer": 25000,
  "US Based QA Engineer": 19000,
  "US Based Designer": 18000,
  "US Based Analyst": 17000,
  // Europe
  "EU Based Web Developer": 20584,
  "EU Based Developer": 20584,
  "EU Based Senior Developer": 23000,
  "EU Based Lead": 28000,
  "EU Based DevOps Engineer": 19500,
  "EU Based QA Engineer": 16500,
  "EU Based Designer": 15000,
  "EU Based Analyst": 14500,
  // India (24/7 offshore shift receives a premium)
  "India-Based AEM Developer": 6240,
  "India-Based Developer": 6240,
  "India-Based Senior Developer": 8000,
  "India-Based Lead": 10000,
  "India-Based 24/7 Offshore Dev-ops personnel": 13996,
  "India-Based DevOps Engineer": 11000,
  "India-Based QA Engineer": 4800,
  "India-Based Designer": 4200,
  "India-Based Analyst": 5400,
};

// Map a granular TechRole / designation onto the role-tier used as the
// STANDARD_RESOURCE_RATES key. Roles not present here default to "Developer".
function techRoleToTier(role: string): string {
  const map: Record<string, string> = {
    "Java Developer": "Developer",
    "Frontend Developer": "Developer",
    "Backend Developer": "Developer",
    "Full Stack Developer": "Developer",
    "AEM Developer": "Developer",
    "Web Developer": "Developer",
    "Senior Developer": "Senior Developer",
    "Technical Lead": "Lead",
    "Solution Architect": "Lead",
    "Project Manager": "Lead",
    "DevOps Engineer": "DevOps Engineer",
    "QA Engineer": "QA Engineer",
    "UI/UX Designer": "Designer",
    "Business Analyst": "Analyst",
    "Scrum Master": "Analyst",
    "Data Engineer": "Analyst",
  };
  return map[role] ?? "Developer";
}

// Resolve the monthly line-item rate for an employee.
// Lookup precedence: 1) exact `${geography} ${techRole}` match (handles PDF
// display names like "AEM Developer", "Web Developer", "24/7 Offshore Dev-ops
// personnel"); 2) tier-normalized `${geography} ${tier}` fallback.
function getResourceRate(employee: Employee): number | undefined {
  const geography =
    employee.country === "United States" ? "US Based"
    : employee.country === "India" ? "India-Based"
    : "EU Based";
  const techRole = employee.techRole ?? employee.designation;
  const exactKey = `${geography} ${techRole}`;
  if (STANDARD_RESOURCE_RATES[exactKey] !== undefined) return STANDARD_RESOURCE_RATES[exactKey];
  return STANDARD_RESOURCE_RATES[`${geography} ${techRoleToTier(techRole)}`];
}
```

---

# 40. DAILY LOG BUSINESS RULES (UI ENFORCEMENT)

The daily log form must enforce these rules client-side (and the backend will enforce them again):

1. **Project filtering**: Only projects where the employee has an ACTIVE assignment are selectable.
2. **Overtime gating**: Overtime hours field is disabled unless the work date is Saturday or Sunday.
3. **Hours validation**: Regular hours + overtime hours ≤ 24.
4. **Duplicate prevention**: If a log exists for the same employee + date + project, show a warning and offer to edit the existing entry instead of creating a new one.
5. **Timesheet lock**: Once a timesheet containing this log is APPROVED or PAID, the log is read-only.

---

# 41. TIMESHEET STATE MACHINE

```text
DRAFT → SUBMITTED → IN_REVIEW → APPROVED → PAID
                     ↘ REJECTED → REVISED → SUBMITTED
                                  ↗ (employee revises and resubmits)
```

Transitions:

| From | To | Trigger | Permission |
|------|-----|---------|------------|
| DRAFT | SUBMITTED | "Submit for Review" button | Employee (own timesheet) |
| SUBMITTED | IN_REVIEW | Auto-assigned on submission | System |
| IN_REVIEW | APPROVED | "Approve" button | Admin, Manager, Supervisor |
| IN_REVIEW | REJECTED | "Reject" button | Admin, Manager, Supervisor |
| REJECTED | REVISED | System marks as revised; employee revises then resubmits to SUBMITTED | System |
| APPROVED | PAID | "Mark as Paid" button | Admin |

Invalid transitions must be visually prevented (disabled buttons) with tooltips explaining why.

---

# 42. INVOICE STATE MACHINE

```text
DRAFT → SENT → PAID
       ↘     ↘ OVERDUE (if past due date)
        ↘     ↘ PARTIAL (partial payment received)
         ↘ VOID
          ↘ CANCELLED
```

Transitions:

| From | To | Trigger | Permission |
|------|-----|---------|------------|
| DRAFT | SENT | "Send Invoice" button → email modal | Admin, Manager |
| DRAFT | VOID | "Void" button | Admin |
| SENT | PAID | "Mark as Paid" / payment received | Admin |
| SENT | OVERDUE | Auto (date-based) | System |
| SENT | VOID | "Void" button | Admin |
| SENT | PARTIAL | "Record Payment" (partial amount) | Admin |
| OVERDUE | PAID | "Mark as Paid" | Admin |
| OVERDUE | VOID | "Void" button | Admin |
| OVERDUE | PARTIAL | "Record Payment" (partial amount) | Admin |
| PARTIAL | PAID | "Mark as Paid" (remaining balance) | Admin |
| any | CANCELLED | N/A (future) | Admin |

---

# 43. RESPONSIVE DESIGN

## Breakpoints

Primary target: desktop (xl/2xl). Mobile/tablet are secondary.

```text
sm:  640px   (mobile landscape)
md:  768px   (tablet portrait)
lg:  1024px  (tablet landscape)
xl:  1280px  (desktop minimum)
2xl: 1536px  (wide desktop)
```

## Mobile behavior

* Sidebar becomes a drawer (overlay)
* Tables become horizontally scrollable
* The two-column wizard layout (step content + action panel) stacks vertically
* Daily log form collapses to a card-based layout
* Invoice line items show condensed columns

## Tablet behavior

* Sidebar collapses to icon-only
* Dashboard grids go from 3 columns to 2
* Tables remain full-width but with condensed padding

---

# 44. DEVELOPMENT ROLE SWITCHER

Same pattern as EMSF. The frontend MUST support switching roles during development.

```text
Demo User
Role:
[ Administrator v ]

Administrator
HR (blocked — CMS access denied)
Manager
Supervisor
Employee
```

Changing the role should immediately change:

* Dashboard
* Sidebar
* Available navigation
* Visible actions
* Permission behavior
* Profile menu information

For HR: show an "Access Denied" splash screen with explanation that HR users use the EMS platform, not the CMS.

---

# 45. ROUTE & PERMISSION GUARDS

All routes must be wrapped with `ProtectedRoute` (authentication) and `PermissionGuard` (authorization).

```typescript
function PermissionGuard({ children, permission }: {
  children: React.ReactNode;
  permission: Permission;
}) {
  const { user } = useAuth();
  if (!user || !hasPermission(user.role, permission)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}
```

Every direct URL access must be protected. Unauthorized access redirects to `/403`.

---

# 46. API INTEGRATION PATH

The EMSB backend already provides these endpoints that the CMS will consume:

```text
GET  /api/v1/clients              → client.view
GET  /api/v1/clients/:id          → client.view
POST /api/v1/clients              → client.create
PATCH /api/v1/clients/:id         → client.edit

GET  /api/v1/projects             → project.view
GET  /api/v1/projects/:id         → project.view
POST /api/v1/projects             → project.create
PATCH /api/v1/projects/:id        → project.edit

GET  /api/v1/assignments          → assignment.view
POST /api/v1/assignments          → assignment.create
PATCH /api/v1/assignments/:id     → assignment.edit

GET  /api/v1/employees            → employee.view (for assignment + timesheet lookup)
GET  /api/v1/employees/:id/timesheet → timesheet.view (provisioning status)

GET  /api/v1/notifications        → notification.view
POST /api/v1/notifications/:id/read → notification.view

GET  /api/v1/dashboard            → role-based dashboard data
GET  /api/v1/reports/:reportId    → report.view
GET  /api/v1/audit-log            → audit.view
GET  /api/v1/settings             → settings.manage
```

New CMS-specific endpoints to be added to EMSB later:

```text
GET  /api/v1/daily-logs           → daily_log.view_all / daily_log.view
POST /api/v1/daily-logs           → daily_log.create
PATCH /api/v1/daily-logs/:id      → daily_log.edit

GET  /api/v1/timesheets           → timesheet.view_all / timesheet.view
POST /api/v1/timesheets           → timesheet.submit
POST /api/v1/timesheets/:id/approve → timesheet.approve
POST /api/v1/timesheets/:id/reject  → timesheet.reject

GET  /api/v1/invoices             → invoice.view_all / invoice.view
POST /api/v1/invoices             → invoice.create
PATCH /api/v1/invoices/:id        → invoice.edit
POST /api/v1/invoices/:id/send   → invoice.send
POST /api/v1/invoices/:id/generate → auto-generate from timesheets
```

For this frontend shell phase, all data comes from mock repositories. The repository function signatures above match the future API contract shapes.

---

# 47. THEMING: CMS vs EMS

| Property | EMS Value | CMS Value |
|----------|-----------|-----------|
| Primary | `#0B1F3A` (navy) | `#0F2B1D` (forest green) |
| Secondary | `#163A63` | `#1A5F43` |
| Accent | `#1D4ED8` (blue) | `#1A8A5A` (green) |
| Sidebar bg | `#0B1F3A` | `#0F2B1D` |
| Sidebar active | `#163A63` | `#1A5F43` |
| Sidebar accent | `#4C8DFF` | `#4CAF50` |
| Light accent bg | `#E8F0FA` | `#E3F2E8` |

All other values (neutrals, typography, borders, shadows, spacing) remain identical to EMS.

---

# 48. PHASED IMPLEMENTATION PLAN

## Phase 0: Project Initialization
- [x] Vite project scaffolded (React 19 + TypeScript 6 + Tailwind CSS 4, oxlint + vitest)
- [x] `tsconfig` configured (references: `tsconfig.app.json` + `tsconfig.node.json`)
- [x] `vite.config.ts` with `@vitejs/plugin-react` + `@tailwindcss/vite`
- [x] `index.html` (CMS branding)
- [x] Green design system in `src/index.css` — §5/§47 palette over EMSF component classes (`.app-shell`, `.app-header`, `.app-sidebar`, `.app-main`, `.app-footer`, `.btn`, `.card`, `.badge`)
- [x] Entry points: `src/main.tsx` + `src/App.tsx` (branded loading root)
- [x] `src/types/index.ts` — §34 full type model (`BaseEmployee` + `Employee` + `Client` + `Project` + `ProjectAssignment` + `DailyLog` + `Timesheet` + `Invoice`/`InvoiceLineItem` + `InvoiceTemplate` + `Notification` + `AuditLog` + `Permission`)
- [x] `src/lib/permissions.ts` — §36 CMS permission matrix (30 permissions + `ROLE_PERMISSIONS` + `hasPermission` helpers)
- [x] `src/lib/utils.ts` — §61 deterministic billing-period helpers (`getCurrentBillingPeriod`, `getPreviousBillingPeriods`)
- [x] `src/data/constants/index.ts` — §60 enums + `DEMO_USERS` (§13) + `ROUTES` + status color maps
- [x] `src/data/mock/index.ts` — §35 typed mock arrays + `loadBackendData` stub (mirrors EMSF pattern)
- [x] Verified locally: `npm install` (189 pkgs, 0 vulns), `tsc --noEmit` (ES0), `npm run build` (`dist/` produced), `oxlint` (0 warnings)

**Exit Criteria:** Project builds, lints clean, and typechecks with 0 errors. The non-UI foundation layers (design system, types, permissions, constants, deterministic utilities) are in place for the Phase 1 shell to consume.

## Phase 1: Project Foundation (Shell)
- [ ] Vite project initialized with React + TypeScript + Tailwind CSS
- [ ] `tsconfig` configured (strict, NodeNext-compatible)
- [ ] Design system: color variables in `index.css`, typography, shadows, borders
- [ ] Shared component primitives: Button, Input, Select, Badge, Modal, Tabs, DataTable, Toast
- [ ] Auth context with mock authentication and role switcher (6 roles including blocked HR)
- [ ] AppShell layout (Header, Sidebar, Main, Footer)
- [ ] Router with ProtectedRoute + PermissionGuard
- [ ] Type definitions (`src/types/index.ts`)
- [ ] Constants (`src/data/constants/index.ts`: tech roles, industries, client tiers, payment terms, etc.)
- [ ] Lint/typecheck/passing build

**Exit Criteria:** App runs, can switch roles, navigation renders, routes are guarded.

## Phase 2: Shared Dashboards
- [ ] DashboardRouter that returns role-specific dashboard
- [ ] Admin Dashboard (6 KPI cards + 5 content rows)
- [ ] Manager Dashboard (KPI + project portfolio + team timesheet status + resource allocation + health + client activity)
- [ ] Supervisor Dashboard (KPI + projects + daily logs + team timesheets + activity + health)
- [ ] Employee Dashboard (today widget + projects + quick log + timesheet status + recent logs + notifications)
- [ ] Chart components: revenue trend (line), project health (donut), timesheet submission rate (bar), resource utilization (bar)

## Phase 3: Client & Project Management
- [ ] Client Dashboard (KPIs + search + filters + table)
- [ ] Client Detail (5 tabs: Overview, Contacts, Projects, Invoices, Activity)
- [ ] Create/Edit Client modal with all fields
- [ ] Project Dashboard (KPIs + search + filters + table with progress bars)
- [ ] Project Detail (6 tabs: Overview, Team, Timesheets, Invoices, Activity)
- [ ] Create/Edit Project modal
- [ ] Assignment modal for adding team members
- [ ] Tech role selection on assignments

## Phase 4: Assignments Module
- [ ] Assignments dashboard (table with employee, project, client, role, allocation, status)
- [ ] Search + filters
- [ ] Role-based visibility

## Phase 5: Daily Logs Module
- [ ] Daily Logs dashboard (KPIs + search + filters + table)
- [ ] Daily Log form page (with overtime gating, project filtering, duplicate prevention)
- [ ] Daily Log detail view
- [ ] Inline editing in table
- [ ] "Log Hours" quick action from employee dashboard

## Phase 6: Timesheets Module
- [ ] Timesheets dashboard (KPIs + search + filters + table)
- [ ] Timesheet detail (4 tabs: Overview, Daily Logs, Summary, Activity)
- [ ] Timesheet review modal (approve/reject with notes)
- [ ] "My Timesheets" employee self-service page
- [ ] Auto-compile daily logs into bi-monthly timesheets
- [ ] Timesheet state machine enforcement
- [ ] Submit flow from DRAFT → SUBMITTED

## Phase 7: Invoicing Module
- [ ] Invoices dashboard (KPIs + search + filters + table)
- [ ] Invoice detail (6 tabs: Overview, Line Items, Timesheets, Activity, etc.)
- [ ] Invoice creation wizard (3 steps: client/period, line items, review/send)
- [ ] Auto-populate line items from approved timesheets
- [ ] Invoice state machine (DRAFT → SENT → PAID/OVERDUE)
- [ ] Email composition modal for sending
- [ ] PDF preview/download
- [ ] Invoice templates configuration in Settings

## Phase 8: Reports Module
- [ ] Report center page (cards grouped by 8 categories)
- [ ] Report detail modal (tabbed: table + chart)
- [ ] Export functionality (CSV/PDF simulated)

## Phase 9: Analytics Dashboard
- [ ] Full-width charts and KPI summary
- [ ] Revenue trend, project health, timesheet submission, top clients, resource utilization

## Phase 10: Notifications + Audit + Settings
- [ ] Notification Center (with CMS-specific types)
- [ ] Audit Log (Admin/Manager read-only)
- [ ] Settings page (10 sections including invoice templates, billing periods, payment terms)
- [ ] Profile page (4 tabs including CMS Preferences)

## Phase 11: Polish
- [ ] Toasts wired globally via ToastProvider
- [ ] Modal enhancements (Escape key, stopPropagation)
- [ ] Focus states (focus-visible outlines)
- [ ] Accessibility audit (aria attributes, keyboard navigation)
- [ ] Loading/empty/error states on all DataTable instances
- [ ] Form validation (required indicators, error states, helper text)
- [ ] Consistency review across all modules
- [ ] Responsive design verification

## Phase 12: Route & Permission Audit
- [ ] Every sidebar item has a valid route
- [ ] Every action has a destination
- [ ] All routes are permission-checked
- [ ] Role permission coverage is correct
- [ ] HR users get access denied
- [ ] Non-billable employees blocked from CMS

## Phase 13: Testing
- [ ] Unit tests for pure logic functions (timesheet compilation, invoice generation, period calculation, overtime validation)
- [ ] Component tests for key UI patterns (daily log form, timesheet review, invoice wizard)
- [ ] Integration tests for state machines (timesheet states, invoice states)

---

# 49. TECH STACK CONSTRAINTS

```text
Frontend:  TypeScript + React 19 + Tailwind CSS v4
Icons:     Lucide React
Charts:    Recharts v3
Routing:   React Router DOM v7
State:     React Context + useState/useReducer (no over-engineering)
Testing:   Vitest + React Testing Library
Linting:   oxlint
Build:     Vite 8
```

No dark mode in v1 (matching EMSF.md §118).

No additional libraries beyond those listed unless explicitly required.

---

# 50. SHARED INTEGRATION WITH EMS

The CMS and EMS share:

| Shared Resource | Details |
|----------------|---------|
| Database | Same MongoDB Atlas cluster/database |
| Backend | Same EMSB API (`eniac-inc-api.vercel.app`) |
| Authentication | Same JWT tokens, same login endpoint |
| Employee data | CMS reads employee records, bill rates, assignment data |
| Client data | CMS manages clients (EMSB owns, EMSF displays read-only) |
| Project data | CMS manages projects (EMSB owns, EMSF displays read-only) |
| Assignment data | Both platforms read/write assignments |
| Notifications | Shared notification system |
| Audit logs | Shared audit trail (all actions logged) |
| Settings | Shared settings (client tiers, industries, etc.) |

EMS users can log into CMS if they have an appropriate role.
CMS data (timesheets, invoices) is not visible in EMS (separate feature sets).

---

# 51. UI COMPONENT SPECIFICATIONS

## DailyLogForm

A form component for entering/editing daily work logs.

```text
+---------------------------------------------------------+
| Daily Work Log                                          |
| Oct 13, 2026 (Wednesday)                                |
+---------------------------------------------------------+
| Date          [October 13, 2026    ] [Calendar picker]  |
| Project       [Platform API Enhancement       ▼]         |
| Task Category [Development                      ▼]     |
|                                                         |
| Description   [                                       ] |
|               [Implemented user authentication endpoint] |
|               [                                    ]    |
|               [                                    ]    |
|                                                         |
| Regular Hours [  8.00 ]  (0.25 increments, max 24)      |
| Overtime      [  0.00 ]  ⓘ Only enabled on Sat/Sun       |
|                                                         |
| Billing Type  [ (●) Billable  ( ) Non-Billable        ] |
| Tags          [ api, auth ]  +                          |
| Attachment    [No file chosen] [Choose file]           |
|                                                         |
| [ Save as Draft ]  [ Submit Log ]                       |
+---------------------------------------------------------+
```

Validation rules displayed inline:
* Project required
* Description required (min 10 characters)
* Overtime disabled on weekdays (tooltip explains)
* Total hours ≤ 24

## TimesheetReviewModal

A modal component for approving/rejecting timesheets.

```text
+---------------------------------------------------------+
| Review Timesheet: TS-001                                |
| Employee: John Smith (Oct 1-15, 2026)                   |
+---------------------------------------------------------+
| Summary:                                              |
|   Regular Hours:    80.00                               |
|   Overtime Hours:   0.00                                |
|   Total Hours:      80.00                               |
|   Billable Amount:  $4,000.00                           |
|                                                         |
| Review Notes:                                          |
|   [                                                   ] |
|   [                                                   ] |
|                                                         |
| [ Reject ]                    [ Approve Timesheet ]      |
+---------------------------------------------------------+
```

## InvoiceWizard

Three-step wizard for creating invoices, producing output matching the professional services invoice format (INV-000001.pdf).

### Step 1: Select Client & Billing Details
```text
[Client] [SIE  ▼]

Invoice Date:  [July 1, 2026]
Payment Terms: [Due on Receipt   ▼]
Currency:      [USD  ▼]
Tax Rate:       [  0 ] %

[Auto-Populate from Approved Timesheets]
[Continue]
```

### Step 2: Line Items
```text
Line Items (Qty × Rate = Amount):

#  Description                              Qty    Rate        Amount
1  US Based AEM Developer                 1.00   $23,400.00  $23,400.00
2  EU Based Web Developer                 1.00   $20,584.00  $20,584.00
3  India-Based AEM Developer #1           1.00   $6,240.00   $6,240.00
4  India-Based AEM Developer #2           1.00   $6,240.00   $6,240.00
5  India-Based 24/7 Offshore Dev-ops      1.00   $13,996.00  $13,996.00

                                                    -----------
Subtotal:                                  $70,460.00
Tax (0%):                                          $0.00
Total:                                     $70,460.00
```

[+ Add Line Item] [Auto-Populate from Timesheets]

[Back] [Continue]

### Step 3: Review & Send
```text
Invoice Preview (PDF Layout):
┌─────────────────────────────────────────────────────────────┐
│ From: SIE Services LLC                     Invoice #       │
│ 2207 Bridgepointe Pkwy                   INV-000001          │
│ San Mateo, CA 94404                    Invoice Date: Jul 1 │
│                                                           │
│ Bill To: SIE                                               │
│ 2207 Bridgepointe Parkway                                │
│ San Mateo, CA 94404                                       │
│ USA                                                       │
│                                                           │
│ P.O. #: 6300006436    Terms: Due on Receipt              │
│ Due Date: July 1, 2026                                    │
│                                                           │
│ Subject: Professional Consulting                         │
│                                                           │
│ #  Description                         Qty    Rate   Amount │
│ 1  US Based AEM Developer             1.00 $23400.00 $23400  │
│ 2  EU Based Web Developer             1.00 $20584.00 $20584  │
│ 3  India-Based AEM Developer #1       1.00 $6240.00  $6240  │
│ 4  India-Based AEM Developer #2       1.00 $6240.00  $6240  │
│ 5  India-Based 24/7 Dev-ops           1.00 $13996.00 $13996 │
│                                     Subtotal: $70,460.00   │
│                                       Tax:     $0.00      │
│                                       Total:   $70,460.00  │
│                                                           │
│ Thank you for your business!                              │
│ Terms: Payment due on receipt. Late payments subject to  │
│ 1.5% monthly interest.                                    │
└─────────────────────────────────────────────────────────────┘

Notes: [Thanks for your business.                     ]

[Save as Draft] [Send via Email] [Download PDF]
```

## TimesheetDetail View Structure

```text
TIMESHEET DETAIL HEADER
┌────────────────────────────────────────────────────┐
│ Timesheet #TS-001                                  │
│                                                    │
│ John Smith (EMP-005)                               │
│ Period: Oct 1-15, 2026 (Period 1)                  │
│ Status: [SUBMITTED]                                │
│                                                    │
│ [Approve] [Reject] [Download PDF] [More]           │
└────────────────────────────────────────────────────┘

TABS:
┌─ Overview ─┬─ Daily Logs ─┬─ Summary ─┬─ Activity ─┐
│            │             │           │            │
│ Overview   │ Daily Logs  │ Summary   │ Activity   │
│ content    │ Table       │ Financial │ Timeline   │
│ here       │             │ summary   │            │
│            │             │           │            │
└────────────────────────────────────────────────────┘
```

## DataTable Component (Enhanced)

The DataTable supports:
* Column sorting (click header)
* Global search
* Column-level filters
* Row selection (checkbox)
* Bulk actions
* Pagination with page size selector
* Loading skeleton
* Empty state with illustration
* Error state with retry
* Row hover actions
* Responsive (horizontal scroll on mobile)

Props:
```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  searchPlaceholder?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectedRows?: T[];
  onSelectRows?: (rows: T[]) => void;
  bulkActions?: BulkAction[];
}
```

---

# 52. MOCK DATA EXAMPLES

## Sample Client

```typescript
{
  id: "CLIENT-001",
  clientCode: "ACME-001",
  name: "ACME Corporation",
  country: "United States",
  industry: "Technology",
  clientTier: "ENTERPRISE",
  status: "ACTIVE",
  primaryContact: {
    name: "Alice Johnson",
    email: "alice.johnson@acme.com",
    phone: "+1 (555) 123-4567",
    role: "CTO"
  },
  contacts: [
    { id: "CONTACT-001", name: "Alice Johnson", email: "alice@acme.com", phone: "+1 (555) 123-4567", role: "CTO", isPrimary: true },
    { id: "CONTACT-002", name: "Bob Smith", email: "bob@acme.com", phone: "+1 (555) 123-4568", role: "Finance Director", isPrimary: false }
  ],
  billingAddress: {
    line1: "123 Market Street",
    line2: "Suite 100",
    city: "San Francisco",
    state: "California",
    postalCode: "94105",
    country: "United States"
  },
  taxId: "12-3456789",
  paymentTerms: "NET_30",
  activeProjectCount: 3,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-10-10T14:30:00Z"
}
```

## Sample Project

```typescript
{
  id: "PROJ-001",
  projectCode: "ACME-API-001",
  name: "Platform API Enhancement",
  clientId: "CLIENT-001",
  clientName: "ACME Corporation",
  managerId: "user_manager",
  supervisorId: "user_supervisor",
  description: "Enhancing the platform API with new authentication and rate limiting features.",
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  progress: 45,
  status: "ACTIVE",
  health: "ON_TRACK",
  budget: 50000,
  budgetCurrency: "USD",
  teamSize: 4,
  billable: true,
  tags: ["backend", "api", "critical"],
  visibility: "INTERNAL",
  createdAt: "2026-09-15T09:00:00Z",
  updatedAt: "2026-10-10T16:00:00Z"
}
```

## Sample Assignment

```typescript
{
  id: "ASSIGN-001",
  employeeId: "EMP-005",
  projectId: "PROJ-001",
  role: "Backend Developer",
  allocation: 70,
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  billable: true,
  status: "ACTIVE",
  assignedBy: "user_manager",
  createdAt: "2026-09-20T08:00:00Z",
  updatedAt: "2026-10-01T09:00:00Z"
}
```

## Sample Daily Log

```typescript
{
  id: "LOG-001",
  employeeId: "EMP-005",
  employeeName: "John Smith",
  projectId: "PROJ-001",
  projectName: "Platform API Enhancement",
  workDate: "2026-10-13",
  dayOfWeek: "Wed",
  taskCategory: "DEVELOPMENT",
  description: "Implemented JWT-based authentication endpoint with refresh token support.",
  regularHours: 8.0,
  overtimeHours: 0.0,
  totalHours: 8.0,
  billable: true,
  billingType: "BILLABLE",
  status: "SUBMITTED",
  timesheetId: "TS-001",
  reviewedBy: undefined,
  reviewedAt: undefined,
  createdAt: "2026-10-13T18:00:00Z",
  updatedAt: "2026-10-13T18:00:00Z",
  tags: ["api", "authentication"]
}
```

## Sample Weekend Daily Log (with overtime)

```typescript
{
  id: "LOG-002",
  employeeId: "EMP-005",
  employeeName: "John Smith",
  projectId: "PROJ-001",
  projectName: "Platform API Enhancement",
  workDate: "2026-10-11",
  dayOfWeek: "Sat",
  taskCategory: "DEVELOPMENT",
  description: "Weekend emergency fix for production rate limiting issue.",
  regularHours: 4.0,
  overtimeHours: 3.0,
  totalHours: 7.0,
  billable: true,
  billingType: "BILLABLE",
  status: "SUBMITTED",
  timesheetId: "TS-001",
  createdAt: "2026-10-11T20:00:00Z",
  updatedAt: "2026-10-11T20:00:00Z",
  tags: ["emergency", "production-fix"]
}
```

## Sample Timesheet

```typescript
{
  id: "TS-001",
  employeeId: "EMP-005",
  employeeName: "John Smith",
  periodStart: "2026-10-01",
  periodEnd: "2026-10-15",
  periodLabel: "Oct 1-15, 2026",
  billingPeriod: 1,
  year: 2026,
  month: 10,
  totalDays: 15,
  totalBillableHours: 85.0,
  totalRegularHours: 80.0,
  totalOvertimeHours: 5.0,
  totalNonBillableHours: 0.0,
  totalHours: 85.0,
  billableAmount: 4250.0,
  currency: "USD",
  status: "APPROVED",
  submittedAt: "2026-10-16T09:00:00Z",
  submittedBy: "EMP-005",
  reviewedBy: "user_manager",
  reviewedAt: "2026-10-17T14:00:00Z",
  approvedAt: "2026-10-18T10:00:00Z",
  dailyLogIds: ["LOG-001", "LOG-002", "LOG-003", "LOG-004", "LOG-005"],
  projectBreakdown: [
    {
      projectId: "PROJ-001",
      projectName: "Platform API Enhancement",
      employeeBillRate: 50.00,
      billableHours: 85.0,
      billableAmount: 4250.0
    }
  ],
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-18T10:00:00Z"
}
```

## Sample Invoice

Matches the professional services invoice format (see INV-000001.pdf):

```typescript
{
  id: "INV-001",
  invoiceNumber: "INV-000001",
  clientId: "CLIENT-001",
  clientName: "SIE",
  clientCode: "SIE-001",
  clientAddress: {
    line1: "2207 Bridgepointe Parkway",
    city: "San Mateo",
    state: "CA",
    postalCode: "94404",
    country: "United States"
  },
  poNumber: "6300006436",
  subject: "Professional Consulting",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-15",
  periodLabel: "Jul 1-15, 2026",
  issueDate: "2026-07-01",
  dueDate: "2026-07-01",
  currency: "USD",
  paymentTerms: "DUE_ON_RECEIPT",
  taxRate: 0,
  taxAmount: 0,
  subtotal: 70460.00,
  totalAmount: 70460.00,
  amountPaid: 0,
  balanceDue: 70460.00,
  status: "DRAFT",
  lineItems: [
    {
      id: "LI-001",
      description: "US Based AEM Developer",
      quantity: 1.00,
      rate: 23400.00,
      amount: 23400.00,
      currency: "USD",
      employeeId: "EMP-005",
      employeeName: "John Smith",
      projectId: "PROJ-001",
      projectName: "Platform API Enhancement",
      manual: false,
      sortOrder: 1
    },
    {
      id: "LI-002",
      description: "EU Based Web Developer",
      quantity: 1.00,
      rate: 20584.00,
      amount: 20584.00,
      currency: "USD",
      employeeId: "EMP-006",
      employeeName: "Sarah Chen",
      projectId: "PROJ-002",
      projectName: "Frontend Dashboard",
      manual: false,
      sortOrder: 2
    },
    {
      id: "LI-003",
      description: "India-Based AEM Developer #1",
      quantity: 1.00,
      rate: 6240.00,
      amount: 6240.00,
      currency: "USD",
      employeeId: "EMP-007",
      employeeName: "Raj Patel",
      projectId: "PROJ-003",
      projectName: "API Integration",
      manual: false,
      sortOrder: 3
    },
    {
      id: "LI-004",
      description: "India-Based AEM Developer #2",
      quantity: 1.00,
      rate: 6240.00,
      amount: 6240.00,
      currency: "USD",
      employeeId: "EMP-008",
      employeeName: "Priya Sharma",
      projectId: "PROJ-001",
      projectName: "Platform API Enhancement",
      manual: false,
      sortOrder: 4
    },
    {
      id: "LI-005",
      description: "India-Based 24/7 Offshore Dev-ops personnel",
      quantity: 1.00,
      rate: 13996.00,
      amount: 13996.00,
      currency: "USD",
      projectId: "PROJ-001",
      projectName: "Platform API Enhancement",
      manual: false,
      sortOrder: 5
    }
  ],
  timesheetIds: ["TS-001", "TS-002", "TS-003", "TS-004"],
  notes: "Thanks for your business.",
  termsAndConditions: "Payment terms: Due on Receipt. Late payments subject to 1.5% monthly interest.",
  createdBy: "user_manager",
  createdAt: "2026-07-01T10:00:00Z",
  updatedAt: "2026-07-01T10:00:00Z"
}
```

---

# 53. FORM VALIDATION PATTERNS

## Daily Log Form Validation

```typescript
const dailyLogSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  projectId: z.string().min(1, "Project is required"),
  workDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Valid date is required"
  }),
  taskCategory: z.enum(["DEVELOPMENT", "TESTING", "REVIEW", "MEETING", "DESIGN", "OTHER"]),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  regularHours: z.number().min(0, "Regular hours must be 0 or greater").max(24, "Total hours cannot exceed 24"),
  overtimeHours: z.number().min(0).max(24),
  billingType: z.enum(["BILLABLE", "NON_BILLABLE"]),
  tags: z.array(z.string()).optional(),
}).refine((data) => {
  const total = data.regularHours + data.overtimeHours;
  return total <= 24;
}, {
  message: "Total hours (regular + overtime) cannot exceed 24",
  path: ["overtimeHours"]
});
```

## Validation messages must appear:
1. Inline below the field
2. In the submit button hover state (show all errors)
3. As form-level error banner at the top of the form on attempted submit

## Timesheet Submit Validation
Before submission, verify:
1. At least one daily log exists for the period
2. All daily logs have a status of "SUBMITTED"
3. Total hours > 0

## Invoice Creation Validation
1. Client is selected
2. Period is valid (start ≤ end)
3. At least one line item exists
4. Tax rate is 0-100

---

# 54. LOADING & EMPTY STATES

## Table Loading
```text
┌─────────────────────────────────────┐
│ ┌─────┐ ┌─────┐ ┌─────┐ ────       │
│ ┌─────┐ ┌─────┐ ┌─────┐ ────       │
│ ┌─────┐ ┌─────┐ ┌─────┐ ────       │
│ ┌─────┐ ┌─────┐ ┌─────┐ ────       │
│ ┌─────┐ ┌─────┐ ┌─────┐ ────       │
│ ┌─────┐ ┌─────┐ ┌─────┐ ────       │
└─────────────────────────────────────┘
```

## Table Empty State
```text
      [Illustration: Empty state icon]
      
      No records found
      
      Try adjusting your search or filter criteria.
      
      [Clear Filters]
```

## Dashboard Card Loading
```text
┌──────────────────────────┐
│ ─────────               │
│ ───────                    │
│ ───────                    │
└──────────────────────────┘
```

## Dashboard Card Empty
```text
┌──────────────────────────┐
│ Icon                     │
│                          │
│ No data available        │
│ for this period          │
└──────────────────────────┘
```

---

# 55. ERROR HANDLING

## API Error Display
Errors from mock repository failures should show:

```text
[Warning icon] Failed to load data
[Error message from the mock layer]
[Retry button]
```

## Form Submission Errors
On form submission failure:
1. Show error banner at top of form: `Error: [message]`
2. Highlight the first invalid field
3. Scroll to the first invalid field
4. Keep form data intact for correction

## 403 (Access Denied)
When a user navigates to a route they don't have permission for:

```text
[Shield icon]
Access Restricted

You do not have permission to access this page.

[Return to Dashboard]
```

## 404 (Not Found)
When a resource ID is not found:

```text
[Search icon]
Page Not Found

The requested resource could not be found.

[Return to Dashboard]
```

---

# 56. ACCESSIBILITY

1. All interactive elements must have keyboard focus indicators
2. All images must have alt text (avatars use employee/client initials as fallback)
3. Color is never the only indicator of state — always use icons, text, or patterns
4. Tables must have proper `<th>` headers with scope
5. Forms must have `<label>` elements properly associated with inputs
6. Modal dialogs must trap focus and return focus on close
7. Progress bars must have `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
8. Status badges must include text that screen readers can announce

---

# 57. PRINT & EXPORT

## Print Styles
All detail pages (Client, Project, Timesheet, Invoice) must support print:

1. A "Print" button in the action bar
2. Print styles that:
   * Hide navigation (sidebar, header search)
   * Expand all collapsed sections
   * Use dark text on white background
   * Show full-width content
   * Include company watermark in footer

## Export Formats

| Module | CSV | PDF |
|--------|-----|-----|
| Clients | ✓ Client list, contacts | ✓ Client details |
| Projects | ✓ Project list, assignments | ✓ Project details |
| Daily Logs | ✓ Log entries | ✓ Daily log summary |
| Timesheets | ✓ Timesheet entries | ✓ Timesheet detail + daily logs |
| Invoices | ✓ Line items | ✓ Full invoice (print-ready) |
| Assignments | ✓ Assignment list | — |

Export buttons in the action bar of each dashboard/table page.

---

# 58. KEYBOARD SHORTCUTS

## Global Shortcuts
```text
/                    Focus global search
?                    Open shortcut help modal
G then D             Go to dashboard
G then C             Go to clients
G then P             Go to projects
G then T             Go to timesheets
G then I             Go to invoices
N                    Open notifications
```

## Role-Specific Shortcuts (Employee)
```text
N                    New daily log
Ctrl+Enter           Submit form / primary action
Ctrl+Shift+E         Quick navigate to today's log
```

## Role-Specific Shortcuts (Manager/Admin)
```text
Ctrl+Enter           Approve selected timesheet
Ctrl+Shift+R         Reject selected timesheet
Ctrl+Shift+U         Unassign selected (assignments)
```

Show shortcuts in a help modal triggered by pressing `?`.

---

# 59. FILE STRUCTURE — DETAILED

```text
src/
├── App.tsx                           Root component (router provider + auth provider)
├── main.tsx                          React 19 entry point with createRoot
├── index.css                         Tailwind imports + design system CSS variables
├── app/
│   ├── router/
│   │   └── index.tsx                 React Router v7 routes (27 route definitions)
│   └── layouts/
│       └── AppShell.tsx              Main layout (Header + Sidebar + Outlet + Footer)
├── features/
│   ├── auth/
│   │   ├── AuthContext.tsx           Auth state, login/logout, role context
│   │   ├── LoginPage.tsx             Login form
│   │   └── AccessDeniedPage.tsx      HR blocking page
│   ├── dashboard/
│   │   ├── DashboardRouter.tsx       Role-based dashboard dispatcher
│   │   ├── AdminDashboard.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── SupervisorDashboard.tsx
│   │   └── EmployeeDashboard.tsx
│   ├── clients/
│   │   ├── ClientDashboardPage.tsx
│   │   ├── ClientDetailPage.tsx
│   │   └── components/
│   │       ├── ClientForm.tsx
│   │       ├── ClientStatusPanel.tsx
│   │       └── ClientContactsTab.tsx
│   ├── projects/
│   │   ├── ProjectDashboardPage.tsx
│   │   ├── ProjectDetailPage.tsx
│   │   └── components/
│   │       ├── ProjectForm.tsx
│   │       ├── ProjectTeamTab.tsx
│   │       ├── ProjectTimesheetsTab.tsx
│   │       └── ProjectHealthChart.tsx
│   ├── assignments/
│   │   ├── AssignmentsDashboardPage.tsx
│   │   └── components/
│   │       └── AssignmentDetailModal.tsx
│   ├── daily-logs/
│   │   ├── DailyLogsPage.tsx
│   │   ├── DailyLogFormPage.tsx
│   │   └── components/
│   │       ├── DailyLogForm.tsx
│   │       ├── DailyLogTable.tsx
│   │       └── DailyLogDetail.tsx
│   ├── timesheets/
│   │   ├── TimesheetsPage.tsx
│   │   ├── TimesheetDetailPage.tsx
│   │   ├── MyTimesheetsPage.tsx
│   │   └── components/
│   │       ├── TimesheetDetail.tsx
│   │       ├── TimesheetReviewModal.tsx
│   │       ├── TimesheetSummary.tsx
│   │       ├── DailyLogsTable.tsx
│   │       └── TimesheetCompilationNotice.tsx
│   ├── invoices/
│   │   ├── InvoicesPage.tsx
│   │   ├── InvoiceDetailPage.tsx
│   │   ├── InvoiceWizardPage.tsx
│   │   └── components/
│   │       ├── InvoiceForm.tsx
│   │       ├── LineItemsTable.tsx
│   │       ├── TimesheetPicker.tsx
│   │       ├── InvoicePreview.tsx
│   │       └── EmailComposeModal.tsx
│   ├── reports/
│   │   ├── ReportCenterPage.tsx
│   │   └── components/
│   │       └── ReportDetailModal.tsx
│   ├── analytics/
│   │   └── AnalyticsDashboardPage.tsx
│   ├── notifications/
│   │   └── NotificationCenterPage.tsx
│   ├── audit/
│   │   └── AuditLogPage.tsx
│   ├── settings/
│   │   ├── SettingsPage.tsx
│   │   └── components/
│   │       ├── InvoiceTemplateForm.tsx
│   │       ├── BillingPeriodConfig.tsx
│   │       └── PaymentTermsConfig.tsx
│   └── profile/
│       ├── ProfilePage.tsx
│       └── CmsPreferencesTab.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx                    Fixed top header (64px)
│   │   ├── Sidebar.tsx                   Dark green collapsible sidebar (248px/68px)
│   │   ├── Footer.tsx                    Status bar
│   │   └── MobileSidebar.tsx             Drawer sidebar for mobile
│   ├── navigation/
│   │   └── NavItem.tsx                   Individual nav link with icon
│   ├── tables/
│   │   └── DataTable.tsx                 Full-featured data table
│   ├── forms/
│   │   ├── FormField.tsx                 Label + input wrapper
│   │   ├── Select.tsx                    Custom select dropdown
│   │   ├── DatePicker.tsx                Date picker component
│   │   ├── Textarea.tsx                 Textarea with character counter
│   │   └── FileUpload.tsx               File upload with preview
│   ├── feedback/
│   │   ├── Toast.tsx                    Toast provider + hook
│   │   ├── useToast.ts                  Toast hook
│   │   ├── Badge.tsx                    Status badge component
│   │   ├── ProgressBar.tsx             Compact progress bar
│   │   └── StatusIndicator.tsx          Dot indicator + label
│   ├── modals/
│   │   └── Modal.tsx                    Modal with focus trap + Escape key
│   ├── charts/
│   │   ├── BaseChart.tsx               Shared chart wrapper (ResponsiveContainer + Tooltip + Legend)
│   │   ├── WorkforceChart.tsx          Line chart for trends
│   │   ├── StatusDistributionChart.tsx Donut chart for distributions
│   │   ├── ProjectHealthChart.tsx      Donut + bar for health
│   │   ├── RevenueTrendChart.tsx       Line for revenue
│   │   ├── TimesheetSubmissionChart.tsx Vertical bar
│   │   └── ResourceUtilizationChart.tsx Horizontal bar
│   └── ui/
│       ├── IconButton.tsx              Icon-only button
│       ├── Dropdown.tsx                Select dropdown
│       ├── Tabs.tsx                    Tab navigation
│       └── Tooltip.tsx                 Tooltip wrapper
├── hooks/
│   ├── useAuth.ts                      Current user + role
│   ├── useRole.ts                      Role checking helpers
│   ├── usePermissions.ts              Permission checking
│   ├── useToast.ts                    Toast notifications
│   ├── usePagination.ts               Pagination logic
│   ├── useDailyLogForm.ts             Form state for daily log
│   └── useTimesheetPeriod.ts          Period calculation hook
├── data/
│   ├── constants/
│   │   └── index.ts                    Tech roles, industries, client tiers, payment terms, billing periods, invoice statuses, timesheet statuses, task categories
│   └── mock/
│       ├── index.ts                   Data export
│       ├── clients.ts                 Client mock data (20 items)
│       ├── projects.ts                Project mock data (30 items)
│       ├── assignments.ts             Assignment mock data (50 items)
│       ├── dailyLogs.ts               Daily log mock data (300 items)
│       ├── timesheets.ts              Timesheet mock data (100 items)
│       ├── invoices.ts                Invoice mock data (25 items)
│       ├── invoiceTemplates.ts        Template mock data (5 items)
│       ├── users.ts                   Demo user mock data (6 items)
│       └── repositories.ts            Repository functions (40+ functions)
├── lib/
│   ├── permissions.ts                 Permission constants + role mapping + hasPermission helpers
│   ├── auth.ts                        Mock auth helpers (login, logout, token)
│   ├── utils.ts                       Date formatting, number formatting, etc.
│   └── charts.ts                      Shared chart config + color helpers
└── types/
    └── index.ts                       All TypeScript type definitions (30+ interfaces)
```

---

# 60. CONSTANTS REFERENCE

```typescript
// Tech roles
export const TECH_ROLES = [
  "Java Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "QA Engineer",
  "UI/UX Designer",
  "Project Manager",
  "Business Analyst",
  "Technical Lead",
  "Scrum Master",
  "Data Engineer",
  "Solution Architect",
] as const;

// Client tiers
export const CLIENT_TIERS = ["ENTERPRISE", "MID_MARKET", "SMB", "PROSPECT"] as const;

// Client statuses
export const CLIENT_STATUSES = ["PROSPECT", "ACTIVE", "INACTIVE", "SUSPENDED", "CLOSED"] as const;

// Project statuses
export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

// Project health
export const PROJECT_HEALTH = ["ON_TRACK", "AT_RISK", "DELAYED", "COMPLETED"] as const;

// Timesheet statuses
export const TIMESHEET_STATUSES = ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "REVISED", "PAID"] as const;

// Invoice statuses
export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID", "CANCELLED", "PARTIAL"] as const;

// Daily log statuses
export const DAILY_LOG_STATUSES = ["DRAFT", "SUBMITTED", "LOCKED"] as const;

// Billing types
export const BILLING_TYPES = ["BILLABLE", "NON_BILLABLE"] as const;

// Task categories
export const TASK_CATEGORIES = ["DEVELOPMENT", "TESTING", "REVIEW", "MEETING", "DESIGN", "OTHER"] as const;

// Payment terms
export const PAYMENT_TERMS = ["NET_15", "NET_30", "NET_45", "NET_60", "CUSTOM"] as const;

// Period types
export const PERIOD_TYPES = ["WEEKLY", "BI_WEEKLY", "BI_MONTHLY", "MONTHLY"] as const;

// Currencies
export const CURRENCIES = ["USD", "INR", "EUR", "GBP", "CAD"] as const;

// Industries
export const INDUSTRIES = [
  "Technology", "Manufacturing", "Consulting", "Healthcare",
  "Financial Services", "E-commerce", "Media & Entertainment",
  "Education", "Telecommunications", "Energy", "Logistics",
  "Real Estate", "Retail", "Non-Profit", "Government", "Other"
];

// Countries
export const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Germany", "France", "Japan", "Australia"];

// Invoice template fields
export const INVOICE_TERMS = [
  "Payment due within 30 days of invoice date.",
  "Late payments subject to 1.5% monthly interest.",
  "All amounts exclusive of applicable taxes.",
  "Please include invoice number in all correspondence."
];
```

---

# 61. BILLING PERIOD CALCULATION

```typescript
// Bi-monthly periods: 1st-15th and 16th-last day
// Period 1: 1st - 15th
// Period 2: 16th - last day of month

export function getBillingPeriodsForMonth(year: number, month: number): {
  period1: { start: string; end: string };
  period2: { start: string; end: string };
} {
  const period1Start = `${year}-${pad(month + 1)}-01`;
  const period1End = `${year}-${pad(month + 1)}-15`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const period2Start = `${year}-${pad(month + 1)}-16`;
  const period2End = `${year}-${pad(month + 1)}-${pad(lastDay)}`;

  return {
    period1: { start: period1Start, end: period1End },
    period2: { start: period2Start, end: period2End }
  };
}

export function getCurrentBillingPeriod(date: Date = new Date()) {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();

  if (day <= 15) {
    return {
      period: 1,
      start: `${year}-${pad(month + 1)}-01`,
      end: `${year}-${pad(month + 1)}-15`,
      label: `${formatMonth(month)} 1-15, ${year}`
    };
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      period: 2,
      start: `${year}-${pad(month + 1)}-16`,
      end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
      label: `${formatMonth(month)} 16-${lastDay}, ${year}`
    };
  }
}

export function getPreviousBillingPeriods(count: number = 6, date?: Date): BillingPeriod[] {
  // Returns the last N billing periods
}
```

---

# 62. AUTOMATED TIMESHEET COMPILATION

Daily logs are automatically compiled into bi-monthly timesheets.

```typescript
function compileTimesheet(employeeId: string, period: BillingPeriod): Timesheet {
  // 1. Gather all submitted daily logs for the employee within the period
  // 2. Group by project
  // 3. Calculate totals:
  //    - Regular hours (sum of all regularHours)
  //    - Overtime hours (sum of all overtimeHours)
  //    - Total hours
  //    - Billable hours (for BILLABLE logs only)
  //    - Billable amount (billableHours * employee's billRate)
  // 4. Set status to DRAFT
  // 5. Link daily log IDs
  // 6. Create project breakdown
}
```

The compiled timesheet appears in the employee's "My Timesheets" page with a DRAFT status, ready for submission.

When the employee submits, the timesheet transitions to SUBMITTED and becomes available for manager review.

---

# 63. INVOICE CALCULATION ENGINE

```typescript
function calculateInvoice(invoice: Partial<Invoice>): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  balanceDue: number;
} {
  // Subtotal = sum of all line item amounts
  const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
  
  // Tax only applies if taxRate > 0 (default 0 = no tax, matching professional services invoices)
  const taxAmount = invoice.taxRate && invoice.taxRate > 0
    ? subtotal * (invoice.taxRate / 100)
    : 0;
  const totalAmount = subtotal + taxAmount;
  const balanceDue = totalAmount - (invoice.amountPaid || 0);

  return { subtotal, taxAmount, totalAmount, balanceDue };
}

function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  });
  return formatter.format(amount);
}

function autoGenerateLineItems(input: InvoiceGenerationInput): InvoiceLineItem[] {
  // 1. Find approved timesheets for client in period
  // 2. Group by resource type (geography + role)
  // 3. For each group:
  //    - description = `${geography} ${role}`
  //    - quantity = 1.00
  //    - rate = standard resource rate (or average of group's bill rates)
  //    - amount = quantity × rate
  // 4. Sort by rate descending (highest-paid resources first, matching PDF)
}

function generateResourceName(employee: Employee): string {
  const geographyMap: Record<string, string> = {
    "United States": "US Based",
    "United Kingdom": "EU Based",
    "Germany": "EU Based",
    "France": "EU Based",
    "India": "India-Based",
  };
  const geo = geographyMap[employee.country] ?? employee.country;
  return `${geo} ${employee.techRole ?? employee.designation}`;
}
```

---

# 64. FINAL IMPLEMENTATION NOTES

1. **All routes must be created in the router** — even placeholder pages must have routes (Phase 22 audit requirement).

2. **PermissionGuard on every protected route** — even read-only routes need protection for direct URL access.

3. **Loading states everywhere** — `DataTable` supports `loading` prop with skeleton rows; dashboard cards have loading placeholders.

4. **No Math.random in feature code** — mock data must be deterministic. Random values pre-computed at data-generation time, not at render time.

5. **ToastProvider at the shell level** — so all features can call `useToast()` without importing providers per-module.

6. **The `/analytics` route must exist** — it's in the sidebar, so it needs a route even if it's a simple page.

7. **403 redirect target** — unauthorized users redirect to `/403`, not `/dashboard`.

8. **All 5 roles must work** — including the HR "access denied" case and the blocked non-billable employee case.

9. **Consistent error format** — all API errors (even mock) should return `{ success: false, error: { code, message } }`.

10. **Audit trail on all actions** — every create/update/approve/reject in the mock layer should generate an audit entry (even if it's just appended to a mock array).

---

# 65. PRIORITY ORDERING

The phases should be implemented in this order:

| Priority | Phase | Rationale |
|----------|-------|-----------|
| P0 | 1 (Foundation) | Without the shell, nothing else can be built |
| P0 | 2 (Dashboards) | First thing users see; validates permission system |
| P1 | 3 (Clients) | Clients are the root entity for CMS |
| P1 | 4 (Projects) | Projects are children of clients |
| P1 | 5 (Assignments) | Links employees to projects — needed for timesheets |
| P2 | 6 (Daily Logs) | Core time entry — employees need this first |
| P2 | 7 (Timesheets) | Compiles daily logs — the "why we're here" feature |
| P2 | 8 (Invoices) | Billing — the business value of the CMS |
| P3 | 9 (Reports) | Nice-to-have analytics |
| P3 | 10 (Analytics) | Dashboard extras |
| P3 | 11-13 (Notifications, Audit, Settings) | Cross-cutting concerns |
| P4 | 14 (Polish) | UI/UX refinements |
| P4 | 15 (Routes/Permissions Audit) | Verification |
| P4 | 16 (Testing) | Quality assurance |

---

# 66. SUCCESS CRITERIA

The CMS frontend is complete when:

1. All 5 roles can log in and see appropriate dashboards
   - ADMIN: full access
   - HR: access denied with explanation page
   - MANAGER: full client/project/timesheet/invoice access
   - SUPERVISOR: read + review access to assigned projects
   - EMPLOYEE: self-service daily logs + own timesheets

2. All routes exist in the router (no broken links)

3. All routes are permission-guarded (direct URL access blocked)

4. All forms validate inputs and show errors inline

5. All tables support sorting, filtering, and pagination

6. All dashboards show KPI cards + data visualizations

7. Daily logs can be created, edited, and deleted

8. Timesheets auto-compile from daily logs and can be submitted/revised

9. Invoices can be created (manual + auto-populate), sent, and tracked

10. Reports generate and display data with export options

11. Notifications display and can be marked read

12. Audit log shows all system actions (read-only)

13. Settings page is accessible to Admin only

14. Profile page allows self-service edits

15. Application builds with zero errors and all tests pass

16. No `Math.random` in feature code (deterministic mock data)

17. ToastProvider wired at shell level for all toast usage

18. `tsc --noEmit` clean
19. `vite build` passes
20. `oxlint` passes (0 new warnings)

---

# Document End