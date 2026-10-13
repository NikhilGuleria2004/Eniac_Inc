import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { initializeIndexes } from "../src/config/init-db.js";
import { hashPassword } from "../src/utils/auth/jwt.js";
import { UserRepository } from "../src/repositories/user.repository.js";
import { EmployeeRepository } from "../src/repositories/employee.repository.js";
import { ClientRepository } from "../src/repositories/client.repository.js";
import { ProjectRepository } from "../src/repositories/project.repository.js";

describe("Database Foundation", () => {
  beforeAll(async () => {
    await connectDatabase();
    await initializeIndexes();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Indexes", () => {
    it("users collection has email unique index", async () => {
      const db = getDb();
      const indexes = await db.collection("users").listIndexes().toArray();
      const emailIndex = indexes.find((i) => i.key.email);
      expect(emailIndex).toBeDefined();
      expect(emailIndex.unique).toBe(true);
    });

    it("users collection has userId unique index", async () => {
      const db = getDb();
      const indexes = await db.collection("users").listIndexes().toArray();
      const userIdIndex = indexes.find((i) => i.key.userId);
      expect(userIdIndex).toBeDefined();
    });

    it("employees collection has employeeId unique index", async () => {
      const db = getDb();
      const indexes = await db.collection("employees").listIndexes().toArray();
      const empIndex = indexes.find((i) => i.key.employeeId);
      expect(empIndex).toBeDefined();
      expect(empIndex.unique).toBe(true);
    });

    it("employees collection has email unique index", async () => {
      const db = getDb();
      const indexes = await db.collection("employees").listIndexes().toArray();
      const emailIndex = indexes.find((i) => i.key.email);
      expect(emailIndex).toBeDefined();
      expect(emailIndex.unique).toBe(true);
    });

    it("projects collection has clientId index", async () => {
      const db = getDb();
      const indexes = await db.collection("projects").listIndexes().toArray();
      const clientIdIndex = indexes.find((i) => i.key.clientId);
      expect(clientIdIndex).toBeDefined();
    });

    it("audit_logs collection has entityType+entityId compound index", async () => {
      const db = getDb();
      const indexes = await db.collection("audit_logs").listIndexes().toArray();
      const compoundIndex = indexes.find((i) => i.key.entityType && i.key.entityId);
      expect(compoundIndex).toBeDefined();
    });

    it("attendance_records has employeeId+date compound index", async () => {
      const db = getDb();
      const indexes = await db.collection("attendance_records").listIndexes().toArray();
      const compoundIndex = indexes.find((i) => i.key.employeeId && i.key.date);
      expect(compoundIndex).toBeDefined();
    });
  });

  describe("UserRepository", () => {
    const repo = new UserRepository();

    it("creates and retrieves user by email", async () => {
      const db = getDb();
      await db.collection("users").deleteMany({ email: "test.user@eniac.com" });

      const hashedPassword = await hashPassword("password123");
      const user = await repo.create({
        userId: "test_user_1",
        email: "test.user@eniac.com",
        firstName: "Test",
        lastName: "User",
        role: "EMPLOYEE",
        hashedPassword,
        status: "ACTIVE",
        employeeId: "EMP-999",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(user.userId).toBe("test_user_1");
      expect(user.email).toBe("test.user@eniac.com");

      const found = await repo.findByEmail("test.user@eniac.com");
      expect(found).not.toBeNull();
      expect(found?.email).toBe("test.user@eniac.com");
    });

    it("finds user by userId", async () => {
      const found = await repo.findByUserId("test_user_1");
      expect(found).not.toBeNull();
      expect(found?.userId).toBe("test_user_1");
    });
  });

  describe("EmployeeRepository", () => {
    const repo = new EmployeeRepository();

    it("creates and retrieves employee by employeeId", async () => {
      const db = getDb();
      await db.collection("employees").deleteMany({ employeeId: "EMP-TEST" });

      const employee = await repo.create({
        employeeId: "EMP-TEST",
        firstName: "Test",
        lastName: "Employee",
        email: "test.employee@eniac.com",
        designation: "Engineer",
        department: "Engineering",
        country: "INDIA",
        employmentStatus: "ONBOARDING",
        billingStatus: "BILLABLE",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(employee.employeeId).toBe("EMP-TEST");

      const found = await repo.findById("EMP-TEST");
      expect(found).not.toBeNull();
      expect(found?.firstName).toBe("Test");
    });

    it("finds many employees with pagination", async () => {
      const { employees, total } = await repo.findMany({ page: 1, pageSize: 10 });

      expect(employees.length).toBeLessThanOrEqual(10);
      expect(total).toBeGreaterThan(0);
    });

    it("finds many employees with search", async () => {
      const { employees } = await repo.findMany({ search: "Test" });

      expect(employees.length).toBeGreaterThan(0);
    });

    it("updates employee", async () => {
      const updated = await repo.update("EMP-TEST", { department: "Product" });

      expect(updated).not.toBeNull();
      expect(updated?.department).toBe("Product");
    });

    it("deletes employee", async () => {
      await repo.delete("EMP-TEST");

      const found = await repo.findById("EMP-TEST");
      expect(found).toBeNull();
    });
  });

  describe("ClientRepository", () => {
    const repo = new ClientRepository();

    it("creates and retrieves client by clientId", async () => {
      const db = getDb();
      await db.collection("clients").deleteMany({ clientId: "CLT-TEST" });

      const client = await repo.create({
        clientId: "CLT-TEST",
        name: "Test Client",
        code: "TEST001",
        status: "ACTIVE",
        createdBy: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(client.clientId).toBe("CLT-TEST");

      const found = await repo.findById("CLT-TEST");
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Test Client");
    });

    it("finds client by code", async () => {
      const found = await repo.findByCode("TEST001");
      expect(found).not.toBeNull();
      expect(found?.code).toBe("TEST001");
    });

    it("updates client", async () => {
      const updated = await repo.update("CLT-TEST", { name: "Updated Client" });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe("Updated Client");
    });

    it("deactivates client", async () => {
      const deactivated = await repo.deactivate("CLT-TEST");

      expect(deactivated).not.toBeNull();
      expect(deactivated?.status).toBe("INACTIVE");
    });
  });

  describe("ProjectRepository", () => {
    const repo = new ProjectRepository();

    it("creates and retrieves project by projectId", async () => {
      const db = getDb();
      await db.collection("projects").deleteMany({ projectId: "PRO-TEST" });

      const project = await repo.create({
        projectId: "PRO-TEST",
        clientId: "CLT-TEST",
        name: "Test Project",
        code: "PROJ001",
        status: "PLANNING",
        health: "ON_TRACK",
        createdBy: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(project.projectId).toBe("PRO-TEST");

      const found = await repo.findById("PRO-TEST");
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Test Project");
    });

    it("sets project status", async () => {
      const updated = await repo.setStatus("PRO-TEST", "ACTIVE");

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("ACTIVE");
    });
  });
});
