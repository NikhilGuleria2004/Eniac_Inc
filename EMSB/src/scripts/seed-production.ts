import "dotenv/config";
import { randomBytes } from "crypto";
import { Document } from "mongodb";
import { connectDatabase, getDb, closeDatabase } from "../config/database.js";
import { hashPassword } from "../utils/auth/jwt.js";
import { initializeIndexes } from "../config/init-db.js";
import { env } from "../config/env.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Sales",
  "Marketing",
  "Operations",
  "HR",
  "Finance",
  "Design",
  "QA",
  "DevOps",
  "Support",
  "Legal",
];
const DESIGNATIONS = [
  "Software Engineer",
  "Senior Engineer",
  "Tech Lead",
  "Product Manager",
  "Sales Director",
  "Marketing Manager",
  "Operations Lead",
  "HR Manager",
  "Finance Specialist",
  "UX Designer",
  "QA Engineer",
  "DevOps Engineer",
  "Support Specialist",
  "Legal Counsel",
];
const COUNTRIES = ["INDIA", "USA"];
const CITIES_INDIA = [
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
];
const CITIES_USA = [
  "San Francisco",
  "New York",
  "Austin",
  "Seattle",
  "Boston",
  "Chicago",
  "Denver",
];
const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];
const PROJECT_HEALTH = ["ON_TRACK", "AT_RISK", "OFF_TRACK"];
const EMPLOYMENT_STATUSES = ["ACTIVE", "ONBOARDING", "ON_LEAVE", "SUSPENDED"];
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];
const BILLING_STATUSES = ["BILLABLE", "NON_BILLABLE"];
const CLIENT_INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Consulting",
  "Media",
  "Energy",
];
const CLIENT_COMPANIES = [
  "Acme Corp",
  "GlobalTech",
  "Innovation Labs",
  "NextGen Systems",
  "Fusion Dynamics",
  "Vertex Solutions",
  "Summit Partners",
  "Pinnacle Group",
  "Quantum Edge",
  "Apex Industries",
  "Zenith Digital",
  "Meridian Health",
];
const PROJECT_THEMES = [
  "Phoenix",
  "Summit",
  "Nexus",
  "Atlas",
  "Quantum",
  "Voyager",
  "Horizon",
  "Apex",
  "Orbit",
  "Catalyst",
  "Vertex",
  "Echo",
  "Nova",
  "Pulse",
  "Zenith",
];
const LEAVE_TYPES = ["PAID", "SICK", "CASUAL", "UNPAID"];
const TECH_ROLES = [
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
];
const DOC_TYPES = [
  "OFFER_LETTER",
  "EMPLOYMENT_AGREEMENT",
  "ID_PROOF",
  "ADDRESS_PROOF",
  "VISA",
  "BANK_DETAILS",
];
const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "PARTIAL"];
const TIMESHEET_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "REVISED",
  "PAID",
];
const AUDIT_ACTIONS = [
  "employee.created",
  "employee.updated",
  "onboarding.completed",
  "invitation.sent",
  "document.approved",
  "leave.approved",
  "project.created",
  "invoice.sent",
  "timesheet.approved",
  "user.login",
];
const AUDIT_ENTITIES = [
  "employee",
  "onboarding",
  "invitation",
  "document",
  "leave",
  "project",
  "invoice",
  "timesheet",
  "user",
];

const FIRST_NAMES = [
  "Arjun",
  "Priya",
  "Rohan",
  "Sneha",
  "Amit",
  "Neha",
  "Karan",
  "Ananya",
  "Vikram",
  "Pooja",
  "Ravi",
  "Kavya",
  "Siddharth",
  "Meera",
  "Harsh",
  "Ishita",
  "Manoj",
  "Tina",
  "Chetan",
  "Riya",
  "Deepak",
  "Sunita",
  "Gaurav",
  "Nidhi",
  "Yash",
  "Tanya",
  "Amitabh",
  "Kriti",
  "Sanjay",
  "Maya",
];
const LAST_NAMES = [
  "Sharma",
  "Desai",
  "Patel",
  "Kumar",
  "Verma",
  "Joshi",
  "Mehta",
  "Singh",
  "Reddy",
  "Chauhan",
  "Yadav",
  "Thakur",
  "Mishra",
  "Rao",
  "Kapoor",
  "Gupta",
  "Shah",
  "Malhotra",
  "Saxena",
  "Ramesh",
];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function hex(n = 4): string {
  return randomBytes(n).toString("hex");
}

const ROLE_ACCOUNTS = [
  {
    email: "superadmin@eniacinc.com",
    userId: "user_admin",
    employeeId: "EMP-001",
    role: "ADMIN",
    firstName: "Superadmin",
    lastName: "User",
    password: "Eniacinc1",
  },
  {
    email: "hreniac@eniacinc.com",
    userId: "user_hr",
    employeeId: "EMP-002",
    role: "HR",
    firstName: "HR",
    lastName: "User",
    password: "Eniacinc2",
  },
  {
    email: "manager@eniacinc.com",
    userId: "user_manager",
    employeeId: "EMP-003",
    role: "MANAGER",
    firstName: "Manager",
    lastName: "User",
    password: "Eniacinc3",
  },
  {
    email: "supervisor@eniacinc.com",
    userId: "user_supervisor",
    employeeId: "EMP-004",
    role: "SUPERVISOR",
    firstName: "Supervisor",
    lastName: "User",
    password: "Eniacinc4",
  },
  {
    email: "employee@eniacinc.com",
    userId: "user_employee",
    employeeId: "EMP-005",
    role: "EMPLOYEE",
    firstName: "Employee",
    lastName: "User",
    password: "Eniacinc5",
  },
];

async function insertChunked(
  db: ReturnType<typeof getDb>,
  name: string,
  docs: Document[],
): Promise<number> {
  if (!docs.length) return 0;
  const col = db.collection(name);
  let inserted = 0;
  for (let i = 0; i < docs.length; i += 1000) {
    const chunk = docs.slice(i, i + 1000);
    await col.insertMany(chunk);
    inserted += chunk.length;
  }
  return inserted;
}

async function run(): Promise<void> {
  await connectDatabase();
  const db = getDb();
  const now = new Date();

  // ---- 0. Wipe everything ----
  const existing = await db.listCollections().toArray();
  for (const col of existing) {
    await db.dropCollection(col.name);
  }
  console.log(`  Wiped ${existing.length} collections.`);

  await initializeIndexes();

  let total = 0;
  async function seed(name: string, docs: Document[]): Promise<void> {
    const n = await insertChunked(db, name, docs);
    if (n) console.log(`  ${name}: ${n}`);
    total += n;
  }

  // ---- 1. Users (5 dev role accounts, unchanged) ----
  const userDocs: Document[] = [];
  for (const u of ROLE_ACCOUNTS) {
    userDocs.push({
      userId: u.userId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      hashedPassword: await hashPassword(u.password),
      status: "ACTIVE",
      employeeId: u.employeeId,
      workMail: u.email,
      createdAt: now,
      updatedAt: now,
    });
  }
  await seed("users", userDocs);

  // ---- 2. Employees (EMP-001..120; 001-005 are the role accounts) ----
  const EMP_COUNT = 120;
  const employeeIds: string[] = [];
  const employeeDocs: Document[] = [];
  for (let i = 1; i <= EMP_COUNT; i++) {
    const employeeId = `EMP-${String(i).padStart(3, "0")}`;
    employeeIds.push(employeeId);
    if (i <= 5) {
      const role = ROLE_ACCOUNTS[i - 1];
      employeeDocs.push({
        employeeId,
        firstName: role.firstName,
        lastName: role.lastName,
        email: role.email,
        workMail: role.email,
        phone: "+1-555-0001",
        designation: DESIGNATIONS[i - 1],
        department: DEPARTMENTS[i - 1],
        country: COUNTRIES[i % 2],
        employmentStatus: "ACTIVE",
        billingStatus: "BILLABLE",
        employmentType: "FULL_TIME",
        joiningDate: new Date(now.getTime() - 365 * MS_PER_DAY),
        managerId: undefined,
        timesheetEligibility: { eligible: true, reason: "ACTIVE + BILLABLE" },
        address: {
          city: "Bangalore",
          state: "Maharashtra",
          country: "INDIA",
          line1: "100 Main St",
          postalCode: "400001",
        },
        compensation: {
          currency: "INR",
          salary: 1000000,
          payFrequency: "MONTHLY",
        },
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const country = rand(COUNTRIES);
      const cityList = country === "INDIA" ? CITIES_INDIA : CITIES_USA;
      employeeDocs.push({
        employeeId,
        firstName: rand(FIRST_NAMES),
        lastName: rand(LAST_NAMES),
        email: `employee${i}@eniacinc.com`,
        workMail: `emp${i}.${rand(FIRST_NAMES).toLowerCase()}.${rand(LAST_NAMES).toLowerCase()}@eniacinc.com`,
        phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        designation: rand(TECH_ROLES),
        department: rand(DEPARTMENTS),
        country,
        employmentStatus: rand(EMPLOYMENT_STATUSES) as string,
        billingStatus: rand(BILLING_STATUSES) as string,
        employmentType: rand(EMPLOYMENT_TYPES) as string,
        joiningDate: new Date(
          now.getTime() - Math.floor(Math.random() * 365) * MS_PER_DAY,
        ),
        managerId: i > 10 ? "EMP-003" : undefined,
        timesheetEligibility: { eligible: Math.random() > 0.3, reason: "AUTO" },
        address: {
          city: rand(cityList),
          state: country === "INDIA" ? "Maharashtra" : "California",
          country,
          line1: `${Math.floor(Math.random() * 9000) + 1000} Main St`,
          postalCode: String(Math.floor(Math.random() * 90000) + 10000),
        },
        compensation: {
          currency: country === "INDIA" ? "INR" : "USD",
          salary:
            country === "INDIA"
              ? 800000 + Math.floor(Math.random() * 500000)
              : 80000 + Math.floor(Math.random() * 120000),
          payFrequency: "MONTHLY",
        },
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await seed("employees", employeeDocs);

  // ---- 3. Onboarding records (one per employee) ----
  const onboardingStatuses = [
    "DRAFT",
    "IN_PROGRESS",
    "AWAITING_REVIEW",
    "REVIEWED",
    "REJECTED",
    "COMPLETED",
  ];
  const onboardingStages = [
    "EMPLOYEE_INFORMATION",
    "EMPLOYMENT_DETAILS",
    "GEOGRAPHY",
    "BILLING_CLASSIFICATION",
    "DOCUMENTS",
    "HR_REVIEW",
    "ACTIVATION",
    "TIMESHEET_ELIGIBILITY",
  ];
  const onboardingDocs: Document[] = [];
  for (const empId of employeeIds) {
    const isSeeded = ROLE_ACCOUNTS.some((r) => r.employeeId === empId);
    const status = isSeeded ? "COMPLETED" : rand(onboardingStatuses);
    onboardingDocs.push({
      employeeId: empId,
      currentStage: isSeeded ? "TIMESHEET_ELIGIBILITY" : rand(onboardingStages),
      status,
      completedStages:
        status === "COMPLETED"
          ? [
              "EMPLOYEE_INFORMATION",
              "EMPLOYMENT_DETAILS",
              "GEOGRAPHY",
              "BILLING_CLASSIFICATION",
              "DOCUMENTS",
              "HR_REVIEW",
              "ACTIVATION",
            ]
          : [],
      documentRequirements: [
        {
          type: "OFFER_LETTER",
          name: "Offer Letter",
          required: true,
          uploaded: status === "COMPLETED",
        },
        {
          type: "EMPLOYMENT_AGREEMENT",
          name: "Employment Agreement",
          required: true,
          uploaded: status === "COMPLETED",
        },
        {
          type: "ID_PROOF",
          name: "ID Proof",
          required: true,
          uploaded: status === "COMPLETED",
        },
        {
          type: "ADDRESS_PROOF",
          name: "Address Proof",
          required: true,
          uploaded: status === "COMPLETED",
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }
  await seed("onboarding_records", onboardingDocs);

  // ---- 4. Clients ----
  const clientIds: string[] = [];
  const clientDocs: Document[] = [];
  for (let i = 0; i < 30; i++) {
    const clientId = `CLI-${String(i + 1).padStart(3, "0")}`;
    clientIds.push(clientId);
    clientDocs.push({
      clientId,
      code: `CL-${String(i + 1).padStart(3, "0")}`,
      name: `${rand(CLIENT_COMPANIES)} ${i + 1}`,
      status: rand([
        "PROSPECT",
        "ACTIVE",
        "INACTIVE",
        "SUSPENDED",
        "CLOSED",
      ]) as string,
      industry: rand(CLIENT_INDUSTRIES),
      clientTier: rand(["ENTERPRISE", "MID_MARKET", "SMB", "PROSPECT"]),
      paymentTerms: rand([
        "NET_15",
        "NET_30",
        "NET_45",
        "NET_60",
        "DUE_ON_RECEIPT",
      ]),
      contact: {
        name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
        email: `contact${i + 1}@example.com`,
        phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        role: "Procurement Manager",
      },
      address: {
        line1: `${Math.floor(Math.random() * 9000) + 1000} Market St`,
        city: rand(CITIES_USA),
        state: "California",
        country: "USA",
        postalCode: String(Math.floor(Math.random() * 90000) + 10000),
      },
      contacts: [
        {
          id: `CON-${i + 1}`,
          name: "Primary Contact",
          email: `contact${i + 1}@example.com`,
          phone: `+1-555-43210`,
          role: "Contact",
          isPrimary: true,
        },
      ],
      taxId: `TAX-${String(1000 + i)}`,
      createdBy: "user_admin",
      createdAt: now,
      updatedAt: now,
    });
  }
  await seed("clients", clientDocs);

  // ---- 5. Projects ----
  const projectIds: string[] = [];
  const projectDocs: Document[] = [];
  for (let i = 0; i < 50; i++) {
    const projectId = `PROJ-${String(i + 1).padStart(3, "0")}`;
    projectIds.push(projectId);
    projectDocs.push({
      projectId,
      clientId: rand(clientIds),
      name: `${rand(PROJECT_THEMES)} Project ${i + 1}`,
      code: `PRJ-${String(i + 1).padStart(3, "0")}`,
      description: `Project ${i + 1} for client ${rand(CLIENT_COMPANIES)}.`,
      status: rand(PROJECT_STATUSES),
      health: rand(PROJECT_HEALTH),
      startDate: new Date(
        now.getTime() - Math.floor(Math.random() * 180) * MS_PER_DAY,
      ),
      endDate:
        Math.random() > 0.4
          ? new Date(
              now.getTime() + Math.floor(Math.random() * 180) * MS_PER_DAY,
            )
          : undefined,
      managerId: "EMP-003",
      progressPercent: Math.floor(Math.random() * 100),
      budget: randInt(50000, 500000),
      budgetCurrency: "USD",
      teamSize: randInt(3, 15),
      billable: true,
      visibility: rand(["INTERNAL", "CLIENT_VISIBLE"]),
      tags: ["seed", rand(CLIENT_INDUSTRIES).toLowerCase()],
      createdBy: "user_admin",
      createdAt: now,
      updatedAt: now,
    });
  }
  await seed("projects", projectDocs);

  // ---- 6. Project assignments ----
  const assignmentDocs: Document[] = [];
  for (const empId of employeeIds) {
    if (Math.random() > 0.15) {
      assignmentDocs.push({
        assignmentId: `ASGN-${hex()}`,
        employeeId: empId,
        projectId: rand(projectIds),
        role: rand(TECH_ROLES),
        allocationPercent: randInt(25, 100),
        billable: Math.random() > 0.3,
        startDate: new Date(
          now.getTime() - Math.floor(Math.random() * 90) * MS_PER_DAY,
        ),
        endDate:
          Math.random() > 0.6
            ? new Date(
                now.getTime() + Math.floor(Math.random() * 90) * MS_PER_DAY,
              )
            : undefined,
        status: rand(["ACTIVE", "ENDED"]),
        createdBy: "user_admin",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await seed("project_assignments", assignmentDocs);

  // ---- 7. Attendance records (30 days per employee; one per employee/date) ----
  const attendanceDocs: Document[] = [];
  for (const empId of employeeIds) {
    for (let d = 30; d >= 1; d--) {
      const date = new Date(now.getTime() - d * MS_PER_DAY);
      if (date.getDay() === 0) continue; // skip Sundays
      const status = rand(["P", "P", "P", "P", "P", "A", "L", "M"]);
      const doc: Document = {
        attendanceId: `ATT-${hex()}`,
        employeeId: empId,
        date,
        status,
        createdAt: now,
        updatedAt: now,
      };
      if (status === "P" || status === "M") {
        const checkIn = new Date(
          date.getTime() + 9 * 3600000 + Math.random() * 3600000,
        );
        doc.checkIn = checkIn;
        if (Math.random() > 0.25) {
          const checkOut = new Date(
            checkIn.getTime() + 8 * 3600000 + Math.random() * 2 * 3600000,
          );
          doc.checkOut = checkOut;
          doc.workingHours = parseFloat(
            ((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(2),
          );
        }
      }
      attendanceDocs.push(doc);
    }
  }
  await seed("attendance_records", attendanceDocs);

  // ---- 8. Leave types + balances (one per employee per type) ----
  const leaveTypeDocs: Document[] = [];
  const leaveAllowances: Record<string, number> = {
    PAID: 18,
    SICK: 10,
    CASUAL: 12,
    UNPAID: 0,
  };
  for (const lt of LEAVE_TYPES) {
    leaveTypeDocs.push({
      typeId: `LT-${lt}`,
      code: lt,
      name: lt.replace(/_/g, " "),
      annualAllowance: leaveAllowances[lt] ?? 0,
      requiresApproval: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  await seed("leave_types", leaveTypeDocs);

  const leaveBalanceDocs: Document[] = [];
  for (const empId of employeeIds) {
    for (const lt of LEAVE_TYPES) {
      leaveBalanceDocs.push({
        employeeId: empId,
        leaveType: lt,
        balance: lt === "UNPAID" ? 0 : randInt(5, 15),
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await seed("leave_balances", leaveBalanceDocs);

  // ---- 9. Leave requests ----
  const leaveRequestDocs: Document[] = [];
  for (const empId of employeeIds) {
    if (Math.random() > 0.55) {
      const startDate = new Date(
        now.getTime() - Math.floor(Math.random() * 30) * MS_PER_DAY,
      );
      const days = randInt(1, 5);
      leaveRequestDocs.push({
        requestId: `LR-${hex()}`,
        employeeId: empId,
        leaveType: rand(LEAVE_TYPES),
        startDate,
        endDate: new Date(startDate.getTime() + (days - 1) * MS_PER_DAY),
        days,
        reason: "Personal leave",
        status: rand(["APPROVED", "REJECTED", "PENDING"]),
        reviewedBy: Math.random() > 0.5 ? "user_hr" : undefined,
        reviewedAt: Math.random() > 0.5 ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await seed("leave_requests", leaveRequestDocs);

  // ---- 10. Documents ----
  const documentDocs: Document[] = [];
  for (const empId of employeeIds) {
    for (const docType of DOC_TYPES) {
      if (Math.random() > 0.5) {
        const status = rand(["APPROVED", "PENDING", "REJECTED"]);
        documentDocs.push({
          documentId: `DOC-${hex()}`,
          employeeId: empId,
          type: docType,
          name: `${docType.replace(/_/g, " ")} for ${empId}`,
          url: "https://res.cloudinary.com/demo/image/upload/v1700000000/sample.pdf",
          uploadedAt: now,
          uploadedBy: "user_hr",
          status,
          expiryDate:
            docType === "VISA"
              ? new Date(now.getTime() + 180 * MS_PER_DAY)
              : undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }
  await seed("documents", documentDocs);

  // ---- 11. Invitations ----
  const invitationDocs: Document[] = [];
  for (const empId of employeeIds) {
    if (Math.random() > 0.85) {
      invitationDocs.push({
        tokenHash: hex(32),
        userId: `user_${empId}`,
        employeeId: empId,
        email: `employee${parseInt(empId.split("-")[1], 10)}@eniacinc.com`,
        workMail: `emp${parseInt(empId.split("-")[1], 10)}@eniacinc.com`,
        role: "EMPLOYEE",
        status: rand(["PENDING", "ACCEPTED"]),
        invitedByRole: "HR",
        expiresAt: new Date(now.getTime() + 7 * MS_PER_DAY),
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await seed("invitations", invitationDocs);

  // ---- 12. Employee reviews ----
  const reviewDocs: Document[] = [];
  for (const empId of employeeIds) {
    if (Math.random() > 0.6) {
      reviewDocs.push({
        reviewId: `REV-${hex()}`,
        employeeId: empId,
        reviewerId: "user_hr",
        reviewerName: "HR User",
        type: rand(["ANNUAL", "PROBATION", "MID_YEAR"]),
        score: randInt(3, 5),
        maxScore: 5,
        status: rand(["COMPLETED", "IN_PROGRESS", "SCHEDULED"]),
        summary: "Performance review completed.",
        goals: [
          "Improve communication skills",
          "Take ownership of projects",
          "Mentor junior developers",
        ],
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await seed("employee_reviews", reviewDocs);

  // ---- 13. Notifications ----
  const notificationDocs: Document[] = [];
  const NOTIF_TITLES = [
    "Leave Request Approved",
    "Document Uploaded",
    "Project Update",
    "Onboarding Reminder",
    "Attendance Marked",
    "System Announcement",
  ];
  for (let i = 0; i < 500; i++) {
    const empId = employeeIds[i % employeeIds.length];
    notificationDocs.push({
      notificationId: `NOTIF-${hex()}`,
      userId: `user_${empId}`,
      type: rand([
        "LEAVE",
        "DOCUMENT",
        "PROJECT",
        "ONBOARDING",
        "ATTENDANCE",
        "SYSTEM",
      ]),
      title: rand(NOTIF_TITLES),
      message: `Notification message for ${empId}.`,
      read: Math.random() > 0.5,
      link: "/dashboard",
      readAt: Math.random() > 0.5 ? now : undefined,
      createdAt: new Date(
        now.getTime() - Math.floor(Math.random() * 30) * MS_PER_DAY,
      ),
      updatedAt: now,
    });
  }
  await seed("notifications", notificationDocs);

  // ---- 14. Audit logs ----
  const auditDocs: Document[] = [];
  for (let i = 0; i < 300; i++) {
    const empId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
    auditDocs.push({
      auditId: `AUDIT-${hex()}`,
      actorUserId: rand([
        "user_admin",
        "user_hr",
        "user_manager",
        "user_supervisor",
        `user_${empId}`,
      ]),
      actorRole: rand(["ADMIN", "HR", "MANAGER", "SUPERVISOR", "EMPLOYEE"]),
      action: rand(AUDIT_ACTIONS),
      entityType: rand(AUDIT_ENTITIES),
      entityId: rand([
        empId,
        `PROJ-${String(randInt(1, 50)).padStart(3, "0")}`,
        `CLI-${String(randInt(1, 30)).padStart(3, "0")}`,
      ]),
      details: { ipAddress: "192.168.1.1", userAgent: "Mozilla/5.0" },
      ipAddress: "192.168.1.1",
      createdAt: new Date(
        now.getTime() - Math.floor(Math.random() * 90) * MS_PER_DAY,
      ),
    });
  }
  await seed("audit_logs", auditDocs);

  // ---- 15. Settings ----
  const settingsDocs: Document[] = [
    {
      key: "company_name",
      value: "Eniac Inc.",
      createdAt: now,
      updatedAt: now,
    },
    {
      key: "support_email",
      value: "support@eniacinc.com",
      createdAt: now,
      updatedAt: now,
    },
    { key: "timezone", value: "Asia/Kolkata", createdAt: now, updatedAt: now },
    { key: "date_format", value: "DD/MM/YYYY", createdAt: now, updatedAt: now },
    { key: "weekend_days", value: "0", createdAt: now, updatedAt: now },
  ];
  await seed("settings", settingsDocs);

  // ---- 16. Invoice templates ----
  const templateIds: string[] = [];
  const templateDocs: Document[] = [];
  for (let i = 0; i < 5; i++) {
    const tplId = `TPL-${i + 1}`;
    templateIds.push(tplId);
    templateDocs.push({
      invoiceTemplateId: tplId,
      name: `Template ${i + 1}`,
      logoUrl: "https://eniacinc.com/logo.png",
      primaryColor: "#0F2B1D",
      secondaryColor: "#0A1E16",
      footerNote: "Thank you for your business.",
      termsAndConditions: "Payment due within 30 days.",
      paymentInstructions: "Bank transfer to A/C 123456789, SWIFT: ENIACBOM.",
      taxSettings: { defaultRate: 0, label: "Tax" },
      isDefault: i === 0,
      createdBy: "user_admin",
      createdAt: now,
      updatedAt: now,
    });
  }
  await seed("invoice_templates", templateDocs);

  // ---- 17. Timesheet provisioning (one per employee) ----
  const provisioningDocs: Document[] = [];
  for (const empId of employeeIds) {
    provisioningDocs.push({
      employeeId: empId,
      status: "PROVISIONED",
      eligible: true,
      provisionedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
  await seed("timesheet_provisioning", provisioningDocs);

  // ---- 18. Daily logs ----
  const dailyLogDocs: Document[] = [];
  let dlCounter = 0;
  const activeEmployees = employeeIds;
  for (let i = 0; i < 600; i++) {
    const empId =
      activeEmployees[Math.floor(Math.random() * activeEmployees.length)];
    const proj = rand(projectIds);
    const workDate = new Date(
      now.getTime() - Math.floor(Math.random() * 45) * MS_PER_DAY,
    );
    if (workDate.getDay() === 0) continue;
    dlCounter++;
    dailyLogDocs.push({
      dailyLogId: `DL-${String(dlCounter).padStart(5, "0")}`,
      employeeId: empId,
      employeeName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
      projectId: proj,
      projectName: proj,
      workDate,
      workDateStr: workDate.toISOString().slice(0, 10),
      dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        workDate.getDay()
      ],
      taskCategory: rand([
        "DEVELOPMENT",
        "TESTING",
        "REVIEW",
        "MEETING",
        "DESIGN",
        "OTHER",
      ]),
      description: `Development work — day ${i + 1}`,
      regularHours: randInt(6, 8),
      overtimeHours: Math.random() < 0.3 ? randInt(1, 4) : 0,
      totalHours: 0,
      billable: true,
      billingType: "BILLABLE",
      status: rand(["DRAFT", "SUBMITTED", "SUBMITTED", "LOCKED"]),
      timesheetId: `TS-${String(randInt(1, 60)).padStart(4, "0")}`,
      reviewedBy: "user_manager",
      reviewedAt: now,
      tags: ["seed"],
      createdBy: "user_manager",
      createdAt: workDate,
      updatedAt: workDate,
    });
  }
  for (const doc of dailyLogDocs) {
    const total = (doc.regularHours as number) + (doc.overtimeHours as number);
    doc.totalHours = total;
  }
  await seed("daily_logs", dailyLogDocs);

  // ---- 19. Timesheets (unique per employee per period) ----
  const months: { periodStart: Date; periodEnd: Date; label: string }[] = [];
  for (let m = 0; m < 4; m++) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
    months.push({
      periodStart,
      periodEnd,
      label: `${periodStart.toLocaleString("en-US", { month: "long" })} ${periodStart.getFullYear()}`,
    });
  }
  const timesheetDocs: Document[] = [];
  let tsIdx = 0;
  const used: Set<string> = new Set();
  for (let mi = 0; mi < months.length; mi++) {
    const month = months[mi];
    for (let e = 0; e < 15; e++) {
      const emp = employeeIds[(mi * 15 + e) % employeeIds.length];
      const key = `${emp}|${month.label}`;
      if (used.has(key)) continue;
      used.add(key);
      tsIdx++;
      const totalHours = randInt(30, 70);
      const billableHours = Math.floor(totalHours * 0.9);
      const rate = randInt(40, 120);
      timesheetDocs.push({
        timesheetId: `TS-${String(tsIdx).padStart(4, "0")}`,
        employeeId: emp,
        employeeName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
        periodStart: month.periodStart.toISOString().slice(0, 10),
        periodEnd: month.periodEnd.toISOString().slice(0, 10),
        periodLabel: month.label,
        billingPeriod: month.periodStart.getMonth() + 1,
        year: month.periodStart.getFullYear(),
        month: month.periodStart.getMonth() + 1,
        totalDays: randInt(8, 14),
        totalRegularHours: totalHours - (totalHours - billableHours),
        totalOvertimeHours: randInt(0, 8),
        totalBillableHours: billableHours,
        totalNonBillableHours: totalHours - billableHours,
        totalHours,
        billableAmount: billableHours * rate,
        currency: "USD",
        status: rand(TIMESHEET_STATUSES),
        submittedAt: now,
        submittedBy: emp,
        reviewedBy: "user_supervisor",
        reviewedAt: now,
        approvedAt: now,
        paidAt: Math.random() < 0.3 ? now : undefined,
        dailyLogIds: [],
        projectBreakdown: [
          {
            projectId: rand(projectIds),
            projectName: rand(PROJECT_THEMES),
            employeeBillRate: rate,
            billableHours,
            billableAmount: billableHours * rate,
          },
        ],
        createdBy: "user_manager",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await seed("timesheets", timesheetDocs);

  // ---- 20. Invoices (with line items) ----
  const invoiceCounter = { n: 0 };
  const invoiceDocs: Document[] = [];
  const tsIds = timesheetDocs.map((t) => t.timesheetId as string);
  for (const client of clientDocs) {
    if ((client.status as string) === "CLOSED") continue;
    const clientTs = tsIds.filter(() => Math.random() > 0.5);
    if (clientTs.length === 0) continue;
    const numInvoices = randInt(1, 3);
    const clientProjects = projectIds
      .filter(() => Math.random() > 0.5)
      .slice(0, 4);
    for (let i = 0; i < numInvoices && i < clientTs.length; i++) {
      invoiceCounter.n++;
      const invId = `INV-${String(invoiceCounter.n).padStart(4, "0")}`;
      const rate = randInt(40, 120);
      const numLines = Math.min(randInt(1, 4), clientProjects.length || 1);
      const selProjects = clientProjects.slice(0, numLines);
      const lineItems = (
        selProjects.length ? selProjects : [rand(projectIds)]
      ).map((projectId, li) => ({
        id: `LI-${invId}-${li}`,
        description: `${rand(["US Based", "India-Based"])} ${rand(TECH_ROLES)}`,
        quantity: 1,
        rate,
        amount: rate * randInt(1, 3),
        currency: "USD",
        employeeId: employeeIds[Math.floor(Math.random() * employeeIds.length)],
        employeeName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
        projectId,
        projectName: projectId,
        manual: false,
        sortOrder: li,
      }));
      const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
      const totalAmount = subtotal;
      const status = rand(INVOICE_STATUSES);
      const issueDate = new Date(
        now.getTime() - Math.floor(Math.random() * 60) * MS_PER_DAY,
      );
      const dueDate = new Date(issueDate.getTime() + 30 * MS_PER_DAY);
      invoiceDocs.push({
        invoiceId: invId,
        invoiceNumber: `INV-${invId}`,
        clientId: client.clientId,
        clientName: client.name,
        clientCode: client.code,
        clientAddress: client.address,
        poNumber: `PO-${String(100000 + invoiceCounter.n).slice(-6)}`,
        subject: "Professional Services — Development & Consulting",
        periodStart: months[0].periodStart.toISOString().slice(0, 10),
        periodEnd: months[0].periodEnd.toISOString().slice(0, 10),
        periodLabel: months[0].label,
        issueDate: issueDate.toISOString().slice(0, 10),
        dueDate: dueDate.toISOString().slice(0, 10),
        currency: "USD",
        paymentTerms: client.paymentTerms,
        taxRate: 0,
        taxAmount: 0,
        subtotal,
        totalAmount,
        amountPaid:
          status === "PAID"
            ? totalAmount
            : status === "PARTIAL"
              ? totalAmount / 2
              : 0,
        balanceDue:
          totalAmount -
          (status === "PAID"
            ? totalAmount
            : status === "PARTIAL"
              ? totalAmount / 2
              : 0),
        status,
        lineItems,
        timesheetIds: clientTs.slice(i * 2, (i + 1) * 2),
        notes: `Auto-generated from ${clientTs.length} approved timesheets.`,
        termsAndConditions: "Payment due within 30 days of invoice date.",
        templateId: templateIds[0],
        sentAt: status !== "DRAFT" ? issueDate : undefined,
        sentBy: status !== "DRAFT" ? "user_manager" : undefined,
        paidAt: status === "PAID" ? dueDate : undefined,
        createdBy: "user_manager",
        createdAt: issueDate,
        updatedAt: issueDate,
      });
    }
  }
  await seed("invoices", invoiceDocs);

  console.log(
    `\n✅ Seed complete. Database: ${env.MONGODB_DATABASE} | total documents seeded: ${total}`,
  );
  await closeDatabase();
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
