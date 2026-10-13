import { getDb } from "./database.js";

export async function initializeIndexes(): Promise<void> {
  const db = getDb();

  // Users collection
  await db.collection("users").createIndexes([
    { key: { email: 1 }, unique: true, background: true },
    { key: { userId: 1 }, unique: true, background: true }
  ]);

  // Employees collection
  await db.collection("employees").createIndexes([
    { key: { employeeId: 1 }, unique: true, background: true },
    { key: { email: 1 }, unique: true, sparse: true, background: true },
    { key: { employmentStatus: 1 }, background: true },
    { key: { billingStatus: 1 }, background: true },
    { key: { department: 1 }, background: true },
    { key: { managerId: 1 }, background: true },
    { key: { country: 1 }, background: true }
  ]);

  // Clients collection
  await db.collection("clients").createIndexes([
    { key: { clientId: 1 }, unique: true, background: true },
    { key: { code: 1 }, unique: true, sparse: true, background: true },
    { key: { status: 1 }, background: true }
  ]);

  // Projects collection
  await db.collection("projects").createIndexes([
    { key: { projectId: 1 }, unique: true, background: true },
    { key: { code: 1 }, unique: true, sparse: true, background: true },
    { key: { clientId: 1 }, background: true },
    { key: { status: 1 }, background: true },
    { key: { managerId: 1 }, background: true }
  ]);

  // Documents collection
  await db.collection("documents").createIndexes([
    { key: { documentId: 1 }, unique: true, background: true },
    { key: { employeeId: 1 }, background: true },
    { key: { status: 1 }, background: true },
    { key: { expiresAt: 1 }, background: true }
  ]);

  // Attendance records collection
  await db.collection("attendance_records").createIndexes([
    { key: { attendanceId: 1 }, unique: true, background: true },
    { key: { employeeId: 1, date: 1 }, unique: true, background: true },
    { key: { date: 1 }, background: true },
    { key: { status: 1 }, background: true }
  ]);

  // Leave requests collection
  await db.collection("leave_requests").createIndexes([
    { key: { requestId: 1 }, unique: true, background: true },
    { key: { employeeId: 1 }, background: true },
    { key: { status: 1 }, background: true },
    { key: { startDate: 1 }, background: true },
    { key: { endDate: 1 }, background: true }
  ]);

  // Leave balances collection
  await db.collection("leave_balances").createIndexes([
    { key: { employeeId: 1, leaveType: 1 }, unique: true, background: true }
  ]);

  // Leave types collection
  await db.collection("leave_types").createIndexes([
    { key: { typeId: 1 }, unique: true, background: true },
    { key: { code: 1 }, unique: true, background: true }
  ]);

  // Project assignments collection
  await db.collection("project_assignments").createIndexes([
    { key: { assignmentId: 1 }, unique: true, background: true },
    { key: { employeeId: 1 }, background: true },
    { key: { projectId: 1 }, background: true },
    { key: { status: 1 }, background: true }
  ]);

  // Employee reviews collection
  await db.collection("employee_reviews").createIndexes([
    { key: { reviewId: 1 }, unique: true, background: true },
    { key: { employeeId: 1 }, background: true },
    { key: { reviewerId: 1 }, background: true },
    { key: { status: 1 }, background: true }
  ]);

  // Notifications collection
  await db.collection("notifications").createIndexes([
    { key: { notificationId: 1 }, unique: true, background: true },
    { key: { userId: 1 }, background: true },
    { key: { read: 1 }, background: true },
    { key: { createdAt: 1 }, background: true }
  ]);

  // Audit logs collection
  await db.collection("audit_logs").createIndexes([
    { key: { auditId: 1 }, unique: true, background: true },
    { key: { actorUserId: 1 }, background: true },
    { key: { entityType: 1, entityId: 1 }, background: true },
    { key: { createdAt: 1 }, background: true }
  ]);

  // Attendance corrections collection
  await db.collection("attendance_corrections").createIndexes([
    { key: { correctionId: 1 }, unique: true, background: true },
    { key: { employeeId: 1 }, background: true },
    { key: { status: 1 }, background: true }
  ]);

  // Settings collection
  await db.collection("settings").createIndexes([
    { key: { key: 1 }, unique: true, background: true }
  ]);

  // Timesheet provisioning collection
  await db.collection("timesheet_provisioning").createIndexes([
    { key: { employeeId: 1 }, unique: true, background: true },
    { key: { status: 1 }, background: true }
  ]);

  // Onboarding records collection
  await db.collection("onboarding_records").createIndexes([
    { key: { employeeId: 1 }, unique: true, background: true },
    { key: { status: 1 }, background: true }
  ]);

  // Invitations collection
  await db.collection("invitations").createIndexes([
    { key: { tokenHash: 1 }, unique: true, background: true },
    { key: { employeeId: 1, status: 1 }, background: true },
    { key: { expiresAt: 1 }, background: true }
  ]);

  // Compensation history collection
  await db.collection("employee_compensation_history").createIndexes([
    { key: { historyId: 1 }, unique: true, background: true },
    { key: { employeeId: 1 }, background: true },
    { key: { effectiveFrom: 1 }, background: true }
  ]);

  // Bill rate history collection
  await db.collection("employee_bill_rate_history").createIndexes([
    { key: { historyId: 1 }, unique: true, background: true },
    { key: { employeeId: 1 }, background: true },
    { key: { effectiveFrom: 1 }, background: true }
  ]);

  // Rate limits collection — shared express-rate-limit store.
  // Unique key keeps concurrent upserts from duplicating counters; the TTL
  // index on resetAt removes expired rate-limit windows automatically.
  await db.collection("rate_limits").createIndexes([
    { key: { key: 1 }, unique: true, background: true },
    { key: { resetAt: 1 }, expireAfterSeconds: 0, background: true }
  ]);

  console.log("Database indexes initialized successfully.");
}
