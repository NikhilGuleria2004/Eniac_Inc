# EMSB.md

# Eniac Inc. — Employee Management System Backend

## Backend Implementation Specification

**Project:** Eniac Inc. Employee Management System
**Backend Folder:** `EMSB/`
**Frontend Folder:** `EMSF/`
**Backend Stack:** TypeScript + Node.js + Express.js
**Database:** MongoDB Atlas
**Architecture:** REST API + Service Layer + Repository Layer
**Frontend Consumer:** EMSF React application
**Related System:** Separate Timesheet Management System (TS)

---

# 1. Purpose

This document is the authoritative implementation specification for the Eniac Inc. Employee Management System backend.

The backend must provide the complete business, security, persistence, authorization, reporting, workflow, and integration layer required by the EMSF frontend.

The backend must be implemented using:

* TypeScript
* Node.js
* Express.js
* MongoDB Atlas
* Official MongoDB Node.js driver
* Zod for request/environment validation
* Pino for structured logging
* Vitest for unit/integration tests
* Supertest for HTTP API testing

The backend must **not use Hono**.

The backend must expose a clean versioned REST API consumed by the EMSF frontend.

---

# 2. System Context

The Eniac Inc. ecosystem contains multiple applications.

The first application is:

> Employee Management System — EMS

The EMS consists of:

```text
EMSF/
Frontend
React + TypeScript + Tailwind CSS
```

and:

```text
EMSB/
Backend
Node.js + TypeScript + Express.js
```

There is also a separate:

```text
Timesheet Management System
TS
```

The EMS and Timesheet system may use the same MongoDB Atlas database infrastructure, but they remain separate applications.

Recommended architecture:

```text
                         ┌──────────────────────────┐
                         │       EMSF Frontend      │
                         │ React + TypeScript       │
                         │ Tailwind CSS             │
                         └────────────┬─────────────┘
                                      │
                                      │ HTTPS REST API
                                      ▼
                         ┌──────────────────────────┐
                         │       EMSB Backend       │
                         │ Node.js                  │
                         │ TypeScript               │
                         │ Express.js               │
                         └────────────┬─────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                         ▼                         ▼
              ┌────────────────────┐    ┌────────────────────┐
              │    MongoDB Atlas   │    │ Timesheet Adapter  │
              │    EMS Database    │    │ / Integration API  │
              └────────────────────┘    └────────────────────┘
```

The frontend must never connect directly to MongoDB.

---

# 3. Core Architectural Principle

EMSB is the authoritative backend/business layer for EMS.

The frontend must not contain authoritative business rules.

The frontend may provide:

* UI validation
* client-side permission checks
* optimistic UI
* loading states
* form validation

But the backend must independently enforce:

* authentication
* authorization
* role permissions
* data visibility
* field-level security
* business rules
* workflow transitions
* ownership rules
* lifecycle rules
* sensitive-data protection

Never trust the frontend.

---

# 4. Technology Stack

## Required

### Runtime

```text
Node.js
```

Use an actively supported Node.js LTS release.

### Language

```text
TypeScript
```

Use strict TypeScript.

Recommended:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### HTTP Framework

```text
Express.js
```

### Database

```text
MongoDB Atlas
```

Use the official:

```text
mongodb
```

Node.js driver.

Do not introduce Mongoose unless there is a compelling architectural reason.

The preferred implementation is:

```text
Express
    ↓
Services
    ↓
Repositories
    ↓
MongoDB Driver
    ↓
MongoDB Atlas
```

---

# 5. Recommended Dependencies

Recommended production dependencies:

```text
express
mongodb
zod
pino
pino-http
cors
helmet
express-rate-limit
jsonwebtoken
bcrypt
dotenv
```

Recommended development/testing dependencies:

```text
typescript
tsx
vitest
supertest
@types/express
@types/node
@types/jsonwebtoken
@types/bcrypt
@types/cors
```

Optional:

```text
uuid
swagger-jsdoc
swagger-ui-express
```

---

# 6. Backend Responsibilities

EMSB is responsible for:

1. Authentication
2. Authorization
3. Employee management
4. Employee lifecycle
5. Onboarding
6. Employee profiles
7. Documents
8. Attendance
9. Attendance corrections
10. Leave management
11. Leave approvals
12. Clients
13. Projects
14. Project assignments
15. Employee reviews
16. Compensation
17. Bill rates
18. Timesheet eligibility
19. Timesheet provisioning state
20. Notifications
21. Reports
22. Dashboards
23. Audit logs
24. Settings
25. Role/permission enforcement
26. Data validation
27. Error handling
28. Logging
29. Security
30. Database persistence

---

# 7. Non-Responsibilities

EMSB should not:

* render React UI
* contain Tailwind styles
* contain frontend components
* connect directly to the browser's local state
* expose MongoDB credentials
* allow the frontend to execute arbitrary MongoDB queries
* allow users to bypass business workflows
* expose sensitive employee information without authorization

---

# 8. Folder Structure

Use the following structure as the target architecture:

```text
EMSB/
│
├── package.json
├── package-lock.json
├── tsconfig.json
├── .env
├── .env.example
├── .gitignore
├── README.md
│
├── src/
│   │
│   ├── server.ts
│   ├── app.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── database.ts
│   │   └── constants.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── authorization.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   ├── not-found.middleware.ts
│   │   ├── request-id.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── audit-context.middleware.ts
│   │
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── employees.routes.ts
│   │   ├── onboarding.routes.ts
│   │   ├── documents.routes.ts
│   │   ├── attendance.routes.ts
│   │   ├── leave.routes.ts
│   │   ├── reviews.routes.ts
│   │   ├── clients.routes.ts
│   │   ├── projects.routes.ts
│   │   ├── assignments.routes.ts
│   │   ├── reports.routes.ts
│   │   ├── notifications.routes.ts
│   │   ├── audit.routes.ts
│   │   ├── settings.routes.ts
│   │   └── profile.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── employees.controller.ts
│   │   ├── onboarding.controller.ts
│   │   ├── documents.controller.ts
│   │   ├── attendance.controller.ts
│   │   ├── leave.controller.ts
│   │   ├── reviews.controller.ts
│   │   ├── clients.controller.ts
│   │   ├── projects.controller.ts
│   │   ├── assignments.controller.ts
│   │   ├── reports.controller.ts
│   │   ├── notifications.controller.ts
│   │   ├── audit.controller.ts
│   │   ├── settings.controller.ts
│   │   └── profile.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── dashboard.service.ts
│   │   ├── employee.service.ts
│   │   ├── onboarding.service.ts
│   │   ├── document.service.ts
│   │   ├── attendance.service.ts
│   │   ├── leave.service.ts
│   │   ├── review.service.ts
│   │   ├── client.service.ts
│   │   ├── project.service.ts
│   │   ├── assignment.service.ts
│   │   ├── report.service.ts
│   │   ├── notification.service.ts
│   │   ├── audit.service.ts
│   │   ├── settings.service.ts
│   │   └── timesheet.service.ts
│   │
│   ├── repositories/
│   │   ├── employee.repository.ts
│   │   ├── onboarding.repository.ts
│   │   ├── document.repository.ts
│   │   ├── attendance.repository.ts
│   │   ├── leave.repository.ts
│   │   ├── review.repository.ts
│   │   ├── client.repository.ts
│   │   ├── project.repository.ts
│   │   ├── assignment.repository.ts
│   │   ├── notification.repository.ts
│   │   ├── audit.repository.ts
│   │   ├── settings.repository.ts
│   │   └── user.repository.ts
│   │
│   ├── schemas/
│   │   ├── auth.schemas.ts
│   │   ├── employee.schemas.ts
│   │   ├── onboarding.schemas.ts
│   │   ├── document.schemas.ts
│   │   ├── attendance.schemas.ts
│   │   ├── leave.schemas.ts
│   │   ├── review.schemas.ts
│   │   ├── client.schemas.ts
│   │   ├── project.schemas.ts
│   │   ├── assignment.schemas.ts
│   │   ├── report.schemas.ts
│   │   └── settings.schemas.ts
│   │
│   ├── models/
│   │   ├── employee.ts
│   │   ├── onboarding.ts
│   │   ├── document.ts
│   │   ├── attendance.ts
│   │   ├── leave.ts
│   │   ├── review.ts
│   │   ├── client.ts
│   │   ├── project.ts
│   │   ├── assignment.ts
│   │   ├── notification.ts
│   │   ├── audit.ts
│   │   └── user.ts
│   │
│   ├── permissions/
│   │   ├── permissions.ts
│   │   ├── roles.ts
│   │   └── authorization.ts
│   │
│   ├── integrations/
│   │   └── timesheet/
│   │       ├── timesheet.adapter.ts
│   │       ├── timesheet.types.ts
│   │       └── timesheet.service.ts
│   │
│   ├── utils/
│   │   ├── pagination.ts
│   │   ├── dates.ts
│   │   ├── ids.ts
│   │   ├── response.ts
│   │   ├── errors.ts
│   │   └── sanitize.ts
│   │
│   └── types/
│       ├── auth.ts
│       ├── common.ts
│       └── express.d.ts
│
└── tests/
    ├── auth/
    ├── employees/
    ├── onboarding/
    ├── attendance/
    ├── leave/
    ├── documents/
    ├── projects/
    ├── assignments/
    └── permissions/
```

---

# 9. Application Entry Point

Separate:

```text
src/app.ts
```

from:

```text
src/server.ts
```

`app.ts` should create and configure the Express application.

`server.ts` should:

1. load configuration
2. connect to MongoDB
3. start HTTP server
4. handle graceful shutdown

Conceptually:

```text
server.ts
    ↓
connectDatabase()
    ↓
createApp()
    ↓
app.listen()
```

Do not put all backend logic inside `server.ts`.

---

# 10. Express Application

The Express application should configure middleware in approximately this order:

```text
Request ID
↓
Security headers
↓
CORS
↓
JSON body parser
↓
HTTP logging
↓
Rate limiting
↓
API routes
↓
404 handler
↓
Global error handler
```

Example conceptual setup:

```ts
const app = express();

app.use(requestIdMiddleware);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(pinoHttp());
app.use(apiRateLimiter);

app.use("/api/v1", apiRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
```

---

# 11. API Versioning

All APIs must be versioned.

Base:

```text
/api/v1
```

Example:

```text
GET /api/v1/employees
GET /api/v1/employees/:employeeId
POST /api/v1/employees
PATCH /api/v1/employees/:employeeId
```

Do not create unversioned production endpoints such as:

```text
/employees
```

---

# 12. Environment Variables

Required environment variables:

```env
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb+srv://...
MONGODB_DATABASE=eniac_ems

JWT_SECRET=...
JWT_EXPIRES_IN=...

CORS_ORIGIN=http://localhost:5173

LOG_LEVEL=info
```

Production must use secure secrets.

Never commit:

```text
.env
```

to Git.

Provide:

```text
.env.example
```

with placeholders.

---

# 13. Environment Validation

Environment variables must be validated at application startup.

Use Zod.

The server should fail fast if required configuration is missing.

Example conceptual schema:

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DATABASE: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string(),
  CORS_ORIGIN: z.string().min(1)
});
```

---

# 14. MongoDB Architecture

Use a single MongoDB connection pool.

Do not create a new MongoDB connection for every request.

Recommended:

```text
database.ts
    ↓
MongoClient
    ↓
Db
    ↓
Repositories
```

Example:

```ts
let client: MongoClient;
let db: Db;

export async function connectDatabase() {
  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db(env.MONGODB_DATABASE);
}
```

Repositories should obtain collections from the shared database connection.

---

# 15. Database Collections

Recommended collections:

```text
users
employees
onboarding_records
documents
attendance_records
attendance_corrections
leave_requests
leave_balances
clients
projects
project_assignments
employee_reviews
notifications
audit_logs
settings
timesheet_provisioning
```

---

# 16. ID Strategy

MongoDB may use `_id` internally.

The application should expose stable string identifiers.

Recommended:

```text
_id
employeeId
clientId
projectId
documentId
assignmentId
leaveRequestId
reviewId
```

Do not expose internal implementation details unnecessarily.

---

# 17. Employee Model

Employee is the central entity.

Recommended structure:

```ts
interface Employee {
  _id: ObjectId;

  employeeId: string;

  firstName: string;
  middleName?: string;
  lastName: string;

  email: string;
  phone?: string;

  profilePhotoUrl?: string;

  dateOfBirth?: Date;

  designation: string;
  department: string;

  managerId?: string;

  country: "INDIA" | "USA" | string;

  employmentStatus:
    | "ONBOARDING"
    | "ACTIVE"
    | "ON_LEAVE"
    | "SUSPENDED"
    | "RESIGNED"
    | "TERMINATED"
    | "INACTIVE";

  billingStatus:
    | "BILLABLE"
    | "NON_BILLABLE";

  joiningDate?: Date;

  employmentType?:
    | "FULL_TIME"
    | "PART_TIME"
    | "CONTRACT"
    | "INTERN";

  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };

  compensation?: {
    currency?: string;
    salary?: number;
    payFrequency?: "MONTHLY" | "YEARLY" | "HOURLY";
  };

  billRate?: {
    currency?: string;
    amount?: number;
    unit?: "HOURLY" | "DAILY" | "MONTHLY";
  };

  timesheetEligibility?: {
    eligible: boolean;
    eligibleAt?: Date;
    reason?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

---

# 18. Employment Status

Supported statuses:

```text
ONBOARDING
ACTIVE
ON_LEAVE
SUSPENDED
RESIGNED
TERMINATED
INACTIVE
```

Status transitions must be controlled by the backend.

Do not allow arbitrary:

```text
PATCH employee status
```

to bypass workflow.

Prefer action endpoints:

```text
POST /employees/:id/activate
POST /employees/:id/suspend
POST /employees/:id/resign
POST /employees/:id/terminate
POST /employees/:id/deactivate
```

---

# 19. Billing Status

Billing status is independent of employment status.

Supported:

```text
BILLABLE
NON_BILLABLE
```

An employee can therefore be:

```text
ACTIVE + BILLABLE
```

or:

```text
ACTIVE + NON_BILLABLE
```

Billing status must not automatically imply employment status.

---

# 20. Timesheet Eligibility

The core rule is:

```text
Employee is Timesheet Eligible
IF
employmentStatus === ACTIVE
AND
billingStatus === BILLABLE
AND
required onboarding conditions are complete
```

Recommended:

```ts
function isTimesheetEligible(employee: Employee): boolean {
  return (
    employee.employmentStatus === "ACTIVE" &&
    employee.billingStatus === "BILLABLE"
  );
}
```

The final implementation may include additional required conditions.

The eligibility decision belongs to the backend.

---

# 21. Timesheet Provisioning

The EMS should maintain provisioning state.

Example:

```text
NOT_ELIGIBLE
ELIGIBLE
PENDING
PROVISIONED
FAILED
DISABLED
```

Recommended collection:

```text
timesheet_provisioning
```

Example:

```ts
interface TimesheetProvisioning {
  employeeId: string;

  status:
    | "NOT_ELIGIBLE"
    | "ELIGIBLE"
    | "PENDING"
    | "PROVISIONED"
    | "FAILED"
    | "DISABLED";

  externalEmployeeId?: string;

  lastAttemptAt?: Date;
  provisionedAt?: Date;

  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

# 22. Timesheet Integration Boundary

Do not tightly couple EMS business logic to Timesheet implementation.

Use an adapter:

```text
integrations/timesheet/
```

Example:

```ts
interface TimesheetAdapter {
  provisionEmployee(employee: Employee): Promise<ProvisionResult>;

  disableEmployee(employeeId: string): Promise<void>;

  updateEmployee(employee: Employee): Promise<void>;
}
```

This allows the Timesheet platform to later become:

* another Express service
* another Node service
* an external API
* an internal service
* an event-driven system

without rewriting EMS business logic.

---

# 23. Roles

The system has five primary roles.

```text
ADMIN
HR
MANAGER
SUPERVISOR
EMPLOYEE
```

---

# 24. Admin Role

Admin has system-wide capabilities.

Admin can:

* manage employees
* manage onboarding
* manage documents
* manage attendance
* manage leave
* manage clients
* manage projects
* manage assignments
* view reviews
* manage settings
* view reports
* view audit logs
* manage permissions
* manage system configuration

Important:

> Admin does NOT mark attendance.

Admin may have access to attendance administration/reporting, but the Admin role itself is not an attendance participant.

---

# 25. HR Role

HR can:

* onboard employees
* edit employee information
* manage employee lifecycle
* review employee documents
* approve/reject documents
* manage salary/pay rates
* manage bill rates
* manage leave
* review attendance
* manage employee reviews
* view reports
* manage HR workflows

HR should not automatically receive unrestricted system administration privileges.

---

# 26. Manager Role

Manager can:

* create clients
* edit clients
* create projects
* edit projects
* assign employees to projects
* review project progress
* view operational employee information
* review client information
* view project assignments

Manager should not see:

* salary
* confidential HR information
* private HR documents
* audit logs
* system administration
* sensitive compensation information

unless explicitly authorized.

---

# 27. Supervisor Role

Supervisor is primarily intended for operational/project and Timesheet workflows.

Within EMS, Supervisor can:

* view assigned projects
* view assigned team members
* assign employees to projects where permitted
* review project progress
* view operational information
* view relevant activity

Supervisor should not access:

* salary
* bill rates unless explicitly authorized
* confidential documents
* HR configuration
* audit logs
* system administration

---

# 28. Employee Role

Employee can:

* view own profile
* edit allowed profile fields
* mark attendance
* request leave
* view leave information
* upload documents
* view own documents
* view assigned projects
* view own reviews where permitted
* receive notifications

Employee cannot:

* edit salary
* edit bill rate
* edit employee status
* edit employee ID
* edit manager
* edit department
* edit joining date
* edit billing classification
* view other employees' private information

---

# 29. Permission System

Use centralized permissions.

Do not scatter checks such as:

```ts
if (user.role === "HR")
```

throughout controllers.

Instead define permissions:

```text
employee.view
employee.create
employee.edit
employee.delete
employee.activate

employee.view_salary
employee.edit_salary

employee.view_bill_rate
employee.edit_bill_rate

document.view
document.upload
document.review

attendance.view
attendance.mark
attendance.correct
attendance.review

leave.view
leave.request
leave.approve
leave.reject

client.view
client.create
client.edit

project.view
project.create
project.edit

assignment.view
assignment.create
assignment.edit

review.view
review.create
review.edit

report.view

audit.view

settings.view
settings.edit

timesheet.view
timesheet.provision
```

---

# 30. Permission Mapping

Example:

```text
ADMIN
    *
    
HR
    employee.*
    onboarding.*
    document.*
    attendance.*
    leave.*
    review.*
    report.view
    compensation.*

MANAGER
    client.view
    client.create
    client.edit
    project.view
    project.create
    project.edit
    assignment.view
    assignment.create
    assignment.edit
    employee.view_operational

SUPERVISOR
    project.view
    assignment.view
    assignment.create
    employee.view_operational

EMPLOYEE
    profile.view_self
    profile.edit_self
    attendance.mark
    attendance.view_self
    leave.view_self
    leave.request
    document.view_self
    document.upload
    project.view_self
```

Exact mapping should be centralized in:

```text
src/permissions/permissions.ts
```

---

# 31. Authorization Middleware

Create reusable middleware:

```ts
requireAuthentication()

requirePermission("employee.view")

requirePermission("employee.edit")
```

Conceptually:

```ts
router.patch(
  "/employees/:employeeId",
  authenticate,
  requirePermission("employee.edit"),
  updateEmployee
);
```

Authorization must occur server-side.

---

# 32. Resource-Level Authorization

Permission alone is not always enough.

For example:

```text
EMPLOYEE
```

may have:

```text
profile.edit_self
```

but this does not allow:

```text
PATCH /employees/another-user
```

The service must verify ownership.

Example:

```ts
if (
  actor.role === "EMPLOYEE" &&
  actor.employeeId !== employeeId
) {
  throw new ForbiddenError();
}
```

---

# 33. Sensitive Data Protection

Sensitive fields must be protected at the API/service layer.

Sensitive fields include:

```text
salary
pay rate
bill rate
confidential documents
private HR notes
audit data
authentication information
```

Do not merely hide them in the React frontend.

The backend must omit unauthorized fields.

---

# 34. Field-Level Projection

For example, normal employee response:

```json
{
  "employeeId": "EMP-001",
  "firstName": "Priya",
  "lastName": "Sharma",
  "designation": "Software Engineer",
  "department": "Engineering",
  "country": "INDIA",
  "employmentStatus": "ACTIVE",
  "billingStatus": "BILLABLE"
}
```

HR may receive:

```json
{
  "salary": 1200000,
  "currency": "INR"
}
```

Manager should not receive salary.

Never fetch sensitive fields and rely only on frontend rendering to hide them.

---

# 35. Authentication

Recommended authentication flow:

```text
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "user": {
      "id": "...",
      "email": "...",
      "role": "HR"
    }
  }
}
```

JWT may be used for the initial implementation.

Authentication must include:

* password hashing
* token validation
* token expiry
* account status
* role
* employee/user identity

---

# 36. Password Security

Passwords must never be stored in plaintext.

Use:

```text
bcrypt
```

or another strong password hashing algorithm.

Never log:

```text
password
JWT
refresh token
API secret
```

---

# 37. Authenticated User Context

Attach authenticated user information to the Express request.

Example:

```ts
interface AuthenticatedUser {
  userId: string;
  employeeId?: string;
  email: string;
  role: Role;
}
```

Extend Express request typing.

Example:

```ts
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}
```

---

# 38. Standard API Response

Use consistent responses.

Success:

```json
{
  "success": true,
  "data": {}
}
```

List:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "EMPLOYEE_NOT_FOUND",
    "message": "Employee was not found."
  }
}
```

---

# 39. HTTP Status Codes

Use appropriate status codes.

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
503 Service Unavailable
```

Do not return `200` for every failure.

---

# 40. Error Handling

All asynchronous controllers must correctly propagate errors.

Recommended pattern:

```ts
asyncHandler(async (req, res) => {
  ...
});
```

Create application errors:

```ts
class AppError extends Error {
  statusCode: number;
  code: string;
}
```

Examples:

```text
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
BusinessRuleError
```

All errors must eventually reach:

```text
error-handler.middleware.ts
```

---

# 41. Never Leak Internal Errors

Do not return:

```text
MongoDB connection string
stack traces
internal filesystem paths
database query details
JWT secrets
```

in production responses.

---

# 42. Logging

Use structured logging.

Recommended:

```text
Pino
```

Log:

* request ID
* method
* route
* response status
* duration
* authenticated user ID
* relevant resource IDs
* errors

Do not log:

* passwords
* tokens
* salary values
* confidential documents
* private personal data unnecessarily

---

# 43. Request IDs

Every request should receive a request ID.

Example:

```text
X-Request-ID
```

If supplied by a trusted upstream source, validate it.

Otherwise generate one.

This makes debugging easier.

---

# 44. Security Middleware

Use:

```text
helmet
cors
express-rate-limit
```

Configure CORS explicitly.

Do not use:

```ts
cors({ origin: "*" })
```

in production unless intentionally required.

---

# 45. Input Validation

Every request body, query, and route parameter should be validated.

Use:

```text
Zod
```

Example:

```ts
const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  designation: z.string().min(1),
  department: z.string().min(1)
});
```

Never trust:

```text
req.body
req.query
req.params
```

directly.

---

# 46. Employees API

Base:

```text
/api/v1/employees
```

Routes:

```text
GET    /employees
POST   /employees
GET    /employees/:employeeId
PATCH  /employees/:employeeId
```

Lifecycle:

```text
POST /employees/:employeeId/activate
POST /employees/:employeeId/suspend
POST /employees/:employeeId/resign
POST /employees/:employeeId/terminate
POST /employees/:employeeId/deactivate
```

Billing:

```text
POST /employees/:employeeId/billing-status
```

Timesheet:

```text
GET  /employees/:employeeId/timesheet
POST /employees/:employeeId/timesheet/provision
POST /employees/:employeeId/timesheet/disable
```

---

# 47. Employee List API

Support:

```text
page
pageSize
search
status
department
country
billingStatus
managerId
designation
sortBy
sortOrder
```

Example:

```text
GET /api/v1/employees?page=1&pageSize=25&status=ACTIVE&billingStatus=BILLABLE
```

---

# 48. Employee Search

Search should support relevant fields:

```text
employeeId
firstName
lastName
email
designation
department
```

Use MongoDB indexes where appropriate.

---

# 49. Employee Creation

Employee creation must validate:

* email uniqueness
* employee ID uniqueness
* country
* department
* designation
* employment status
* billing status
* manager
* joining date

Do not automatically create an active employee unless onboarding requirements are satisfied.

---

# 50. Employee Update

Do not allow arbitrary fields from the client.

Use separate schemas for:

```text
HR employee update
Manager operational update
Employee self update
```

This prevents mass assignment vulnerabilities.

---

# 51. Employee Self-Service Update

Employee may edit:

```text
phone
address
city
state
postal code
emergency contact
profile photo
```

Employee may not edit:

```text
employeeId
joiningDate
designation
department
managerId
employmentStatus
billingStatus
salary
billRate
timesheetEligibility
```

---

# 52. Onboarding

Onboarding should be modeled as a workflow.

Stages:

```text
EMPLOYEE_INFORMATION
EMPLOYMENT_DETAILS
GEOGRAPHY
BILLING_CLASSIFICATION
DOCUMENTS
HR_REVIEW
ACTIVATION
TIMESHEET_ELIGIBILITY
```

---

# 53. Onboarding API

Routes:

```text
GET  /onboarding
POST /onboarding
GET  /onboarding/:employeeId
PATCH /onboarding/:employeeId
```

Workflow actions:

```text
POST /onboarding/:employeeId/submit
POST /onboarding/:employeeId/review
POST /onboarding/:employeeId/approve
POST /onboarding/:employeeId/reject
POST /onboarding/:employeeId/activate
```

---

# 54. Onboarding Completion

An employee should not become:

```text
ACTIVE
```

until required onboarding conditions are satisfied.

Backend should validate:

```text
required employee data
required employment information
required documents
HR approval
```

---

# 55. Geography

Current supported countries:

```text
INDIA
USA
```

Implementation should remain extensible.

Do not hardcode the entire backend around only two countries.

Country-specific fields should be designed so future countries can be added.

---

# 56. Documents

Documents are associated with employees.

Document example:

```ts
interface EmployeeDocument {
  documentId: string;
  employeeId: string;

  type: string;
  name: string;

  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CHANGES_REQUESTED";

  fileUrl?: string;

  uploadedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;

  expiresAt?: Date;

  reviewComments?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

# 57. Document API

```text
GET  /documents
GET  /documents/:documentId
POST /documents
PATCH /documents/:documentId
```

Actions:

```text
POST /documents/:documentId/approve
POST /documents/:documentId/reject
POST /documents/:documentId/request-changes
```

---

# 58. Document Security

Employees can view their own documents.

HR can review documents.

Admin can review documents.

Managers should not automatically see confidential HR documents.

Document authorization must be checked server-side.

---

# 59. Document Expiry

Documents with:

```text
expiresAt
```

must be queryable.

Backend should support:

```text
expired
expiring soon
valid
```

Reports should be able to identify documents expiring within a configurable window.

---

# 60. Attendance

Attendance applies to:

```text
HR
Manager
Supervisor
Employee
```

Attendance does not apply to:

```text
Admin
```

---

# 61. Attendance Model

Example:

```ts
interface AttendanceRecord {
  attendanceId: string;

  employeeId: string;

  date: Date;

  checkIn?: Date;
  checkOut?: Date;

  status:
    | "P"
    | "A"
    | "L"
    | "LV"
    | "M";

  totalMinutes?: number;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

# 62. Attendance API

```text
GET /attendance
GET /attendance/:employeeId
POST /attendance/check-in
POST /attendance/check-out
```

Admin/HR management:

```text
PATCH /attendance/:attendanceId
```

Corrections:

```text
POST /attendance/:attendanceId/correction
GET  /attendance/corrections
POST /attendance/corrections/:correctionId/approve
POST /attendance/corrections/:correctionId/reject
```

---

# 63. Attendance Rules

The backend must prevent:

* duplicate check-ins
* invalid check-out before check-in
* unauthorized attendance marking
* marking attendance for another employee
* Admin self-attendance
* impossible timestamps
* duplicate daily attendance records

---

# 64. Attendance Correction Workflow

Employee submits:

```text
correction request
```

HR or authorized reviewer:

```text
approve
reject
```

Do not silently overwrite attendance.

Corrections should create an audit trail.

---

# 65. Leave

Leave management supports:

```text
leave balance
leave requests
approval
rejection
history
```

---

# 66. Leave API

```text
GET  /leave
GET  /leave/balances
GET  /leave/balances/:employeeId
POST /leave/request
GET  /leave/:requestId
```

Approval:

```text
POST /leave/:requestId/approve
POST /leave/:requestId/reject
```

---

# 67. Leave Request

Example:

```ts
interface LeaveRequest {
  requestId: string;

  employeeId: string;

  leaveType: string;

  startDate: Date;
  endDate: Date;

  days: number;

  reason?: string;

  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED";

  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

# 68. Leave Rules

Backend must validate:

* start date <= end date
* employee is eligible
* sufficient leave balance
* no invalid overlap
* valid leave type
* approval authority
* no approval of already resolved request

Leave balances should update transactionally where required.

---

# 69. Clients

Managers and authorized users can manage clients.

Client model:

```ts
interface Client {
  clientId: string;

  name: string;
  code?: string;

  status:
    | "ACTIVE"
    | "INACTIVE";

  industry?: string;

  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };

  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };

  createdBy: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

# 70. Client API

```text
GET    /clients
POST   /clients
GET    /clients/:clientId
PATCH  /clients/:clientId
POST   /clients/:clientId/deactivate
```

---

# 71. Projects

Projects belong to clients.

Project model:

```ts
interface Project {
  projectId: string;

  clientId: string;

  name: string;
  code?: string;

  description?: string;

  status:
    | "PLANNING"
    | "ACTIVE"
    | "ON_HOLD"
    | "COMPLETED"
    | "CANCELLED";

  health:
    | "ON_TRACK"
    | "AT_RISK"
    | "OFF_TRACK";

  startDate?: Date;
  endDate?: Date;

  managerId?: string;

  progressPercent?: number;

  createdAt: Date;
  updatedAt: Date;
}
```

---

# 72. Project API

```text
GET    /projects
POST   /projects
GET    /projects/:projectId
PATCH  /projects/:projectId
POST   /projects/:projectId/activate
POST   /projects/:projectId/complete
POST   /projects/:projectId/archive
```

---

# 73. Project Assignment

Do not store only:

```text
employee.projectId
```

Employees may work on multiple projects.

Create:

```text
project_assignments
```

---

# 74. Assignment Model

```ts
interface ProjectAssignment {
  assignmentId: string;

  employeeId: string;
  projectId: string;

  role?: string;

  allocationPercent: number;

  billable: boolean;

  startDate: Date;
  endDate?: Date;

  status:
    | "ACTIVE"
    | "ENDED"
    | "CANCELLED";

  createdBy: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

# 75. Assignment API

```text
GET  /assignments
POST /assignments
GET  /assignments/:assignmentId
PATCH /assignments/:assignmentId
POST /assignments/:assignmentId/end
```

Validation:

```text
allocationPercent >= 0
allocationPercent <= 100
```

The system should detect problematic overallocation.

---

# 76. Employee Reviews

Reviews should support:

```text
review cycle
reviewer
employee
rating
comments
goals
status
```

API:

```text
GET  /reviews
POST /reviews
GET  /reviews/:reviewId
PATCH /reviews/:reviewId
POST /reviews/:reviewId/submit
POST /reviews/:reviewId/complete
```

---

# 77. Notifications

Notifications are first-class entities.

Example:

```ts
interface Notification {
  notificationId: string;

  userId: string;

  type: string;

  title: string;
  message: string;

  read: boolean;

  link?: string;

  createdAt: Date;
  readAt?: Date;
}
```

API:

```text
GET /notifications
POST /notifications/:notificationId/read
POST /notifications/read-all
```

---

# 78. Notification Events

Generate notifications for important events.

Examples:

```text
Leave submitted
Leave approved
Leave rejected
Document approved
Document rejected
Document changes requested
Document expiring
Onboarding awaiting review
Employee activated
Project assignment created
Review due
Timesheet provisioning failed
```

---

# 79. Audit Logging

Audit logging is mandatory for important business actions.

Audit events include:

```text
employee.created
employee.updated
employee.activated
employee.suspended
employee.terminated

document.uploaded
document.approved
document.rejected

leave.requested
leave.approved
leave.rejected

attendance.corrected

client.created
project.created
assignment.created

salary.updated
bill_rate.updated

timesheet.provisioned
timesheet.provision_failed
```

---

# 80. Audit Log Model

```ts
interface AuditLog {
  auditId: string;

  actorUserId: string;
  actorRole: string;

  action: string;

  entityType: string;
  entityId: string;

  before?: unknown;
  after?: unknown;

  requestId?: string;

  ipAddress?: string;

  createdAt: Date;
}
```

---

# 81. Audit Access

Audit logs are highly restricted.

Default:

```text
ADMIN only
```

Do not expose audit logs to:

```text
EMPLOYEE
MANAGER
SUPERVISOR
```

HR access should be explicitly decided rather than assumed.

---

# 82. Compensation

Salary/pay rate and bill rate are separate concepts.

Salary:

```text
what Eniac pays the employee
```

Bill rate:

```text
what Eniac charges the client
```

Never combine these fields.

---

# 83. Salary Permissions

Salary access:

```text
ADMIN
HR
```

Salary must not be returned to:

```text
MANAGER
SUPERVISOR
EMPLOYEE
```

unless a future explicit permission grants access.

---

# 84. Bill Rate Permissions

Bill rate access should initially be restricted to:

```text
ADMIN
HR
```

Project-specific future billing permissions may be added later.

---

# 85. Dashboard APIs

The frontend has role-specific dashboards.

Backend should provide dashboard-specific aggregation APIs rather than forcing the frontend to download all data.

Base:

```text
GET /dashboard
```

Recommended:

```text
GET /dashboard/admin
GET /dashboard/hr
GET /dashboard/manager
GET /dashboard/supervisor
GET /dashboard/employee
```

---

# 86. Admin Dashboard

Return metrics such as:

```text
totalEmployees
activeEmployees
billableEmployees
nonBillableEmployees
activeProjects
activeClients
pendingLeaveRequests
pendingDocuments
upcomingReviews
attendanceExceptions
```

Also:

```text
employeeStatusDistribution
workforceDistribution
projectHealth
recentActivity
```

---

# 87. HR Dashboard

Metrics:

```text
totalEmployees
pendingOnboarding
pendingDocuments
pendingLeaveRequests
upcomingReviews
documentsExpiringSoon
```

Pipeline:

```text
onboarding stages
employee distribution
pending HR actions
```

---

# 88. Manager Dashboard

Metrics:

```text
activeClients
activeProjects
assignedEmployees
projectsAtRisk
```

Data:

```text
project portfolio
resource allocation
project health
client activity
```

---

# 89. Supervisor Dashboard

Metrics:

```text
assignedProjects
teamMembers
activeAssignments
projectsRequiringAttention
```

Data:

```text
my projects
team assignments
project progress
recent operational activity
```

---

# 90. Employee Dashboard

Return only employee-specific information:

```text
attendance
leave balance
pending leave requests
assigned projects
documents
recent notifications
```

---

# 91. Reports

Reports should be generated server-side.

Base:

```text
GET /reports
```

Examples:

```text
GET /reports/employees
GET /reports/attendance
GET /reports/leave
GET /reports/projects
GET /reports/assignments
GET /reports/documents
GET /reports/billing
```

Sensitive reports must be permission-protected.

---

# 92. Pagination

All large collection endpoints should support pagination.

Recommended:

```text
page
pageSize
```

Default:

```text
page = 1
pageSize = 20
```

Maximum:

```text
pageSize = 100
```

Do not allow arbitrary huge page sizes.

---

# 93. Sorting

Use whitelisted sort fields.

Do not pass arbitrary client strings directly into MongoDB sort/query operations.

Example:

```ts
const allowedSortFields = [
  "employeeId",
  "firstName",
  "department",
  "joiningDate"
];
```

---

# 94. Filtering

Filters should be validated.

Example:

```text
status=ACTIVE
country=INDIA
billingStatus=BILLABLE
department=Engineering
```

Never construct raw MongoDB queries from arbitrary user input.

---

# 95. MongoDB Indexes

Create indexes for common queries.

Employees:

```text
employeeId
email
employmentStatus
billingStatus
department
managerId
country
```

Documents:

```text
employeeId
status
expiresAt
```

Attendance:

```text
employeeId + date
date
status
```

Leave:

```text
employeeId
status
startDate
endDate
```

Projects:

```text
clientId
status
managerId
```

Assignments:

```text
employeeId
projectId
status
```

Notifications:

```text
userId
read
createdAt
```

Audit:

```text
actorUserId
entityType + entityId
createdAt
```

---

# 96. Unique Constraints

Use MongoDB unique indexes where appropriate.

Examples:

```text
employeeId
user.email
client.code
project.code
```

Ensure duplicate errors are translated into:

```text
409 Conflict
```

---

# 97. Soft Deletion

Do not hard delete employees.

Prefer:

```text
employmentStatus = INACTIVE
```

or:

```text
deletedAt
```

for entities where appropriate.

Historical records must remain intact.

Do not delete attendance, leave, audit, assignment, or review history simply because an employee leaves.

---

# 98. Employee Lifecycle

Typical lifecycle:

```text
ONBOARDING
    ↓
ACTIVE
    ↓
ON_LEAVE
    ↓
ACTIVE
    ↓
RESIGNED
    ↓
INACTIVE
```

Other transitions:

```text
ACTIVE → SUSPENDED
SUSPENDED → ACTIVE
ACTIVE → TERMINATED
```

Transitions must be validated.

---

# 99. Business Rule: Active + Billable

An employee is eligible for Timesheet provisioning when:

```text
employmentStatus = ACTIVE
AND
billingStatus = BILLABLE
```

Do not provision employees merely because:

```text
billingStatus = BILLABLE
```

if they are still:

```text
ONBOARDING
```

---

# 100. Business Rule: Admin Attendance

The backend must reject Admin attendance actions.

For example:

```text
POST /attendance/check-in
```

with an Admin account should return:

```text
403 Forbidden
```

---

# 101. Business Rule: Employee Self-Service

Employee requests involving another employee must be rejected.

Example:

```text
PATCH /employees/EMP-002
```

from:

```text
EMP-001
```

must fail unless the user has elevated permission.

---

# 102. Business Rule: Manager Sensitive Data

Manager employee endpoints must not return:

```text
salary
billRate
private HR notes
confidential documents
```

---

# 103. Business Rule: Supervisor Scope

Supervisor access should be limited to operational/project data.

Supervisor should not become an implicit HR administrator.

---

# 104. Business Rule: Leave Approval

Employees cannot approve their own leave.

A request creator should not be allowed to approve the same request unless an explicit future policy permits it.

---

# 105. Business Rule: Document Review

Employees cannot approve their own uploaded documents.

---

# 106. Business Rule: Audit

Sensitive mutations should produce audit entries.

At minimum:

```text
create
update
delete/deactivate
approve
reject
activate
terminate
salary change
bill rate change
timesheet provisioning
```

---

# 107. Service Layer

Controllers should remain thin.

Bad:

```ts
router.post("/employees", async (req, res) => {
  const employee = await db.collection("employees").insertOne(...);
});
```

Preferred:

```text
Route
 ↓
Middleware
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
MongoDB
```

---

# 108. Controller Responsibilities

Controllers should:

* parse request
* invoke validation
* call service
* return response

Controllers should not contain complex business logic.

---

# 109. Service Responsibilities

Services contain:

* business rules
* workflow transitions
* permission-sensitive operations
* transaction orchestration
* integration coordination
* notifications
* audit creation

---

# 110. Repository Responsibilities

Repositories contain database operations.

Examples:

```ts
employeeRepository.findById()
employeeRepository.findMany()
employeeRepository.create()
employeeRepository.update()
```

Repositories should not decide:

```text
whether a user is allowed to update salary
```

That belongs in authorization/service logic.

---

# 111. MongoDB Transactions

Use MongoDB transactions where multiple related writes must remain consistent.

Example leave approval:

```text
approve leave
↓
update leave request
↓
update leave balance
↓
create notification
↓
create audit log
```

Where transaction support is available and justified, these operations should be coordinated transactionally.

---

# 112. API Route Organization

Use modular Express routers.

Example:

```ts
const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("employee.view"),
  getEmployees
);

router.get(
  "/:employeeId",
  authenticate,
  requirePermission("employee.view"),
  getEmployee
);
```

Mount:

```ts
app.use("/api/v1/employees", employeeRouter);
```

---

# 113. Auth Routes

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/refresh
```

If refresh tokens are not initially implemented, keep the architecture ready for them.

---

# 114. Profile Routes

```text
GET /api/v1/profile
PATCH /api/v1/profile
```

These operate on the authenticated employee.

They must not accept an arbitrary employee ID for self-service operations.

---

# 115. Settings

Settings are highly permission-controlled.

Routes:

```text
GET /api/v1/settings
PATCH /api/v1/settings
```

Possible configuration:

```text
leave types
attendance rules
document expiry thresholds
organization settings
notification settings
```

---

# 116. Leave Types

Do not hardcode all leave types into controllers.

Recommended configurable structure:

```text
leave_types
```

or system settings.

Example:

```ts
interface LeaveType {
  code: string;
  name: string;
  annualAllowance?: number;
  requiresApproval: boolean;
  active: boolean;
}
```

---

# 117. Date Handling

Use UTC internally where practical.

Be explicit about organization/user timezone.

Do not assume:

```text
server timezone == employee timezone
```

Attendance is especially sensitive to timezone.

---

# 118. Attendance Date Semantics

Attendance records should represent the employee's local work date.

For example:

```text
2026-10-08
```

should not accidentally become:

```text
2026-10-07
```

because of server timezone conversion.

---

# 119. File Uploads

If document files are uploaded, do not store large binary files directly inside normal employee documents unless explicitly designed.

Preferred architecture:

```text
Frontend
 ↓
Upload service/storage
 ↓
File URL / object key
 ↓
MongoDB metadata
```

MongoDB stores metadata.

Example:

```text
fileName
mimeType
size
storageKey
storageUrl
```

Actual storage may later be:

```text
S3
Azure Blob
Google Cloud Storage
```

---

# 120. Document Upload Security

Validate:

```text
file type
file size
extension
content type
employee ownership
```

Do not trust the browser-provided MIME type alone.

---

# 121. API Security

Protect against:

* mass assignment
* injection
* unauthorized access
* IDOR
* brute-force login
* excessive request sizes
* unrestricted pagination
* sensitive field exposure
* privilege escalation

---

# 122. IDOR Prevention

Every endpoint receiving an entity ID must verify that the authenticated user has access to that specific entity.

Example:

```text
GET /employees/EMP-123
```

does not automatically mean:

```text
employee.view
```

is enough.

Additional scope rules may apply.

---

# 123. CORS

Development:

```text
http://localhost:5173
```

Production:

```text
https://<EMS-FRONTEND-DOMAIN>
```

Only approved frontend origins should be allowed.

---

# 124. Rate Limiting

At minimum apply rate limiting to:

```text
/auth/login
```

and optionally all public/API routes.

Authentication endpoints should have stricter limits.

---

# 125. Health Endpoint

Create:

```text
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

Optionally:

```text
GET /health/ready
GET /health/live
```

Readiness may verify MongoDB connectivity.

---

# 126. Graceful Shutdown

On:

```text
SIGTERM
SIGINT
```

the backend should:

1. stop accepting new requests
2. wait for active requests
3. close MongoDB connection
4. close server
5. exit cleanly

---

# 127. API Contract With EMSF

The backend should be designed around the data currently consumed by EMSF.

The frontend's mock repositories currently represent the logical API boundary.

Those operations should map to actual backend endpoints.

Conceptually:

```text
EMSF mock repository
        ↓
EMSB REST API
        ↓
service
        ↓
repository
        ↓
MongoDB
```

Do not make the frontend aware of MongoDB implementation details.

---

# 128. Replacing Frontend Mock Repositories

The frontend currently has mock data/repository behavior.

The migration should be:

```text
BEFORE

React
 ↓
mock repository
 ↓
mock data


AFTER

React
 ↓
API client
 ↓
HTTP
 ↓
Express
 ↓
service
 ↓
MongoDB
```

The EMSF component APIs should remain as stable as possible.

---

# 129. API Client Expectations

The frontend should eventually have an API client such as:

```text
src/lib/api.ts
```

or:

```text
src/services/api/
```

It should call:

```text
/api/v1/...
```

The backend should maintain consistent response structures.

---

# 130. Frontend Route Compatibility

Backend routes must support the frontend pages:

```text
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

The backend does not need to duplicate these frontend URLs.

Instead, it needs the API resources required by those screens.

---

# 131. Dashboard API Mapping

Frontend:

```text
/dashboard
```

Backend:

```text
GET /api/v1/dashboard
```

The backend determines the user's role and returns the appropriate dashboard data, or the frontend can use explicit role dashboard endpoints.

---

# 132. Employee Detail API

Frontend:

```text
/employees/:employeeId
```

Backend:

```text
GET /api/v1/employees/:employeeId
```

Response should include only authorized information.

---

# 133. Employee Detail Tabs

The employee profile contains:

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

Each section may map to separate API endpoints.

Examples:

```text
GET /employees/:id/documents
GET /attendance/:id
GET /leave?employeeId=:id
GET /assignments?employeeId=:id
GET /reviews?employeeId=:id
GET /employees/:id/compensation
```

Sensitive endpoints must be permission protected.

---

# 134. Compensation API

Do not return compensation as part of every employee response.

Prefer:

```text
GET /employees/:employeeId/compensation
```

and require:

```text
employee.view_salary
```

or equivalent.

This minimizes accidental exposure.

---

# 135. Employee Activity

Employee activity can include:

```text
profile changes
document actions
leave actions
attendance corrections
assignment changes
review actions
```

Sensitive information should be filtered according to role.

---

# 136. Project Progress

Project progress may include:

```text
progressPercent
health
status
milestones
assigned employees
```

Do not expose internal HR information through project APIs.

---

# 137. Resource Allocation

Backend should calculate:

```text
employee allocation
project allocation
overallocation
available capacity
```

Example:

```text
Employee A
Project X: 50%
Project Y: 30%
Total: 80%
```

Potential warning:

```text
Employee B
Project X: 70%
Project Y: 50%
Total: 120%
```

---

# 138. Reporting Aggregations

Use MongoDB aggregation pipelines where appropriate.

Do not fetch thousands of records into Node.js and calculate everything in application memory.

Examples:

```text
employee status counts
department distribution
attendance summaries
leave summaries
project health
billability
```

---

# 139. Performance

Backend should:

* use indexes
* paginate
* avoid N+1 queries
* use projections
* use aggregation for reporting
* reuse MongoDB connections
* avoid unnecessary data transfer
* avoid loading entire collections into memory

---

# 140. N+1 Prevention

For employee lists, do not query the database once for every employee's manager.

Prefer:

```text
aggregation
batch lookup
cached lookup
```

where appropriate.

---

# 141. Data Validation

Validation must happen at multiple levels:

```text
request validation
↓
service business validation
↓
database constraints
```

Never rely on only one.

---

# 142. Business Errors

Use meaningful codes.

Examples:

```text
EMPLOYEE_NOT_FOUND
EMPLOYEE_ALREADY_ACTIVE
INVALID_STATUS_TRANSITION
DUPLICATE_EMPLOYEE
INSUFFICIENT_LEAVE_BALANCE
LEAVE_OVERLAP
DOCUMENT_NOT_FOUND
UNAUTHORIZED_DOCUMENT_ACCESS
PROJECT_NOT_FOUND
ASSIGNMENT_OVERALLOCATION
TIMESHEET_NOT_ELIGIBLE
TIMESHEET_PROVISION_FAILED
```

---

# 143. Route-Level Permission Matrix

The backend should maintain a route/permission matrix.

Example:

| Resource    | Admin      | HR         | Manager                | Supervisor  | Employee |
| ----------- | ---------- | ---------- | ---------------------- | ----------- | -------- |
| Employees   | Full       | Full       | Operational            | Operational | Self     |
| Salary      | Full       | Full       | No                     | No          | No       |
| Bill Rate   | Full       | Full       | No                     | No          | No       |
| Documents   | Full       | Full       | Limited                | Limited     | Own      |
| Attendance  | Administer | Full       | Operational            | Operational | Own      |
| Leave       | Full       | Full       | Approve where assigned | Limited     | Own      |
| Clients     | Full       | View       | Full                   | Limited     | No       |
| Projects    | Full       | View       | Full                   | Operational | Assigned |
| Assignments | Full       | View       | Full                   | Operational | Own      |
| Reviews     | Full       | Full       | Relevant               | Relevant    | Own      |
| Reports     | Full       | HR         | Operational            | Limited     | Own      |
| Audit       | Full       | Restricted | No                     | No          | No       |
| Settings    | Full       | HR subset  | No                     | No          | No       |

This is a conceptual matrix and should be refined during implementation.

---

# 144. HTTP 403 vs 404

Use:

```text
403
```

when the user is authenticated but not authorized.

Use:

```text
404
```

when the resource does not exist.

For sensitive resources, a `404` may intentionally be returned to avoid revealing resource existence.

This should be deliberate.

---

# 145. API Documentation

Prefer OpenAPI documentation.

Recommended endpoint:

```text
/api-docs
```

Development documentation should describe:

* authentication
* request schemas
* responses
* errors
* permissions
* examples

---

# 146. Testing Strategy

Testing is mandatory.

Use:

```text
Vitest
Supertest
```

Test:

```text
unit logic
services
authorization
API endpoints
business rules
database behavior
```

---

# 147. Authentication Tests

Test:

```text
valid login
invalid password
unknown user
inactive user
expired token
invalid token
missing token
```

---

# 148. Authorization Tests

Every major permission should have tests.

Examples:

```text
Employee cannot access another employee
Employee cannot edit salary
Manager cannot access salary
Supervisor cannot access salary
HR can access salary
Admin can access salary
Admin cannot mark attendance
```

---

# 149. Employee Tests

Test:

```text
create employee
duplicate email
duplicate employee ID
get employee
update employee
activate
suspend
terminate
deactivate
```

---

# 150. Onboarding Tests

Test:

```text
create onboarding
complete stages
reject onboarding
approve onboarding
activate employee
prevent activation without requirements
```

---

# 151. Timesheet Tests

Critical tests:

```text
ACTIVE + BILLABLE → eligible
ACTIVE + NON_BILLABLE → not eligible
ONBOARDING + BILLABLE → not eligible
ON_LEAVE + BILLABLE → not eligible if policy requires active status
TERMINATED + BILLABLE → not eligible
```

Provisioning should only be available when eligible.

---

# 152. Attendance Tests

Test:

```text
employee check-in
employee check-out
duplicate check-in
invalid check-out
Admin check-in rejected
employee cannot mark another employee
correction request
correction approval
correction rejection
```

---

# 153. Leave Tests

Test:

```text
request leave
insufficient balance
overlapping leave
approve leave
reject leave
employee cannot approve own leave
balance update
```

---

# 154. Document Tests

Test:

```text
upload document
view own document
HR review
approve
reject
request changes
unauthorized manager access
expiry detection
```

---

# 155. Project Tests

Test:

```text
create client
create project
assign employee
update project
end assignment
invalid allocation
overallocation warning
```

---

# 156. Audit Tests

Verify that important actions generate audit records.

Example:

```text
salary update
→ audit log created
```

---

# 157. Test Database

Tests should not rely on production MongoDB.

Use:

```text
test database
```

or a controlled test MongoDB environment.

Never run destructive tests against production.

---

# 158. Seed Data

Development environment should have seed data.

Recommended:

```text
5 roles
50+ employees
10 clients
20 projects
100+ attendance records
30 leave requests
50 documents
30 assignments
20 reviews
50 notifications
100 audit records
```

Use deterministic mock/seed data.

---

# 159. Demo Users

Recommended demo accounts:

```text
admin@eniac.demo
hr@eniac.demo
manager@eniac.demo
supervisor@eniac.demo
employee@eniac.demo
```

Development-only password:

```text
demo123
```

Do not use these credentials in production.

---

# 160. Seed User Mapping

Example:

```text
admin@eniac.demo
→ ADMIN

hr@eniac.demo
→ HR

manager@eniac.demo
→ MANAGER

supervisor@eniac.demo
→ SUPERVISOR

employee@eniac.demo
→ EMPLOYEE
```

---

# 161. Development Scripts

Recommended `package.json` scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "seed": "tsx src/scripts/seed.ts"
  }
}
```

---

# 162. TypeScript Strictness

Avoid:

```ts
any
```

unless unavoidable.

Prefer explicit interfaces and types.

Bad:

```ts
const employee: any = ...
```

Good:

```ts
const employee: Employee = ...
```

---

# 163. Repository Typing

Repositories should be strongly typed.

Example:

```ts
class EmployeeRepository {
  async findByEmployeeId(
    employeeId: string
  ): Promise<Employee | null> {
    ...
  }
}
```

---

# 164. Service Typing

Services should expose explicit business operations.

Example:

```ts
class EmployeeService {
  async activateEmployee(
    actor: AuthenticatedUser,
    employeeId: string
  ): Promise<Employee> {
    ...
  }
}
```

---

# 165. Controller Typing

Controllers should use Express types.

Example:

```ts
export async function getEmployee(
  req: Request,
  res: Response
) {
  ...
}
```

---

# 166. No Business Logic in Routes

Avoid:

```ts
router.post("/", async (req, res) => {
  // 100 lines of business logic
});
```

Routes should only wire:

```text
middleware → controller
```

---

# 167. No MongoDB Queries in Controllers

Avoid:

```ts
req.app.locals.db.collection(...)
```

inside controllers.

Controllers call services.

Services call repositories.

---

# 168. Transaction Boundaries

Transactions belong at the service/business-operation level.

Repositories should expose transaction-aware methods where needed.

---

# 169. Audit Context

Middleware should make request metadata available:

```text
requestId
userId
role
IP
user agent
```

Services can use this context when generating audit logs.

---

# 170. Notifications

Notification generation should not be scattered throughout controllers.

Use:

```text
NotificationService
```

Example:

```ts
await notificationService.create({
  userId,
  type: "LEAVE_APPROVED",
  title: "Leave approved",
  message: "Your leave request was approved."
});
```

---

# 171. Audit Service

Likewise:

```text
AuditService
```

should centralize audit creation.

Example:

```ts
await auditService.record({
  actorUserId,
  action: "leave.approved",
  entityType: "leave_request",
  entityId: requestId
});
```

---

# 172. Frontend Error Compatibility

Frontend should be able to display:

```text
error.code
error.message
```

Do not return unpredictable error formats.

---

# 173. Validation Error Format

Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "fields": {
      "email": "Invalid email address."
    }
  }
}
```

---

# 174. Pagination Response

Use:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

# 175. Search Performance

Search should not use an unbounded regex over every field for every request.

Use appropriate MongoDB indexes.

For larger scale, consider MongoDB Atlas Search.

---

# 176. Database Naming

Recommended database:

```text
eniac_ems
```

Production database name can be configured through:

```env
MONGODB_DATABASE
```

---

# 177. Collection Naming

Use consistent plural names:

```text
employees
users
documents
attendance_records
leave_requests
leave_balances
clients
projects
project_assignments
employee_reviews
notifications
audit_logs
```

---

# 178. Timestamps

Every primary document should generally contain:

```text
createdAt
updatedAt
```

Use server-generated timestamps.

Do not trust client-provided:

```text
createdAt
updatedAt
```

---

# 179. Immutable Historical Data

The following should generally preserve historical records:

```text
attendance
leave
reviews
audit logs
assignments
employee lifecycle events
```

Do not overwrite historical facts without an audit trail.

---

# 180. Lifecycle History

Consider storing employee lifecycle events:

```text
employee_lifecycle_events
```

Example:

```ts
{
  employeeId: "EMP-001",
  fromStatus: "ONBOARDING",
  toStatus: "ACTIVE",
  changedBy: "USER-001",
  reason: "Onboarding completed",
  createdAt: Date
}
```

This is highly recommended.

---

# 181. Compensation History

Do not simply overwrite salary forever.

Recommended future model:

```text
employee_compensation_history
```

with:

```text
effectiveFrom
effectiveTo
salary
currency
changedBy
reason
```

This enables historical reporting.

---

# 182. Bill Rate History

Likewise:

```text
employee_bill_rate_history
```

is recommended.

Bill rate changes should preserve history.

---

# 183. Data Ownership

MongoDB collections should be owned logically by EMSB.

The Timesheet application should not arbitrarily mutate EMS-specific employee records.

Instead:

```text
EMSB
    ↓
Timesheet Adapter/API
```

or:

```text
EMSB
    ↓
Event
    ↓
Timesheet
```

---

# 184. Shared MongoDB Consideration

Even if both applications use the same MongoDB Atlas cluster:

```text
EMSB
TS
```

should maintain clear collection ownership.

Do not allow:

```text
TS
```

to directly update:

```text
employees.salary
employees.managerId
employees.employmentStatus
```

unless explicitly designed.

---

# 185. Recommended Integration Event

When employee becomes:

```text
ACTIVE + BILLABLE
```

EMS can trigger:

```text
EmployeeTimesheetEligibilityChanged
```

Payload:

```json
{
  "employeeId": "EMP-001",
  "eligible": true
}
```

---

# 186. Timesheet Provisioning Retry

If provisioning fails:

```text
PROVISIONING
→ FAILED
```

store:

```text
failureReason
lastAttemptAt
```

Allow authorized retry:

```text
POST /employees/:employeeId/timesheet/provision
```

---

# 187. No Automatic Infinite Retry

Do not implement an uncontrolled retry loop.

Use:

```text
manual retry
```

initially.

Future:

```text
background job queue
```

may be added.

---

# 188. Background Jobs

Not required for the first implementation.

Potential future jobs:

```text
document expiry notifications
review reminders
leave reminders
Timesheet provisioning retries
report generation
```

If queues are added later, keep them separate from HTTP request logic.

---

# 189. API Route Summary

## Authentication

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/refresh
```

## Dashboard

```text
GET /api/v1/dashboard
GET /api/v1/dashboard/admin
GET /api/v1/dashboard/hr
GET /api/v1/dashboard/manager
GET /api/v1/dashboard/supervisor
GET /api/v1/dashboard/employee
```

## Employees

```text
GET    /api/v1/employees
POST   /api/v1/employees
GET    /api/v1/employees/:employeeId
PATCH  /api/v1/employees/:employeeId
POST   /api/v1/employees/:employeeId/activate
POST   /api/v1/employees/:employeeId/suspend
POST   /api/v1/employees/:employeeId/resign
POST   /api/v1/employees/:employeeId/terminate
POST   /api/v1/employees/:employeeId/deactivate
GET    /api/v1/employees/:employeeId/compensation
PATCH  /api/v1/employees/:employeeId/compensation
GET    /api/v1/employees/:employeeId/timesheet
POST   /api/v1/employees/:employeeId/timesheet/provision
POST   /api/v1/employees/:employeeId/timesheet/disable
```

## Profile

```text
GET   /api/v1/profile
PATCH /api/v1/profile
```

## Onboarding

```text
GET   /api/v1/onboarding
POST  /api/v1/onboarding
GET   /api/v1/onboarding/:employeeId
PATCH /api/v1/onboarding/:employeeId
POST  /api/v1/onboarding/:employeeId/submit
POST  /api/v1/onboarding/:employeeId/review
POST  /api/v1/onboarding/:employeeId/approve
POST  /api/v1/onboarding/:employeeId/reject
POST  /api/v1/onboarding/:employeeId/activate
```

## Documents

```text
GET  /api/v1/documents
POST /api/v1/documents
GET  /api/v1/documents/:documentId
PATCH /api/v1/documents/:documentId
POST /api/v1/documents/:documentId/approve
POST /api/v1/documents/:documentId/reject
POST /api/v1/documents/:documentId/request-changes
```

## Attendance

```text
GET  /api/v1/attendance
GET  /api/v1/attendance/:employeeId
POST /api/v1/attendance/check-in
POST /api/v1/attendance/check-out
PATCH /api/v1/attendance/:attendanceId
POST /api/v1/attendance/:attendanceId/correction
GET  /api/v1/attendance/corrections
POST /api/v1/attendance/corrections/:correctionId/approve
POST /api/v1/attendance/corrections/:correctionId/reject
```

## Leave

```text
GET  /api/v1/leave
GET  /api/v1/leave/balances
GET  /api/v1/leave/balances/:employeeId
POST /api/v1/leave/request
GET  /api/v1/leave/:requestId
POST /api/v1/leave/:requestId/approve
POST /api/v1/leave/:requestId/reject
```

## Clients

```text
GET  /api/v1/clients
POST /api/v1/clients
GET  /api/v1/clients/:clientId
PATCH /api/v1/clients/:clientId
POST /api/v1/clients/:clientId/deactivate
```

## Projects

```text
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/:projectId
PATCH /api/v1/projects/:projectId
POST /api/v1/projects/:projectId/activate
POST /api/v1/projects/:projectId/complete
POST /api/v1/projects/:projectId/archive
```

## Assignments

```text
GET  /api/v1/assignments
POST /api/v1/assignments
GET  /api/v1/assignments/:assignmentId
PATCH /api/v1/assignments/:assignmentId
POST /api/v1/assignments/:assignmentId/end
```

## Reviews

```text
GET  /api/v1/reviews
POST /api/v1/reviews
GET  /api/v1/reviews/:reviewId
PATCH /api/v1/reviews/:reviewId
POST /api/v1/reviews/:reviewId/submit
POST /api/v1/reviews/:reviewId/complete
```

## Reports

```text
GET /api/v1/reports/employees
GET /api/v1/reports/attendance
GET /api/v1/reports/leave
GET /api/v1/reports/projects
GET /api/v1/reports/assignments
GET /api/v1/reports/documents
GET /api/v1/reports/billing
```

## Notifications

```text
GET  /api/v1/notifications
POST /api/v1/notifications/:notificationId/read
POST /api/v1/notifications/read-all
```

## Audit

```text
GET /api/v1/audit-log
GET /api/v1/audit-log/:auditId
```

## Settings

```text
GET   /api/v1/settings
PATCH /api/v1/settings
```

---

# 190. Implementation Phases

Build the backend in controlled phases.

---

## Phase 0 — Backend Foundation

Create:

```text
package.json
tsconfig.json
.env.example
src/server.ts
src/app.ts
```

Implement:

* Node.js
* TypeScript
* Express
* environment configuration
* logging
* error handling
* MongoDB connection
* health endpoint

### Exit Criteria

```text
npm run dev
```

starts successfully.

MongoDB connects.

```text
GET /health
```

works.

---

# 191. Phase 1 — Security Foundation

Implement:

* Helmet
* CORS
* rate limiting
* request IDs
* JWT authentication
* password hashing
* auth middleware
* authorization middleware
* permission model

### Exit Criteria

All five demo roles can authenticate.

Unauthorized requests receive:

```text
401
```

Authenticated but unauthorized requests receive:

```text
403
```

---

# 192. Phase 2 — Database Foundation

Create:

```text
MongoDB collections
indexes
repositories
seed scripts
```

Implement:

```text
users
employees
clients
projects
```

### Exit Criteria

CRUD operations work through repository/service layers.

---

# 193. Phase 3 — Employee Management

Implement:

* employee list
* search
* filters
* pagination
* employee detail
* employee creation
* employee editing
* lifecycle actions
* soft deactivation

### Exit Criteria

EMSF employee directory can replace mock employee repository.

---

# 194. Phase 4 — Onboarding

Implement:

* onboarding records
* onboarding stages
* document requirements
* HR review
* approval
* activation

### Exit Criteria

A new employee can move through:

```text
ONBOARDING
→ HR REVIEW
→ ACTIVE
```

---

# 195. Phase 5 — Documents

Implement:

* document metadata
* upload metadata
* document list
* review
* approval
* rejection
* changes requested
* expiry tracking

### Exit Criteria

HR can review documents.

Employees can access their own documents.

Managers cannot access confidential HR documents.

---

# 196. Phase 6 — Attendance

Implement:

* check-in
* check-out
* daily attendance
* attendance list
* employee attendance
* corrections
* correction approval

### Exit Criteria

Employees can mark attendance.

Admin cannot.

---

# 197. Phase 7 — Leave

Implement:

* leave types
* balances
* leave requests
* approvals
* rejection
* overlap validation
* balance updates

### Exit Criteria

Employee can request leave.

Authorized reviewer can approve/reject.

---

# 198. Phase 8 — Clients

Implement:

* client list
* create
* edit
* detail
* deactivate

### Exit Criteria

Managers can create clients.

Unauthorized roles cannot.

---

# 199. Phase 9 — Projects

Implement:

* project list
* project creation
* project editing
* project status
* health
* progress
* client relationship

### Exit Criteria

Manager can manage projects.

---

# 200. Phase 10 — Assignments

Implement:

* assignment creation
* assignment editing
* assignment ending
* allocation
* billable flag
* overallocation detection

### Exit Criteria

Employees can belong to multiple projects.

---

# 201. Phase 11 — Reviews

Implement:

* review creation
* review editing
* submission
* completion
* employee access

### Exit Criteria

Review workflow works end-to-end.

---

# 202. Phase 12 — Compensation

Implement:

* salary
* pay rate
* bill rate
* compensation history

Strict authorization is required.

### Exit Criteria

Only authorized roles can access compensation.

---

# 203. Phase 13 — Timesheet Integration

Implement:

* eligibility calculation
* provisioning state
* adapter
* provisioning endpoint
* disable endpoint
* failure handling

### Exit Criteria

Rule works:

```text
ACTIVE + BILLABLE
→ ELIGIBLE
```

---

# 204. Phase 14 — Notifications

Implement:

* notification repository
* notification service
* unread count
* mark read
* read all
* event-based notification creation

---

# 205. Phase 15 — Audit

Implement:

* audit service
* audit repository
* audit middleware/context
* audit queries
* admin-only access

---

# 206. Phase 16 — Dashboards

Implement:

```text
admin dashboard
HR dashboard
manager dashboard
supervisor dashboard
employee dashboard
```

Use MongoDB aggregation pipelines.

---

# 207. Phase 17 — Reports

Implement:

```text
employee reports
attendance reports
leave reports
project reports
assignment reports
document reports
billing reports
```

Permission-protect each report.

---

# 208. Phase 18 — API/Frontend Integration

Replace EMSF mock repositories with API calls.

Verify:

```text
login
dashboard
employees
onboarding
documents
attendance
leave
clients
projects
assignments
reviews
reports
notifications
audit
settings
```

---

# 209. Phase 19 — Security Audit

Test all five roles.

Verify:

```text
Employee cannot access HR data
Employee cannot access another employee
Manager cannot see salary
Manager cannot see confidential documents
Supervisor cannot access HR data
Admin cannot mark attendance
HR cannot access inappropriate system administration
```

---

# 210. Phase 20 — Performance and Reliability

Review:

* indexes
* pagination
* aggregation
* MongoDB connection pool
* error handling
* logging
* rate limits
* API latency

---

# 211. Phase 21 — Production Hardening

Implement:

* production environment
* secure secrets
* CORS configuration
* logging configuration
* health checks
* graceful shutdown
* database backup strategy
* monitoring
* API documentation
* deployment configuration

---

# 212. Phase 22 — Route and Permission Audit

This phase is mandatory.

## Route Checklist

Verify:

* every EMSF API operation has a backend endpoint
* every endpoint returns expected response shape
* every frontend action maps to a valid API
* every detail operation works
* every mutation works
* invalid endpoint returns 404
* malformed request returns 400/422
* unauthorized request returns 401
* forbidden request returns 403
* direct URL/API access is protected
* refresh/retry behavior works

---

# 213. Permission Audit

Test every role against every sensitive endpoint.

### Admin

Verify:

```text
full access
except attendance marking
```

### HR

Verify:

```text
employee
documents
attendance
leave
reviews
salary
bill rate
reports
```

### Manager

Verify:

```text
clients
projects
assignments
operational employee data
```

and reject:

```text
salary
confidential documents
audit logs
system settings
```

### Supervisor

Verify:

```text
projects
assignments
operational employee information
```

and reject:

```text
salary
confidential documents
audit logs
HR settings
```

### Employee

Verify:

```text
own profile
own attendance
own leave
own documents
own projects
```

and reject:

```text
other employees
salary
bill rate
clients
system reports
audit logs
settings
```

---

# 214. API Acceptance Checklist

## Authentication

* [ ] login works
* [ ] invalid password rejected
* [ ] token required
* [ ] expired token rejected
* [ ] inactive account rejected
* [ ] `/auth/me` works

## Employees

* [ ] list
* [ ] search
* [ ] filter
* [ ] pagination
* [ ] detail
* [ ] create
* [ ] edit
* [ ] activate
* [ ] suspend
* [ ] resign
* [ ] terminate
* [ ] deactivate

## Onboarding

* [ ] create
* [ ] update
* [ ] submit
* [ ] review
* [ ] approve
* [ ] reject
* [ ] activate

## Documents

* [ ] list
* [ ] own access
* [ ] upload
* [ ] review
* [ ] approve
* [ ] reject
* [ ] request changes
* [ ] expiry

## Attendance

* [ ] check-in
* [ ] check-out
* [ ] duplicate prevention
* [ ] correction request
* [ ] correction approval
* [ ] correction rejection
* [ ] Admin blocked

## Leave

* [ ] balance
* [ ] request
* [ ] overlap validation
* [ ] approval
* [ ] rejection
* [ ] balance update

## Clients

* [ ] list
* [ ] create
* [ ] edit
* [ ] deactivate

## Projects

* [ ] list
* [ ] create
* [ ] edit
* [ ] progress
* [ ] health
* [ ] status

## Assignments

* [ ] create
* [ ] edit
* [ ] end
* [ ] allocation validation
* [ ] overallocation detection

## Reviews

* [ ] create
* [ ] edit
* [ ] submit
* [ ] complete
* [ ] access control

## Compensation

* [ ] salary
* [ ] bill rate
* [ ] history
* [ ] authorization

## Timesheet

* [ ] eligibility
* [ ] provisioning
* [ ] retry
* [ ] disable
* [ ] failure state

## Notifications

* [ ] list
* [ ] unread
* [ ] mark read
* [ ] read all

## Audit

* [ ] audit events
* [ ] admin access
* [ ] unauthorized access blocked

## Reports

* [ ] employee
* [ ] attendance
* [ ] leave
* [ ] projects
* [ ] assignments
* [ ] documents
* [ ] billing

---

# 215. API Quality Requirements

Every endpoint must have:

```text
authentication decision
authorization decision
input validation
business validation
consistent response
error handling
logging where appropriate
audit logging where appropriate
```

---

# 216. Backend Coding Rules

Do:

```text
small services
typed interfaces
centralized permissions
centralized errors
centralized validation
repositories for DB operations
business rules in services
```

Do not:

```text
put everything in routes
use any everywhere
trust req.body
trust frontend permissions
expose MongoDB
hardcode secrets
return sensitive fields
duplicate permission logic
```

---

# 217. Naming Conventions

Use:

```text
camelCase
```

for TypeScript variables/functions.

Use:

```text
PascalCase
```

for classes/types/interfaces.

Use:

```text
kebab-case
```

or consistent naming for route files.

Examples:

```text
employee.service.ts
employee.repository.ts
employee.controller.ts
```

---

# 218. Code Organization Rule

One domain should have related:

```text
route
controller
service
repository
schema
model
```

This keeps the backend modular.

---

# 219. Dependency Direction

Preferred dependency flow:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Repositories
  ↓
Database
```

Supporting dependencies:

```text
Services
  ↓
Notification Service
Audit Service
Timesheet Adapter
```

Do not reverse this flow unnecessarily.

---

# 220. Repository Isolation

Repositories should know about:

```text
MongoDB
collections
queries
indexes
documents
```

Repositories should not know about:

```text
HTTP
Express
JWT
frontend
```

---

# 221. Controller Isolation

Controllers should know about:

```text
Express
HTTP
request
response
service
```

Controllers should not know about:

```text
MongoDB collection details
```

---

# 222. Service Isolation

Services should contain domain/business logic.

Services should not depend directly on:

```text
Express Request
Express Response
```

unless unavoidable.

This makes them easier to test.

---

# 223. Configuration Isolation

Do not access:

```ts
process.env.X
```

throughout the application.

Use:

```text
config/env.ts
```

and import validated configuration.

---

# 224. Secrets

Never place secrets in:

```text
source code
Git
frontend
mock data
API responses
logs
```

---

# 225. Production Database

Production MongoDB credentials must come from secure environment/secret management.

Do not put:

```text
mongodb+srv://username:password...
```

inside source files.

---

# 226. Deployment Architecture

Recommended:

```text
Internet
   ↓
HTTPS
   ↓
Reverse Proxy / Load Balancer
   ↓
Node.js Express EMSB
   ↓
MongoDB Atlas
```

Frontend:

```text
HTTPS
 ↓
EMSF
 ↓
EMSB API
```

---

# 227. Node.js Process

The application should be stateless at the HTTP layer.

Do not store important session state only in process memory.

This allows future horizontal scaling.

---

# 228. Health Monitoring

Monitoring should track:

```text
HTTP errors
response latency
MongoDB connectivity
memory
CPU
process uptime
authentication failures
```

---

# 229. Database Failure Behavior

If MongoDB becomes unavailable:

API should return a controlled:

```text
503 Service Unavailable
```

where appropriate.

Do not return raw MongoDB exceptions.

---

# 230. Graceful Error Example

Bad:

```json
{
  "error": "MongoServerSelectionError: ..."
}
```

Good:

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "The service is temporarily unavailable."
  }
}
```

---

# 231. Frontend Compatibility Rule

Do not unnecessarily change API contracts after EMSF integration begins.

If an API contract needs to change:

```text
version it
```

or provide a backward-compatible transition.

---

# 232. API Contract Source of Truth

Maintain either:

```text
OpenAPI
```

or a documented API contract in:

```text
docs/api/
```

The contract should document:

```text
request
response
permissions
errors
pagination
filters
```

---

# 233. Initial MVP Priority

If implementation time is limited, build in this order:

```text
1. Auth
2. Permissions
3. Employees
4. Onboarding
5. Documents
6. Attendance
7. Leave
8. Clients
9. Projects
10. Assignments
11. Reviews
12. Compensation
13. Timesheet eligibility
14. Notifications
15. Audit
16. Dashboards
17. Reports
18. Settings
```

---

# 234. Critical Business Rules

These rules must never be forgotten.

## Rule 1

Admin does not mark attendance.

## Rule 2

Employee can edit only permitted self-service fields.

## Rule 3

Employee cannot access another employee's private information.

## Rule 4

Manager cannot see salary by default.

## Rule 5

Manager cannot see confidential HR documents by default.

## Rule 6

Supervisor does not automatically receive HR privileges.

## Rule 7

Salary and bill rate are different fields.

## Rule 8

Billable status is independent from employment status.

## Rule 9

Only:

```text
ACTIVE + BILLABLE
```

can become Timesheet eligible.

## Rule 10

Terminated/inactive employees must not remain actively provisioned to Timesheet.

## Rule 11

Important mutations must generate audit events.

## Rule 12

Historical employee information must not be destroyed simply because an employee leaves.

## Rule 13

Frontend permissions are not security.

## Rule 14

Backend authorization is mandatory.

## Rule 15

No hard deletion of important business history.

---

# 235. Definition of Done

The backend is considered complete only when:

### Infrastructure

* [ ] Node.js configured
* [ ] TypeScript configured
* [ ] Express configured
* [ ] MongoDB Atlas connected
* [ ] environment validation
* [ ] logging
* [ ] health endpoint
* [ ] graceful shutdown

### Security

* [ ] authentication
* [ ] JWT validation
* [ ] password hashing
* [ ] role permissions
* [ ] authorization middleware
* [ ] CORS
* [ ] Helmet
* [ ] rate limiting
* [ ] sensitive field protection

### Employee Management

* [ ] employee CRUD
* [ ] employee search
* [ ] filters
* [ ] pagination
* [ ] lifecycle
* [ ] self-service

### HR

* [ ] onboarding
* [ ] documents
* [ ] compensation
* [ ] leave
* [ ] attendance
* [ ] reviews

### Management

* [ ] clients
* [ ] projects
* [ ] assignments
* [ ] project progress
* [ ] resource allocation

### Attendance

* [ ] check-in
* [ ] check-out
* [ ] corrections
* [ ] approvals
* [ ] Admin restriction

### Leave

* [ ] requests
* [ ] balances
* [ ] approval
* [ ] rejection
* [ ] overlap validation

### Documents

* [ ] upload metadata
* [ ] review
* [ ] approval
* [ ] rejection
* [ ] expiry

### Timesheet

* [ ] eligibility
* [ ] provisioning
* [ ] disable
* [ ] failure state
* [ ] adapter

### Notifications

* [ ] notification creation
* [ ] unread
* [ ] mark read
* [ ] read all

### Audit

* [ ] audit service
* [ ] audit repository
* [ ] important actions logged
* [ ] restricted access

### Reporting

* [ ] dashboards
* [ ] employee reports
* [ ] attendance reports
* [ ] leave reports
* [ ] project reports
* [ ] assignment reports
* [ ] document reports
* [ ] billing reports

### Testing

* [ ] unit tests
* [ ] API tests
* [ ] permission tests
* [ ] business-rule tests
* [ ] integration tests
* [ ] critical workflows tested

---

# 236. Final Architecture

The final system should look like:

```text
                         EMSF
                React + TypeScript
                         │
                         │ HTTPS
                         ▼
                 ┌───────────────┐
                 │    Express    │
                 │   REST API    │
                 └───────┬───────┘
                         │
             ┌───────────┼───────────┐
             │           │           │
             ▼           ▼           ▼
        Controllers   Middleware   Validation
             │
             ▼
         Services
             │
       ┌─────┼──────────────┐
       │     │              │
       ▼     ▼              ▼
 Repositories Audit      Integrations
       │      Service       │
       │                     ▼
       │                Timesheet
       │
       ▼
 MongoDB Atlas
```

---

# 237. Final Technology Stack

The authoritative EMSB backend stack is:

```text
Language:
TypeScript

Runtime:
Node.js

HTTP Framework:
Express.js

Database:
MongoDB Atlas

Database Driver:
Official MongoDB Node.js Driver

Validation:
Zod

Authentication:
JWT

Password Hashing:
bcrypt

Logging:
Pino

Security:
Helmet
CORS
express-rate-limit

Testing:
Vitest
Supertest

API Style:
Versioned REST API

API Base:
 /api/v1
```

---

# 238. Important: No Hono

This backend specification intentionally does **not** use Hono.

Do not introduce:

```text
Hono
Hono middleware
Hono routers
Hono context
Hono handlers
```

The backend must use:

```text
Express Router
Express Request
Express Response
Express middleware
Express application
```

---

# 239. Final Project Relationship

The completed ecosystem should be:

```text
                    ENIAC INC.
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
         EMS                         TS
 Employee Management          Timesheet Management
        System                       System
          │                           │
          │                           │
        EMSF                        TS Frontend
          │                           │
          ▼                           ▼
        EMSB                     TS Backend
          │                           │
          └─────────────┬─────────────┘
                        │
                        ▼
                  MongoDB Atlas
```

EMSB is the authoritative business backend for EMS.

TS remains a separate product.

The two systems should communicate through defined integration boundaries rather than tightly coupling their internal implementation.

---

# 240. Final Implementation Principle

Build EMSB as a real production-style backend, not merely a collection of CRUD endpoints.

The implementation must prioritize:

```text
Security
Authorization
Business Rules
Data Integrity
Auditability
Maintainability
Type Safety
Performance
Clear API Contracts
Separation of Concerns
```

The most important architectural rule is:

```text
EMSF
  ↓
Express API
  ↓
Services
  ↓
Repositories
  ↓
MongoDB Atlas
```

and never:

```text
EMSF
  ↓
MongoDB
```

The frontend is the presentation layer.

EMSB is the business and security layer.

MongoDB Atlas is the persistence layer.

The Timesheet system is a separate application connected through a defined integration boundary.

---

# END OF EMSB.md
