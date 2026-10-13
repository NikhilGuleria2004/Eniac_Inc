import "dotenv/config";
import { connectDatabase, getDb, closeDatabase } from "../config/database.js";
import { hashPassword } from "../utils/auth/jwt.js";
import { initializeIndexes } from "../config/init-db.js";
import { randomBytes } from "crypto";

const DEPARTMENTS = ["Engineering", "Product", "Sales", "Marketing", "Operations", "HR", "Finance", "Design", "QA", "DevOps", "Support", "Legal"];
const DESIGNATIONS = ["Software Engineer", "Senior Engineer", "Tech Lead", "Product Manager", "Sales Director", "Marketing Manager", "Operations Lead", "HR Manager", "Finance Specialist", "UX Designer", "QA Engineer", "DevOps Engineer", "Support Specialist", "Legal Counsel"];
const COUNTRIES = ["INDIA", "USA"];
const CITIES_INDIA = ["Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai", "Kolkata"];
const CITIES_USA = ["San Francisco", "New York", "Austin", "Seattle", "Boston", "Chicago", "Denver"];
const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
const PROJECT_HEALTH = ["ON_TRACK", "AT_RISK", "OFF_TRACK"];
const LEAVE_TYPES = ["PAID", "SICK", "CASUAL", "UNPAID"];

const FIRST_NAMES = ["Arjun", "Priya", "Rohan", "Sneha", "Amit", "Neha", "Karan", "Ananya", "Vikram", "Pooja", "Ravi", "Kavya", "Siddharth", "Meera", "Harsh", "Ishita", "Manoj", "Tina", "Chetan", "Riya", "Deepak", "Sunita", "Gaurav", "Nidhi", "Yash", "Tanya", "Amitabh", "Kriti", "Sanjay", "Maya"];
const LAST_NAMES = ["Sharma", "Desai", "Patel", "Kumar", "Verma", "Joshi", "Mehta", "Singh", "Reddy", "Chauhan", "Yadav", "Thakur", "Mishra", "Rao", "Kapoor", "Gupta", "Shah", "Malhotra", "Saxena", "Ramesh"];
const CLIENT_NAMES = ["Acme Corp", "GlobalTech", "Innovation Labs", "NextGen Systems", "Fusion Dynamics", "Vertex Solutions", "Summit Partners", "Pinnacle Group", "Quantum Edge", "Apex Industries"];
const CLIENT_INDUSTRIES = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail", "Consulting", "Media", "Energy"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function seed(): Promise<void> {
  await connectDatabase();
  await initializeIndexes();

  const db = getDb();
  const now = new Date();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Clean all collections
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
  console.log("Cleared all collections");

  // ===== USERS =====
  console.log("Creating users...");
  const passwords = ["Eniacinc1", "Eniacinc2", "Eniacinc3", "Eniacinc4", "Eniacinc5"];
  const roles = ["ADMIN", "HR", "MANAGER", "SUPERVISOR", "EMPLOYEE"];
  const userEmails = ["superadmin@eniacinc.com", "hreniac@eniacinc.com", "manager@eniacinc.com", "supervisor@eniacinc.com", "employee@eniacinc.com"];
  const userIds = ["user_admin", "user_hr", "user_manager", "user_supervisor", "user_employee"];
  const seededEmployeeIds = ["EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-005"];
  const seededFirstNames = ["Superadmin", "HR", "Manager", "Supervisor", "Employee"];

  const userDocs = [];
  for (let i = 0; i < 5; i++) {
    const hashedPassword = await hashPassword(passwords[i]);
    userDocs.push({
      userId: userIds[i],
      email: userEmails[i],
      firstName: seededFirstNames[i],
      lastName: "User",
      role: roles[i],
      hashedPassword,
      status: "ACTIVE",
      employeeId: seededEmployeeIds[i],
      workMail: userEmails[i],
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection("users").insertMany(userDocs);
  console.log("  Created 5 users");

  // ===== EMPLOYEES =====
  console.log("Creating employees...");
  const allEmployeeIds = [...seededEmployeeIds];
  const employeeDocs: any[] = [...seededEmployeeIds.map((empId, i) => ({
    employeeId: empId,
    firstName: seededFirstNames[i],
    lastName: "User",
    email: userEmails[i],
    workMail: userEmails[i],
    phone: "+1-555-0001",
    designation: DESIGNATIONS[i],
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    country: COUNTRIES[i % COUNTRIES.length],
    employmentStatus: "ACTIVE",
    billingStatus: "BILLABLE",
    employmentType: "FULL_TIME",
    joiningDate: new Date(now.getTime() - 365 * MS_PER_DAY),
    managerId: undefined,
    timesheetEligibility: { eligible: true, reason: "ACTIVE + BILLABLE" },
    address: { city: "Bangalore", state: "Maharashtra", country: "INDIA", line1: "100 Main St", postalCode: "400001" },
    compensation: { currency: "INR", salary: 1000000, payFrequency: "MONTHLY" },
    createdAt: now,
    updatedAt: now
  }))];

  for (let i = 1; i <= 50; i++) {
    const empId = `EMP-${String(i + 5).padStart(3, "0")}`;
    allEmployeeIds.push(empId);
    const country = rand(COUNTRIES);
    const cityList = country === "INDIA" ? CITIES_INDIA : CITIES_USA;
    employeeDocs.push({
      employeeId: empId,
      firstName: rand(FIRST_NAMES),
      lastName: rand(LAST_NAMES),
      email: `employee${i}@eniacinc.com`,
      workMail: `emp${i}.${rand(FIRST_NAMES).toLowerCase()}.${rand(LAST_NAMES).toLowerCase()}@eniacinc.com`,
      phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      designation: rand(DESIGNATIONS),
      department: rand(DEPARTMENTS),
      country,
      employmentStatus: rand(["ACTIVE", "ONBOARDING", "ON_LEAVE", "SUSPENDED"]) as string,
      billingStatus: rand(["BILLABLE", "NON_BILLABLE"]) as string,
      employmentType: rand(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]) as string,
      joiningDate: new Date(now.getTime() - Math.floor(Math.random() * 365) * MS_PER_DAY),
      managerId: i > 10 ? "EMP-003" : undefined,
      timesheetEligibility: { eligible: Math.random() > 0.3, reason: "AUTO" },
      address: { city: rand(cityList), state: country === "INDIA" ? "Maharashtra" : "California", country, line1: `${Math.floor(Math.random() * 9000) + 1000} Main St`, postalCode: String(Math.floor(Math.random() * 90000) + 10000) },
      compensation: { currency: country === "INDIA" ? "INR" : "USD", salary: country === "INDIA" ? 800000 + Math.floor(Math.random() * 500000) : 80000 + Math.floor(Math.random() * 120000), payFrequency: "MONTHLY" },
      createdAt: now,
      updatedAt: now
    });
  }
  await db.collection("employees").insertMany(employeeDocs);
  console.log(`  Created ${employeeDocs.length} employees`);

  // ===== ONBOARDING RECORDS =====
  console.log("Creating onboarding records...");
  const onboardingStatuses = ["DRAFT", "IN_PROGRESS", "AWAITING_REVIEW", "REVIEWED", "REJECTED", "COMPLETED"];
  const onboardingStages = ["EMPLOYEE_INFORMATION", "EMPLOYMENT_DETAILS", "GEOGRAPHY", "BILLING_CLASSIFICATION", "DOCUMENTS", "HR_REVIEW", "ACTIVATION", "TIMESHEET_ELIGIBILITY"];
  const onboardingDocs = [];

  for (const emp of employeeDocs) {
    if (seededEmployeeIds.includes(emp.employeeId)) continue;
    const status = rand(onboardingStatuses);
    onboardingDocs.push({
      employeeId: emp.employeeId,
      currentStage: rand(onboardingStages),
      status,
      completedStages: status === "COMPLETED" ? ["EMPLOYEE_INFORMATION", "EMPLOYMENT_DETAILS", "GEOGRAPHY", "BILLING_CLASSIFICATION", "DOCUMENTS", "HR_REVIEW", "ACTIVATION"] : [],
      documentRequirements: [
        { type: "OFFER_LETTER", name: "Offer Letter", required: true, uploaded: status === "COMPLETED" },
        { type: "EMPLOYMENT_AGREEMENT", name: "Employment Agreement", required: true, uploaded: status === "COMPLETED" },
        { type: "ID_PROOF", name: "ID Proof", required: true, uploaded: status === "COMPLETED" },
        { type: "ADDRESS_PROOF", name: "Address Proof", required: true, uploaded: status === "COMPLETED" },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }
  // Seeded employees get COMPLETED onboarding
  for (const empId of seededEmployeeIds) {
    onboardingDocs.push({
      employeeId: empId,
      currentStage: "TIMESHEET_ELIGIBILITY",
      status: "COMPLETED",
      completedStages: ["EMPLOYEE_INFORMATION", "EMPLOYMENT_DETAILS", "GEOGRAPHY", "BILLING_CLASSIFICATION", "DOCUMENTS", "HR_REVIEW", "ACTIVATION"],
      documentRequirements: [],
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection("onboarding_records").insertMany(onboardingDocs);
  console.log(`  Created ${onboardingDocs.length} onboarding records`);

  // ===== CLIENTS =====
  console.log("Creating clients...");
  const clientIds = [];
  const clientDocs = [];
  for (let i = 1; i <= 10; i++) {
    const clientId = `CLI-${String(i).padStart(3, "0")}`;
    clientIds.push(clientId);
    clientDocs.push({
      clientId,
      code: `C-${String(i).padStart(3, "0")}`,
      name: `${rand(CLIENT_NAMES)} ${i > 5 ? i : ""}`.trim(),
      status: rand(PROJECT_STATUSES),
      industry: rand(CLIENT_INDUSTRIES),
      contact: { name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`, email: `contact${i}@client.com`, phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}` },
      address: { line1: `${Math.floor(Math.random() * 9000) + 1000} Market St`, city: rand(CITIES_USA), state: "California", country: "USA", postalCode: String(Math.floor(Math.random() * 90000) + 10000) },
      createdBy: "user_admin",
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection("clients").insertMany(clientDocs);
  console.log(`  Created ${clientIds.length} clients`);

  // ===== PROJECTS =====
  console.log("Creating projects...");
  const projectIds = [];
  const projectNames = ["Phoenix", "Summit", "Nexus", "Atlas", "Quantum", "Voyager", "Horizon", "Apex", "Orbit", "Catalyst", "Vertex", "Echo", "Nova", "Pulse", "Zenith"];
  const projectDocs = [];
  for (let i = 1; i <= 15; i++) {
    const projectId = `PROJ-${String(i).padStart(3, "0")}`;
    projectIds.push(projectId);
    projectDocs.push({
      projectId,
      clientId: rand(clientIds),
      name: `${rand(projectNames)} ${i}`,
      code: `PRJ-${String(i).padStart(3, "0")}`,
      description: `Project ${i} for ${rand(CLIENT_NAMES)}`,
      status: rand(PROJECT_STATUSES),
      health: rand(PROJECT_HEALTH),
      startDate: new Date(now.getTime() - Math.floor(Math.random() * 180) * MS_PER_DAY),
      endDate: Math.random() > 0.5 ? new Date(now.getTime() + Math.floor(Math.random() * 180) * MS_PER_DAY) : undefined,
      managerId: "EMP-003",
      progressPercent: Math.floor(Math.random() * 100),
      createdBy: "user_admin",
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection("projects").insertMany(projectDocs);
  console.log(`  Created ${projectIds.length} projects`);

  // ===== PROJECT ASSIGNMENTS =====
  console.log("Creating project assignments...");
  const assignmentDocs = [];
  for (const emp of employeeDocs) {
    if (Math.random() > 0.2) {
      assignmentDocs.push({
        assignmentId: `ASGN-${randomBytes(4).toString("hex")}`,
        employeeId: emp.employeeId,
        projectId: rand(projectIds),
        role: rand(["Developer", "Tester", "Designer", "Analyst", "Lead", "Contributor"]),
        allocationPercent: Math.floor(Math.random() * 50) + 50,
        billable: emp.billingStatus === "BILLABLE",
        startDate: new Date(now.getTime() - Math.floor(Math.random() * 90) * MS_PER_DAY),
        endDate: Math.random() > 0.7 ? new Date(now.getTime() + Math.floor(Math.random() * 90) * MS_PER_DAY) : undefined,
        status: rand(["ACTIVE", "ENDED"]),
        createdBy: "user_admin",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  if (assignmentDocs.length) await db.collection("project_assignments").insertMany(assignmentDocs);
  console.log(`  Created ${assignmentDocs.length} project assignments`);

  // ===== ATTENDANCE RECORDS =====
  console.log("Creating attendance records...");
  const attendanceDocs = [];
  for (const emp of employeeDocs) {
    if (["TERMINATED", "RESIGNED"].includes(emp.employmentStatus)) continue;
    for (let d = 14; d >= 1; d--) {
      const date = new Date(now.getTime() - d * MS_PER_DAY);
      if (date.getDay() === 0) continue;
      const status = rand(["P", "P", "P", "P", "P", "A", "L", "M"]);
      const doc: any = {
        attendanceId: `ATT-${randomBytes(4).toString("hex")}`,
        employeeId: emp.employeeId,
        date,
        status,
        createdAt: now,
        updatedAt: now,
      };
      if (status === "P" || status === "M") {
        doc.checkIn = new Date(date.getTime() + 9 * 3600000 + Math.random() * 3600000);
        if (Math.random() > 0.3) {
          doc.checkOut = new Date(doc.checkIn.getTime() + 8 * 3600000 + Math.random() * 2 * 3600000);
          doc.workingHours = parseFloat(((doc.checkOut.getTime() - doc.checkIn.getTime()) / 3600000).toFixed(2));
        }
      }
      attendanceDocs.push(doc);
    }
  }
  if (attendanceDocs.length) await db.collection("attendance_records").insertMany(attendanceDocs);
  console.log(`  Created ${attendanceDocs.length} attendance records`);

  // ===== LEAVE REQUESTS =====
  console.log("Creating leave requests...");
  const leaveDocs = [];
  for (const emp of employeeDocs) {
    if (Math.random() > 0.5) {
      const startDate = new Date(now.getTime() - Math.floor(Math.random() * 30) * MS_PER_DAY);
      const days = Math.floor(Math.random() * 5) + 1;
      leaveDocs.push({
        requestId: `LR-${randomBytes(4).toString("hex")}`,
        employeeId: emp.employeeId,
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
  if (leaveDocs.length) await db.collection("leave_requests").insertMany(leaveDocs);
  console.log(`  Created ${leaveDocs.length} leave requests`);

  // ===== LEAVE BALANCES =====
  console.log("Creating leave balances...");
  const balanceDocs = [];
  for (const emp of employeeDocs) {
    for (const lt of LEAVE_TYPES) {
      balanceDocs.push({
        employeeId: emp.employeeId,
        leaveType: lt,
        balance: lt === "UNPAID" ? 0 : Math.floor(Math.random() * 15) + 5,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  if (balanceDocs.length) await db.collection("leave_balances").insertMany(balanceDocs);
  console.log(`  Created ${balanceDocs.length} leave balances`);

  // ===== DOCUMENTS =====
  console.log("Creating documents...");
  const docTypes = ["OFFER_LETTER", "EMPLOYMENT_AGREEMENT", "ID_PROOF", "ADDRESS_PROOF", "VISA", "BANK_DETAILS"];
  const documentDocs = [];
  for (const emp of employeeDocs) {
    for (const docType of docTypes) {
      if (Math.random() > 0.5) {
        const status = rand(["APPROVED", "PENDING", "REJECTED"]);
        documentDocs.push({
          documentId: `DOC-${randomBytes(4).toString("hex")}`,
          employeeId: emp.employeeId,
          type: docType,
          name: `${docType.replace(/_/g, " ")} for ${emp.firstName}`,
          url: "https://res.cloudinary.com/demo/image/upload/v1700000000/sample.pdf",
          uploadedAt: now,
          uploadedBy: "user_hr",
          status,
          expiryDate: docType === "VISA" ? new Date(now.getTime() + 180 * MS_PER_DAY) : undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }
  if (documentDocs.length) await db.collection("documents").insertMany(documentDocs);
  console.log(`  Created ${documentDocs.length} documents`);

  // ===== INVITATIONS =====
  console.log("Creating invitations...");
  const inviteDocs = [];
  for (const emp of employeeDocs) {
    if (Math.random() > 0.7) {
      inviteDocs.push({
        tokenHash: randomBytes(32).toString("hex"),
        userId: `user_${emp.employeeId}`,
        employeeId: emp.employeeId,
        email: emp.email,
        workMail: emp.workMail,
        role: "EMPLOYEE",
        status: rand(["PENDING", "ACCEPTED"]),
        invitedByRole: "HR",
        expiresAt: new Date(now.getTime() + 7 * MS_PER_DAY),
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  if (inviteDocs.length) await db.collection("invitations").insertMany(inviteDocs);
  console.log(`  Created ${inviteDocs.length} invitations`);

  // ===== EMPLOYEE REVIEWS =====
  console.log("Creating employee reviews...");
  const reviewDocs = [];
  for (const emp of employeeDocs) {
    if (Math.random() > 0.6) {
      reviewDocs.push({
        reviewId: `REV-${randomBytes(4).toString("hex")}`,
        employeeId: emp.employeeId,
        reviewerId: "user_hr",
        reviewerName: "HR User",
        type: rand(["ANNUAL", "PROBATION", "MID_YEAR"]),
        score: Math.floor(Math.random() * 3) + 3,
        maxScore: 5,
        status: rand(["COMPLETED", "IN_PROGRESS", "SCHEDULED"]),
        summary: "Performance review completed.",
        goals: ["Improve communication skills", "Take ownership of projects", "Mentor junior developers"],
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  if (reviewDocs.length) await db.collection("employee_reviews").insertMany(reviewDocs);
  console.log(`  Created ${reviewDocs.length} employee reviews`);

  // ===== NOTIFICATIONS =====
  console.log("Creating notifications...");
  const notificationTypes = ["LEAVE", "DOCUMENT", "PROJECT", "ONBOARDING", "ATTENDANCE", "SYSTEM"];
  const notificationDocs = [];
  for (const emp of employeeDocs) {
    for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
      notificationDocs.push({
        notificationId: `NOTIF-${randomBytes(4).toString("hex")}`,
        userId: `user_${emp.employeeId}`,
        type: rand(notificationTypes),
         title: rand(["Leave Request Approved", "Document Uploaded", "Project Update", "Onboarding Reminder", "Attendance Marked", "System Announcement"]),
        message: "This is a notification message for the employee.",
        read: Math.random() > 0.5,
        link: "/dashboard",
        readAt: Math.random() > 0.5 ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  if (notificationDocs.length) await db.collection("notifications").insertMany(notificationDocs);
  console.log(`  Created ${notificationDocs.length} notifications`);

  // ===== AUDIT LOGS =====
  console.log("Creating audit logs...");
  const auditActions = ["employee.created", "employee.updated", "onboarding.completed", "invitation.sent", "document.approved", "leave.approved", "project.created"];
  const auditDocs = [];
  for (let i = 0; i < 200; i++) {
    auditDocs.push({
      auditId: `AUDIT-${randomBytes(4).toString("hex")}`,
      actorUserId: `user_${rand([...seededEmployeeIds, ...employeeDocs.map((e) => e.employeeId)])}`,
      actorRole: rand(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]),
      action: rand(auditActions),
      entityType: rand(["employee", "onboarding", "invitation", "document", "leave", "project", "user"]),
      entityId: `EMP-${String(Math.floor(Math.random() * 50) + 5).padStart(3, "0")}`,
      details: { ipAddress: "192.168.1.1", userAgent: "Mozilla/5.0" },
      ipAddress: "192.168.1.1",
      createdAt: now,
    });
  }
  if (auditDocs.length) await db.collection("audit_logs").insertMany(auditDocs);
  console.log(`  Created ${auditDocs.length} audit logs`);

  // ===== LEAVE TYPES =====
  console.log("Creating leave types...");
  const leaveTypeDocs = [];
  const leaveTypeAllowances: Record<string, number> = { PAID: 18, SICK: 10, CASUAL: 12, UNPAID: 0 };
  for (const lt of LEAVE_TYPES) {
    leaveTypeDocs.push({
      typeId: `LT-${lt}`,
      code: lt,
      name: lt.replace(/_/g, " "),
      annualAllowance: leaveTypeAllowances[lt] ?? 0,
      requiresApproval: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection("leave_types").insertMany(leaveTypeDocs);
  console.log(`  Created ${leaveTypeDocs.length} leave types`);

  // ===== SETTINGS =====
  console.log("Creating settings...");
  const settingsDocs = [
    { key: "company_name", value: "Eniac Inc.", createdAt: now, updatedAt: now },
    { key: "support_email", value: "support@eniacinc.com", createdAt: now, updatedAt: now },
    { key: "timezone", value: "Asia/Kolkata", createdAt: now, updatedAt: now },
    { key: "date_format", value: "DD/MM/YYYY", createdAt: now, updatedAt: now },
    { key: "weekend_days", value: "0", createdAt: now, updatedAt: now },
  ];
  await db.collection("settings").insertMany(settingsDocs);
  console.log(`  Created ${settingsDocs.length} settings`);

  console.log("\n✅ Seed complete! Database: eniac_ems_dev");
  await closeDatabase();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
