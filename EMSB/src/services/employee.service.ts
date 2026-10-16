import { Decimal128 } from "mongodb";
import { EmployeeRepository, type EmployeeListFilters } from "../repositories/employee.repository.js";
import type { UserRepository } from "../repositories/user.repository.js";
import { OnboardingRepository } from "../repositories/onboarding.repository.js";
import { integrationEvents } from "../integrations/events.js";
import { computeTimesheetEligibility } from "../utils/timesheet-eligibility.js";
import type { Employee } from "../models/employee.js";
import type { Role, EmploymentStatus } from "../config/constants.js";
import { NotFoundError, ConflictError, BusinessRuleError } from "../utils/errors.js";
import { toISO, formatDateOnly } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import { getDb } from "../config/database.js";
import type {
  CreateEmployeeInput,
  HrEmployeeUpdateInput,
  EmployeeSelfUpdateInput,
  ManagerEmployeeUpdateInput,
  UpdateBillingStatusInput,
  EmployeeSearchQuery
} from "../schemas/employee.schemas.js";

export interface EmployeeDTO {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  designation: string;
  department: string;
  country: string;
  state?: string;
  city?: string;
  employmentStatus: EmploymentStatus;
  employmentType: string | undefined;
  billingStatus: string;
  workMail?: string;
  hourlyRate?: number;
  salary?: number;
  joiningDate: string | undefined;
  managerId?: string;
  timesheetEligibility: string;
  role: Role | undefined;
  techRole?: string;
  createdAt: string;
  updatedAt: string;
}

export type EmployeeDetailDTO = EmployeeDTO & {
  middleName?: string;
  profilePhotoUrl?: string;
  dateOfBirth?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  compensation?: {
    currency?: string;
    salary?: number;
    payFrequency?: string;
  };
  billRate?: {
    currency?: string;
    amount?: number;
    unit?: string;
  };
};

type ViewContext = "HR" | "MANAGER" | "SUPERVISOR" | "EMPLOYEE";

function moneyToNumber(value: number | Decimal128 | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  if (value instanceof Decimal128) return Number(value.toString());
  return undefined;
}

const VALID_TRANSITIONS: Record<EmploymentStatus, EmploymentStatus[]> = {
  ONBOARDING: ["ACTIVE", "SUSPENDED", "TERMINATED", "INACTIVE"],
  ACTIVE: ["ON_LEAVE", "SUSPENDED", "RESIGNED", "TERMINATED", "INACTIVE"],
  ON_LEAVE: ["ACTIVE", "SUSPENDED", "RESIGNED", "TERMINATED"],
  SUSPENDED: ["ACTIVE", "RESIGNED", "TERMINATED", "INACTIVE"],
  RESIGNED: ["TERMINATED", "INACTIVE"],
  TERMINATED: ["INACTIVE"],
  INACTIVE: []
};

export class EmployeeService {
  constructor(
    private employeeRepository: EmployeeRepository,
    private userRepository: UserRepository,
    private onboardingRepository: OnboardingRepository
  ) {}

  async listEmployees(
    filters: EmployeeSearchQuery
  ): Promise<{ employees: EmployeeDTO[]; total: number; page: number; pageSize: number }> {
    const listFilters: EmployeeListFilters = {
      search: filters.search,
      employmentStatus: filters.status,
      billingStatus: filters.billingStatus,
      department: filters.department,
      country: filters.country,
      managerId: filters.managerId,
      designation: filters.designation,
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };

    const { employees, total } = await this.employeeRepository.findMany(listFilters);
    const roleMap = await this.buildRoleMap(employees.map((e) => e.employeeId));
    const onboardingMap = await this.buildOnboardingCompletionMap(
      employees.map((e) => e.employeeId)
    );

    return {
      employees: await Promise.all(
        employees.map((e) => this.toDTO(e, "HR", roleMap, onboardingMap.get(e.employeeId) ?? true))
      ),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async createEmployee(input: CreateEmployeeInput, actorUserId: string): Promise<EmployeeDetailDTO> {
    const existing = await this.employeeRepository.findByEmployeeId(input.employeeId);
    if (existing) {
      throw new ConflictError("Employee ID already exists.");
    }

    const existingEmail = await this.employeeRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError("Email is already in use by another employee.");
    }

    if (input.managerId) {
      const manager = await this.employeeRepository.findByEmployeeId(input.managerId);
      if (!manager) {
        throw new NotFoundError("Manager not found.");
      }
    }

    const employee: Omit<Employee, "_id"> = {
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      profilePhotoUrl: input.profilePhotoUrl,
      dateOfBirth: input.dateOfBirth,
      designation: input.designation,
      department: input.department,
      managerId: input.managerId,
      country: input.country,
       employmentStatus: input.employmentStatus,
       billingStatus: input.billingStatus,
       workMail: input.workMail,
       joiningDate: input.joiningDate,
      employmentType: input.employmentType,
      address: input.address,
      emergencyContact: input.emergencyContact,
       compensation: input.compensation,
       billRate: input.billRate,
       techRole: input.techRole,
       createdAt: new Date(),
       updatedAt: new Date()
     };

    const created = await this.employeeRepository.create(employee);

    await this.createAuditLog("HR", "employee.created", "employee", created.employeeId, actorUserId);

    const roleMap = await this.buildRoleMap([created.employeeId]);
    const onboardingCompleted = await this.onboardingCompletedFor(created.employeeId);
    return this.toDetailDTO(created, "HR", roleMap, onboardingCompleted);
  }

  async getEmployeeById(
    employeeId: string,
    role: Role,
    requestingEmployeeId?: string
  ): Promise<EmployeeDetailDTO> {
    if (role === "EMPLOYEE" && requestingEmployeeId !== employeeId) {
      throw new NotFoundError("Employee was not found.");
    }

    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const context = this.getViewContext(role, employeeId, requestingEmployeeId);
    const roleMap = await this.buildRoleMap([employee.employeeId]);
    const onboardingCompleted = await this.onboardingCompletedFor(employee.employeeId);
    return this.toDetailDTO(employee, context, roleMap, onboardingCompleted);
  }

  async updateEmployee(
    employeeId: string,
    input: unknown,
    role: Role,
    requestingEmployeeId: string | undefined,
    actorUserId: string
  ): Promise<EmployeeDetailDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    if (role === "EMPLOYEE" && requestingEmployeeId !== employeeId) {
      throw new NotFoundError("Employee was not found.");
    }

    let update: Partial<Employee>;
    let viewContext: ViewContext;

    if (role === "HR") {
      update = this.mapHrUpdate(input as HrEmployeeUpdateInput);
      viewContext = "HR";
    } else if (role === "EMPLOYEE") {
      update = this.mapSelfUpdate(input as EmployeeSelfUpdateInput);
      viewContext = "EMPLOYEE";
    } else if (role === "MANAGER") {
      update = this.mapManagerUpdate(input as ManagerEmployeeUpdateInput);
      viewContext = "MANAGER";
    } else {
      throw new NotFoundError("Employee was not found.");
    }

    const updated = await this.employeeRepository.update(employeeId, update);
    if (!updated) {
      throw new NotFoundError("Employee was not found.");
    }

    await this.createAuditLog(role, "employee.updated", "employee", employeeId, actorUserId);

    const roleMap = await this.buildRoleMap([updated.employeeId]);
    const onboardingCompleted = await this.onboardingCompletedFor(updated.employeeId);
    return this.toDetailDTO(updated, viewContext, roleMap, onboardingCompleted);
  }

  async updateBillingStatus(
    employeeId: string,
    input: UpdateBillingStatusInput,
    actorUserId: string
  ): Promise<EmployeeDetailDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const updated = await this.employeeRepository.updateBillingStatus(
      employeeId,
      input.billingStatus
    );
    if (!updated) {
      throw new NotFoundError("Employee was not found.");
    }

    await this.createAuditLog("HR", "employee.updated", "employee", employeeId, actorUserId);

    const context = this.getViewContext("HR", employeeId, undefined);
    const roleMap = await this.buildRoleMap([updated.employeeId]);
    const onboardingCompleted = await this.onboardingCompletedFor(updated.employeeId);
    return this.toDetailDTO(updated, context, roleMap, onboardingCompleted);
  }

  async changeEmploymentStatus(
    employeeId: string,
    targetStatus: EmploymentStatus,
    actorRole: Role,
    actorUserId: string
  ): Promise<EmployeeDetailDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const allowedTransitions = VALID_TRANSITIONS[employee.employmentStatus];
    if (!allowedTransitions.includes(targetStatus)) {
      throw new BusinessRuleError(
        `Invalid status transition from ${employee.employmentStatus} to ${targetStatus}`,
        "INVALID_STATUS_TRANSITION"
      );
    }

    const updated = await this.employeeRepository.updateEmploymentStatus(
      employeeId,
      targetStatus
    );
    if (!updated) {
      throw new NotFoundError("Employee was not found.");
    }

    const actionMap: Record<EmploymentStatus, string> = {
      ACTIVE: "employee.activated",
      SUSPENDED: "employee.suspended",
      TERMINATED: "employee.terminated",
      RESIGNED: "employee.resigned",
      INACTIVE: "employee.deactivated",
      ON_LEAVE: "employee.updated",
      ONBOARDING: "employee.updated"
    };

    await this.createAuditLog(
      actorRole,
      actionMap[targetStatus] ?? "employee.updated",
      "employee",
      employeeId,
      actorUserId
    );

    // Fire timesheet eligibility event on status change (activation, etc.)
    await integrationEvents.employeeTimesheetEligibilityChanged({
      employeeId: updated.employeeId,
      occurredAt: new Date()
    });

    // Fire notification event for employee activation
    if (targetStatus === "ACTIVE") {
      await integrationEvents.employeeActivated({
        employeeId: updated.employeeId,
        employeeName: `${updated.firstName} ${updated.lastName}`,
        managerId: updated.managerId,
        occurredAt: new Date()
      });
    }

    const context = this.getViewContext("HR", employeeId, undefined);
    const roleMap = await this.buildRoleMap([updated.employeeId]);
    const onboardingCompleted = await this.onboardingCompletedFor(updated.employeeId);
    return this.toDetailDTO(updated, context, roleMap, onboardingCompleted);
  }

  async deleteEmployee(employeeId: string, actorRole: Role, actorUserId: string): Promise<void> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const db = getDb();

    await db.collection("employees").deleteOne({ employeeId });
    await db.collection("users").deleteMany({ employeeId });
    await db.collection("onboarding_records").deleteMany({ employeeId });
    await db.collection("invitations").deleteMany({ employeeId });

    await this.createAuditLog(actorRole, "employee.deleted", "employee", employeeId, actorUserId);
  }

  private getViewContext(
    role: Role,
    employeeId: string,
    requestingEmployeeId?: string
  ): ViewContext {
    if (role === "HR") return "HR";
    if (role === "EMPLOYEE" && requestingEmployeeId === employeeId) return "EMPLOYEE";
    return "MANAGER";
  }

  /**
   * Single source of truth for timesheet eligibility (Finding #2): delegates to
   * the shared predicate so the employee DTO and TimesheetService.calculateEligibility
   * can never disagree. `onboardingCompleted` is resolved by the caller via a
   * batched query (list) or a single lookup (detail) to avoid N+1.
   */
  private isTimesheetEligible(employee: Employee, onboardingCompleted: boolean): boolean {
    return computeTimesheetEligibility(
      {
        employmentStatus: employee.employmentStatus,
        billingStatus: employee.billingStatus,
        timesheetEligibility: employee.timesheetEligibility
      },
      onboardingCompleted
    ).eligible;
  }

  private async toDTO(
    employee: Employee,
    context: ViewContext,
    roleMap?: Map<string, Role>,
    onboardingCompleted: boolean = true
  ): Promise<EmployeeDTO> {
    const base: EmployeeDTO = {
      id: employee.employeeId,
      employeeCode: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      avatar: employee.profilePhotoUrl,
      designation: employee.designation,
      department: employee.department,
      country: employee.country === "INDIA" ? "India" : "United States",
      state: employee.address?.state,
      city: employee.address?.city,
      employmentStatus: employee.employmentStatus,
      employmentType: employee.employmentType,
      billingStatus: employee.billingStatus,
      workMail: employee.workMail,
      joiningDate: formatDateOnly(employee.joiningDate),
      managerId: employee.managerId,
       timesheetEligibility: this.isTimesheetEligible(employee, onboardingCompleted) ? "ELIGIBLE" : "NOT_ELIGIBLE",
       role: roleMap?.get(employee.employeeId),
       techRole: employee.techRole,
       createdAt: toISO(employee.createdAt) ?? "",
       updatedAt: toISO(employee.updatedAt) ?? ""
    };

    if (context === "HR" && employee.billingStatus === "BILLABLE") {
      base.hourlyRate = moneyToNumber(employee.billRate?.amount);
    }
    if (context === "HR" && employee.compensation?.salary) {
      base.salary = moneyToNumber(employee.compensation.salary);
    }

    return base;
  }

  private async toDetailDTO(
    employee: Employee,
    context: ViewContext,
    roleMap?: Map<string, Role>,
    onboardingCompleted: boolean = true
  ): Promise<EmployeeDetailDTO> {
    const dto = (await this.toDTO(employee, context, roleMap, onboardingCompleted)) as EmployeeDetailDTO;

    if (context === "HR" || context === "EMPLOYEE") {
      dto.middleName = employee.middleName;
      dto.profilePhotoUrl = employee.profilePhotoUrl;
      dto.dateOfBirth = formatDateOnly(employee.dateOfBirth);
      dto.address = employee.address;
      dto.emergencyContact = employee.emergencyContact;
    }

    if (context === "HR") {
      if (employee.compensation) {
        dto.compensation = {
          currency: employee.compensation.currency,
          salary: moneyToNumber(employee.compensation.salary),
          payFrequency: employee.compensation.payFrequency
        };
      }
      if (employee.billRate) {
        dto.billRate = {
          currency: employee.billRate.currency,
          amount: moneyToNumber(employee.billRate.amount),
          unit: employee.billRate.unit
        };
      }
    }

    return dto;
  }

  private mapHrUpdate(input: HrEmployeeUpdateInput): Partial<Employee> {
    const update: Partial<Employee> = {};
    if (input.firstName !== undefined) update.firstName = input.firstName;
    if (input.lastName !== undefined) update.lastName = input.lastName;
       if (input.email !== undefined) update.email = input.email;
       if (input.workMail !== undefined) update.workMail = input.workMail;
       if (input.phone !== undefined) update.phone = input.phone;
    if (input.profilePhotoUrl !== undefined) update.profilePhotoUrl = input.profilePhotoUrl;
    if (input.dateOfBirth !== undefined) update.dateOfBirth = input.dateOfBirth;
    if (input.designation !== undefined) update.designation = input.designation;
    if (input.department !== undefined) update.department = input.department;
    if (input.managerId !== undefined) update.managerId = input.managerId;
    if (input.country !== undefined) update.country = input.country;
    if (input.employmentStatus !== undefined) update.employmentStatus = input.employmentStatus;
    if (input.billingStatus !== undefined) update.billingStatus = input.billingStatus;
    if (input.joiningDate !== undefined) update.joiningDate = input.joiningDate;
    if (input.employmentType !== undefined) update.employmentType = input.employmentType;
    if (input.address !== undefined) update.address = input.address;
    if (input.emergencyContact !== undefined) update.emergencyContact = input.emergencyContact;
    if (input.compensation !== undefined) update.compensation = input.compensation;
    if (input.billRate !== undefined) update.billRate = input.billRate;
    if (input.techRole !== undefined) update.techRole = input.techRole;
    return update;
  }

  private mapSelfUpdate(input: EmployeeSelfUpdateInput): Partial<Employee> {
    const update: Partial<Employee> = {};
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.address !== undefined) update.address = input.address;
    if (input.emergencyContact !== undefined) update.emergencyContact = input.emergencyContact;
    if (input.profilePhotoUrl !== undefined) update.profilePhotoUrl = input.profilePhotoUrl;
    return update;
  }

  private mapManagerUpdate(input: ManagerEmployeeUpdateInput): Partial<Employee> {
    const update: Partial<Employee> = {};
    if (input.firstName !== undefined) update.firstName = input.firstName;
    if (input.lastName !== undefined) update.lastName = input.lastName;
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.designation !== undefined) update.designation = input.designation;
    if (input.department !== undefined) update.department = input.department;
    if (input.managerId !== undefined) update.managerId = input.managerId;
    return update;
  }

  /**
   * Builds an employeeId → Role map with a single batched users query.
   * Employees without a linked user record get no role (fallback: undefined).
   */
  private async buildRoleMap(employeeIds: string[]): Promise<Map<string, Role>> {
    const roleMap = new Map<string, Role>();
    if (employeeIds.length === 0) return roleMap;

    const users = await this.userRepository.findByEmployeeIds(employeeIds);
    for (const user of users) {
      if (user.employeeId) {
        roleMap.set(user.employeeId, user.role as Role);
      }
    }
    return roleMap;
  }

  /**
   * Batch lookup of onboarding completion for a page of employees, so the
   * employee list DTO computes timesheet eligibility in one query (mirrors
   * buildRoleMap; avoids N+1). An employee with no onboarding record is
   * treated as onboarding-complete (activated directly — same rule as
   * TimesheetService.isOnboardingComplete).
   */
  private async buildOnboardingCompletionMap(
    employeeIds: string[]
  ): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    if (employeeIds.length === 0) return map;

    const records = await this.onboardingRepository.findByEmployeeIds(employeeIds);
    for (const record of records) {
      map.set(record.employeeId, record.status === "COMPLETED");
    }
    return map;
  }

  /** Resolves onboarding completion for a single employee (detail DTO path). */
  private async onboardingCompletedFor(employeeId: string): Promise<boolean> {
    const record = await this.onboardingRepository.findByEmployeeId(employeeId);
    return record ? record.status === "COMPLETED" : true;
  }

  private async createAuditLog(
    actorRole: Role,
    action: string,
    entityType: string,
    entityId: string,
    actorUserId: string
  ): Promise<void> {
    await writeAuditLog(actorRole, action, entityType, entityId, actorUserId);
  }
}
