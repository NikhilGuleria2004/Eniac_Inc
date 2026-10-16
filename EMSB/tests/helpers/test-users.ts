import { hashPassword } from "../../src/utils/auth/jwt.js";
import type { Collection } from "mongodb";

export interface TestUser {
  email: string;
  role: string;
  password: string;
  employeeId: string;
  userId: string;
  firstName: string;
  lastName: string;
}

export const TEST_USERS: TestUser[] = [
  { email: "superadmin@eniacinc.com", role: "ADMIN", password: "Eniacinc1", employeeId: "EMP-001", userId: "user_admin", firstName: "Superadmin", lastName: "User" },
  { email: "hreniac@eniacinc.com", role: "HR", password: "Eniacinc2", employeeId: "EMP-002", userId: "user_hr", firstName: "HR", lastName: "User" },
  { email: "manager@eniacinc.com", role: "MANAGER", password: "Eniacinc3", employeeId: "EMP-003", userId: "user_manager", firstName: "Manager", lastName: "User" },
  { email: "supervisor@eniacinc.com", role: "SUPERVISOR", password: "Eniacinc4", employeeId: "EMP-004", userId: "user_supervisor", firstName: "Supervisor", lastName: "User" },
  { email: "employee@eniacinc.com", role: "EMPLOYEE", password: "Eniacinc5", employeeId: "EMP-005", userId: "user_employee", firstName: "Employee", lastName: "User" },
];

export async function setupTestUsers(): Promise<void> {
  const { getDb } = await import("../../src/config/database.js");
  const db = getDb();
  const users: Collection = db.collection("users");

  for (const testUser of TEST_USERS) {
    const hashedPassword = await hashPassword(testUser.password);
    await users.replaceOne(
      { userId: testUser.userId },
      {
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: testUser.role,
        hashedPassword,
        status: "ACTIVE",
        employeeId: testUser.employeeId,
        userId: testUser.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { upsert: true }
    );
  }
}
