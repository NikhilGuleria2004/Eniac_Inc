import { BillingTimesheetRepository } from "../repositories/billing-timesheet.repository.js";
import { DailyLogRepository } from "../repositories/daily-log.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import type { Timesheet, ProjectBreakdown } from "../models/billing-timesheet.js";
import type { Role, TimesheetStatus } from "../config/constants.js";
import { AuthorizationError, NotFoundError, ValidationError, ConflictError, BusinessRuleError } from "../utils/errors.js";
import { toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import { emitNotification } from "../utils/notification-emitter.js";
import { runInTransaction } from "../utils/transaction.js";
import { hasPermission } from "../permissions/permissions.js";
import type {
  TimesheetListQuery,
  CompileTimesheetInput,
  CreateManualTimesheetInput
} from "../schemas/billing-timesheet.schemas.js";

const TRANSITIONS: Record<TimesheetStatus, TimesheetStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["IN_REVIEW", "APPROVED", "REJECTED"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["PAID"],
  REJECTED: ["REVISED"],
  REVISED: ["SUBMITTED"],
  PAID: []
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function periodLabelOf(start: string, end: string): string {
  const s = new Date(`${start.slice(0, 10)}T00:00:00`);
  const e = new Date(`${end.slice(0, 10)}T00:00:00`);
  const month = MONTHS[s.getMonth()];
  const year = s.getFullYear();
  return `${month} ${s.getDate()}-${e.getDate()}, ${year}`;
}

export interface TimesheetDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  billingPeriod: number;
  year: number;
  month: number;
  totalDays: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalBillableHours: number;
  totalNonBillableHours: number;
  totalHours: number;
  billableAmount: number;
  currency: string;
  status: TimesheetStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  dailyLogIds: string[];
  projectBreakdown: ProjectBreakdown[];
  createdAt: string;
  updatedAt: string;
}

export class BillingTimesheetService {
  constructor(
    private repo: BillingTimesheetRepository,
    private dailyLogRepo: DailyLogRepository,
    private employeeRepo: EmployeeRepository
  ) {}

  private async scopedProjectIds(actorRole: Role, actorEmployeeId?: string): Promise<Set<string> | null> {
    if (actorRole === "ADMIN") return null;
    if (actorRole !== "MANAGER" && actorRole !== "SUPERVISOR") return null;
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const field = actorRole === "MANAGER" ? "managerId" : "supervisorId";
    const projects = await db.collection("projects").find({ [field]: actorEmployeeId }, { projection: { projectId: 1 } }).toArray();
    return new Set(projects.map((p) => p.projectId as string));
  }

  async listTimesheets(
    filters: TimesheetListQuery,
    actorRole: Role,
    actorEmployeeId?: string
  ): Promise<{ timesheets: TimesheetDTO[]; total: number; page: number; pageSize: number }> {
    const repoFilters: Parameters<BillingTimesheetRepository["findMany"]>[0] = { ...filters };
    if (actorRole === "EMPLOYEE") {
      repoFilters.employeeId = actorEmployeeId;
      repoFilters.employeeIds = undefined;
    }
    const { timesheets, total } = await this.repo.findMany(repoFilters);

    // A timesheet is an employee-period aggregate that can span several projects,
    // so a supervisor's visibility must be intersected on projectBreakdown —
    // filtering by employee alone would expose hours on unsupervised projects.
    if (actorRole === "MANAGER" || actorRole === "SUPERVISOR") {
      const scopedProjects = await this.scopedProjectIds(actorRole, actorEmployeeId);
      if (scopedProjects) {
        const visible = timesheets.filter((t) =>
          t.projectBreakdown.some((pb) => scopedProjects.has(pb.projectId))
        );
        return {
          timesheets: visible.map((t) => this.toDTO(t)),
          total: visible.length,
          page: filters.page,
          pageSize: filters.pageSize,
        };
      }
    }

    return {
      timesheets: timesheets.map((t) => this.toDTO(t)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async listMyTimesheets(actorEmployeeId?: string) {
    const { timesheets } = await this.repo.findMany({ employeeId: actorEmployeeId });
    return timesheets.map((t) => this.toDTO(t));
  }

  async getById(timesheetId: string, actorRole: Role, actorEmployeeId?: string): Promise<TimesheetDTO> {
    const ts = await this.repo.findById(timesheetId);
    if (!ts) throw new NotFoundError("Timesheet was not found.");
    await this.assertViewScope(ts, actorRole, actorEmployeeId);
    return this.toDTO(ts);
  }

  async compileTimesheet(
    input: CompileTimesheetInput,
    actorRole: Role,
    actorEmployeeId?: string,
    actorUserId?: string
  ): Promise<TimesheetDTO> {
    if (actorRole === "EMPLOYEE") {
      if (input.employeeId && input.employeeId !== actorEmployeeId) {
        throw new AuthorizationError("You can only compile your own timesheet.");
      }
      if (!actorEmployeeId) throw new ValidationError("Employee is required.");
      input.employeeId = actorEmployeeId;
    }
    const employeeId = input.employeeId ?? actorEmployeeId;
    if (!employeeId) throw new ValidationError("Employee is required.");

    const employee = await this.employeeRepo.findByEmployeeId(employeeId);
    if (!employee) throw new NotFoundError("Employee was not found.");

    const existing = await this.repo.findByEmployeePeriod(employeeId, input.periodStart, input.periodEnd);
    if (existing) return this.toDTO(existing);

    const from = new Date(`${input.periodStart.slice(0, 10)}T00:00:00`);
    const to = new Date(`${input.periodEnd.slice(0, 10)}T00:00:00`);
    to.setHours(23, 59, 59, 999);
    const { logs } = await this.dailyLogRepo.findMany({ employeeId, from, to, status: "SUBMITTED" });
    const submitted = logs;
    if (submitted.length === 0) {
      throw new BusinessRuleError("No submitted daily logs to compile for this period.", "NO_LOGS_TO_COMPILE");
    }

    const rate = (employee.billRate?.amount as number | undefined) ?? 0;
    const breakdownMap = new Map<string, ProjectBreakdown>();
    let regular = 0;
    let overtime = 0;
    let billableHours = 0;

    for (const log of submitted) {
      regular += log.regularHours;
      overtime += log.overtimeHours;
      if (log.billable) {
        billableHours += log.totalHours;
        const existing = breakdownMap.get(log.projectId);
        if (existing) {
          existing.billableHours += log.totalHours;
          existing.billableAmount = Number((existing.billableHours * existing.employeeBillRate).toFixed(2));
        } else {
          breakdownMap.set(log.projectId, {
            projectId: log.projectId,
            projectName: log.projectName,
            employeeBillRate: rate,
            billableHours: log.totalHours,
            billableAmount: Number((log.totalHours * rate).toFixed(2))
          });
        }
      }
    }

    const breakdown = Array.from(breakdownMap.values());
    const billableAmount = Number(breakdown.reduce((s, b) => s + b.billableAmount, 0).toFixed(2));
    const timesheetId = await this.repo.generateId();

    const timesheet: Omit<Timesheet, "_id"> = {
      timesheetId,
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      periodStart: input.periodStart.slice(0, 10),
      periodEnd: input.periodEnd.slice(0, 10),
      periodLabel: periodLabelOf(input.periodStart, input.periodEnd),
      billingPeriod: Number(input.periodStart.slice(8, 10)) <= 15 ? 1 : 2,
      year: Number(input.periodStart.slice(0, 4)),
      month: Number(input.periodStart.slice(5, 7)),
      totalDays: submitted.length,
      totalRegularHours: regular,
      totalOvertimeHours: overtime,
      totalBillableHours: billableHours,
      totalNonBillableHours: regular + overtime - billableHours,
      totalHours: regular + overtime,
      billableAmount,
      currency: "USD",
      status: "DRAFT",
      dailyLogIds: submitted.map((l) => l.dailyLogId),
      projectBreakdown: breakdown,
      createdBy: actorRole,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.repo.create(timesheet);
    for (const logId of created.dailyLogIds) {
      await this.dailyLogRepo.update(logId, { timesheetId: created.timesheetId });
    }
    await writeAuditLog(actorRole, "timesheet.submitted", "timesheet", created.timesheetId, actorUserId);
    return this.toDTO(created);
  }

  async createManual(input: CreateManualTimesheetInput, actorRole: Role, actorUserId?: string): Promise<TimesheetDTO> {
    if (actorRole !== "ADMIN" && actorRole !== "MANAGER") {
      throw new AuthorizationError("Only admins and managers can create manual timesheets.");
    }
    const employee = await this.employeeRepo.findByEmployeeId(input.employeeId);
    if (!employee) throw new NotFoundError("Employee was not found.");

    const existing = await this.repo.findByEmployeePeriod(input.employeeId, input.periodStart, input.periodEnd);
    if (existing) throw new ConflictError("A timesheet already exists for this employee and period.");

    const timesheetId = await this.repo.generateId();
    const created = await this.repo.create({
      timesheetId,
      employeeId: input.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      periodStart: input.periodStart.slice(0, 10),
      periodEnd: input.periodEnd.slice(0, 10),
      periodLabel: periodLabelOf(input.periodStart, input.periodEnd),
      billingPeriod: Number(input.periodStart.slice(8, 10)) <= 15 ? 1 : 2,
      year: Number(input.periodStart.slice(0, 4)),
      month: Number(input.periodStart.slice(5, 7)),
      totalDays: 0,
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalBillableHours: 0,
      totalNonBillableHours: 0,
      totalHours: 0,
      billableAmount: 0,
      currency: "USD",
      status: input.status,
      reviewNotes: input.reviewNotes,
      dailyLogIds: [],
      projectBreakdown: [],
      createdBy: actorRole,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await writeAuditLog(actorRole, "timesheet.submitted", "timesheet", created.timesheetId, actorUserId);
    return this.toDTO(created);
  }

  async submit(timesheetId: string, actorRole: Role, actorEmployeeId?: string, actorUserId?: string): Promise<TimesheetDTO> {
    const ts = await this.repo.findById(timesheetId);
    if (!ts) throw new NotFoundError("Timesheet was not found.");
    this.assertActorOwnsOrReviews(ts, actorRole, actorEmployeeId);
    this.assertTransition(ts.status, "SUBMITTED");
    const updated = await this.repo.update(timesheetId, { status: "SUBMITTED", submittedAt: new Date(), submittedBy: actorEmployeeId ?? actorRole });
    await writeAuditLog(actorRole, "timesheet.submitted", "timesheet", timesheetId, actorUserId);
    await emitNotification("onTimesheetSubmitted", { timesheetId }, timesheetId, updated!.employeeName, updated!.periodLabel);
    return this.toDTO(updated!);
  }

  async approve(timesheetId: string, reviewedBy: string, notes: string | undefined, actorRole: Role, actorUserId?: string): Promise<TimesheetDTO> {
    if (!hasPermission(actorRole, "timesheet.approve")) {
      throw new AuthorizationError("You cannot approve timesheets.");
    }
    const ts = await this.repo.findById(timesheetId);
    if (!ts) throw new NotFoundError("Timesheet was not found.");
    this.assertTransition(ts.status, "APPROVED");

    const logIds = ts.dailyLogIds;
    const updated = (await runInTransaction(async () => {
      const approved = await this.repo.update(timesheetId, {
        status: "APPROVED",
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: notes,
        approvedAt: new Date()
      });
      if (!approved) throw new NotFoundError("Timesheet was not found.");
      for (const logId of logIds) {
        await this.dailyLogRepo.update(logId, { status: "LOCKED", reviewedBy });
      }
      return approved;
    }))!;

    await writeAuditLog(actorRole, "timesheet.approved", "timesheet", timesheetId, actorUserId);
    await emitNotification("onTimesheetReviewed", { timesheetId }, updated.employeeId, timesheetId, "APPROVED", notes);
    return this.toDTO(updated);
  }

  async reject(timesheetId: string, reviewedBy: string, notes: string | undefined, actorRole: Role, actorUserId?: string): Promise<TimesheetDTO> {
    if (!hasPermission(actorRole, "timesheet.reject")) {
      throw new AuthorizationError("You cannot reject timesheets.");
    }
    if (!notes || notes.trim().length === 0) {
      throw new ValidationError("Rejection notes are required.");
    }
    const ts = await this.repo.findById(timesheetId);
    if (!ts) throw new NotFoundError("Timesheet was not found.");
    this.assertTransition(ts.status, "REJECTED");
    const updated = await this.repo.update(timesheetId, { status: "REJECTED", reviewedBy, reviewedAt: new Date(), reviewNotes: notes });
    await writeAuditLog(actorRole, "timesheet.rejected", "timesheet", timesheetId, actorUserId);
    await emitNotification("onTimesheetReviewed", { timesheetId }, updated!.employeeId, timesheetId, "REJECTED", notes);
    return this.toDTO(updated!);
  }

  async revise(timesheetId: string, actorRole: Role, actorEmployeeId?: string, actorUserId?: string): Promise<TimesheetDTO> {
    const ts = await this.repo.findById(timesheetId);
    if (!ts) throw new NotFoundError("Timesheet was not found.");
    this.assertActorOwnsOrReviews(ts, actorRole, actorEmployeeId);
    this.assertTransition(ts.status, "REVISED");
    const updated = await this.repo.update(timesheetId, { status: "REVISED" });
    await writeAuditLog(actorRole, "timesheet.submitted", "timesheet", timesheetId, actorUserId);
    return this.toDTO(updated!);
  }

  async markPaid(timesheetId: string, actorRole: Role, actorUserId?: string): Promise<TimesheetDTO> {
    if (actorRole !== "ADMIN") {
      throw new AuthorizationError("Only admins can mark timesheets as paid.");
    }
    const ts = await this.repo.findById(timesheetId);
    if (!ts) throw new NotFoundError("Timesheet was not found.");
    this.assertTransition(ts.status, "PAID");
    const updated = await this.repo.update(timesheetId, { status: "PAID", paidAt: new Date() });
    await writeAuditLog(actorRole, "timesheet.approved", "timesheet", timesheetId, actorUserId);
    return this.toDTO(updated!);
  }

  private assertTransition(from: TimesheetStatus, to: TimesheetStatus): void {
    const allowed = TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessRuleError(
        `Invalid timesheet status transition from ${from} to ${to}`,
        "INVALID_TIMESHEET_TRANSITION"
      );
    }
  }

  private assertActorOwnsOrReviews(ts: Timesheet, actorRole: Role, actorEmployeeId?: string): void {
    if (actorRole === "ADMIN" || actorRole === "MANAGER" || actorRole === "SUPERVISOR") return;
    if (actorRole === "EMPLOYEE" && ts.employeeId === actorEmployeeId) return;
    throw new AuthorizationError("You do not have access to this timesheet.");
  }

  private async assertViewScope(ts: Timesheet, actorRole: Role, actorEmployeeId?: string): Promise<void> {
    if (actorRole === "EMPLOYEE") {
      if (ts.employeeId === actorEmployeeId) return;
      throw new AuthorizationError("You do not have access to this timesheet.");
    }
    if (actorRole === "ADMIN") return;
    const scope = await this.scopedProjectIds(actorRole, actorEmployeeId);
    if (scope === null || ts.projectBreakdown.some((pb) => scope.has(pb.projectId))) return;
    throw new AuthorizationError("You do not have access to this timesheet.");
  }

  private toDTO(ts: Timesheet): TimesheetDTO {
    return {
      id: ts.timesheetId,
      employeeId: ts.employeeId,
      employeeName: ts.employeeName,
      periodStart: ts.periodStart,
      periodEnd: ts.periodEnd,
      periodLabel: ts.periodLabel,
      billingPeriod: ts.billingPeriod,
      year: ts.year,
      month: ts.month,
      totalDays: ts.totalDays,
      totalRegularHours: ts.totalRegularHours,
      totalOvertimeHours: ts.totalOvertimeHours,
      totalBillableHours: ts.totalBillableHours,
      totalNonBillableHours: ts.totalNonBillableHours,
      totalHours: ts.totalHours,
      billableAmount: ts.billableAmount,
      currency: ts.currency,
      status: ts.status,
      reviewedBy: ts.reviewedBy,
      reviewNotes: ts.reviewNotes,
      submittedAt: toISO(ts.submittedAt),
      submittedBy: ts.submittedBy,
      approvedAt: toISO(ts.approvedAt),
      paidAt: toISO(ts.paidAt),
      dailyLogIds: ts.dailyLogIds,
      projectBreakdown: ts.projectBreakdown,
      createdAt: toISO(ts.createdAt) ?? "",
      updatedAt: toISO(ts.updatedAt) ?? ""
    };
  }
}
