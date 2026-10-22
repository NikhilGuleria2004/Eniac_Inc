import "dotenv/config";
import { connectDatabase, getDb, closeDatabase } from "../config/database.js";
import { hashPassword } from "../utils/auth/jwt.js";
import { initializeIndexes } from "../config/init-db.js";

const EMPLOYEE_DATA = [
  {
    employeeId: "EMP-TEST-001",
    userId: "user_emp1",
    email: "emp1@test.com",
    firstName: "Alice",
    lastName: "Johnson",
    password: "Testpass1",
    role: "EMPLOYEE",
    designation: "Software Engineer",
    department: "Engineering",
    country: "USA",
    employmentStatus: "ACTIVE" as const,
    billingStatus: "BILLABLE" as const,
    techRole: "Full Stack Developer",
    hourlyRate: { currency: "USD", amount: 120, unit: "HOURLY" },
    compensation: { currency: "USD", salary: 120000, payFrequency: "MONTHLY" as const },
  },
  {
    employeeId: "EMP-TEST-002",
    userId: "user_emp2",
    email: "emp2@test.com",
    firstName: "Bob",
    lastName: "Smith",
    password: "Testpass2",
    role: "EMPLOYEE",
    designation: "Frontend Developer",
    department: "Engineering",
    country: "USA",
    employmentStatus: "ACTIVE" as const,
    billingStatus: "BILLABLE" as const,
    techRole: "Frontend Developer",
    hourlyRate: { currency: "USD", amount: 100, unit: "HOURLY" },
    compensation: { currency: "USD", salary: 110000, payFrequency: "MONTHLY" as const },
  },
  {
    employeeId: "EMP-TEST-003",
    userId: "user_emp3",
    email: "emp3@test.com",
    firstName: "Carol",
    lastName: "Davis",
    password: "Testpass3",
    role: "EMPLOYEE",
    designation: "Backend Developer",
    department: "Engineering",
    country: "INDIA",
    employmentStatus: "ACTIVE" as const,
    billingStatus: "BILLABLE" as const,
    techRole: "Backend Developer",
    hourlyRate: { currency: "USD", amount: 90, unit: "HOURLY" },
    compensation: { currency: "USD", salary: 100000, payFrequency: "MONTHLY" as const },
  },
];

const CLIENT_ID = "CLI-TEST-001";
const PROJECT_ID = "PROJ-TEST-001";

async function seedCmsTest(): Promise<void> {
  await connectDatabase();
  await initializeIndexes();

  const db = getDb();
  const now = new Date();

  console.log("Seeding CMS test data...");

  // Create employees + their user accounts
  for (const empData of EMPLOYEE_DATA) {
    const hashedPassword = await hashPassword(empData.password);

    await db.collection("users").updateOne(
      { userId: empData.userId },
      {
        $set: {
          userId: empData.userId,
          employeeId: empData.employeeId,
          email: empData.email,
          firstName: empData.firstName,
          lastName: empData.lastName,
          role: empData.role,
          hashedPassword,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    await db.collection("employees").updateOne(
      { employeeId: empData.employeeId },
      {
        $set: {
          employeeId: empData.employeeId,
          firstName: empData.firstName,
          lastName: empData.lastName,
          email: empData.email,
          workMail: empData.email,
          designation: empData.designation,
          department: empData.department,
          country: empData.country,
          employmentStatus: empData.employmentStatus,
          billingStatus: empData.billingStatus,
          employmentType: "FULL_TIME",
          joiningDate: new Date("2026-10-15"),
          techRole: empData.techRole,
          hourlyRate: empData.hourlyRate,
          compensation: empData.compensation,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    console.log(`  Created employee: ${empData.firstName} ${empData.lastName} (${empData.employeeId})`);
  }

  // Create client
  await db.collection("clients").updateOne(
    { clientId: CLIENT_ID },
    {
      $set: {
        clientId: CLIENT_ID,
        code: "CLI-TEST-001",
        name: "Test Client Inc",
        status: "ACTIVE",
        clientTier: "ENTERPRISE",
        paymentTerms: "NET_30",
        industry: "Technology",
        contact: {
          name: "Jane Doe",
          email: "jane@testclient.com",
          phone: "555-0100",
        },
        address: {
          city: "San Francisco",
          country: "USA",
        },
        billingAddress: {
          city: "San Francisco",
          country: "USA",
        },
        createdBy: "user_admin",
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
  console.log(`  Created client: Test Client Inc (${CLIENT_ID})`);

  // Create project
  await db.collection("projects").updateOne(
    { projectId: PROJECT_ID },
    {
      $set: {
        projectId: PROJECT_ID,
        code: "PROJ-TEST-001",
        name: "Test Project Alpha",
        description: "E-commerce platform development",
        clientId: CLIENT_ID,
        clientName: "Test Client Inc",
        status: "ACTIVE",
        health: "ON_TRACK",
        visibility: "CLIENT_VISIBLE",
        managerId: "EMP-TEST-001",
        startDate: new Date("2026-10-01"),
        budget: 100000,
        budgetCurrency: "USD",
        progressPercent: 0,
        tags: ["development", "ecommerce"],
        createdBy: "user_admin",
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
  console.log(`  Created project: Test Project Alpha (${PROJECT_ID})`);

  // Create project assignments
  const assignments = EMPLOYEE_DATA.map((emp, i) => ({
    assignmentId: `ASGN-TEST-${String(i + 1).padStart(3, "0")}`,
    employeeId: emp.employeeId,
    projectId: PROJECT_ID,
    role: emp.techRole,
    allocationPercent: 100,
    billable: true,
    startDate: new Date("2026-10-15"),
    status: "ACTIVE" as const,
    createdBy: "user_admin",
    createdAt: now,
    updatedAt: now,
  }));

  for (const assignment of assignments) {
    await db.collection("project_assignments").updateOne(
      { assignmentId: assignment.assignmentId },
      { $set: assignment },
      { upsert: true }
    );
  }
  console.log(`  Created ${assignments.length} project assignments`);

  // Create daily logs (5 days of work: Oct 15-19, Mon-Fri, 2024)
  const dates = [
    new Date("2026-10-15"), // Wed
    new Date("2026-10-16"), // Thu
    new Date("2026-10-17"), // Fri
    new Date("2026-10-20"), // Mon
    new Date("2026-10-21"), // Tue
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let logCount = 0;
  for (const emp of EMPLOYEE_DATA) {
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const regularHours = 8;
      const overtimeHours = isWeekend ? 4 : 0;
      const totalHours = regularHours + overtimeHours;

      const dailyLogId = `DL-${emp.employeeId}-${date.toISOString().slice(0, 10).replace(/-/g, "")}`;

      await db.collection("daily_logs").updateOne(
        { dailyLogId },
        {
          $set: {
            dailyLogId,
            employeeId: emp.employeeId,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            projectId: PROJECT_ID,
            projectName: "Test Project Alpha",
            workDate: date,
            workDateStr: date.toISOString().slice(0, 10),
            dayOfWeek: dayNames[date.getDay()],
            taskCategory: "DEVELOPMENT",
            description: `Development work on Test Project Alpha - ${emp.designation}`,
            regularHours,
            overtimeHours,
            totalHours,
            billable: true,
            billingType: "BILLABLE",
            status: "SUBMITTED",
            tags: ["project", "development"],
            createdBy: emp.userId,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );
      logCount++;
    }
  }
  console.log(`  Created ${logCount} daily logs`);

  console.log("\nCMS test data seeded successfully!");
  console.log(`Employees: ${EMPLOYEE_DATA.length}, Project: 1, Assignments: ${assignments.length}, Daily logs: ${logCount}`);
  await closeDatabase();
}

seedCmsTest().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
