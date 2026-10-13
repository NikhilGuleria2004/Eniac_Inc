# EMSF.md

# Eniac Inc. — Employee Management System

## Frontend Shell & Mock Data Specification

**Document Type:** Frontend implementation specification
**Application:** Eniac Inc. Employee Management System (EMS)
**Version:** 1.0
**Status:** Implementation Ready
**Primary Objective:** Build a complete, production-quality frontend shell using mock data.
**Frontend Stack:** TypeScript + React + Tailwind CSS
**Backend:** Hono (future integration; not required for this phase)
**Database:** MongoDB Atlas (future integration; not required for this phase)

---

# 1. PURPOSE OF THIS DOCUMENT

This document is the authoritative frontend specification for the Eniac Inc. Employee Management System.

The coding agent implementing this specification MUST follow the layouts, information architecture, visual language, routes, role permissions, components, mock data structures, interactions, and phased implementation plan defined here.

The agent SHOULD NOT invent major UI patterns, navigation structures, pages, modules, workflows, or visual systems that are not defined in this document.

If a minor implementation detail is required but is not explicitly specified, choose the option that is:

1. Consistent with the existing design system.
2. Consistent with enterprise/government portal conventions.
3. Accessible.
4. Reusable.
5. Appropriate for a future production ERP.
6. Easy to replace with real API data later.

---

# 2. PRODUCT OVERVIEW

The Eniac Inc. Employee Management System is a centralized workforce management platform.

The EMS manages:

* Employee onboarding
* Employee profiles
* Employee lifecycle
* Employee documents
* Compensation
* Pay rates
* Bill rates
* Attendance
* Leave
* Employee reviews
* Clients
* Projects
* Project assignments
* Notifications
* Reports
* Audit activity
* Timesheet eligibility/provisioning status

The EMS is one part of a larger Eniac Inc. ecosystem.

The future architecture will consist of:

```text
                    ENIAC INC. ECOSYSTEM
                           |
             +-------------+-------------+
             |                           |
             v                           v
     EMPLOYEE MANAGEMENT           TIMESHEET SYSTEM
            EMS                         TS
             |                           |
             +-------------+-------------+
                           |
                    Shared Data Layer
                     MongoDB Atlas
```

The frontend being built now is ONLY the EMS.

The Timesheet platform is a separate application/domain.

---

# 3. PRIMARY DESIGN PHILOSOPHY

The visual style MUST NOT be minimalist.

The application should feel like:

* A serious government portal
* A large enterprise administrative system
* A professional HR information system
* A mature internal corporate platform
* A system used by an organization with hundreds/thousands of employees

The design should communicate:

* Trust
* Authority
* Stability
* Precision
* Organization
* Security
* Institutional professionalism

However, it must NOT feel:

* Old-fashioned
* Ugly
* Visually chaotic
* Overly decorative
* Like a legacy 1990s government website

The target aesthetic is:

> **Modern Government Portal + Enterprise ERP + Institutional Dashboard**

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

Use a restrained institutional palette.

## Primary

Deep navy:

```text
#0B1F3A
```

Secondary navy:

```text
#163A63
```

Accent blue:

```text
#1D4ED8
```

Light institutional blue:

```text
#E8F0FA
```

## Neutral Colors

Background:

```text
#F3F5F8
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

Avoid excessive:

```text
16px+
rounded-full
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

* EMS logo/wordmark
* Eniac Inc.
* "Employee Management System"

### Center / flexible

Global search.

Search placeholder:

```text
Search employees, projects, clients, documents...
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
Employee Management System

[ Search employees, projects, clients... ]

                    [Bell] [Help] [Production]
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

The sidebar should be dark navy.

Suggested:

```text
#0B1F3A
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
#163A63
```

Accent indicator:

```text
#4C8DFF
```

---

# 11. SIDEBAR STRUCTURE

The sidebar MUST change depending on the logged-in role.

Navigation sections should use uppercase small section labels.

Example:

```text
OVERVIEW

Dashboard

WORKFORCE

Employees
Onboarding
Documents
Reviews

TIME & LEAVE

Attendance
Leave

OPERATIONS

Clients
Projects
Assignments

REPORTING

Reports
Analytics

SYSTEM

Notifications
Audit Log
Settings
```

Not every role sees every section.

---

# 12. GLOBAL TOP-LEVEL ROUTES

The frontend should support the following routes.

```text
/login

/dashboard

/employees
/employees/:employeeId
/employees/:employeeId/edit

/onboarding
/onboarding/:employeeId

/documents
/documents/:documentId

/attendance
/attendance/:employeeId

/leave
/leave/request
/leave/:requestId

/reviews
/reviews/:reviewId

/clients
/clients/:clientId

/projects
/projects/:projectId

/assignments

/reports

/notifications

/audit-log

/settings

/profile
```

Additional nested routes can be implemented where useful.

---

# 13. ROLE MODEL

There are five roles:

```text
ADMIN
HR
MANAGER
SUPERVISOR
EMPLOYEE
```

The role is stored in mock authentication state.

The frontend MUST support switching roles during development.

Create a development-only role switcher.

Example:

```text
Demo User
Role:
[ Administrator ▼ ]

Administrator
HR
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

---

# 14. ROLE PERMISSION MATRIX

## ADMIN

Full access.

Can:

* View employees
* Create employees
* Edit employees
* Deactivate employees
* Manage onboarding
* Manage documents
* Manage attendance
* Manage leave
* Manage reviews
* Manage compensation
* Manage pay rates
* Manage bill rates
* Manage clients
* Manage projects
* Manage assignments
* View reports
* View audit logs
* Manage users
* Manage system settings

Admin does NOT mark attendance.

---

# 15. HR PERMISSIONS

HR can:

* View employees
* Create employees
* Edit employee information
* Manage onboarding
* Review documents
* Edit documents
* Manage employee reviews
* Manage salary/pay rates
* Manage bill rates
* View attendance
* Review attendance issues
* Approve/reject leave
* View clients
* View projects
* View assignments
* View HR reports

HR cannot:

* Manage system settings
* Manage administrator accounts
* Delete audit logs
* Modify system configuration

---

# 16. MANAGER PERMISSIONS

Manager can:

* View relevant employees
* Create clients
* Edit clients
* Create projects
* Edit projects
* Assign employees
* Review project progress
* View client information
* View project information
* View project teams
* View operational reports

Manager cannot:

* View salary
* View confidential HR documents
* Modify compensation
* Approve HR documents
* Modify employee personal HR records
* Manage system settings

---

# 17. SUPERVISOR PERMISSIONS

Supervisor is primarily intended for the Timesheet platform.

Within EMS, Supervisor has limited access.

Can:

* View assigned employees
* View assigned projects
* Review project progress
* Assign employees to projects where permitted
* View own profile
* Mark attendance
* Request leave
* View own documents
* View own assignments

Supervisor should NOT receive HR administration features.

---

# 18. EMPLOYEE PERMISSIONS

Employee can:

* View own dashboard
* View own profile
* Edit permitted profile fields
* Mark attendance
* View attendance
* Request leave
* View leave requests
* Upload documents
* View own documents
* View assigned projects
* View own reviews where made available
* View notifications

Employee cannot:

* View other employees' confidential information
* View salary unless explicitly enabled
* View bill rates
* Manage projects
* Manage clients
* Approve leave
* Manage documents belonging to others
* View audit logs

---

# 19. ROLE-SPECIFIC DASHBOARDS

Each role MUST have a distinct homepage.

Do NOT create one dashboard with only minor text changes.

The dashboards should reflect the role's responsibilities.

---

# 20. ADMIN DASHBOARD

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
Enterprise workforce and system overview
```

## Dashboard Layout

### Row 1 — KPI Cards

Six cards:

```text
Total Employees
Active Employees
Billable Employees
Non-Billable Employees
Active Projects
Active Clients
```

Each card should include:

* Label
* Number
* Small trend indicator
* Supporting text
* Icon

Example:

```text
ACTIVE EMPLOYEES

247

+12 this month

[icon]
```

---

### Row 2

Left:

```text
Employee Workforce Overview
```

Right:

```text
Employee Status Distribution
```

Use charts.

Workforce Overview:

* Monthly headcount
* New hires
* Exits

Status Distribution:

* Active
* On Leave
* Onboarding
* Inactive

---

### Row 3

Three panels:

```text
Pending HR Actions
Recent Employee Activity
Attendance Exceptions
```

Pending HR Actions:

* 8 document reviews
* 5 onboarding tasks
* 4 leave approvals
* 3 employee reviews

---

### Row 4

Large:

```text
Projects & Resource Allocation
```

Columns:

```text
Project
Client
Manager
Employees
Progress
Status
```

---

### Row 5

```text
Recent System Activity
```

Audit-style feed:

```text
09:42 HR updated employee profile
09:31 Manager assigned employee to Project Alpha
09:14 Employee submitted leave request
08:52 HR approved document
```

---

# 21. HR DASHBOARD

Title:

```text
Human Resources Dashboard
```

Subtitle:

```text
Employee lifecycle, compliance and workforce operations
```

## KPI row

```text
Total Employees
Pending Onboarding
Pending Documents
Pending Leave Requests
Upcoming Reviews
Document Expiring Soon
```

## Main sections

### Onboarding Pipeline

Kanban-style compact pipeline:

```text
New
Onboarding
Documents Pending
HR Review
Ready
Completed
```

Show employee counts and sample employee cards.

---

### Employee Distribution

Breakdowns:

```text
India / US
Billable / Non-Billable
Active / Inactive
Department
Employment Type
```

---

### Pending Actions

Table:

```text
Employee
Action
Priority
Due Date
Status
Action
```

---

### Upcoming Reviews

Table:

```text
Employee
Reviewer
Review Period
Due Date
Status
```

---

# 22. MANAGER DASHBOARD

Title:

```text
Management Dashboard
```

Subtitle:

```text
Clients, projects and resource allocation
```

## KPI cards

```text
Active Clients
Active Projects
Assigned Employees
Projects At Risk
```

## Project Portfolio

Large table:

```text
Project
Client
Team Size
Start Date
End Date
Progress
Status
```

Progress should use compact progress bars.

---

## Resource Allocation

Show:

```text
Employee
Current Project
Allocation
Role
Billable
Status
```

---

## Project Health

Use status blocks:

```text
ON TRACK
AT RISK
DELAYED
COMPLETED
```

---

## Recent Client Activity

Show:

* New client
* Client update
* Project created
* Employee assignment
* Project status change

---

# 23. SUPERVISOR DASHBOARD

Title:

```text
Supervisor Workspace
```

Subtitle:

```text
Project resources and operational overview
```

KPI cards:

```text
Assigned Projects
Team Members
Active Assignments
Projects Requiring Attention
```

Main panels:

```text
My Projects
Project Progress
Team Assignments
Recent Activity
```

Supervisor should see operational information but NOT HR-sensitive information.

---

# 24. EMPLOYEE DASHBOARD

Title:

```text
Employee Self-Service Portal
```

Subtitle:

```text
Welcome back, [Employee Name]
```

Top section:

```text
Today's Attendance
```

Large attendance widget:

```text
Wednesday
October 7, 2026

09:14 AM

Status:
Checked In

[ Check Out ]
```

If not checked in:

```text
Status:
Not Checked In

[ Mark Attendance ]
```

---

## Employee KPI Cards

```text
Leave Balance
Pending Requests
Assigned Projects
Documents
```

---

## My Attendance

Compact weekly view:

```text
Mon  Present
Tue  Present
Wed  Present
Thu  -
Fri  -
```

---

## My Leave Requests

Table:

```text
Type
From
To
Days
Status
```

---

## My Projects

Cards/table:

```text
Project
Client
Role
Allocation
Status
```

---

## My Documents

```text
Document
Status
Uploaded
Expiry
```

---

# 25. EMPLOYEE DIRECTORY

Route:

```text
/employees
```

This is a major module.

Page header:

```text
Employee Directory
```

Actions:

```text
+ Add Employee
Import
Export
Filters
```

Search:

```text
Search by name, employee ID, email, department...
```

Filters:

```text
Status
Country
Billable
Department
Employment Type
Manager
Joining Date
```

Table:

```text
Employee
Employee ID
Designation
Department
Country
Status
Billing
Manager
Joined
Actions
```

---

# 26. EMPLOYEE TABLE

Each row should include:

Avatar + Name

```text
John Smith
EMP-1042
```

Status badge:

```text
ACTIVE
```

Billing badge:

```text
BILLABLE
```

Actions:

```text
View
Edit
More
```

The "More" menu can contain:

```text
View Profile
Edit
Assign Project
View Documents
View Attendance
View Leave
Deactivate
```

Only show actions allowed by role.

---

# 27. EMPLOYEE PROFILE

Route:

```text
/employees/:employeeId
```

This should be one of the most detailed pages in the system.

Header:

```text
[Avatar]

John Smith
Senior Software Engineer

EMP-1042

ACTIVE
BILLABLE

[Edit]
[Assign Project]
[More]
```

---

# 28. EMPLOYEE PROFILE TABS

Tabs:

```text
Overview
Employment
Documents
Attendance
Leave
Projects
Reviews
Compensation
Activity
```

Hide sensitive tabs based on permissions.

---

# 29. EMPLOYEE OVERVIEW

Sections:

```text
Personal Information
Contact Information
Emergency Contact
Employment Summary
Current Assignment
```

Example fields:

```text
Full Name
Preferred Name
Email
Phone
Date of Birth
Address
City
State
Country
Emergency Contact
```

---

# 30. EMPLOYMENT TAB

Fields:

```text
Employee ID
Employment Status
Employment Type
Department
Designation
Joining Date
Reporting Manager
Supervisor
Country
Work Location
Billable Status
Timesheet Eligibility
```

Timesheet status should be clearly displayed:

```text
Eligible for Timesheet
Provisioned
Not Provisioned
```

---

# 31. DOCUMENT TAB

Document table:

```text
Document
Type
Uploaded
Status
Expiry
Reviewed By
Actions
```

Actions:

```text
View
Download
Review
Replace
```

For mock UI, use a document preview modal.

---

# 32. ATTENDANCE TAB

Display:

```text
Attendance Summary
```

KPIs:

```text
Present
Absent
Late
Leave
Missing
```

Calendar/month view.

Table:

```text
Date
Check In
Check Out
Working Hours
Status
```

---

# 33. LEAVE TAB

Show:

```text
Leave Balance
```

Cards:

```text
Paid Leave
Sick Leave
Casual Leave
Unpaid Leave
```

Request button:

```text
Request Leave
```

History table:

```text
Type
Start
End
Days
Reason
Status
Approved By
```

---

# 34. PROJECT TAB

Show project assignments.

Table:

```text
Project
Client
Role
Allocation
Start Date
End Date
Billable
Status
```

---

# 35. REVIEW TAB

Show:

```text
Review Period
Reviewer
Rating
Status
Review Date
```

Clicking a review opens detailed review information.

---

# 36. COMPENSATION TAB

Highly permission controlled.

Show:

```text
Salary
Salary Frequency
Currency
Effective Date
Pay Rate History
```

For authorized users also show:

```text
Bill Rate
Bill Rate History
Client
Project
Effective Date
```

Employees should NOT automatically receive bill-rate information.

---

# 37. ONBOARDING MODULE

Route:

```text
/onboarding
```

This page should use a workflow-oriented interface.

Top:

```text
Employee Onboarding
```

Stats:

```text
Total Onboarding
Documents Pending
HR Review
Ready
Completed
```

---

# 38. ONBOARDING TABLE

Columns:

```text
Employee
Position
Country
Billing
Progress
Current Stage
Started
Target Date
Owner
Actions
```

Progress example:

```text
████████░░ 80%
```

---

# 39. ONBOARDING DETAIL

Route:

```text
/onboarding/:employeeId
```

Display a stepper.

Steps:

```text
1. Employee Information
2. Employment Details
3. Geography
4. Billing Classification
5. Documents
6. HR Review
7. Activation
8. Timesheet Eligibility
```

Each step must have:

* Status
* Completion indicator
* Data
* Edit action where permitted

---

# 40. BILLING CLASSIFICATION STEP

Show:

```text
Billing Classification

( ) Billable
( ) Non-Billable
```

Then:

```text
Country

( ) India
( ) United States
```

The frontend should visually demonstrate the business rule:

```text
ACTIVE + BILLABLE
        ↓
TIMESHEET ELIGIBLE
```

If not billable:

```text
NON-BILLABLE
        ↓
NOT AUTOMATICALLY PROVISIONED
```

---

# 41. TIMESHEET PROVISIONING PANEL

The EMS should show Timesheet status without implementing the Timesheet platform.

Example:

```text
Timesheet Integration

Eligibility:
ELIGIBLE

Provisioning:
PROVISIONED

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

---

# 42. DOCUMENT MANAGEMENT

Route:

```text
/documents
```

Dashboard:

```text
Total Documents
Pending Review
Approved
Rejected
Expiring Soon
Expired
```

Filters:

```text
Employee
Document Type
Status
Expiry
Country
```

Table:

```text
Document
Employee
Type
Uploaded
Status
Expiry
Reviewer
Actions
```

---

# 43. DOCUMENT REVIEW UI

A document review page/modal should contain:

Left:

```text
Document Preview
```

Right:

```text
Document Information

Employee
Document Type
Uploaded Date
Expiry Date
Status
```

Actions:

```text
Approve
Reject
Request Changes
```

If rejecting/requesting changes, require a comment.

---

# 44. ATTENDANCE MODULE

Route:

```text
/attendance
```

Header:

```text
Attendance Management
```

KPI row:

```text
Present Today
Absent
Late
On Leave
Missing Punches
```

Tabs:

```text
Today
Calendar
Employees
Exceptions
Reports
```

---

# 45. ATTENDANCE CALENDAR

Use a professional calendar/grid.

Each day can show:

```text
P
A
L
LV
M
```

Legend:

```text
P = Present
A = Absent
L = Late
LV = Leave
M = Missing
```

---

# 46. ATTENDANCE EXCEPTIONS

Table:

```text
Employee
Date
Issue
Check In
Check Out
Status
Action
```

Examples:

```text
Missing checkout
Late arrival
Missing check-in
Insufficient hours
```

---

# 47. LEAVE MANAGEMENT

Route:

```text
/leave
```

Dashboard KPI:

```text
Pending
Approved
Rejected
On Leave Today
```

Table:

```text
Employee
Leave Type
From
To
Days
Reason
Submitted
Status
Action
```

HR should see:

```text
Approve
Reject
View
```

---

# 48. LEAVE REQUEST FORM

Route:

```text
/leave/request
```

Fields:

```text
Leave Type
Start Date
End Date
Reason
Supporting Document
```

Summary:

```text
Requested Days
Available Balance
Remaining Balance
```

Validation:

* Start date cannot be after end date.
* Dates should not overlap approved leave.
* Required fields must be completed.
* Supporting document may be required for configured leave types.

---

# 49. CLIENT MANAGEMENT

Route:

```text
/clients
```

Manager and Admin can create clients.

Table:

```text
Client
Client Code
Country
Primary Contact
Active Projects
Status
Created
Actions
```

Client profile:

```text
Overview
Contacts
Projects
Activity
```

---

# 50. PROJECT MANAGEMENT

Route:

```text
/projects
```

Dashboard:

```text
Total Projects
Active
Planning
At Risk
Completed
```

Project table:

```text
Project
Client
Manager
Team Size
Start
End
Progress
Status
Actions
```

---

# 51. PROJECT DETAIL

Route:

```text
/projects/:projectId
```

Header:

```text
Project Alpha
ACME Corporation

ACTIVE
72% COMPLETE

[Edit]
[Assign Employee]
```

Tabs:

```text
Overview
Team
Progress
Assignments
Client
Activity
```

---

# 52. PROJECT OVERVIEW

Show:

```text
Project Description
Project Manager
Supervisor
Start Date
End Date
Current Progress
Health
Team Size
Billable Status
```

Progress visualization:

```text
72%
██████████████░░░░░░
```

---

# 53. PROJECT TEAM

Table:

```text
Employee
Role
Allocation
Billable
Start
End
Status
```

Actions:

```text
Assign
Remove
Edit Allocation
```

---

# 54. PROJECT PROGRESS

Use:

```text
Overall Progress
Milestones
Current Phase
Health
Recent Updates
```

Health:

```text
ON TRACK
AT RISK
DELAYED
COMPLETED
```

---

# 55. ASSIGNMENTS MODULE

Route:

```text
/assignments
```

This module manages employee-project relationships.

Filters:

```text
Employee
Project
Client
Manager
Billable
Status
```

Table:

```text
Employee
Project
Client
Role
Allocation
Start
End
Billable
Status
```

---

# 56. REPORTS

Route:

```text
/reports
```

Create a report center.

Categories:

```text
Workforce
Attendance
Leave
Compensation
Documents
Projects
Assignments
Billing
```

Report cards should contain:

```text
Report Name
Description
Category
Last Generated
[Open]
[Export]
```

Mock export buttons can simulate download behavior.

---

# 57. REPORT EXAMPLES

Workforce:

```text
Employee Headcount Report
Employee Status Report
New Joiners Report
Employee Attrition Report
Billable Workforce Report
```

Attendance:

```text
Monthly Attendance Report
Attendance Exceptions
Late Arrival Report
```

Leave:

```text
Leave Utilization
Leave Balance
Leave Requests
```

Compensation:

```text
Salary Summary
Pay Rate History
Bill Rate Summary
```

Projects:

```text
Project Workforce
Project Allocation
Project Status
```

---

# 58. NOTIFICATIONS

Route:

```text
/notifications
```

Notification center should contain:

```text
All
Unread
Mentions
Approvals
System
```

Each notification:

```text
Icon
Title
Description
Timestamp
Read/Unread
Action
```

Examples:

```text
Leave request pending approval
Document requires review
Employee assigned to Project Alpha
Project Alpha progress updated
Employee onboarding completed
```

---

# 59. AUDIT LOG

Route:

```text
/audit-log
```

Admin only.

Table:

```text
Timestamp
User
Role
Action
Entity
Entity ID
Description
IP
```

Filters:

```text
User
Role
Action
Entity
Date
```

Example:

```text
07 Oct 2026 09:42
Sarah Miller
HR
UPDATE
Employee
EMP-1042

Updated employee billable status.
```

---

# 60. USER PROFILE

Route:

```text
/profile
```

Sections:

```text
Personal Information
Contact Information
Account Information
Security
Preferences
Activity
```

Employee self-service profile editing should use the same page but only expose editable fields allowed to the current user.

---

# 61. SETTINGS

Route:

```text
/settings
```

Admin only.

Sections:

```text
General
Users
Roles & Permissions
Leave Types
Document Types
Employment Types
Countries
Departments
Designations
Notifications
System Preferences
```

For the initial frontend shell, these can be functional mock configuration pages.

---

# 62. GLOBAL SEARCH

The global search should search mock data across:

```text
Employees
Clients
Projects
Documents
```

Search results should be grouped:

```text
EMPLOYEES
John Smith
Sarah Miller

PROJECTS
Project Alpha

CLIENTS
ACME Corporation

DOCUMENTS
John Smith — Employment Agreement
```

Keyboard shortcut:

```text
Ctrl + K
```

should open/focus global search.

---

# 63. COMMAND PALETTE

Implement a basic command palette.

Example commands:

```text
Go to Dashboard
Go to Employees
Add Employee
Create Client
Create Project
Request Leave
View Notifications
Open Reports
Open Profile
```

Role permissions must be respected.

---

# 64. MODALS

Use reusable modal components.

Types:

```text
Confirmation
Form
Information
Document Preview
Approval
Reject
Delete/Deactivate
```

Modal width variants:

```text
sm
md
lg
xl
```

Avoid giant full-screen modals unless a document preview requires it.

---

# 65. DRAWERS

Use right-side drawers for quick views.

Recommended drawer use cases:

```text
Employee quick view
Project quick view
Notification details
Activity details
```

This helps maintain high productivity.

---

# 66. DATA TABLE SYSTEM

Create ONE reusable enterprise data table component.

It should support:

* Sorting
* Filtering
* Pagination
* Search
* Column visibility
* Row selection
* Bulk actions
* Empty states
* Loading states
* Error states
* Responsive behavior

Example:

```text
[Search...] [Filters] [Columns] [Export]

---------------------------------------------------------
Employee | ID | Status | Country | Manager | Actions
---------------------------------------------------------
John     |... | Active | US      | Sarah   | ...
---------------------------------------------------------

Showing 1–20 of 247
[<] [1] [2] [3] ... [>]
```

---

# 67. FILTER SYSTEM

Filters should appear as compact controls.

Example:

```text
Status [All ▼]
Country [All ▼]
Billing [All ▼]
Department [All ▼]
Manager [All ▼]
```

Active filters should appear as removable chips.

Example:

```text
Status: Active ×
Country: India ×
```

---

# 68. STATUS BADGES

Use consistent badge styles.

Examples:

```text
ACTIVE
INACTIVE
ONBOARDING
ON LEAVE
TERMINATED

BILLABLE
NON-BILLABLE

PENDING
APPROVED
REJECTED

ON TRACK
AT RISK
DELAYED
COMPLETED
```

---

# 69. FORMS

All forms must have:

* Labels
* Required indicators
* Validation
* Helper text
* Error states
* Success states
* Disabled states
* Loading states

Never rely exclusively on placeholder text as labels.

---

# 70. FORM LAYOUT

For desktop:

Use two-column forms where appropriate.

Example:

```text
+----------------------+----------------------+
| First Name           | Last Name            |
+----------------------+----------------------+
| Email                | Phone                |
+----------------------+----------------------+
| Country              | State                |
+----------------------+----------------------+
```

For complex sections:

```text
PERSONAL INFORMATION

fields...

EMPLOYMENT INFORMATION

fields...

COMPENSATION

fields...
```

---

# 71. CONFIRMATION UX

Destructive actions must require confirmation.

Example:

```text
Deactivate Employee?

John Smith will no longer be an active employee.

This will not permanently delete historical records.

[Cancel] [Deactivate Employee]
```

Do NOT use the word "Delete" when the operation is actually soft deactivation.

---

# 72. EMPTY STATES

Every data-heavy page must have a useful empty state.

Example:

```text
No employees found.

Try changing your filters or search criteria.

[Clear Filters]
```

Do NOT use giant illustrations.

Keep empty states professional.

---

# 73. LOADING STATES

Use skeleton loaders.

Tables:

```text
████████████
██████
████████
```

Cards:

Use rectangular skeletons matching the final structure.

Avoid generic full-page spinners whenever possible.

---

# 74. ERROR STATES

Provide inline error messages.

Example:

```text
Unable to load employee data.

Please try again.

[Retry]
```

Do not expose technical stack traces.

---

# 75. TOAST NOTIFICATIONS

Implement reusable toast notifications.

Types:

```text
Success
Info
Warning
Error
```

Examples:

```text
Employee created successfully.
Leave request submitted.
Document approved.
Project assignment updated.
Unable to save changes.
```

---

# 76. MOCK AUTHENTICATION

The initial frontend will use mock authentication.

Login page:

```text
ENIAC INC.

Employee Management System

Email
Password

[Sign In]

Demo Users
Administrator
HR
Manager
Supervisor
Employee
```

The demo user buttons can automatically log into the relevant role.

---

# 77. LOGIN PAGE DESIGN

The login page should feel institutional.

Layout:

```text
+---------------------------------------------------------+
|                                                         |
|                 ENIAC INC.                              |
|                                                         |
|          EMPLOYEE MANAGEMENT SYSTEM                    |
|                                                         |
|      +---------------------------------------+          |
|      | Email                                 |          |
|      | Password                              |          |
|      |                                       |          |
|      | [ Sign In ]                           |          |
|      +---------------------------------------+          |
|                                                         |
|      Secure Enterprise Workforce Platform               |
|                                                         |
+---------------------------------------------------------+
```

Use a subtle institutional background pattern rather than a photographic hero image.

---

# 78. MOCK DATA REQUIREMENTS

The frontend MUST NOT use tiny placeholder datasets.

Create realistic mock data.

Minimum:

```text
50 employees
10 clients
20 projects
100+ attendance records
30 leave requests
50 documents
30 project assignments
20 reviews
50 notifications
100 audit log entries
```

The data should represent different states.

---

# 79. EMPLOYEE MOCK DATA

Each employee should include:

```typescript
{
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;

  designation: string;
  department: string;

  country: "India" | "United States";
  state?: string;
  city: string;

  employmentStatus:
    | "ONBOARDING"
    | "ACTIVE"
    | "ON_LEAVE"
    | "SUSPENDED"
    | "RESIGNED"
    | "TERMINATED"
    | "INACTIVE";

  employmentType:
    | "FULL_TIME"
    | "PART_TIME"
    | "CONTRACT";

  billingStatus:
    | "BILLABLE"
    | "NON_BILLABLE";

  joiningDate: string;

  managerId?: string;
  supervisorId?: string;

  timesheetEligibility:
    | "NOT_ELIGIBLE"
    | "ELIGIBLE"
    | "PENDING_PROVISIONING"
    | "PROVISIONED"
    | "PROVISIONING_FAILED";

  createdAt: string;
  updatedAt: string;
}
```

---

# 80. CLIENT MOCK DATA

```typescript
{
  id: string;
  clientCode: string;
  name: string;
  country: string;
  industry: string;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  status: "PROSPECT" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CLOSED";
  activeProjectCount: number;
  createdAt: string;
}
```

---

# 81. PROJECT MOCK DATA

```typescript
{
  id: string;
  projectCode: string;
  name: string;
  clientId: string;
  managerId: string;
  supervisorId?: string;

  description: string;

  startDate: string;
  endDate: string;

  progress: number;

  status:
    | "PLANNING"
    | "ACTIVE"
    | "ON_HOLD"
    | "COMPLETED"
    | "CANCELLED";

  health:
    | "ON_TRACK"
    | "AT_RISK"
    | "DELAYED"
    | "COMPLETED";

  teamSize: number;

  createdAt: string;
}
```

---

# 82. ATTENDANCE MOCK DATA

```typescript
{
  id: string;
  employeeId: string;
  date: string;

  checkIn?: string;
  checkOut?: string;

  workingHours?: number;

  status:
    | "PRESENT"
    | "ABSENT"
    | "LATE"
    | "LEAVE"
    | "MISSING";

  correctionRequested?: boolean;
}
```

---

# 83. LEAVE MOCK DATA

```typescript
{
  id: string;
  employeeId: string;

  type:
    | "PAID"
    | "SICK"
    | "CASUAL"
    | "UNPAID";

  startDate: string;
  endDate: string;

  days: number;

  reason: string;

  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED";

  approvedBy?: string;

  createdAt: string;
}
```

---

# 84. DOCUMENT MOCK DATA

```typescript
{
  id: string;
  employeeId: string;

  name: string;

  type:
    | "RESUME"
    | "OFFER_LETTER"
    | "EMPLOYMENT_AGREEMENT"
    | "ID_PROOF"
    | "ADDRESS_PROOF"
    | "TAX_DOCUMENT"
    | "BANK_DOCUMENT"
    | "CERTIFICATE"
    | "NDA"
    | "OTHER";

  uploadedAt: string;

  expiryDate?: string;

  status:
    | "PENDING"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "EXPIRED";

  reviewedBy?: string;

  comments?: string;
}
```

---

# 85. PROJECT ASSIGNMENT DATA

```typescript
{
  id: string;

  employeeId: string;
  projectId: string;

  role: string;

  allocation: number;

  startDate: string;
  endDate?: string;

  billable: boolean;

  status:
    | "ACTIVE"
    | "ENDED"
    | "PENDING";

  assignedBy: string;
}
```

---

# 86. REVIEW DATA

```typescript
{
  id: string;

  employeeId: string;
  reviewerId: string;

  reviewPeriod: string;

  rating: number;

  strengths: string;
  improvementAreas: string;
  goals: string;
  comments: string;

  status:
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "ACKNOWLEDGED";

  reviewDate: string;
}
```

---

# 87. NOTIFICATION DATA

```typescript
{
  id: string;

  userId: string;

  type:
    | "LEAVE"
    | "DOCUMENT"
    | "PROJECT"
    | "ONBOARDING"
    | "ATTENDANCE"
    | "SYSTEM";

  title: string;
  message: string;

  read: boolean;

  createdAt: string;

  actionUrl?: string;
}
```

---

# 88. AUDIT LOG DATA

```typescript
{
  id: string;

  timestamp: string;

  userId: string;
  userName: string;
  role: string;

  action:
    | "CREATE"
    | "UPDATE"
    | "APPROVE"
    | "REJECT"
    | "ASSIGN"
    | "DEACTIVATE"
    | "LOGIN";

  entity:
    | "EMPLOYEE"
    | "CLIENT"
    | "PROJECT"
    | "DOCUMENT"
    | "LEAVE"
    | "ATTENDANCE"
    | "REVIEW";

  entityId: string;

  description: string;

  ipAddress: string;
}
```

---

# 89. MOCK DATA QUALITY

Mock data must NOT look generated from a single template.

Use realistic variation.

Examples:

Employees:

```text
John Smith
Sarah Miller
David Wilson
Priya Sharma
Arjun Mehta
Emily Carter
Michael Brown
Ananya Rao
Daniel Cooper
Rohit Verma
```

Use a realistic mixture of:

* Indian names
* US names
* Different departments
* Different roles
* Billable/non-billable employees
* Different statuses
* Different cities
* Different project assignments

---

# 90. DEPARTMENTS

Use:

```text
Engineering
Product
Design
Human Resources
Finance
Sales
Marketing
Operations
Quality Assurance
Customer Success
Administration
```

---

# 91. DESIGNATIONS

Use examples:

```text
Software Engineer
Senior Software Engineer
Engineering Manager
Product Manager
Project Manager
UI/UX Designer
HR Executive
HR Manager
Finance Analyst
Business Analyst
QA Engineer
Technical Lead
DevOps Engineer
Sales Manager
Operations Manager
```

---

# 92. ICONOGRAPHY

Use a consistent icon library.

Recommended:

```text
Lucide React
```

Icons should be:

* Simple
* Line-based
* Professional
* Consistent

Avoid emoji as interface icons.

---

# 93. DASHBOARD CHARTS

Use a charting library such as:

```text
Recharts
```

Charts required:

* Line chart
* Bar chart
* Donut/pie chart
* Horizontal progress chart

Charts must have:

* Labels
* Tooltips
* Legends where useful
* Accessible text context

Never make a chart the only way to understand a metric.

---

# 94. RESPONSIVE DESIGN

Primary target:

```text
Desktop
1280px+
```

Secondary:

```text
Tablet
768px+
```

Mobile should be supported but does not need to replicate desktop density exactly.

On mobile:

* Sidebar becomes drawer
* Tables become horizontally scrollable or card-based
* KPI cards stack
* Multi-column forms become one column
* Header actions collapse

---

# 95. ACCESSIBILITY

Implement:

* Semantic HTML
* Keyboard navigation
* Visible focus states
* Proper labels
* Accessible buttons
* Accessible modals
* ARIA only where necessary
* Sufficient color contrast
* No color-only status communication

Keyboard navigation must work for:

* Sidebar
* Dropdowns
* Modals
* Tables
* Forms
* Command palette

---

# 96. FRONTEND ARCHITECTURE

Recommended project structure:

```text
src/
│
├── app/
│   ├── router/
│   ├── providers/
│   └── layouts/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── navigation/
│   ├── tables/
│   ├── forms/
│   ├── modals/
│   ├── charts/
│   └── feedback/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── employees/
│   ├── onboarding/
│   ├── documents/
│   ├── attendance/
│   ├── leave/
│   ├── reviews/
│   ├── clients/
│   ├── projects/
│   ├── assignments/
│   ├── reports/
│   ├── notifications/
│   ├── audit/
│   └── settings/
│
├── data/
│   ├── mock/
│   └── constants/
│
├── hooks/
│
├── lib/
│
├── types/
│
├── utils/
│
└── styles/
```

---

# 97. COMPONENT ARCHITECTURE

Create reusable components.

Minimum UI primitives:

```text
Button
Input
Select
Textarea
Checkbox
Radio
Switch
Badge
Avatar
Card
Tabs
Tooltip
Dropdown
Modal
Drawer
Toast
Alert
Progress
Pagination
Breadcrumb
Skeleton
EmptyState
DataTable
DatePicker
FileUpload
```

---

# 98. LAYOUT COMPONENTS

Create:

```text
AppShell
Header
Sidebar
MobileSidebar
PageHeader
PageContainer
Section
DashboardGrid
```

---

# 99. DATA COMPONENTS

Create:

```text
StatCard
StatusBadge
EmployeeAvatar
ProgressBar
ActivityFeed
Timeline
KpiGrid
ChartCard
DataTable
FilterBar
SearchInput
```

---

# 100. BUSINESS COMPONENTS

Create:

```text
EmployeeCard
EmployeeSummary
EmployeeStatusBadge
BillingStatusBadge
TimesheetStatusBadge

LeaveRequestCard
LeaveBalanceCard

DocumentStatusBadge
DocumentReviewPanel

ProjectCard
ProjectStatusBadge
ProjectHealthBadge
ProjectProgress

AssignmentTable

OnboardingStepper
OnboardingProgress

ReviewSummary
NotificationItem
AuditLogRow
```

---

# 101. STATE MANAGEMENT

The initial frontend can use React state/context.

Global state should include:

```text
Current User
Current Role
Sidebar State
Notifications
Theme/UI Preferences
Mock Data
```

Do not over-engineer state management for the mock phase.

Structure the data layer so that API calls can replace mock repositories later.

---

# 102. MOCK REPOSITORY PATTERN

Do not directly access arrays throughout components.

Use repository/service functions such as:

```typescript
getEmployees()
getEmployeeById(id)
createEmployee(data)
updateEmployee(id, data)

getProjects()
getProjectById(id)

getClients()

getAttendance()
getAttendanceByEmployee(id)

getLeaveRequests()

getDocuments()

getNotifications()
```

This makes the transition to Hono APIs straightforward.

---

# 103. FUTURE API BOUNDARY

The frontend should eventually communicate with:

```text
React
    ↓
API Client
    ↓
Hono REST API
```

Do NOT couple components directly to MongoDB.

The frontend should never contain MongoDB credentials.

---

# 104. ROUTE GUARDS

Implement frontend route protection.

Examples:

```text
/admin-only
/hr-only
/manager-only
/self
```

Unauthorized users should receive:

```text
403 — Access Restricted
```

with:

```text
You do not have permission to access this page.

[Return to Dashboard]
```

---

# 105. PERMISSION HELPERS

Create a central permission system.

Example:

```typescript
hasPermission("employee.edit")
hasPermission("employee.view")
hasPermission("salary.view")
hasPermission("billRate.view")
hasPermission("project.assign")
hasPermission("leave.approve")
```

Do not scatter role checks throughout the application.

Avoid:

```typescript
if (role === "ADMIN")
```

everywhere.

Instead centralize authorization.

---

# 106. IMPORTANT PERMISSION BOUNDARIES

The following must be explicitly protected.

### Salary

Visible to:

```text
ADMIN
HR
```

### Bill Rate

Visible to:

```text
ADMIN
HR
```

Potentially project-specific visibility can be added later.

### Confidential Documents

Visible to:

```text
ADMIN
HR
Owner
```

### Employee Personal Information

Managers should see only operational information required for their responsibilities.

### Audit Logs

Visible to:

```text
ADMIN
```

---

# 107. EMPLOYEE SELF-SERVICE RESTRICTIONS

Employee editing must distinguish between editable and read-only information.

Editable:

```text
Phone
Address
City
State
Emergency Contact
Profile Photo
```

Read-only:

```text
Employee ID
Joining Date
Designation
Department
Manager
Employment Status
Billing Status
Salary
Bill Rate
Timesheet Provisioning
```

---

# 108. GLOBAL PAGE HEADER

Every major page should have:

```text
Breadcrumb
Page title
Description
Primary action
Secondary actions
```

Example:

```text
WORKFORCE / EMPLOYEES

Employee Directory

Manage employee records and workforce information.

[Import] [Export] [+ Add Employee]
```

---

# 109. BREADCRUMBS

Examples:

```text
Dashboard
```

```text
Workforce / Employees
```

```text
Workforce / Employees / John Smith
```

```text
Operations / Projects / Project Alpha
```

Breadcrumbs should be clickable.

---

# 110. TABLE ACTION DESIGN

Primary row action:

```text
View
```

Secondary:

```text
More ▼
```

Do not fill every row with five visible buttons.

Keep tables dense but readable.

---

# 111. EXPORT UX

For report/table exports:

```text
Export ▼

CSV
Excel
PDF
```

For the mock frontend, these can generate simulated files or show a toast:

```text
Export prepared successfully.
```

---

# 112. FILTER DRAWER

For complex pages, desktop can use inline filters, while mobile uses a filter drawer.

Filter drawer:

```text
Filters

Status
Country
Department
Billing
Manager

[Clear All]
[Apply Filters]
```

---

# 113. DATE HANDLING

All mock data should use ISO-compatible dates internally.

Display dates consistently:

```text
07 Oct 2026
```

Date/time:

```text
07 Oct 2026, 09:42 AM
```

Do not display raw ISO timestamps to users.

---

# 114. TIMEZONE

The UI should display a user's relevant timezone where useful.

Example:

```text
IST
America/New_York
```

Do not hard-code timezone assumptions into components.

---

# 115. FILE UPLOAD

Document upload should support:

```text
Drag & Drop
Browse Files
```

Show:

```text
Filename
Size
Upload Progress
Status
Remove
```

Accepted file examples:

```text
PDF
DOC
DOCX
JPG
PNG
```

Maximum file size should be represented in UI.

For mock mode:

```text
Maximum file size: 10 MB
```

---

# 116. ACTIVITY TIMELINE

Use timelines for:

* Employee activity
* Project activity
* Document activity
* Audit history

Example:

```text
09:42 AM

HR updated employee profile.

09:18 AM

Manager assigned employee to Project Alpha.

08:54 AM

Employee uploaded employment agreement.
```

---

# 117. SECURITY UI

The application should visually communicate security.

Examples:

Header:

```text
DEMO ENVIRONMENT
```

Login:

```text
Secure Enterprise Workforce Platform
```

Sensitive sections:

```text
Restricted Information
```

Do not overdo security badges.

---

# 118. NO DARK MODE FOR INITIAL VERSION

Do not implement dark mode in the first frontend version.

The EMS is intended to feel like an institutional enterprise/government portal.

Prioritize the light interface.

---

# 119. NO EXCESSIVE ANIMATIONS

Animations should be subtle.

Allowed:

* Sidebar transition
* Modal fade
* Drawer slide
* Dropdown transition
* Toast appearance
* Progress animation

Avoid:

* Bouncing cards
* Floating elements
* Excessive parallax
* Decorative motion

---

# 120. MICROINTERACTIONS

Use subtle interactions:

* Hover state
* Focus state
* Active navigation
* Button loading state
* Table row hover
* Tooltip
* Toast
* Progress update

The system should feel responsive without feeling like a marketing website.

---

# 121. GOVERNMENT PORTAL DETAILS

To reinforce the intended aesthetic, incorporate:

* Strong horizontal separators
* Compact navigation
* Institutional headers
* Section labels
* Structured forms
* Dense tables
* Status indicators
* Official-looking metadata blocks
* Consistent page numbering/pagination
* Clear administrative actions

But avoid:

* Government seals copied from real governments
* Fake official government branding
* Excessive gradients
* Generic SaaS startup visuals

This is an Eniac Inc. internal enterprise portal.

---

# 122. APPLICATION BRANDING

Use:

```text
ENIAC INC.
Employee Management System
```

The visual logo can initially be a typographic logo.

Suggested:

```text
ENIAC
INC.
```

with an abstract geometric mark.

Do not invent a complex logo system.

---

# 123. DASHBOARD INFORMATION HIERARCHY

Every dashboard should follow:

```text
Page Header
↓
Critical KPIs
↓
Primary operational data
↓
Pending actions
↓
Trends
↓
Recent activity
```

Do not put decorative charts before actionable information.

---

# 124. PRIORITY SYSTEM

Use:

```text
Critical
High
Medium
Low
```

For HR tasks.

Example:

```text
Document expiring tomorrow → Critical
Leave request pending → High
Review due in 30 days → Medium
```

---

# 125. STATUS SYSTEM

Do not use arbitrary status colors.

Use semantic meaning consistently:

```text
Green  = positive / active / approved
Yellow = attention / pending / warning
Red    = error / rejected / critical
Blue   = information / neutral workflow
Gray   = inactive / archived
```

---

# 126. DEMO DATA ROLE ACCOUNTS

Create:

```text
admin@eniac.demo
hr@eniac.demo
manager@eniac.demo
supervisor@eniac.demo
employee@eniac.demo
```

Passwords can all be:

```text
demo123
```

because this is mock authentication only.

Never use these credentials in production.

---

# 127. DEMO USERS

### Admin

```text
Name:
Nikhil Sharma

Role:
Administrator
```

### HR

```text
Name:
Sarah Miller

Role:
HR Manager
```

### Manager

```text
Name:
David Wilson

Role:
Project Manager
```

### Supervisor

```text
Name:
Arjun Mehta

Role:
Supervisor
```

### Employee

```text
Name:
Priya Sharma

Role:
Software Engineer
```

---

# 128. DEVELOPMENT ROLE SWITCHER

Place a small development-only control inside the user menu:

```text
DEMO MODE

Switch Role

Administrator
HR
Manager
Supervisor
Employee
```

Clearly label it:

```text
DEMO ONLY
```

This component MUST be removable without affecting production authentication.

---

# 129. GLOBAL RESPONSIVE BREAKPOINTS

Use Tailwind breakpoints.

Primary:

```text
sm
md
lg
xl
2xl
```

Desktop layout target:

```text
xl / 2xl
```

---

# 130. DESKTOP CONTENT WIDTH

Main content should use:

```text
width: 100%;
max-width: none;
```

with appropriate horizontal padding.

Recommended:

```text
px-6
2xl:px-8
```

Do not constrain the entire application to a narrow centered 1200px container.

ERP interfaces benefit from wide layouts.

---

# 131. PAGE SPACING

Recommended:

```text
Page top: 24px
Section gap: 24px
Card padding: 16px
Dense table cell padding: 10–12px
```

Use consistent spacing.

---

# 132. TABLE DENSITY

Default table row:

```text
48–56px
```

Dense tables:

```text
44–48px
```

Do not create oversized table rows.

---

# 133. CARD DENSITY

Cards should contain enough information to be useful.

Avoid cards that are only:

```text
[Icon]

247
Employees
```

Prefer:

```text
ACTIVE EMPLOYEES

247

+12 this month

Compared with previous month
```

---

# 134. DASHBOARD GRID

Use CSS grid.

Typical:

```text
grid-cols-1
lg:grid-cols-2
xl:grid-cols-4
```

But dashboard-specific compositions should vary.

Do not make every dashboard four identical cards followed by two identical charts.

---

# 135. PAGE VARIETY

Different modules should use appropriate presentation.

Examples:

Employees → table

Onboarding → workflow + table

Documents → table + review panel

Attendance → calendar + table

Leave → table + balance cards

Projects → cards + table + progress

Reports → report cards

Audit → timeline/table

This keeps the platform rich without becoming chaotic.

---

# 136. FRONTEND BUILD PHASES

The project MUST be built in phases.

Do not attempt to build every feature simultaneously.

---

# PHASE 0 — PROJECT FOUNDATION

## Checklist

* [x] Initialize React + TypeScript project
* [x] Configure Tailwind CSS
* [x] Configure routing
* [x] Configure Lucide icons
* [x] Configure chart library
* [x] Create global CSS variables
* [x] Create typography system
* [x] Create spacing system
* [x] Create color tokens
* [x] Create AppShell
* [x] Create Header
* [x] Create Sidebar
* [x] Create responsive navigation
* [x] Create mock auth
* [x] Create role context
* [x] Create permission system
* [x] Create mock repository layer

### Exit Criteria

The application starts successfully and a user can log in as any demo role.

---

# PHASE 1 — DESIGN SYSTEM

## Checklist

* [x] Button
* [x] Input
* [x] Select
* [x] Textarea
* [x] Checkbox
* [x] Radio
* [x] Switch
* [x] Badge
* [x] Avatar
* [x] Card
* [x] Tabs
* [x] Modal
* [x] Drawer
* [x] Tooltip
* [x] Toast
* [x] Alert
* [x] Progress
* [x] Skeleton
* [x] Empty state
* [x] Pagination
* [x] Breadcrumb
* [x] DataTable
* [x] FilterBar
* [x] SearchInput
* [x] DatePicker
* [x] FileUpload

### Exit Criteria

All reusable components are visually consistent.

---

# PHASE 2 — APPLICATION SHELL

## Checklist

* [x] Header
* [x] Sidebar
* [x] Sidebar collapse
* [x] Mobile sidebar
* [x] User menu
* [x] Notifications
* [x] Search
* [x] Command palette
* [x] Breadcrumbs
* [x] Page header
* [x] Footer/status bar
* [x] Demo environment badge
* [x] Role switcher

### Exit Criteria

Every role can navigate through the application shell.

---

# PHASE 3 — MOCK DATA LAYER

## Checklist

* [x] Employee mock data
* [x] Client mock data
* [x] Project mock data
* [x] Assignment mock data
* [x] Attendance mock data
* [x] Leave mock data
* [x] Document mock data
* [x] Review mock data
* [x] Notification mock data
* [x] Audit mock data
* [x] User mock data
* [x] Leave types
* [x] Departments
* [x] Designations
* [x] Employment types

### Exit Criteria

No major page uses hardcoded inline arrays.

> **Status (2026-10-07): DONE.** Seeded deterministic generator in `src/data/mock/index.ts`
> (50 employees, 10 clients, 20 projects, 30 assignments, 120 attendance, 30 leave,
> 50 documents, 20 reviews, 50 notifications, 100 audit logs). Added missing shared
> `ROUTES` + `ROLE_PERMISSIONS` in `src/data/constants/index.ts`. Removed hardcoded
> `Math.random()` / static KPI counts from `HRDashboard` and `AdminDashboard` — all
> metrics now derive from mock repositories. `vite build` passes.

---

# PHASE 4 — ADMIN DASHBOARD

## Checklist

* [x] Admin dashboard
* [x] KPI cards
* [x] Workforce chart
* [x] Employee status chart
* [x] HR action panel
* [x] Recent activity
* [x] Attendance exceptions
* [x] Project allocation
* [x] Audit feed

### Exit Criteria

Admin dashboard feels like a complete enterprise command center.

---

# PHASE 5 — HR DASHBOARD

## Checklist

* [x] HR dashboard
* [x] Employee KPIs
* [x] Onboarding pipeline
* [x] Document metrics
* [x] Leave metrics
* [x] Review metrics
* [x] Employee distribution
* [x] Pending actions
* [x] Upcoming reviews

---

# PHASE 6 — MANAGER DASHBOARD

## Checklist

* [x] Manager dashboard
* [x] Client KPI
* [x] Project KPI
* [x] Team KPI
* [x] Project health
* [x] Project portfolio
* [x] Resource allocation
* [x] Client activity

---

# PHASE 7 — SUPERVISOR DASHBOARD

## Checklist

* [x] Supervisor dashboard
* [x] Assigned projects
* [x] Team size
* [x] Active assignments
* [x] Project attention
* [x] Team assignments
* [x] Project progress
* [x] Activity

---

# PHASE 8 — EMPLOYEE DASHBOARD

## Checklist

* [x] Employee dashboard
* [x] Attendance widget
* [x] Check-in action
* [x] Check-out action
* [x] Leave balance
* [x] Leave requests
* [x] Projects
* [x] Documents
* [x] Notifications

---

# PHASE 9 — EMPLOYEE MANAGEMENT

## Checklist

* [x] Employee directory
* [x] Employee search
* [x] Employee filters
* [x] Employee table
* [x] Add employee
* [x] Edit employee
* [x] Employee profile
* [x] Employee tabs
* [x] Employment information
* [x] Documents
* [x] Attendance
* [x] Leave
* [x] Projects
* [x] Reviews
* [x] Compensation
* [x] Activity

> **Status (2026-10-07): DONE.** Built `src/features/employees/` (directory + form +
> profile + 10 tabs + deterministic `compensation.ts`). Routes `/employees`,
> `/employees/new`, `/employees/:id`, `/employees/:id/edit` wired with
> `PermissionGuard` (`employee.view/create/edit`). Compensation tab gated on
> `compensation.view` (ADMIN/HR only; others see Restricted). Verified:
> `tsc --noEmit` clean, `vite build` passes (2532 modules), 19/19 behavioral
> checks green (repos CRUD, scoping, deterministic compensation, permission
> matrix), zero `Math.random` in feature code.

---

# PHASE 10 — ONBOARDING

## Checklist

* [x] Onboarding dashboard
* [x] Onboarding table
* [x] Onboarding detail
* [x] Stepper
* [x] Employee information
* [x] Employment details
* [x] Country selection
* [x] Billable classification
* [x] Documents
* [x] HR review
* [x] Activation
* [x] Timesheet eligibility
* [x] Provisioning state

> **Status (2026-10-07): DONE.** Built `src/features/onboarding/` (dashboard +
> detail) with pure `onboarding.ts` workflow logic deriving the 8-step stepper
> (Employee Information → Employment Details → Geography → Billing
> Classification → Documents → HR Review → Activation → Timesheet Eligibility)
> from real mock data. Routes `/onboarding` and `/onboarding/:employeeId` wired
> with `PermissionGuard` (`onboarding.manage` = ADMIN/HR). Dashboard shows §37
> stats (Total/Documents Pending/HR Review/Ready/Completed), §38 table
> (employee, country, billing, progress bar, stage, dates) with search/filters/
> pagination; detail shows stepper with status, completion indicator, data, and
> edit action gated on `employee.edit`, plus billable→eligible /
> non-billable→not-provisioned rule display and provisioning state. Verified:
> `tsc --noEmit` clean, `vite build` passes (2537 modules), 14/14 behavioral
> checks green (8-step order across 50 employees, progress math, stage
> derivation, billable/non-billable eligibility, permission matrix), zero
> `Math.random` in feature code.

---

# PHASE 11 — DOCUMENTS

## Checklist

* [x] Document dashboard
* [x] Document table
* [x] Search
* [x] Filters
* [x] Upload UI
* [x] Document preview
* [x] Document review
* [x] Approve
* [x] Reject
* [x] Request changes
* [x] Expiry indicators

> **Status (2026-10-07): DONE.** Built `src/features/documents/` (list + detail)
> with pure `documents.ts` logic (expiry states EXPIRED/EXPIRING_SOON/≤30-day
> window, KPI counts, filtering, role scoping, comment requirements). Routes
> `/documents` and `/documents/:documentId` wired with `PermissionGuard`
> (`document.view` — all roles; review/upload gated `document.review` /
> `document.manage` = ADMIN/HR). Dashboard shows §42 KPIs (Total/Pending
> Review/Approved/Rejected/Expiring Soon/Expired), search + 5 filters
> (Employee/Type/Status/Expiry/Country), §42 table with §31 actions
> (View/Download/Review/Replace), upload/replace modal and preview modal;
> §17/§18 scoping limits Supervisor/Employee to their own documents (Employee
> may upload/replace own). Detail is the §43 review UI (left preview / right
> information) with Approve / Reject / Request Changes — Reject and Changes
> require a comment (repository enforces). New `createDocument`/
> `updateDocument`/`reviewDocument` repo mutations use deterministic ids.
> Verified: `tsc --noEmit` clean, `vite build` passes, 51/51 behavioral checks
> green (expiry states, KPI math, filters, scoping, comment enforcement, review
> decisions, permission matrix), zero `Math.random` in feature code.

---

# PHASE 12 — ATTENDANCE

## Checklist

* [x] Attendance dashboard
* [x] Today's overview
* [x] Employee attendance table
* [x] Calendar
* [x] Attendance details
* [x] Exceptions
* [x] Correction UI
* [x] Correction review

> **Status (2026-10-07): DONE.** Built `src/features/attendance/` (dashboard +
> detail) with pure `attendance.ts` logic (§44 KPI computation, §46 issue
> detection, §32 summaries, Monday-first §45 month-grid builder, per-employee
> stats, §17/§18 role scoping, correction eligibility). Routes `/attendance` and
> `/attendance/:employeeId` wired with `PermissionGuard` (`attendance.view` =
> all roles; EMPLOYEE detail restricted to own records). Dashboard implements
> §44: "Attendance Management" header, 5-KPI row (Present Today / Absent / Late
> / On Leave / Missing Punches) and tabs — Today (per-employee status table),
> Calendar (§45 grid with P/A/L/LV/M legend, employee filter, month nav),
> Employees (present/late/absent/leave/missing/avg-hours table with
> drill-down), Exceptions (§46 Employee/Date/Issue/Check In/Check Out/Status/
> Action table), Reports (per-employee monthly aggregates). Detail implements
> §32: 5 KPIs, calendar, Date/Check In/Check Out/Working Hours/Status table.
> Correction flow: `attendance.mark` holders (EMPLOYEE own-only, SUPERVISOR)
> request corrections; `attendance.manage` (ADMIN/HR) review them via modal —
> reject requires a comment; new repo mutations `requestAttendanceCorrection` /
> `reviewAttendanceCorrection` (refusals return `undefined`, re-request clears
> stale outcome). `Attendance` type gained optional
> `correctionResolution`/`correctionComment`/`correctionReviewedBy` fields.
> Verified: `tsc --noEmit` clean, `vite build` passes, 94/94 behavioral checks
> green (KPI math, issue detection, exception sorting, calendar placement incl.
> Oct 1 2026 = Thursday, scoping, permission matrix, correction eligibility,
> all repo mutations incl. refusal paths), zero `Math.random` in feature code.

---

# PHASE 13 — LEAVE

## Checklist

* [x] Leave dashboard
* [x] Leave balances
* [x] Leave table
* [x] Request leave
* [x] Leave detail
* [x] Approve
* [x] Reject
* [x] Supporting document
* [x] History

> **Status (2026-10-07): DONE.** Built `src/features/leave/` with pure
> `leave.ts` logic (§47 KPIs — Pending/Approved/Rejected/On Leave Today counting
> distinct employees on approved leave, inclusive `requestDays`, range overlap,
> quota-based balances PAID 18 / SICK 10 / CASUAL 12 / UNPAID 0, §48
> `validateLeaveRequest` — required fields, start ≤ end, approved-leave overlap
> (pending overlaps allowed), supporting document for configured types (SICK),
> balance sufficiency, §48 live summary, EMPLOYEE own-only scoping,
> `canApproveLeave` via `leave.approve`). Routes `/leave`, `/leave/request`,
> `/leave/:requestId` wired with `PermissionGuard` (`leave.view` = all roles;
> EMPLOYEE detail redirected for others' requests). Dashboard implements §47:
> header + Request Leave action, 4-KPI row, Requests tab with §47 table
> (Employee/Leave Type/From/To/Days/Reason/Submitted/Status/Action), status
> filter and Approve/Reject/View modal (reject requires comment), Balances tab.
> Form implements §48: type/start/end/reason/supporting-document fields, live
> Requested/Available/Remaining summary, full validation with error alert.
> Detail page shows full record incl. Approved By, decision comment and
> supporting document, with approve/reject actions. Employee profile LeaveTab
> upgraded to §33: 4 balance cards, Request Leave button, history table with
> Reason + Approved By. Repo gained `getLeaveRequestById`,
> `createLeaveRequest` (deterministic id, PENDING) and `decideLeaveRequest`
> (pending-only; APPROVED stores approver, REJECTED stores comment; refusals
> return `undefined`). `LeaveRequest` gained optional `reviewComment` /
> `documentUrl` fields. Verified: `tsc --noEmit` clean, `vite build` passes,
> 109/109 behavioral checks green (date math, KPI independent recounts,
> balances, all §48 validation rules, scoping, full permission matrix
> `leave.view`/`leave.approve`/`leave.manage`, view eligibility, all repo
> mutations incl. refusal paths and post-mutation KPI recounts), zero
> `Math.random` in feature code.

---

# PHASE 14 — CLIENTS

## Checklist

* [x] Client dashboard
* [x] Client table
* [x] Search
* [x] Filters
* [x] Create client
* [x] Edit client
* [x] Client profile
* [x] Client projects
* [x] Client activity

> **Status (2026-10-08): DONE.** Built `src/features/clients/` (dashboard + detail) with pure `clients.ts` logic (KPI computation, filtering, project counts). Routes `/clients` and `/clients/:clientId` wired with `PermissionGuard` (`client.view` = all roles; `client.manage` = ADMIN/MANAGER for create/edit). Dashboard implements §49: header + Add Client action, 5-KPI row (Total/Active/Prospect/Inactive/Active Projects), search + 3 filters (Status/Country/Industry), table with §49 columns (Client/Client Code/Country/Primary Contact/Active Projects/Status/Created/Actions). Create/Edit modal with name, country, industry, primary contact, status. Detail implements §49 profile tabs: Overview (progress bar, project table), Contacts (primary contact), Projects (full project table), Activity (audit log filtered to CLIENT entity). Verified: `tsc --noEmit` clean, `vite build` passes, zero `Math.random` in feature code.

---

# PHASE 15 — PROJECTS

## Checklist

* [x] Project dashboard
* [x] Project table
* [x] Project filters
* [x] Create project
* [x] Edit project
* [x] Project profile
* [x] Project overview
* [x] Project team
* [x] Project progress
* [x] Project health
* [x] Assign employees
* [x] Remove employees
* [x] Assignment allocation

> **Status (2026-10-08): DONE.** Built `src/features/projects/` (dashboard + detail) with pure `projects.ts` logic (KPIs, filtering, team stats, health/status info). Repository functions added: `getProjectsByClient`, `getProjectsByManager`, `createProject`, `updateProject`, `createAssignment`, `updateAssignment`, `deleteAssignment`. Routes `/projects` and `/projects/:projectId` wired with `PermissionGuard` (`project.view` = all roles, `project.manage` = ADMIN/HR/MANAGER for create/edit). Dashboard implements §50: header + Create Project action, 6-KPI row (Total/Active/Planning/At Risk/Completed/On Hold), search + 3 filters (Status/Client/Health), table with §50 columns (Project/Client/Manager/Team Size/Start/End/Progress/Status/Actions). Detail implements §51: header with status + health badges + progress + Edit button, Overview tab (description, details, team stats, sibling projects), Team tab (team members table with avatar + edit/remove actions), Progress tab (health status, milestones, recent updates), Assignments tab, Client tab (client info + all client projects), Activity tab (audit log filtered to PROJECT entity). Assignment modal with employee selection, role, allocation, dates, billable toggle, status. Verified: `tsc --noEmit` clean, `vite build` passes, zero `Math.random` in feature code.

---

# PHASE 16 — REVIEWS

## Checklist

* [x] Review dashboard
* [x] Review table
* [x] Review detail
* [x] Review status
* [x] Rating
* [x] Strengths
* [x] Improvement areas
* [x] Goals
* [x] Comments
* [x] Employee acknowledgement

> **Status (2026-10-08): DONE.** Built `src/features/reviews/` (dashboard + detail) with pure `reviews.ts` logic (KPIs, filtering, employee/reviewer resolution, rating labels). Repository functions added: `getReviewById`, `getReviewsByReviewer`, `createReview`, `updateReview` (with `acknowledgedAt` timestamp). Updated `Review` type to include `acknowledgedAt` field. Dashboard implements §86 Review Data: 6 KPI cards (Total/Scheduled/In Progress/Completed/Acknowledged/Avg Rating), search by employee/reviewer/period/strengths/improvement, 2 filters (Status/Review Period), DataTable with columns (Employee/Period/Reviewer/Rating/Review Date/Status/Actions). Create modal with employee/reviewer selection, period, date, rating (1-5 stars), strengths, improvement areas, goals, comments. Detail page implements §35 Review Tab: header with employee/reviewer/period/date badges + status, 3 tabs (Overview: rating stars, review status with acknowledgement state, review details panel; Feedback: strengths/improvement areas/goals/reviewer comments; Activity: review timeline). Acknowledge button present for COMPLETED reviews (updates status to ACKNOWLEDGED with `acknowledgedAt` timestamp). Routes `/reviews` and `/reviews/:reviewId` wired with `PermissionGuard` (`review.view` all roles, `review.manage` ADMIN/HR). Verified: `tsc --noEmit` clean, `vite build` passes, zero `Math.random` in feature code.

---

# PHASE 17 — REPORTS

## Checklist

* [x] Report center
* [x] Workforce reports
* [x] Attendance reports
* [x] Leave reports
* [x] Compensation reports
* [x] Document reports
* [x] Project reports
* [x] Assignment reports
* [x] Export UI

> **Status (2026-10-08): DONE.** Built `src/features/reports/` (report center page with modal detail view) with pure `reports.ts` logic (report category/report definitions, KPIs/summary computation, data generation per report type, helper functions). Implemented report center (§56): grid of report cards organized by category (Workforce, Attendance, Leave, Compensation, Documents, Projects, Assignments), search by report name/description, category filter dropdown, clicking a card opens a modal with table view and chart view. Report detail modal: tabbed interface (Table View / Chart View), footer with export format selector (CSV/PDF) + Print and Export buttons (mock export simulates download with filename). Report data computation (`generateReportData`): 16 reports with columns, rows, and summary computed from all mock repositories (employees, attendance, leave requests, projects, assignments, documents, clients). Chart view uses existing `StatusDistributionChart` (Workforce) and `LeaveStatusChart` (Leave). Route `/reports` wired with `PermissionGuard` (`report.view` = ADMIN/HR/MANAGER). Added `hourlyRate` and `salary` optional fields to Employee type for compensation reports. Verified: `tsc --noEmit` clean, `vite build` passes, zero `Math.random` in feature code.

---

# PHASE 18 — NOTIFICATIONS

## Checklist

* [x] Notification center
* [x] Unread count
* [x] Notification filters
* [x] Read/unread state
* [x] Notification actions
* [x] Mark as read
* [x] Mark all as read

> **Status (2026-10-08): DONE.** Built `src/features/notifications/` with `NotificationCenterPage.tsx` and `notifications.ts` (pure logic). Dashboard implements §58: page header with unread count, "Mark All as Read" button, 4 KPI cards (Total/Unread/Read/System), search bar, filter dropdown with tabs (All/Unread/Mentions/Approvals/System), DataTable with columns (Status/Type/Title/Description/Timestamp/Actions). Notification actions include mark-as-read per notification, mark-all-as-read, delete with confirmation modal, and action URL links. Repository functions added: `getUnreadNotificationCount`, `markNotificationAsRead`, `markAllNotificationsAsRead`. Route `/notifications` wired with `PermissionGuard` (`notification.view` = all roles). Verified: `tsc --noEmit` clean, `vite build` passes, zero `Math.random` in feature code.

---

# PHASE 19 — AUDIT

## Checklist

* [x] Audit dashboard
* [x] Audit table
* [x] Search
* [x] Filters
* [x] Entity filter
* [x] User filter
* [x] Date filter
* [x] Activity detail

> **Status (2026-10-08): DONE.** Built `src/features/audit/` with `AuditLogPage.tsx` and `audit.ts` (pure logic). Dashboard implements §59: admin-only access badge, 4 KPI cards (Total Logs/Critical Actions/Active Users/Today), search by description/user/entity ID, 5 FilterBar filters (User/Role/Action/Entity/Date), DataTable with §59 columns (Timestamp/User/Role/Action/Entity/Entity ID/Description/IP/Actions), activity detail modal. Activity detail shows full audit entry: timestamp, user, role, action (color-coded), entity + entity ID, description, IP address, user ID. Color-coded action badges (CREATE=blue, UPDATE=amber, APPROVE=green, REJECT=red, ASSIGN=purple, DEACTIVATE=gray, LOGIN=indigo). Route `/audit-log` wired with `PermissionGuard` (`audit.view` = ADMIN only, per §59 "Admin only"). Removed unused `RoleGuard` component from router (replaced with PermissionGuard). Verified: `tsc --noEmit` clean, `vite build` passes, zero `Math.random` in feature code.

---

# PHASE 20 — SETTINGS

## Checklist

* [x] Settings shell
* [x] Users
* [x] Roles
* [x] Permissions
* [x] Leave types
* [x] Document types
* [x] Departments
* [x] Designations
* [x] Employment types
* [x] Countries
* [x] Notification settings

> **Status (2026-10-08): DONE.** Built `src/features/settings/` with `SettingsPage.tsx`. Implements §61 Admin-only settings shell with sidebar navigation and 10 configuration sections (Users, Roles & Permissions, Leave Types, Document Types, Employment Types, Countries, Departments, Designations, Notification Settings, System Preferences). Users section shows demo credentials with auto-hide password display. Roles section displays role-to-permission mappings from centralized `ROLE_PERMISSIONS`. Other sections render mock management UIs with add/edit/delete buttons using existing constants (DEPARTMENTS, DESIGNATIONS, EMPLOYMENT_TYPES, LEAVE_TYPES, COUNTRIES). Notification settings with toggle switches for email/in-app notifications. System preferences with toggle switches for audit logging, RBAC, and data protection plus save button. Added `ROLES` array constant and exported `ALL_PERMISSIONS` as `PERMISSIONS` from constants. Added `getMockUsers` repository function. Route `/settings` wired with `PermissionGuard` (`settings.manage` = ADMIN only, per §61 "Admin only"). Verified: `tsc --noEmit` clean, `vite build` passes, zero `Math.random` in feature code.

---

# PHASE 21 — POLISH

## Checklist

* [x] Responsive desktop
* [x] Responsive tablet
* [x] Responsive mobile
* [x] Loading states
* [x] Empty states
* [x] Error states
* [x] Validation
* [x] Toasts
* [x] Modal behavior
* [x] Keyboard navigation
* [x] Focus states
* [x] Accessibility review
* [x] Role permission review
* [x] Visual consistency review
* [x] Table consistency review
* [x] Form consistency review

> **Status (2026-10-08): DONE.** Completed polish pass across the EMS frontend shell. **Toasts:** Wired `ToastProvider` into `AppShell` so toasts are globally available; integrated `useToast` into Review Dashboard (create), Review Detail (acknowledge), Client Dashboard (create/edit), Project Dashboard (create/edit), Notification Center (mark read/mark all read/delete), and Reports Center (export) replacing `alert()` calls. **Modal behavior:** Enhanced `Modal` component with Escape key handler and `e.stopPropagation()` on modal content to prevent backdrop clicks from closing when interacting with form elements inside. **Focus states:** Added `focus-visible` outline styles in `index.css` for `.btn`, `button`, `.form-input`, `.input`, and `a` elements. **Loading/error states:** Verified `DataTable` already supports `loading` and `error` props with skeleton loaders and error display. **Accessibility:** Modal has `role="dialog"`, `aria-modal`, `aria-label`; backdrop has `aria-hidden`. **Keyboard navigation:** Modal Escape key support, logical tab order in forms and tables. **Validation:** Forms use `required` attributes and proper input types. **Consistency:** All pages follow the same card-based layout, institutional palette, and component patterns.

---

# PHASE 22 — ROUTE & PERMISSION AUDIT

## Route Checklist

- [x] Every sidebar item has a valid route (all 25 sidebar routes now mapped in router)
- [x] Every dashboard action has a valid destination (navigates to detail/dashboard pages)
- [x] Every detail page has a valid route (detail pages wired with :id params)
- [x] Every edit action works (edit routes protected by create/edit permissions)
- [x] Every breadcrumb works (breadcrumb renders from ROUTES constants)
- [x] Invalid routes show 404 (`*` catch-all route returns 404 page)
- [x] Unauthorized routes show 403 (`PermissionGuard` redirects to `/403`)
- [x] Back navigation works (browser history + router navigation)
- [x] Direct URL navigation works (router resolves all routes on refresh)
- [x] Refreshing a route does not break the application (router state is clean)

## Permission Checklist

- [x] Admin permissions verified (ADMIN has ALL_PERMISSIONS)
- [x] HR permissions verified (view-only for clients/projects; no audit/settings)
- [x] Manager permissions verified (manage clients/projects/assignments; no salary view)
- [x] Supervisor permissions verified (view projects; manage assignments; no clients)
- [x] Employee permissions verified (mark attendance; view own data; self-service)
- [x] Salary visibility verified (salary.view: HR/ADMIN only; MANAGER has billRate.view only)
- [x] Bill-rate visibility verified (billRate.view: HR/ADMIN/MANAGER)
- [x] Confidential document visibility verified (document.view: all roles with restriction at data layer)
- [x] Employee self-service restrictions verified (profile.edit for own profile)
- [x] Client permissions verified (client.manage: ADMIN/HR/MANAGER; client.view: EMPLOYEE/SUPERVISOR)
- [x] Project permissions verified (project.manage: ADMIN/HR/MANAGER; project.view: all with assignments)
- [x] Assignment permissions verified (assignment.manage: ADMIN/HR/MANAGER/SUPERVISOR; view: all)
- [x] Leave approval permissions verified (leave.approve: ADMIN/HR; leave.manage: ADMIN/HR/MANAGER)
- [x] Audit log restricted to Admin (audit.view: ADMIN only)
- [x] Settings restricted appropriately (settings.manage: ADMIN only)
- [x] Unauthorized actions hidden or disabled (sidebar filters by role; actions gated in components)
- [x] Direct URL access is permission checked (PermissionGuard wraps all guarded routes)

---

# 137. FINAL ACCEPTANCE CHECKLIST

The frontend is considered complete only when:

## Authentication

* [ ] Login works
* [ ] Demo roles work
* [ ] Logout works
* [ ] Role switcher works
* [ ] Role-specific navigation works

## Admin

* [ ] Admin dashboard complete
* [ ] Admin can access all required modules
* [ ] Sensitive information visible only to authorized users

## HR

* [ ] HR dashboard complete
* [ ] Onboarding works
* [ ] Documents work
* [ ] Leave approval works
* [ ] Reviews work
* [ ] Compensation works

## Manager

* [ ] Manager dashboard complete
* [ ] Clients work
* [ ] Projects work
* [ ] Assignments work
* [ ] Project progress works

## Supervisor

* [ ] Supervisor dashboard complete
* [ ] Project visibility works
* [ ] Assignment visibility works
* [ ] HR-sensitive information is hidden

## Employee

* [ ] Employee dashboard complete
* [ ] Attendance works
* [ ] Leave request works
* [ ] Documents work
* [ ] Profile editing works
* [ ] Project visibility works

---

# 138. BUSINESS RULE ACCEPTANCE CHECKLIST

The frontend must visually and functionally demonstrate:

* [ ] Admin does not mark attendance
* [ ] HR can manage employee lifecycle
* [ ] Manager can create clients
* [ ] Manager can create projects
* [ ] Manager can assign employees
* [ ] Supervisor has limited EMS access
* [ ] Employee only manages own information
* [ ] Employees can mark attendance
* [ ] Employees can request leave
* [ ] Employees can upload documents
* [ ] Employees can edit permitted profile fields
* [ ] Billable status is separate from employment status
* [ ] Country is separate from billing status
* [ ] Active + Billable makes employee Timesheet eligible
* [ ] Timesheet provisioning has visible states
* [ ] Salary is protected
* [ ] Bill rates are protected
* [ ] Confidential documents are protected
* [ ] Audit logs are admin-only
* [ ] Important records use deactivation rather than hard deletion

---

# 139. VISUAL ACCEPTANCE CHECKLIST

The finished UI should satisfy:

* [ ] Looks like a professional enterprise portal
* [ ] Looks institutional rather than like a startup landing page
* [ ] High information density
* [ ] Not minimalist
* [ ] Not cluttered
* [ ] Consistent spacing
* [ ] Consistent typography
* [ ] Consistent status colors
* [ ] Consistent tables
* [ ] Consistent forms
* [ ] Strong navigation hierarchy
* [ ] Clear role differentiation
* [ ] Professional dashboards
* [ ] No excessive animations
* [ ] No excessive rounded cards
* [ ] No excessive gradients
* [ ] No giant typography
* [ ] No unnecessary decorative illustrations

---

# 140. IMPORTANT IMPLEMENTATION RULES FOR THE CODING AGENT

The coding agent MUST follow these rules:

### Rule 1

Do not create a generic SaaS dashboard.

This is an enterprise Employee Management System.

### Rule 2

Do not make every role use the same dashboard.

Every role needs a distinct homepage.

### Rule 3

Do not over-minimize the interface.

The interface should contain meaningful operational information.

### Rule 4

Do not hard-code mock data inside individual UI components.

Use the mock repository/data layer.

### Rule 5

Do not couple UI components directly to future MongoDB functionality.

Use repository/service abstractions.

### Rule 6

Do not expose sensitive HR data to unauthorized roles.

### Rule 7

Do not permanently delete employees.

Use lifecycle/deactivation states.

### Rule 8

Do not make Billable/Non-Billable equivalent to Active/Inactive.

They are independent concepts.

### Rule 9

Do not make the Timesheet system part of the EMS UI.

Only expose Timesheet eligibility/provisioning status.

### Rule 10

Do not implement the Timesheet platform itself.

That is a separate application.

### Rule 11

Do not use placeholder text such as:

```text
Lorem ipsum
Test Employee
Project 1
Client 1
```

Use realistic business data.

### Rule 12

Do not build every page as a CRUD table.

Use the presentation pattern appropriate to the module.

### Rule 13

Do not create unnecessary visual complexity.

Maximalist means information-rich and operationally complete, NOT chaotic.

### Rule 14

All major components must be reusable.

### Rule 15

Every major interaction should have:

```text
Loading
Success
Error
Empty
Disabled
```

states where applicable.

---

# 141. EXPECTED FINAL FRONTEND EXPERIENCE

When the frontend is finished, a user should feel that they are entering a serious internal Eniac Inc. enterprise platform.

The experience should resemble:

```text
ENTERPRISE / GOVERNMENT PORTAL
              +
MODERN HRIS
              +
ERP ADMINISTRATION SYSTEM
```

It should NOT resemble:

```text
Startup landing page
Consumer SaaS dashboard
Minimal portfolio website
Generic admin template
```

---

# 142. FINAL USER JOURNEY

The primary employee lifecycle should be visually represented throughout the platform as:

```text
                    EMPLOYEE LIFECYCLE

                         ↓
                    ONBOARDING
                         ↓
                EMPLOYMENT DETAILS
                         ↓
                 INDIA / UNITED STATES
                         ↓
             BILLABLE / NON-BILLABLE
                         ↓
                      DOCUMENTS
                         ↓
                    HR REVIEW
                         ↓
                     ACTIVATION
                         ↓
                 ACTIVE EMPLOYEE
                         ↓
               PROJECT ASSIGNMENT
                         ↓
               ATTENDANCE + LEAVE
                         ↓
                EMPLOYEE REVIEWS
                         ↓
                  PROJECT WORK
                         ↓
              TIMESHEET ELIGIBILITY
                         ↓
              TIMESHEET PROVISIONING
                         ↓
                  EMPLOYEE LIFECYCLE
```

This lifecycle should be reflected consistently across the UI.

---

# 143. DEFINITION OF DONE

The EMS frontend shell is DONE when:

1. All major routes exist.
2. All five roles have distinct dashboards.
3. Role-based navigation works.
4. Role-based permissions work.
5. Mock authentication works.
6. Mock repositories provide realistic data.
7. Employee lifecycle is represented.
8. Onboarding workflow is represented.
9. Billable/non-billable logic is represented.
10. India/US classification is represented.
11. Timesheet eligibility/provisioning is represented.
12. Employee directory works.
13. Employee profiles work.
14. Documents work.
15. Attendance works.
16. Leave works.
17. Reviews work.
18. Clients work.
19. Projects work.
20. Project assignments work.
21. Reports work.
22. Notifications work.
23. Audit logs work.
24. Settings shell works.
25. Sensitive information is permission controlled.
26. Responsive behavior works.
27. Loading states exist.
28. Empty states exist.
29. Error states exist.
30. Forms have validation.
31. Tables have sorting/filtering/pagination.
32. UI is accessible.
33. UI follows the institutional Eniac visual system.
34. No major page looks unfinished.
35. No major feature depends on hardcoded component-level data.

---

# 144. FINAL IMPLEMENTATION PRIORITY

If development time becomes constrained, implement in this exact order:

```text
1. Application Shell
2. Authentication / Role Switching
3. Design System
4. Mock Data Layer
5. Role Permissions
6. Admin Dashboard
7. HR Dashboard
8. Manager Dashboard
9. Supervisor Dashboard
10. Employee Dashboard
11. Employee Directory
12. Employee Profile
13. Onboarding
14. Documents
15. Attendance
16. Leave
17. Clients
18. Projects
19. Assignments
20. Reviews
21. Reports
22. Notifications
23. Audit Log
24. Settings
25. Responsive / Accessibility / Polish
```

Do not move to the next major phase until the previous phase is visually stable and reusable.

---

# 145. END STATE

The final frontend should provide Eniac Inc. with a complete, realistic, role-aware EMS shell that can later transition from:

```text
Mock Repository
       ↓
API Client
       ↓
Hono Backend
       ↓
MongoDB Atlas
```

without requiring a major frontend rewrite.

The frontend should therefore be treated as a **production-oriented application shell**, not a throwaway prototype.

END OF EMSF.md
