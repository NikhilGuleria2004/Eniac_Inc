import { DailyLogRepository } from "../repositories/daily-log.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { AssignmentRepository } from "../repositories/assignment.repository.js";
import type { DailyLog, DailyLogStatus, BillingType } from "../models/daily-log.js";
import type { Role } from "../config/constants.js";
import { AuthorizationError, NotFoundError, ConflictError, ValidationError, BusinessRuleError } from "../utils/errors.js";
import { formatDateOnly, toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import type {
  DailyLogListQuery,
  CreateDailyLogInput,
  UpdateDailyLogInput
} from "../schemas/daily-log.schemas.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface DailyLogDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  workDate: string;
  dayOfWeek: string;
  taskCategory: string;
  description: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  billable: boolean;
  billingType: BillingType;
  status: DailyLogStatus;
  timesheetId?: string;
  reviewedBy?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

function dayOfWeekOf(workDateStr: string): string {
  return DAY_NAMES[new Date(`${workDateStr}T00:00:00`).getDay()];
}
function isWeekend(workDateStr: string): boolean {
  const d = new Date(`${workDateStr}T00:00:00`).getDay();
  return d === 0 || d === 6;
}

export class DailyLogService {
  constructor(
    private repo: DailyLogRepository,
    private employeeRepo: EmployeeRepository,
    private projectRepo: ProjectRepository,
    private assignmentRepo: AssignmentRepository
  ) {}

  async listDailyLogs(
    filters: DailyLogListQuery,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<{ logs: DailyLogDTO[]; total: number; page: number; pageSize: number }> {
    const repoFilters = this.buildScopedFilters(filters, actorRole, requestingEmployeeId);
    if (actorRole === "MANAGER" || actorRole === "SUPERVISOR") {
      const { getDb } = await import("../config/database.js");
      const field = actorRole === "MANAGER" ? "managerId" : "supervisorId";
      const projects = await getDb().collection("projects").find({ [field]: requestingEmployeeId }, { projection: { projectId: 1 } }).toArray();
      (repoFilters as { projectIds?: string[] }).projectIds = projects.map((p) => p.projectId as string);
    }

    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : undefined;
    const to = filters.to ? new Date(`${filters.to}T00:00:00`) : undefined;

    const { logs, total } = await this.repo.findMany({ ...repoFilters, from, to });
    return {
      logs: logs.map((l) => this.toDTO(l)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async getById(
    dailyLogId: string,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<DailyLogDTO> {
    const log = await this.repo.findById(dailyLogId);
    if (!log) throw new NotFoundError("Daily log was not found.");
    this.assertScope(log, actorRole, requestingEmployeeId);
    return this.toDTO(log);
  }

  async createDailyLog(
    input: CreateDailyLogInput,
    actorRole: Role,
    requestingEmployeeId?: string,
    actorUserId?: string
  ): Promise<DailyLogDTO> {
    const targetEmployeeId = this.resolveEmployeeId(input.employeeId, actorRole, requestingEmployeeId);

    const employee = await this.employeeRepo.findByEmployeeId(targetEmployeeId);
    if (!employee) throw new NotFoundError("Employee was not found.");

    const project = await this.projectRepo.findById(input.projectId);
    if (!project) throw new NotFoundError("Project was not found.");

    const active = await this.assignmentRepo.findActiveByEmployee(targetEmployeeId);
    if (!active.some((a) => a.projectId === input.projectId)) {
      throw new AuthorizationError("Employee does not have an ACTIVE assignment for this project.");
    }

    if (!isWeekend(input.workDate) && input.overtimeHours > 0) {
      throw new BusinessRuleError(
        "Overtime is only allowed on Saturday and Sunday.",
        "OVERTIME_NOT_ALLOWED"
      );
    }

    if (input.regularHours + input.overtimeHours > 24) {
      throw new BusinessRuleError(
        "Total hours (regular + overtime) cannot exceed 24",
        "HOURS_EXCEED_24"
      );
    }

    const dayStart = new Date(`${input.workDate}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const duplicate = await this.repo.findByEmployeeProjectDateRange(targetEmployeeId, input.projectId, dayStart, dayEnd);
    if (duplicate) {
      throw new ConflictError("A daily log already exists for this employee, project and date.");
    }

    const dailyLogId = await this.repo.generateId();
    const workDateStr = input.workDate.slice(0, 10);
    const log: Omit<DailyLog, "_id"> = {
      dailyLogId,
      employeeId: targetEmployeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      projectId: input.projectId,
      projectName: project.name,
      workDate: dayStart,
      workDateStr,
      dayOfWeek: dayOfWeekOf(workDateStr),
      taskCategory: input.taskCategory,
      description: input.description,
      regularHours: input.regularHours,
      overtimeHours: input.overtimeHours,
      totalHours: Number((input.regularHours + input.overtimeHours).toFixed(2)),
      billable: input.billingType === "BILLABLE",
      billingType: input.billingType,
      status: input.status,
      tags: input.tags,
      createdBy: actorRole,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let created: DailyLog;
    try {
      created = await this.repo.create(log);
    } catch (err) {
      if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
        throw new ConflictError("A daily log already exists for this employee, project and date.");
      }
      throw err;
    }

    await writeAuditLog(actorRole, "daily_log.created", "daily_log", created.dailyLogId, actorUserId);
    return this.toDTO(created);
  }

  async updateDailyLog(
    dailyLogId: string,
    input: UpdateDailyLogInput,
    actorRole: Role,
    requestingEmployeeId?: string,
    actorUserId?: string
  ): Promise<DailyLogDTO> {
    const log = await this.repo.findById(dailyLogId);
    if (!log) throw new NotFoundError("Daily log was not found.");

    await this.assertNotLocked(log);
    this.assertScope(log, actorRole, requestingEmployeeId);

    const regularHours = input.regularHours ?? log.regularHours;
    const overtimeHours = input.overtimeHours ?? log.overtimeHours;
    if (regularHours + overtimeHours > 24) {
      throw new BusinessRuleError("Total hours (regular + overtime) cannot exceed 24", "HOURS_EXCEED_24");
    }
    if (!isWeekend(log.workDateStr) && overtimeHours > 0) {
      throw new BusinessRuleError("Overtime is only allowed on Saturday and Sunday.", "OVERTIME_NOT_ALLOWED");
    }

    const update: Partial<DailyLog> = {
      regularHours,
      overtimeHours,
      totalHours: Number((regularHours + overtimeHours).toFixed(2)),
      billable: input.billingType ? input.billingType === "BILLABLE" : log.billable
    };
    if (input.taskCategory !== undefined) update.taskCategory = input.taskCategory;
    if (input.description !== undefined) update.description = input.description;
    if (input.billingType !== undefined) update.billingType = input.billingType;
    if (input.status !== undefined) update.status = input.status;
    if (input.tags !== undefined) update.tags = input.tags;

    const updated = await this.repo.update(dailyLogId, update);
    await writeAuditLog(actorRole, "daily_log.updated", "daily_log", dailyLogId, actorUserId);
    return this.toDTO(updated!);
  }

  async deleteDailyLog(
    dailyLogId: string,
    actorRole: Role,
    requestingEmployeeId?: string,
    actorUserId?: string
  ): Promise<void> {
    const log = await this.repo.findById(dailyLogId);
    if (!log) throw new NotFoundError("Daily log was not found.");

    this.assertScope(log, actorRole, requestingEmployeeId);

    const isAdmin = actorRole === "ADMIN";
    if (!isAdmin && log.status !== "DRAFT") {
      throw new BusinessRuleError("Only draft daily logs can be deleted.", "DAILY_LOG_NOT_DRAFT");
    }
    if (!isAdmin) {
      await this.assertNotLocked(log);
    }

    await this.repo.softDelete(dailyLogId);
    await writeAuditLog(actorRole, "daily_log.updated", "daily_log", dailyLogId, actorUserId);
  }

  private resolveEmployeeId(
    requested: string | undefined,
    actorRole: Role,
    requestingEmployeeId?: string
  ): string {
    if (actorRole === "EMPLOYEE") {
      if (requested && requested !== requestingEmployeeId) {
        throw new AuthorizationError("You can only log your own hours.");
      }
      if (!requestingEmployeeId) throw new ValidationError("Employee is required.");
      return requestingEmployeeId;
    }
    if (!requested) {
      if (!requestingEmployeeId) throw new ValidationError("Employee is required.");
      return requestingEmployeeId;
    }
    return requested;
  }

  private buildScopedFilters(
    filters: DailyLogListQuery,
    actorRole: Role,
    requestingEmployeeId?: string
  ) {
    if (actorRole === "EMPLOYEE") {
      return { employeeId: requestingEmployeeId, projectId: filters.projectId, status: filters.status, billingType: filters.billingType, search: filters.search };
    }
    // MANAGER/SUPERVISOR/ADMIN scoping to their projects is handled in-lane where possible;
    // ADMIN sees all. For MANAGER/SUPERVISOR we filter by projects they own/supervise on read.
    return {
      employeeId: filters.employeeId,
      projectId: filters.projectId,
      status: filters.status,
      billingType: filters.billingType,
      search: filters.search
    };
  }

  private assertScope(log: DailyLog, actorRole: Role, requestingEmployeeId?: string): void {
    if (actorRole === "ADMIN" || actorRole === "MANAGER" || actorRole === "SUPERVISOR") return;
    if (actorRole === "EMPLOYEE" && log.employeeId === requestingEmployeeId) return;
    throw new AuthorizationError("You do not have access to this daily log.");
  }

  private async assertNotLocked(log: DailyLog): Promise<void> {
    if (!log.timesheetId) return;
    if (log.status === "LOCKED") {
      throw new BusinessRuleError("This log is locked in an approved/paid timesheet.", "DAILY_LOG_LOCKED");
    }
    const { getDb } = await import("../config/database.js");
    try {
      const ts = await getDb().collection("timesheets").findOne({ timesheetId: log.timesheetId });
      if (ts && (ts.status === "APPROVED" || ts.status === "PAID")) {
        throw new BusinessRuleError("This log is locked in an approved/paid timesheet.", "DAILY_LOG_LOCKED");
      }
    } catch (err) {
      if (err instanceof BusinessRuleError) throw err;
    }
  }

  private toDTO(log: DailyLog): DailyLogDTO {
    return {
      id: log.dailyLogId,
      employeeId: log.employeeId,
      employeeName: log.employeeName,
      projectId: log.projectId,
      projectName: log.projectName,
      workDate: formatDateOnly(log.workDate) ?? log.workDateStr,
      dayOfWeek: log.dayOfWeek,
      taskCategory: log.taskCategory,
      description: log.description,
      regularHours: log.regularHours,
      overtimeHours: log.overtimeHours,
      totalHours: log.totalHours,
      billable: log.billable,
      billingType: log.billingType,
      status: log.status,
      timesheetId: log.timesheetId,
      reviewedBy: log.reviewedBy,
      tags: log.tags,
      createdAt: toISO(log.createdAt) ?? "",
      updatedAt: toISO(log.updatedAt) ?? ""
    };
  }
}
