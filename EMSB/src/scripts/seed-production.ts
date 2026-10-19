import "dotenv/config";
import { connectDatabase, getDb, closeDatabase } from "../config/database.js";
import { initializeIndexes } from "../config/init-db.js";
import { hashPassword } from "../utils/auth/jwt.js";
import type { Document } from "mongodb";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const FIRST_NAMES = [
  "Arjun", "Priya", "Rohan", "Sneha", "Amit", "Neha", "Karan", "Ananya",
  "Vikram", "Pooja", "Ravi", "Kavya", "Siddharth", "Meera", "Harsh",
  "Ishita", "Manoj", "Tina", "Chetan", "Riya",
] as const;

const LAST_NAMES = [
  "Sharma", "Desai", "Patel", "Kumar", "Verma", "Joshi", "Mehta", "Singh",
  "Reddy", "Chauhan", "Yadav", "Thakur", "Mishra", "Rao", "Kapoor", "Gupta",
  "Shah", "Malhotra", "Saxena", "Ramesh",
] as const;

const CLIENT_COMPANIES = [
  "Acme Corp", "GlobalTech", "Innovation Labs", "NextGen Systems", "Fusion Dynamics",
  "Vertex Solutions", "Summit Partners", "Pinnacle Group", "Quantum Edge", "Apex Industries",
  "Zenith Digital", "Meridian Health", "Stellaris", "Nimbus Cloud", "Cobalt Blue",
] as const;

const CLIENT_INDUSTRIES = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail", "Consulting", "Media", "Energy"] as const;

const PROJECT_THEMES = ["Phoenix", "Summit", "Nexus", "Atlas", "Quantum", "Voyager", "Horizon", "Apex", "Orbit", "Catalyst", "Vertex", "Echo", "Nova", "Pulse", "Zenith"] as const;

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
] as const;

const TASK_CATEGORIES = ["DEVELOPMENT", "TESTING", "REVIEW", "MEETING", "DESIGN", "OTHER"] as const;

const INVOICE_STATUSES_WITH_RATE: [string, number][] = [
  ["DRAFT", 0.15],
  ["SENT", 0.25],
  ["PAID", 0.20],
  ["OVERDUE", 0.10],
  ["PARTIAL", 0.15],
  ["VOID", 0.05],
  ["CANCELLED", 0.10],
];

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createLcg(seed: number) {
  const rng = seededRandom(seed);
  return {
    next: rng,
    int(min: number, max: number): number {
      return min + Math.floor(rng() * (max - min + 1));
    },
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(rng() * arr.length)];
    },
    pickN<T>(arr: readonly T[], n: number): T[] {
      const result: T[] = [];
      for (let i = 0; i < n; i++) {
        result.push(arr[Math.floor(rng() * arr.length)]);
      }
      return result;
    },
  };
}

const rng = createLcg(0x53454544);

async function run(): Promise<void> {
  await connectDatabase();
  await initializeIndexes();
  const db = getDb();
  const now = new Date();

  console.log("Seeding CMS platform data...");

  await db.collection("invoice_templates").deleteMany({ name: { $regex: "^PROD-TEMPLATE-" } });
  await db.collection("users").deleteMany({ userId: { $regex: "^PROD-USER-" } });
  await db.collection("users").deleteMany({ email: { $regex: "@eniac\\.demo$" } });
  await db.collection("clients").deleteMany({ clientId: { $regex: "^PROD-CLIENT-" } });
  await db.collection("projects").deleteMany({ projectId: { $regex: "^PROD-PRJ-" } });
  await db.collection("project_assignments").deleteMany({ assignmentId: { $regex: "^PROD-ASN-" } });
  await db.collection("daily_logs").deleteMany({ dailyLogId: { $regex: "^PROD-DL-" } });
  await db.collection("timesheets").deleteMany({ timesheetId: { $regex: "^PROD-TS-" } });
  await db.collection("invoices").deleteMany({ invoiceId: { $regex: "^PROD-INV-" } });
  await db.collection("audit_logs").deleteMany({ auditId: { $regex: "^PROD-AUDIT-" } });
  await db.collection("notifications").deleteMany({ notificationId: { $regex: "^PROD-NOTIF-" } });
  await db.collection("timesheet_provisioning").deleteMany({});

  // Drop PROD-only collections that had unique index issues from partial runs
  const colsToDrop = ["employees", "project_assignments", "daily_logs", "timesheets", "invoices"] as const;
  for (const colName of colsToDrop) {
    const cols = await db.listCollections({ name: colName }).toArray();
    if (cols.length > 0) {
      await db.dropCollection(colName);
    }
  }

  // Recreate indexes for dropped collections
  const empColl = db.collection("employees");
  await empColl.createIndexes([
    { key: { employeeId: 1 }, unique: true },
    { key: { email: 1 }, unique: true, sparse: true },
    { key: { employmentStatus: 1 } },
    { key: { billingStatus: 1 } },
    { key: { department: 1 } },
    { key: { managerId: 1 } },
    { key: { country: 1 } },
  ]);
  await db.collection("project_assignments").createIndexes([
    { key: { assignmentId: 1 }, unique: true },
    { key: { employeeId: 1 } },
    { key: { projectId: 1 } },
    { key: { status: 1 } },
  ]);
  await db.collection("timesheets").createIndexes([
    { key: { timesheetId: 1 }, unique: true },
    { key: { employeeId: 1, periodStart: 1, periodEnd: 1 }, unique: true },
    { key: { status: 1, periodStart: 1 } },
    { key: { employeeId: 1, periodStart: 1 } },
  ]);
  await db.collection("invoices").createIndexes([
    { key: { invoiceId: 1 }, unique: true },
    { key: { invoiceNumber: 1 }, unique: true, sparse: true },
    { key: { clientId: 1, status: 1 } },
    { key: { issueDate: 1 } },
  ]);

  const adminUserId = "PROD-USER-000";
  const mgrUserId = "PROD-USER-001";
  const supUserId = "PROD-USER-002";
  const empUserId = "PROD-USER-003";

  console.log("  Creating users...");
  await db.collection("users").insertMany([
    {
      userId: adminUserId,
      email: "admin@eniac.demo",
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      hashedPassword: await hashPassword("demo123"),
      status: "ACTIVE",
      employeeId: "PROD-EMP-000",
      workMail: "admin@eniac.demo",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: mgrUserId,
      email: "manager@eniac.demo",
      firstName: "Manager",
      lastName: "User",
      role: "MANAGER",
      hashedPassword: await hashPassword("demo123"),
      status: "ACTIVE",
      employeeId: "PROD-EMP-001",
      workMail: "manager@eniac.demo",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: supUserId,
      email: "supervisor@eniac.demo",
      firstName: "Supervisor",
      lastName: "User",
      role: "SUPERVISOR",
      hashedPassword: await hashPassword("demo123"),
      status: "ACTIVE",
      employeeId: "PROD-EMP-002",
      workMail: "supervisor@eniac.demo",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: empUserId,
      email: "employee@eniac.demo",
      firstName: "Employee",
      lastName: "User",
      role: "EMPLOYEE",
      hashedPassword: await hashPassword("demo123"),
      status: "ACTIVE",
      employeeId: "PROD-EMP-003",
      workMail: "employee@eniac.demo",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log("  Creating invoice templates...");
  const templateIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const tplId = `PROD-TPL-${String(i).padStart(3, "0")}`;
    templateIds.push(tplId);
    await db.collection("invoice_templates").insertOne({
      invoiceTemplateId: tplId,
      name: `Production Template ${i}`,
      logoUrl: "https://eniacinc.com/logo.png",
      primaryColor: "#0F2B1D",
      secondaryColor: "#0A1E16",
      footerNote: "Thank you for your business.",
      termsAndConditions: "Payment due within 30 days.",
      paymentInstructions: "Bank transfer to A/C 123456789, SWIFT: ENIACBOM.",
      taxSettings: { defaultRate: 0, label: "Tax" },
      isDefault: i === 1,
      createdBy: adminUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log("  Creating employees...");
  const employeeIds: string[] = [];
  const employeesWithRates: { employeeId: string; rate: number; country: string; techRole: string; designation: string }[] = [];

  const rateMap: Record<string, number> = {
    "US Based AEM Developer": 23400,
    "US Based Developer": 23400,
    "US Based Senior Developer": 27000,
    "US Based Lead": 32000,
    "US Based DevOps Engineer": 25000,
    "US Based QA Engineer": 19000,
    "US Based Designer": 18000,
    "US Based Analyst": 17000,
    "EU Based Web Developer": 20584,
    "EU Based Developer": 20584,
    "EU Based Senior Developer": 23000,
    "EU Based Lead": 28000,
    "EU Based DevOps Engineer": 19500,
    "EU Based QA Engineer": 16500,
    "EU Based Designer": 15000,
    "EU Based Analyst": 14500,
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

  const COUNTRY_FOR_RATE: Record<string, string> = {
    "US Based": "United States",
    "EU Based": "Germany",
    "India-Based": "India",
  };

  const employeeRateEntries: { key: string; rate: number; country: string }[] = [];
  for (const [key, rate] of Object.entries(rateMap)) {
    const countryMatch = Object.keys(COUNTRY_FOR_RATE).find((prefix) => key.startsWith(prefix));
    if (countryMatch) {
       employeeRateEntries.push({ key, rate, country: COUNTRY_FOR_RATE[countryMatch] });
    }
  }

  const numEmployees = 30;
  for (let i = 0; i < numEmployees; i++) {
    const empId = `PROD-EMP-${String(i + 1).padStart(3, "0")}`;
    employeeIds.push(empId);
    const rateEntry = employeeRateEntries[i % employeeRateEntries.length];
    const techRole = rateEntry.key.split(" ").slice(2).join(" ");
    const designation = rateEntry.key.split(" ").slice(2).join(" ");

    employeesWithRates.push({
      employeeId: empId,
      rate: rateEntry.rate,
      country: rateEntry.country,
      techRole,
      designation,
    });

    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const empEmail = `${empId.toLowerCase()}@eniac.demo`;

    await db.collection("employees").insertOne({
      employeeId: empId,
      firstName,
      lastName,
      email: empEmail,
      phone: `+1-555-${String(1000 + i).padStart(4, "0")}`,
      profilePhotoUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
      designation,
      department: ["Engineering", "Product", "Sales", "Design", "QA"][i % 5],
      managerId: i >= 5 ? employeeIds[1] : undefined,
      country: rateEntry.country,
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      workMail: empEmail,
      joiningDate: new Date(now.getTime() - (rng.int(30, 365) * MS_PER_DAY)),
      employmentType: rng.pick(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
      address: {
        line1: `${rng.int(100, 999)} Main Street`,
        city: rateEntry.country === "India" ? "Bangalore" : rateEntry.country === "United States" ? "Austin" : "Berlin",
        state: rateEntry.country === "India" ? "KA" : rateEntry.country === "United States" ? "TX" : "BE",
        postalCode: String(rng.int(10000, 99999)),
        country: rateEntry.country,
      },
      emergencyContact: {
        name: `${FIRST_NAMES[(i + 10) % FIRST_NAMES.length]} ${LAST_NAMES[(i + 10) % LAST_NAMES.length]}`,
        relationship: "Spouse",
        phone: `+1-555-${String(2000 + i).padStart(4, "0")}`,
      },
      timesheetEligibility: { eligible: true, eligibleAt: now, reason: "ACTIVE + BILLABLE" },
      techRole,
      compensation: {
        currency: rateEntry.country === "India" ? "INR" : "USD",
        salary: rateEntry.rate * 12,
        payFrequency: "MONTHLY",
      },
      billRate: {
        currency: "USD",
        amount: rateEntry.rate,
        unit: "MONTHLY",
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.collection("timesheet_provisioning").deleteMany({ employeeId: { $regex: "^PROD-EMP-" } });
  for (const empId of employeeIds) {
    await db.collection("timesheet_provisioning").insertOne({
      employeeId: empId,
      status: "PROVISIONED",
      eligible: true,
      provisionedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log("  Creating clients...");
  const clientIds: string[] = [];
  const clients: { clientId: string; name: string; code: string; country: string; industry: string; status: string; clientTier: string; paymentTerms: string; billingAddress: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string } }[] = [];

  for (let i = 0; i < 15; i++) {
    const clientId = `PROD-CLIENT-${String(i + 1).padStart(3, "0")}`;
    clientIds.push(clientId);
    const country = ["United States", "India", "Germany", "United Kingdom", "France"][i % 5];
    const industry = CLIENT_INDUSTRIES[i % CLIENT_INDUSTRIES.length];
    const tier = ["ENTERPRISE", "MID_MARKET", "SMB", "PROSPECT"][i % 4];
    const status = i === 0 ? "ACTIVE" : i === 2 ? "SUSPENDED" : i === 4 ? "CLOSED" : "ACTIVE";
    const terms = ["NET_15", "NET_30", "NET_45", "NET_60", "DUE_ON_RECEIPT"][i % 5];

    const billingAddr = {
      line1: `${rng.int(100, 999)} Business Ave`,
      city: country === "India" ? "Mumbai" : country === "United States" ? "New York" : country === "Germany" ? "Berlin" : country === "United Kingdom" ? "London" : "Paris",
      state: country === "India" ? "MH" : country === "United States" ? "NY" : "DE",
      postalCode: String(rng.int(10000, 99999)),
      country,
    };

    clients.push({ clientId, name: `${CLIENT_COMPANIES[i % CLIENT_COMPANIES.length]} ${i + 1}`, code: `PC${String(i + 1).padStart(3, "0")}`, country, industry, status, clientTier: tier, paymentTerms: terms, billingAddress: billingAddr });

    await db.collection("clients").insertOne({
      clientId,
      name: `${CLIENT_COMPANIES[i % CLIENT_COMPANIES.length]} ${i + 1}`,
      code: `PC${String(i + 1).padStart(3, "0")}`,
      status,
      industry,
      contact: {
        name: `${FIRST_NAMES[(i + 5) % FIRST_NAMES.length]} ${LAST_NAMES[(i + 5) % LAST_NAMES.length]}`,
        email: `contact${i + 1}@${CLIENT_COMPANIES[i % CLIENT_COMPANIES.length].toLowerCase().replace(/\s+/g, "")}.com`,
        phone: `+1-555-${String(3000 + i).padStart(4, "0")}`,
        role: "Procurement Manager",
      },
      address: {
        line1: `${rng.int(100, 999)} Business Ave`,
        city: country === "India" ? "Mumbai" : country === "United States" ? "New York" : country === "Germany" ? "Berlin" : country === "United Kingdom" ? "London" : "Paris",
        state: country === "India" ? "MH" : country === "United States" ? "NY" : country === "Germany" ? "BE" : country === "United Kingdom" ? "ENG" : "IDF",
        postalCode: String(rng.int(10000, 99999)),
        country,
      },
      clientTier: tier,
      paymentTerms: terms,
      taxId: `TAX-${String(1000 + i).padStart(5, "0")}`,
      contacts: [
        {
          id: `CON-${i + 1}`,
          name: `${FIRST_NAMES[(i + 3) % FIRST_NAMES.length]} ${LAST_NAMES[(i + 3) % LAST_NAMES.length]}`,
          email: `contact${i + 1}@${CLIENT_COMPANIES[i % CLIENT_COMPANIES.length].toLowerCase().replace(/\s+/g, "")}.com`,
          phone: `+1-555-${String(4000 + i).padStart(4, "0")}`,
          role: "Project Manager",
          isPrimary: true,
        },
      ],
      billingAddress: billingAddr,
      createdBy: adminUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log("  Creating projects...");
  const projectDefs: { projectId: string; clientId: string; clientName: string; clientCode: string }[] = [];
  let projIdx = 0;

  for (let c = 0; c < clients.length; c++) {
    const numProjects = 3 + (c % 4);
    for (let p = 0; p < numProjects; p++) {
      const projectId = `PROD-PRJ-${String(projIdx + 1).padStart(3, "0")}`;
      projectDefs.push({ projectId, clientId: clients[c].clientId, clientName: clients[c].name, clientCode: clients[c].code });

      await db.collection("projects").insertOne({
        projectId,
        clientId: clients[c].clientId,
        name: `${PROJECT_THEMES[p % PROJECT_THEMES.length]} ${clients[c].name.split(" ").slice(-1)[0]}`,
        code: `PPJ${String(projIdx + 1).padStart(3, "0")}`,
        description: `Project for ${clients[c].name} — ${PROJECT_THEMES[p % PROJECT_THEMES.length]} phase.`,
        status: rng.pick(["PLANNING", "ACTIVE", "ACTIVE", "ACTIVE", "ON_HOLD", "COMPLETED"]),
        health: rng.pick(["ON_TRACK", "ON_TRACK", "AT_RISK", "OFF_TRACK"]),
        startDate: new Date(now.getTime() - rng.int(30, 120) * MS_PER_DAY),
        endDate: new Date(now.getTime() + rng.int(30, 180) * MS_PER_DAY),
        managerId: employeeIds[1],
        supervisorId: employeeIds[2],
        progressPercent: rng.int(10, 95),
        budget: rng.int(50000, 500000),
        budgetCurrency: "USD",
        teamSize: rng.int(3, 12),
        billable: true,
        visibility: rng.pick(["INTERNAL", "CLIENT_VISIBLE"]),
        tags: ["production", clients[c].industry.toLowerCase()],
        createdBy: adminUserId,
        createdAt: now,
        updatedAt: now,
      });

      projIdx++;
    }
  }

  console.log("  Creating project assignments...");
  const allEmployeeIds = employeeIds.slice(0);
  let assignmentCounter = 0;
  for (const proj of projectDefs) {
    const numAssignees = rng.int(3, 8);
    const shuffled = [...allEmployeeIds].sort(() => rng.next() - 0.5);
    for (let a = 0; a < Math.min(numAssignees, shuffled.length); a++) {
      const empId = shuffled[a];
      assignmentCounter++;
      await db.collection("project_assignments").insertOne({
        assignmentId: `PROD-ASN-${String(assignmentCounter).padStart(6, "0")}`,
        employeeId: empId,
        projectId: proj.projectId,
        role: rng.pick(TECH_ROLES),
        allocationPercent: rng.int(25, 100),
        billable: true,
        startDate: new Date(now.getTime() - rng.int(30, 90) * MS_PER_DAY),
        endDate: rng.int(0, 1) === 0 ? new Date(now.getTime() + rng.int(30, 180) * MS_PER_DAY) : undefined,
        status: rng.pick(["ACTIVE", "ACTIVE", "ACTIVE", "ENDED"]),
        createdBy: adminUserId,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const periodStartISO = periodStart.toISOString().slice(0, 10);
  const periodEndISO = periodEnd.toISOString().slice(0, 10);
  const periodLabel = `June 1-${periodEnd.getDate()}, ${today.getFullYear()}`;

  console.log("  Creating daily logs...");
  const dailyLogIds: string[] = [];
  let dlCounter = 0;
  for (const proj of projectDefs) {
    const numEmps = rng.int(2, 5);
    const shuffledEmps = [...allEmployeeIds].sort(() => rng.next() - 0.5).slice(0, numEmps);

    for (const empId of shuffledEmps) {
      const empInfo = employeesWithRates.find((e) => e.employeeId === empId)!;
      const numDays = rng.int(8, 12);
      const startDayOffset = rng.int(15, 25);

      for (let d = 0; d < numDays; d++) {
        const workDate = new Date(today.getTime() - (startDayOffset - d) * MS_PER_DAY);
        if (workDate.getDay() === 0) continue;

        dlCounter++;
        const dlId = `PROD-DL-${String(dlCounter).padStart(5, "0")}`;
        dailyLogIds.push(dlId);

        const regularHours = rng.int(6, 8);
        const overtimeHours = rng.next() < 0.3 ? rng.int(1, 4) : 0;
        const totalHours = regularHours + overtimeHours;
        const billable = true;

        await db.collection("daily_logs").insertOne({
          dailyLogId: dlId,
          employeeId: empId,
          employeeName: `${empInfo.designation} ${empId}`,
          projectId: proj.projectId,
          projectName: proj.projectId,
          workDate,
          workDateStr: workDate.toISOString().slice(0, 10),
          dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][workDate.getDay()],
          taskCategory: rng.pick(TASK_CATEGORIES),
          description: `Development work for ${proj.projectId} — day ${d + 1}`,
          regularHours,
          overtimeHours,
          totalHours,
          billable,
          billingType: "BILLABLE",
          status: "LOCKED",
          timesheetId: `PROD-TS-${String(rng.int(1, 40)).padStart(4, "0")}`,
          reviewedBy: "user_manager",
          reviewedAt: now,
          tags: ["seed"],
          createdBy: mgrUserId,
          createdAt: workDate,
          updatedAt: workDate,
        });
      }
    }
  }

  console.log("  Creating timesheets...");
  const timesheetIds: string[] = [];
  const timesheetByClient: Record<string, string[]> = {};

  for (let i = 1; i <= 40; i++) {
    const empInfo = employeesWithRates[(i - 1) % employeesWithRates.length];
    const empId = empInfo.employeeId;
    const proj = projectDefs[(i - 1) % projectDefs.length];
    const tsId = `PROD-TS-${String(i).padStart(4, "0")}`;
    timesheetIds.push(tsId);

    if (!timesheetByClient[proj.clientId]) timesheetByClient[proj.clientId] = [];
    timesheetByClient[proj.clientId].push(tsId);

    const totalHours = rng.int(30, 60);
    const billableHours = Math.floor(totalHours * 0.9);
    const regularHours = totalHours - billableHours;
    const billableAmount = Number((billableHours * (empInfo.rate / 21 / 8)).toFixed(2));

    await db.collection("timesheets").insertOne({
      timesheetId: tsId,
      employeeId: empId,
      employeeName: `${empInfo.designation} ${empId}`,
      periodStart: periodStartISO,
      periodEnd: periodEndISO,
      periodLabel,
      billingPeriod: today.getMonth() + 1,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      totalDays: rng.int(10, 15),
      totalRegularHours: regularHours,
      totalOvertimeHours: rng.int(0, 4),
      totalBillableHours: billableHours,
      totalNonBillableHours: regularHours,
      totalHours,
      billableAmount: Number(billableAmount.toFixed(2)),
      currency: "USD",
      status: rng.pick(["DRAFT", "SUBMITTED", "APPROVED", "APPROVED", "APPROVED", "REVISED", "PAID"]),
      submittedAt: now,
      submittedBy: empId,
      reviewedBy: supUserId,
      reviewedAt: now,
      approvedAt: now,
      paidAt: rng.next() < 0.3 ? now : undefined,
      dailyLogIds: dailyLogIds.slice(0, 10),
      projectBreakdown: [
        {
          projectId: proj.projectId,
          projectName: proj.projectId,
          employeeBillRate: Number((empInfo.rate / 21 / 8).toFixed(2)),
          billableHours: billableHours,
          billableAmount: Number(billableAmount.toFixed(2)),
        },
      ],
      createdBy: mgrUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const [clientId, tsIds] of Object.entries(timesheetByClient)) {
    const client = clients.find((c) => c.clientId === clientId)!;
    console.log(`    Client ${client.name}: ${tsIds.length} timesheets`);
  }

  console.log("  Creating invoices...");
  let invoiceCounter = 0;
  for (const client of clients) {
    if (client.status === "CLOSED") continue;

    const clientTsIds = timesheetByClient[client.clientId] || [];
    if (clientTsIds.length === 0) continue;

    const numInvoices = rng.int(2, 4);
    const clientProjects = projectDefs.filter((p) => p.clientId === client.clientId);

    for (let i = 0; i < numInvoices && i < clientTsIds.length; i++) {
      invoiceCounter++;
      const invId = `PROD-INV-${String(invoiceCounter).padStart(3, "0")}`;
      const invNum = `INV-PROD-${String(invoiceCounter).padStart(5, "0")}`;

      const numLines = rng.int(1, Math.min(4, clientProjects.length));
      const selectedProjects = clientProjects.slice(0, numLines);

      const lineItems = selectedProjects.map((proj, li) => {
        const empInfo = employeesWithRates[li % employeesWithRates.length];
        const rate = rng.pick([empInfo.rate, empInfo.rate, empInfo.rate * 0.8, empInfo.rate * 1.2]);
        const desc = `${geographyOf(empInfo.country)} ${empInfo.techRole}`;
        return {
          id: `LI-${invId}-${li}`,
          description: desc,
          quantity: rng.int(1, 3),
          rate: Number(rate.toFixed(2)),
          amount: Number((rate * rng.int(1, 3)).toFixed(2)),
          currency: "USD",
          employeeId: empInfo.employeeId,
          employeeName: empInfo.designation,
          projectId: proj.projectId,
          projectName: proj.projectId,
          manual: false,
          sortOrder: li,
        };
      });

      const subtotal = Number(lineItems.reduce((s, li) => s + li.amount, 0).toFixed(2));
      const taxRate = 0;
      const taxAmount = Number((subtotal * taxRate).toFixed(2));
      const totalAmount = Number((subtotal + taxAmount).toFixed(2));

      const [statusEntry] = INVOICE_STATUSES_WITH_RATE.filter(([s]) => s !== "VOID" && s !== "CANCELLED");
      const status = statusEntry[0] as "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "PARTIAL";

      const issueDate = new Date(now.getTime() - rng.int(5, 60) * MS_PER_DAY);
      const dueDate = new Date(issueDate.getTime() + 30 * MS_PER_DAY);
      const amountPaid = status === "PAID" ? totalAmount : status === "PARTIAL" ? Number((totalAmount / 2).toFixed(2)) : 0;
      const balanceDue = Number((totalAmount - amountPaid).toFixed(2));

      const tsCount = rng.int(1, Math.min(5, clientTsIds.length));
      const selectedTsIds = clientTsIds.slice(i * tsCount, (i + 1) * tsCount);

      await db.collection("invoices").insertOne({
        invoiceId: invId,
        invoiceNumber: invNum,
        clientId: client.clientId,
        clientName: client.name,
        clientCode: client.code,
        clientAddress: client.billingAddress,
        poNumber: `PO-${String(100000 + invoiceCounter).slice(-6)}`,
        subject: "Professional Services — Development & Consulting",
        periodStart: periodStartISO,
        periodEnd: periodEndISO,
        periodLabel,
        issueDate: issueDate.toISOString().slice(0, 10),
        dueDate: dueDate.toISOString().slice(0, 10),
        currency: "USD",
        paymentTerms: client.paymentTerms,
        taxRate,
        taxAmount,
        subtotal,
        totalAmount,
        amountPaid,
        balanceDue,
        status,
        lineItems,
        timesheetIds: selectedTsIds,
        notes: `Auto-generated from ${tsCount} approved timesheets.`,
        termsAndConditions: "Payment due within 30 days of invoice date.",
        templateId: templateIds[0],
        sentAt: status !== "DRAFT" ? issueDate : undefined,
        sentBy: status !== "DRAFT" ? mgrUserId : undefined,
        paidAt: status === "PAID" ? dueDate : undefined,
        createdBy: mgrUserId,
        createdAt: issueDate,
        updatedAt: issueDate,
      });
    }

    const draftInvoiceId = `PROD-INV-DRAFT-${client.clientId}`;
    const draftLineItems = clientProjects.slice(0, 2).map((proj, li) => {
      const empInfo = employeesWithRates[li % employeesWithRates.length];
      const rate = empInfo.rate;
      return {
        id: `LI-${draftInvoiceId}-${li}`,
        description: `${geographyOf(empInfo.country)} ${empInfo.techRole}`,
        quantity: 1,
        rate: Number(rate.toFixed(2)),
        amount: Number(rate.toFixed(2)),
        currency: "USD",
        employeeId: empInfo.employeeId,
        employeeName: empInfo.designation,
        projectId: proj.projectId,
        projectName: proj.projectId,
        manual: false,
        sortOrder: li,
      };
    });

    const draftSubtotal = Number(draftLineItems.reduce((s, li) => s + li.amount, 0).toFixed(2));
    await db.collection("invoices").insertOne({
      invoiceId: draftInvoiceId,
      invoiceNumber: `INV-DRAFT-${client.code}`,
      clientId: client.clientId,
      clientName: client.name,
      clientCode: client.code,
      clientAddress: client.billingAddress,
      poNumber: `PO-DRAFT-${String(100000 + invoiceCounter).slice(-6)}`,
      subject: "Draft Invoice — Pending Timesheet Review",
      periodStart: periodStartISO,
      periodEnd: periodEndISO,
      periodLabel,
      issueDate: now.toISOString().slice(0, 10),
      dueDate: new Date(now.getTime() + 30 * MS_PER_DAY).toISOString().slice(0, 10),
      currency: "USD",
      paymentTerms: client.paymentTerms,
      taxRate: 0,
      taxAmount: 0,
      subtotal: draftSubtotal,
      totalAmount: draftSubtotal,
      amountPaid: 0,
      balanceDue: draftSubtotal,
      status: "DRAFT",
      lineItems: draftLineItems,
      timesheetIds: clientTsIds.slice(0, 3),
      notes: "Draft — ready for review/auto-populate.",
      templateId: templateIds[0],
      createdBy: mgrUserId,
      createdAt: now,
      updatedAt: now,
    });
    invoiceCounter++;
  }

  console.log("  Creating audit logs...");
  const auditActions = [
    "invoice.created", "invoice.updated", "invoice.sent", "invoice.paid",
    "timesheet.approved", "timesheet.submitted", "timesheet.paid",
    "daily_log.created", "daily_log.locked",
    "client.updated", "project.updated", "assignment.created",
    "user.login", "user.logout",
  ];
  const auditEntityTypes = ["invoice", "timesheet", "daily_log", "client", "project", "assignment", "user"];

  const auditDocs: Document[] = [];
  for (let i = 0; i < 300; i++) {
    auditDocs.push({
      auditId: `PROD-AUDIT-${String(i + 1).padStart(4, "0")}`,
      actorUserId: rng.pick([adminUserId, mgrUserId, supUserId, empUserId]),
      actorRole: rng.pick(["ADMIN", "MANAGER", "SUPERVISOR", "EMPLOYEE"]),
      action: rng.pick(auditActions),
      entityType: rng.pick(auditEntityTypes),
      entityId: `PROD-INV-${String(rng.int(1, invoiceCounter)).padStart(3, "0")}`,
      before: { status: "DRAFT" },
      after: { status: rng.pick(["DRAFT", "SENT", "PAID", "OVERDUE", "PARTIAL"]) },
      ipAddress: `192.168.1.${rng.int(1, 254)}`,
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) ProductionSeed/1.0",
      createdAt: new Date(now.getTime() - rng.int(0, 90) * MS_PER_DAY),
      updatedAt: new Date(now.getTime() - rng.int(0, 90) * MS_PER_DAY),
    });
  }
  await db.collection("audit_logs").insertMany(auditDocs);

  console.log("  Creating notifications...");
  const notificationDocs: Document[] = [];
  const notificationTitles = ["Invoice Sent", "Timesheet Approved", "Daily Log Locked", "Project Update", "Payment Received", "System Maintenance", "Invoice Overdue"];
  const notificationTypes = ["INVOICE", "TIMESHEET", "PROJECT", "SYSTEM"] as const;

  for (let i = 0; i < 50; i++) {
    notificationDocs.push({
      notificationId: `PROD-NOTIF-${String(i + 1).padStart(4, "0")}`,
      userId: rng.pick([adminUserId, mgrUserId, supUserId, empUserId]),
      type: rng.pick(notificationTypes),
      title: rng.pick(notificationTitles),
      message: `Notification #${i + 1}: Action required on your timesheet or invoice.`,
      read: rng.next() < 0.6,
      link: ["/invoices", "/timesheets", "/projects", "/dashboard"][i % 4],
      readAt: rng.next() < 0.6 ? now : undefined,
      createdAt: new Date(now.getTime() - rng.int(0, 30) * MS_PER_DAY),
      updatedAt: new Date(now.getTime() - rng.int(0, 30) * MS_PER_DAY),
    });
  }
  await db.collection("notifications").insertMany(notificationDocs);

  console.log("\n✅ Seed complete!");
  console.log(`   Users:         4`);
  console.log(`   Templates:     3`);
  console.log(`   Employees:     ${numEmployees}`);
  console.log(`   Clients:       ${clients.length}`);
  console.log(`   Projects:      ${projectDefs.length}`);
  console.log(`   Daily Logs:    ${dailyLogIds.length}`);
  console.log(`   Timesheets:    ${timesheetIds.length}`);
  console.log(`   Invoices:      ${invoiceCounter}`);
  console.log(`   Audit Logs:    ${auditDocs.length}`);
  console.log(`   Notifications: ${notificationDocs.length}`);
  console.log(`   Database: ${process.env.MONGODB_DATABASE ?? "N/A"}`);

  await closeDatabase();
}

function geographyOf(country: string): string {
  if (country === "India") return "India-Based";
  if (country === "United States") return "US Based";
  return "EU Based";
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
