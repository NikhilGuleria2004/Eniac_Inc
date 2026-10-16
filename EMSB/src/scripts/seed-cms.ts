import "dotenv/config";
import { connectDatabase, getDb, closeDatabase } from "../config/database.js";
import { initializeIndexes } from "../config/init-db.js";
import type { Document } from "mongodb";

// Deterministic PRNG so CMS seed ids/values are stable across runs (CMSB.md §64:
// "no Math.random"). Idempotent — upserts only, never deletes EMS data.
function createLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = createLcg(0x43425346);
function randInt(min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

async function upsert(collection: ReturnType<ReturnType<typeof getDb>["collection"]>, filter: Record<string, unknown>, doc: Record<string, unknown>): Promise<void> {
  await collection.updateOne(filter as Document, { $set: { ...filter, ...doc } }, { upsert: true });
}

const CLIENT_TIERS = ["ENTERPRISE", "MID_MARKET", "SMB", "PROSPECT"] as const;
const CLIENT_STATUSES = ["PROSPECT", "ACTIVE", "INACTIVE", "SUSPENDED", "CLOSED"] as const;
const PAYMENT_TERMS = ["NET_15", "NET_30", "NET_45", "NET_60", "CUSTOM", "DUE_ON_RECEIPT"] as const;
const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
const PROJECT_HEALTH = ["ON_TRACK", "AT_RISK", "DELAYED"] as const;
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
  "Solution Architect"
] as const;
const TASK_CATEGORIES = ["DEVELOPMENT", "TESTING", "REVIEW", "MEETING", "DESIGN", "OTHER"] as const;
const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID", "CANCELLED", "PARTIAL"] as const;
const TIMESHEET_STATUSES = ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "REVISED", "PAID"] as const;

const CLIENT_NAMES = [
  "Acme Corp", "GlobalTech", "Innovation Labs", "NextGen Systems", "Fusion Dynamics",
  "Vertex Solutions", "Summit Partners", "Pinnacle Group", "Quantum Edge", "Apex Industries",
  "Zenith Digital", "Meridian Health"
];
const CLIENT_INDUSTRIES = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail", "Consulting"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function seed(): Promise<void> {
  await connectDatabase();
  await initializeIndexes();
  const db = getDb();
  const now = new Date();

  const seedClientIds: string[] = [];
  const seedProjectIds: string[] = [];
  const seedTsIds: string[] = [];
  const seedEmployeeIds: string[] = [];

  console.log("Seeding CMS data (idempotent)...");

  // ===== 1. INVOICE TEMPLATES =====
  for (let i = 1; i <= 5; i++) {
    await upsert(db.collection("invoice_templates"), { invoiceTemplateId: `TPL-${i}` }, {
      name: `Template ${i}`,
      primaryColor: "#0F2B1D",
      isDefault: i === 1,
      termsAndConditions: "Net 30 payment terms",
      paymentInstructions: "Bank transfer",
      taxSettings: { defaultRate: 0, label: "Tax" },
      createdBy: "SYSTEM",
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log("  Invoiced 5 templates");

  // ===== 2. SEED CLIENTS (unique per seed run) =====
  for (let i = 0; i < CLIENT_NAMES.length; i++) {
    const clientId = `SEED-CLIENT-${String(i + 1).padStart(3, "0")}`;
    seedClientIds.push(clientId);
    await upsert(db.collection("clients"), { clientId }, {
      name: CLIENT_NAMES[i],
      code: `SEED${String(i + 1).padStart(3, "0")}`,
      country: pick(["India", "USA", "UK", "Germany", "France"]),
      status: pick(CLIENT_STATUSES),
      industry: pick(CLIENT_INDUSTRIES),
      clientTier: pick(CLIENT_TIERS),
      paymentTerms: pick(PAYMENT_TERMS),
      primaryContact: {
        name: `${pick(["John", "Priya", "Alex"])} ${pick(["Doe", "Sharma", "Kumar"])}`,
        email: `contact${i + 1}@example.com`,
        phone: `+91-98765-432${randInt(10, 99)}`,
        role: "Project Manager",
      },
      billingAddress: {
        line1: `${randInt(100, 999)} Street ${randInt(1, 99)}`,
        city: pick(["Bangalore", "Mumbai", "Pune", "Chennai"]),
        state: "KA",
        postalCode: String(randInt(560000, 599999)),
        country: "India",
      },
      contacts: [
        {
          id: `CON-${i + 1}`,
          name: "Primary Contact",
          email: `contact${i + 1}@example.com`,
          phone: `+91-98765-43210`,
          role: "Contact",
          isPrimary: true,
        },
      ],
      taxId: taxIdFor(i),
      activeProjectCount: 0,
      createdBy: "SYSTEM",
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`  Seeded ${seedClientIds.length} clients`);

  // ===== 3. SEED PROJECTS (unique per seed run) =====
  for (let i = 0; i < 24; i++) {
    const clientId = seedClientIds[i % seedClientIds.length];
    const projectId = `SEED-PRJ-${String(i + 1).padStart(3, "0")}`;
    seedProjectIds.push(projectId);
    await upsert(db.collection("projects"), { projectId }, {
      name: `Project ${["Alpha", "Beta", "Gamma", "Delta", "Epsilon"][(i % 5)]} ${randInt(10, 99)}`,
      code: `SEEDPRJ${String(i + 1).padStart(3, "0")}`,
      clientId,
      clientName: CLIENT_NAMES[i % CLIENT_NAMES.length],
      description: "CMS seed project for analytics testing.",
      status: pick(PROJECT_STATUSES),
      health: pick(PROJECT_HEALTH),
      startDate: new Date(now.getTime() - 90 * MS_PER_DAY),
      endDate: new Date(now.getTime() + 90 * MS_PER_DAY),
      managerId: seedEmployeeIds.length ? seedEmployeeIds[0] : "SYSTEM",
      progressPercent: randInt(0, 100),
      supervisorId: seedEmployeeIds.length > 1 ? seedEmployeeIds[1] : "SYSTEM",
      budget: randInt(50000, 250000),
      budgetCurrency: "USD",
      teamSize: 0,
      billable: true,
      tags: ["seed"],
      visibility: pick(["INTERNAL", "CLIENT_VISIBLE"]),
      createdBy: "SYSTEM",
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`  Seeded ${seedProjectIds.length} projects`);

  // ===== 4. ENSURE EMPLOYEES (minimal support) =====
  for (let i = 1; i <= 8; i++) {
    const employeeId = `SEED-EMP-${String(i).padStart(3, "0")}`;
    seedEmployeeIds.push(employeeId);
    await upsert(db.collection("employees"), { employeeId }, {
      employeeId,
      firstName: pick(["John", "Doe", "Sarah", "Mike", "Priya", "Alex", "Sam"]),
      lastName: pick(["Smith", "Doe", "Johnson", "Kumar", "Patel"]),
      email: `employee.seed${i}@example.com`,
      phone: `+1-555-${randInt(1000, 9999)}`,
      designation: pick(TECH_ROLES),
      department: "Engineering",
      country: pick(["INDIA", "USA"]),
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      employmentType: "FULL_TIME",
      techRole: pick(TECH_ROLES),
      timesheetEligibility: { eligible: true },
      joiningDate: now,
      createdBy: "SYSTEM",
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`  Ensured ${seedEmployeeIds.length} support employees`);

  // ===== 5. PROJECT ASSIGNMENTS =====
  for (let i = 0; i < 50; i++) {
    const projectId = seedProjectIds[i % seedProjectIds.length];
    const employeeId = seedEmployeeIds[i % seedEmployeeIds.length];
    await upsert(db.collection("project_assignments"), { assignmentId: `SEED-ASN-${String(i + 1).padStart(3, "0")}` }, {
      employeeId,
      projectId,
      role: pick(TECH_ROLES),
      billable: true,
      status: "ACTIVE",
      allocationPercent: randInt(25, 100),
      startDate: new Date(now.getTime() - 60 * MS_PER_DAY),
      createdBy: "SYSTEM",
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log("  Seeded 50 assignments");

  // ===== 6. DAILY LOGS =====
  for (let i = 1; i <= 80; i++) {
    const employeeId = seedEmployeeIds[randInt(0, seedEmployeeIds.length - 1)];
    const projectId = seedProjectIds[randInt(0, seedProjectIds.length - 1)];
    const workDate = new Date(now.getTime() - randInt(0, 45) * MS_PER_DAY);
    const billable = rng() < 0.9;
    const overtimeHours = randInt(0, 4);
    await upsert(db.collection("daily_logs"), { dailyLogId: `SEED-DL-${String(i).padStart(4, "0")}` }, {
      employeeId,
      employeeName: `Employee ${randInt(10, 99)}`,
      projectId,
      projectName: `Project ${["Alpha", "Beta", "Gamma", "Delta", "Epsilon"][randInt(0, 4)]}`,
      workDate,
      dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][workDate.getDay()],
      taskCategory: pick(TASK_CATEGORIES),
      description: `Seeded work item ${i}`,
      regularHours: randInt(4, 8),
      overtimeHours,
      totalHours: randInt(4, 8) + overtimeHours,
      billable,
      billingType: billable ? "BILLABLE" : "NON_BILLABLE",
      status: pick(["DRAFT", "SUBMITTED", "SUBMITTED", "LOCKED"]),
      createdBy: "SYSTEM",
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log("  Seeded 80 daily logs");

  // ===== 7. TIMESHEETS =====
  for (let i = 1; i <= 40; i++) {
    const employeeId = seedEmployeeIds[i % seedEmployeeIds.length];
    const projectId = seedProjectIds[i % seedProjectIds.length];
    const tsId = `SEED-TS-${String(i).padStart(4, "0")}`;
    seedTsIds.push(tsId);
    const total = randInt(40, 90);
    const billableHours = Math.floor(total * 0.9);
    await upsert(db.collection("timesheets"), { timesheetId: tsId }, {
      employeeId,
      employeeName: `Employee ${randInt(10, 99)}`,
      periodStart: "2026-02-01",
      periodEnd: "2026-02-16",
      periodLabel: "Feb 1-15, 2026",
      billingPeriod: 1,
      year: 2026,
      month: 2,
      totalDays: randInt(8, 14),
      totalRegularHours: total - randInt(0, total / 4),
      totalOvertimeHours: randInt(0, 8),
      totalBillableHours: billableHours,
      totalNonBillableHours: total - billableHours,
      totalHours: total,
      billableAmount: billableHours * 50,
      currency: "USD",
      status: pick(TIMESHEET_STATUSES),
      dailyLogIds: [],
      projectBreakdown: [
        {
          projectId,
          projectName: `Project ${["Alpha", "Beta", "Gamma", "Delta", "Epsilon"][randInt(0, 4)]}`,
          employeeBillRate: 50,
          billableHours,
          billableAmount: billableHours * 50,
        },
      ],
      createdBy: "SYSTEM",
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log("  Seeded 40 timesheets");

  // ===== 8. INVOICES =====
  for (let i = 1; i <= 25; i++) {
    const clientId = seedClientIds[i % seedClientIds.length];
    const rate = pick([23400, 20584, 6240, 13996]);
    const lineItems = Array.from({ length: randInt(2, 4) }, (_, j) => ({
      id: `SEED-LI-${i}-${j}`,
      description: pick([
        "US Based AEM Developer",
        "EU Based Web Developer",
        "India-Based AEM Developer",
        "India-Based 24/7 Offshore Dev-ops personnel"
      ]),
      quantity: 1,
      rate,
      amount: rate,
      manual: true,
      sortOrder: j,
    }));
    const subtotal = lineItems.reduce((s, l) => s + l.amount, 0);
    const taxRate = 0;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    const status = pick(INVOICE_STATUSES);
    const issueDate = new Date(now.getTime() - randInt(1, 90) * MS_PER_DAY);
    const dueDate = new Date(issueDate.getTime() + 30 * MS_PER_DAY);
    const amountPaid = status === "PAID" ? totalAmount : status === "PARTIAL" ? totalAmount / 2 : 0;
    await upsert(db.collection("invoices"), { invoiceId: `SEED-INV-${String(i).padStart(3, "0")}` }, {
      invoiceId: `SEED-INV-${String(i).padStart(3, "0")}`,
      invoiceNumber: `INV-SEED-${String(i).padStart(3, "0")}`,
      clientId,
      clientName: CLIENT_NAMES[i % CLIENT_NAMES.length],
      clientCode: `SEED${String(i % seedClientIds.length + 1).padStart(3, "0")}`,
      clientAddress: {
        line1: `${randInt(100, 999)} Street`,
        city: pick(["Bangalore", "Chennai", "Mumbai"]),
        state: "KA",
        postalCode: String(randInt(560000, 599999)),
        country: "India",
      },
      poNumber: String(randInt(100000, 999999)),
      subject: "Professional Consulting",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-15",
      periodLabel: "Feb 1-15, 2026",
      issueDate,
      dueDate,
      currency: "USD",
      paymentTerms: pick(PAYMENT_TERMS),
      taxRate,
      taxAmount,
      subtotal,
      totalAmount,
      amountPaid,
      balanceDue: totalAmount - amountPaid,
      status,
      lineItems,
      timesheetIds: [],
      notes: "Seeded analytics invoice.",
      createdBy: "SYSTEM",
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log("  Seeded 25 invoices");

  console.log("\n✅ CMS seed complete! Database:", process.env.MONGODB_DATABASE ?? "eniac_ems_test");
  await closeDatabase();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

function taxIdFor(i: number): string {
  return `TAX-${String(i + 1).padStart(3, "0")}`;
}
