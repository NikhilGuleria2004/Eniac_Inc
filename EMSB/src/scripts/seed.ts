import "dotenv/config";
import { connectDatabase, getDb, closeDatabase } from "../config/database.js";
import { hashPassword } from "../utils/auth/jwt.js";
import { initializeIndexes } from "../config/init-db.js";
import { env } from "../config/env.js";

/**
 * Dev-only password defaults, keyed by the environment variable that overrides
 * them. They are used only outside production: seeding with defaults (or with
 * missing variables) in production is refused.
 */
const DEV_DEFAULT_SEED_PASSWORDS: Record<string, string> = {
  SEED_ADMIN_PASSWORD: "Eniacinc1",
  SEED_HR_PASSWORD: "Eniacinc2",
  SEED_MANAGER_PASSWORD: "Eniacinc3",
  SEED_SUPERVISOR_PASSWORD: "Eniacinc4",
  SEED_EMPLOYEE_PASSWORD: "Eniacinc5"
};

const SEEDED_USERS = [
  { email: "superadmin@eniacinc.com", passwordVar: "SEED_ADMIN_PASSWORD", role: "ADMIN", firstName: "Superadmin", lastName: "User", employeeId: "EMP-001", userId: "user_admin" },
  { email: "hreniac@eniacinc.com", passwordVar: "SEED_HR_PASSWORD", role: "HR", firstName: "HR", lastName: "User", employeeId: "EMP-002", userId: "user_hr" },
  { email: "manager@eniacinc.com", passwordVar: "SEED_MANAGER_PASSWORD", role: "MANAGER", firstName: "Manager", lastName: "User", employeeId: "EMP-003", userId: "user_manager" },
  { email: "supervisor@eniacinc.com", passwordVar: "SEED_SUPERVISOR_PASSWORD", role: "SUPERVISOR", firstName: "Supervisor", lastName: "User", employeeId: "EMP-004", userId: "user_supervisor" },
  { email: "employee@eniacinc.com", passwordVar: "SEED_EMPLOYEE_PASSWORD", role: "EMPLOYEE", firstName: "Employee", lastName: "User", employeeId: "EMP-005", userId: "user_employee" },
];

function resolveSeedPassword(passwordVar: string): string {
  const isProduction = env.NODE_ENV === "production";
  const configured = process.env[passwordVar]?.trim();
  const devDefault = DEV_DEFAULT_SEED_PASSWORDS[passwordVar];

  if (configured) {
    if (isProduction && configured === devDefault) {
      throw new Error(
        `${passwordVar} must not use the dev default in production. Set a strong password.`
      );
    }
    return configured;
  }

  if (isProduction) {
    throw new Error(`${passwordVar} is required when seeding in production.`);
  }

  return devDefault;
}

/**
 * Seeds the 5 role accounts only. All other data (employees, clients,
 * projects, attendance, leave, documents, reviews, notifications, audit
 * logs, etc.) is created through the application itself.
 */
async function seed(): Promise<void> {
  await connectDatabase();
  await initializeIndexes();

  const db = getDb();

  // Resolve passwords up front so a misconfiguration aborts before any writes.
  const seedUsers = SEEDED_USERS.map((seededUser) => {
    const { passwordVar, ...rest } = seededUser;
    return { ...rest, password: resolveSeedPassword(passwordVar) };
  });

  // Clean existing users so a reseed cannot leave stale accounts behind.
  await db.collection("users").deleteMany({});

  // Seeded users (5 roles)
  for (const seedUser of seedUsers) {
    const hashedPassword = await hashPassword(seedUser.password);
    await db.collection("users").insertOne({
      email: seedUser.email,
      firstName: seedUser.firstName,
      lastName: seedUser.lastName,
      role: seedUser.role,
      hashedPassword,
      status: "ACTIVE",
      employeeId: seedUser.employeeId,
      userId: seedUser.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`  Created user: ${seedUser.email} (${seedUser.role})`);
  }

  console.log("\nSeeding complete! (users only)");
  await closeDatabase();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
