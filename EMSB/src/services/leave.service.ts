import { LeaveRepository } from "../repositories/leave.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import type { LeaveRequest, LeaveBalance, LeaveType } from "../models/leave.js";
import type { Role } from "../config/constants.js";
import { NotFoundError, BusinessRuleError, AuthorizationError } from "../utils/errors.js";
import { toISO, formatDateOnly } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import { emitNotification } from "../utils/notification-emitter.js";
import type {
  CreateLeaveRequestInput,
  LeaveListQuery
} from "../schemas/leave.schemas.js";

export interface LeaveRequestDTO {
  id: string;
  requestId: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  approvedBy?: string;
  reviewComment?: string;
  documentUrl?: string;
  createdAt: string;
}

export interface LeaveBalanceDTO {
  employeeId: string;
  leaveType: LeaveType;
  balance: number;
}

const BALANCE_CONSUMING_TYPES: LeaveType[] = ["PAID", "SICK", "CASUAL"];

export class LeaveService {
  constructor(
    private leaveRepository: LeaveRepository,
    private employeeRepository: EmployeeRepository
  ) {}

  async listLeaveRequests(
    filters: LeaveListQuery,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<{ requests: LeaveRequestDTO[]; total: number; page: number; pageSize: number }> {
    if (actorRole === "EMPLOYEE") {
      if (!requestingEmployeeId) {
        return { requests: [], total: 0, page: filters.page, pageSize: filters.pageSize };
      }
      const { requests, total } = await this.leaveRepository.findRequests({
        ...filters,
        employeeId: requestingEmployeeId
      });
      return {
        requests: requests.map((r) => this.toDTO(r)),
        total,
        page: filters.page,
        pageSize: filters.pageSize
      };
    }

    const { requests, total } = await this.leaveRepository.findRequests(filters);
    return {
      requests: requests.map((r) => this.toDTO(r)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async getLeaveRequest(
    requestId: string,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<LeaveRequestDTO> {
    const request = await this.leaveRepository.findRequestById(requestId);
    if (!request) {
      throw new NotFoundError("Leave request was not found.");
    }

    if (actorRole === "EMPLOYEE" && request.employeeId !== requestingEmployeeId) {
      throw new NotFoundError("Leave request was not found.");
    }

    return this.toDTO(request);
  }

  async createLeaveRequest(
    input: CreateLeaveRequestInput,
    actorRole: Role,
    requestingEmployeeId: string | undefined,
    actorUserId: string
  ): Promise<LeaveRequestDTO> {
    const employeeId = actorRole === "EMPLOYEE"
      ? requestingEmployeeId
      : input.employeeId;

    if (!employeeId) {
      throw new BusinessRuleError("Employee ID is required.", "EMPLOYEE_ID_REQUIRED");
    }

    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const days = this.calculateDays(input.startDate, input.endDate);
    if (days <= 0) {
      throw new BusinessRuleError(
        "Leave request must cover at least one day.",
        "INVALID_LEAVE_DATES"
      );
    }

    if (input.startDate < new Date(new Date().setHours(0, 0, 0, 0))) {
      throw new BusinessRuleError(
        "Leave start date cannot be in the past.",
        "INVALID_LEAVE_DATES"
      );
    }

    const overlapping = await this.leaveRepository.findOverlappingRequests(
      employeeId,
      input.startDate,
      input.endDate
    );
    if (overlapping.length > 0) {
      throw new BusinessRuleError(
        "Leave request overlaps with an existing approved or pending leave.",
        "OVERLAPPING_LEAVE"
      );
    }

    if (BALANCE_CONSUMING_TYPES.includes(input.leaveType)) {
      const balance = await this.leaveRepository.findBalance(employeeId, input.leaveType);
      const available = balance?.balance ?? 0;
      if (available < days) {
        throw new BusinessRuleError(
          `Insufficient ${input.leaveType} leave balance. Available: ${available}, requested: ${days}.`,
          "INSUFFICIENT_BALANCE"
        );
      }
    }

    const requestId = await this.generateRequestId();

    const request: Omit<LeaveRequest, "_id"> = {
      requestId,
      employeeId,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      reason: input.reason,
      status: "PENDING",
      documentUrl: input.documentUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.leaveRepository.createRequest(request);
    await writeAuditLog(actorRole, "leave.requested", "leave_request", created.requestId, actorUserId);
    await this.emitOnLeaveSubmitted(employee.employeeId, employee.firstName, employee.lastName, input.leaveType, days);

    return this.toDTO(created);
  }

  async approveLeaveRequest(
    requestId: string,
    actorRole: Role,
    actorUserId: string
  ): Promise<LeaveRequestDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Only HR or Admin can approve leave requests.");
    }

    const request = await this.leaveRepository.findRequestById(requestId);
    if (!request) {
      throw new NotFoundError("Leave request was not found.");
    }

    if (request.status !== "PENDING") {
      throw new BusinessRuleError(
        `Leave request is already ${request.status.toLowerCase()}.`,
        "LEAVE_ALREADY_RESOLVED"
      );
    }

    const updated = await this.leaveRepository.updateRequest(requestId, {
      status: "APPROVED",
      reviewedBy: actorRole,
      reviewedAt: new Date()
    });
    if (!updated) {
      throw new NotFoundError("Leave request was not found.");
    }

    if (BALANCE_CONSUMING_TYPES.includes(request.leaveType)) {
      await this.leaveRepository.decrementBalance(
        request.employeeId,
        request.leaveType,
        request.days
      );
    }

    await writeAuditLog(actorRole, "leave.approved", "leave_request", requestId, actorUserId);
    await this.emitOnLeaveResolved(request.employeeId, "APPROVED");

    return this.toDTO(updated);
  }

  async rejectLeaveRequest(
    requestId: string,
    rejectionReason: string,
    actorRole: Role,
    actorUserId: string
  ): Promise<LeaveRequestDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Only HR or Admin can reject leave requests.");
    }

    const request = await this.leaveRepository.findRequestById(requestId);
    if (!request) {
      throw new NotFoundError("Leave request was not found.");
    }

    if (request.status !== "PENDING") {
      throw new BusinessRuleError(
        `Leave request is already ${request.status.toLowerCase()}.`,
        "LEAVE_ALREADY_RESOLVED"
      );
    }

    const updated = await this.leaveRepository.updateRequest(requestId, {
      status: "REJECTED",
      reviewedBy: actorRole,
      reviewedAt: new Date(),
      rejectionReason
    });
    if (!updated) {
      throw new NotFoundError("Leave request was not found.");
    }

    await writeAuditLog(actorRole, "leave.rejected", "leave_request", requestId, actorUserId);
    await this.emitOnLeaveResolved(request.employeeId, "REJECTED");

    return this.toDTO(updated);
  }

  async getBalances(
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<LeaveBalanceDTO[]> {
    if (actorRole === "EMPLOYEE") {
      if (!requestingEmployeeId) {
        return [];
      }
      const balances = await this.leaveRepository.findBalancesByEmployee(requestingEmployeeId);
      return balances.map((b) => this.toBalanceDTO(b));
    }

    const balances = await this.leaveRepository.findBalances({});
    return balances.map((b) => this.toBalanceDTO(b));
  }

  async getBalanceByEmployee(
    employeeId: string,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<LeaveBalanceDTO[]> {
    if (actorRole === "EMPLOYEE" && requestingEmployeeId !== employeeId) {
      throw new NotFoundError("Leave balances were not found.");
    }

    const balances = await this.leaveRepository.findBalancesByEmployee(employeeId);
    return balances.map((b) => this.toBalanceDTO(b));
  }

  private calculateDays(startDate: Date, endDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const start = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return Math.round((end - start) / msPerDay) + 1;
  }

  private toDTO(request: LeaveRequest): LeaveRequestDTO {
    return {
      id: request.requestId,
      requestId: request.requestId,
      employeeId: request.employeeId,
      type: request.leaveType,
      startDate: formatDateOnly(request.startDate) ?? "",
      endDate: formatDateOnly(request.endDate) ?? "",
      days: request.days,
      reason: request.reason ?? "",
      status: request.status,
      approvedBy: request.reviewedBy,
      reviewComment: request.rejectionReason,
      documentUrl: request.documentUrl,
      createdAt: toISO(request.createdAt) ?? ""
    };
  }

  private toBalanceDTO(balance: LeaveBalance): LeaveBalanceDTO {
    return {
      employeeId: balance.employeeId,
      leaveType: balance.leaveType,
      balance: balance.balance
    };
  }

  private async generateRequestId(): Promise<string> {
    let nextNum = 1;
    for (;;) {
      const id = `LR-${String(nextNum).padStart(4, "0")}`;
      if (!(await this.leaveRepository.requestExists(id))) {
        return id;
      }
      nextNum++;
    }
  }

   private async emitOnLeaveSubmitted(
    employeeId: string,
    firstName: string,
    lastName: string,
    leaveType: string,
    days: number
  ): Promise<void> {
    await emitNotification(
      "onLeaveRequestSubmitted",
      { employeeId },
      employeeId,
      `${firstName} ${lastName}`,
      leaveType,
      days
    );
  }

  private async emitOnLeaveResolved(
    employeeId: string,
    status: "APPROVED" | "REJECTED"
  ): Promise<void> {
    await emitNotification(
      "onLeaveRequestResolved",
      { employeeId },
      employeeId,
      "",
      "leave",
      status
    );
  }
}
