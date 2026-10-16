import { AttendanceRepository } from "../repositories/attendance.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import type { AttendanceRecord, AttendanceStatus } from "../models/attendance.js";
import type { Role } from "../config/constants.js";
import { NotFoundError, BusinessRuleError, AuthorizationError } from "../utils/errors.js";
import { toISO, formatDateOnly } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import type {
  CheckInInput,
  CheckOutInput,
  UpdateAttendanceInput,
  AttendanceListQuery,
  RequestCorrectionInput
} from "../schemas/attendance.schemas.js";

export interface AttendanceDTO {
  id: string;
  attendanceId: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workingHours?: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE" | "MISSING";
  correctionRequested?: boolean;
  correctionResolution?: "APPROVED" | "REJECTED";
  correctionComment?: string;
  correctionReviewedBy?: string;
}

export interface AttendanceCorrectionDTO {
  id: string;
  correctionId: string;
  attendanceId: string;
  employeeId: string;
  reason: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL_MAP: Record<AttendanceStatus, AttendanceDTO["status"]> = {
  P: "PRESENT",
  A: "ABSENT",
  L: "LATE",
  LV: "LEAVE",
  M: "MISSING"
};

const LABEL_STATUS_MAP: Record<AttendanceDTO["status"], AttendanceStatus> = {
  PRESENT: "P",
  ABSENT: "A",
  LATE: "L",
  LEAVE: "LV",
  MISSING: "M"
};

export class AttendanceService {  constructor(
    private attendanceRepository: AttendanceRepository,
    private employeeRepository: EmployeeRepository
  ) {}

  async listAttendance(
    filters: AttendanceListQuery,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<{ records: AttendanceDTO[]; total: number; page: number; pageSize: number }> {
    if (actorRole === "EMPLOYEE") {
      if (!requestingEmployeeId) {
        return { records: [], total: 0, page: filters.page, pageSize: filters.pageSize };
      }
      const { records, total } = await this.attendanceRepository.findMany({
        ...filters,
        employeeId: requestingEmployeeId
      });
      return {
        records: records.map((r) => this.toDTO(r)),
        total,
        page: filters.page,
        pageSize: filters.pageSize
      };
    }

    const { records, total } = await this.attendanceRepository.findMany(filters);
    return {
      records: records.map((r) => this.toDTO(r)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async getEmployeeAttendance(
    employeeId: string,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<{ records: AttendanceDTO[]; total: number }> {
    if (actorRole === "EMPLOYEE" && requestingEmployeeId !== employeeId) {
      throw new NotFoundError("Attendance records were not found.");
    }

    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const records = await this.attendanceRepository.findByEmployeeId(employeeId);
    return {
      records: records.map((r) => this.toDTO(r)),
      total: records.length
    };
  }

  async checkIn(
    input: CheckInInput,
    actorRole: Role,
    requestingEmployeeId: string | undefined,
    actorUserId: string
  ): Promise<AttendanceDTO> {
    if (actorRole === "ADMIN") {
      throw new AuthorizationError("Admin cannot mark attendance.");
    }

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

    const now = input.checkIn ?? new Date();

    const existing = await this.attendanceRepository.findByEmployeeAndDate(employeeId, now);
    if (existing?.checkIn) {
      throw new BusinessRuleError(
        "Employee has already checked in for this date.",
        "DUPLICATE_CHECK_IN"
      );
    }

    const attendanceId = await this.generateAttendanceId();

    const record: Omit<AttendanceRecord, "_id"> = {
      attendanceId,
      employeeId,
      date: this.toDateOnly(now),
      checkIn: now,
      status: "P",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.attendanceRepository.create(record);
    await writeAuditLog(actorRole, "attendance.checked_in", "attendance", created.attendanceId, actorUserId);

    return this.toDTO(created);
  }

  async checkOut(
    input: CheckOutInput,
    actorRole: Role,
    requestingEmployeeId: string | undefined,
    actorUserId: string
  ): Promise<AttendanceDTO> {
    if (actorRole === "ADMIN") {
      throw new AuthorizationError("Admin cannot mark attendance.");
    }

    if (actorRole === "EMPLOYEE" && !requestingEmployeeId) {
      throw new BusinessRuleError("Employee ID is required.", "EMPLOYEE_ID_REQUIRED");
    }

    const employeeId = requestingEmployeeId;
    const now = input.checkOut ?? new Date();

    const existing = await this.attendanceRepository.findByEmployeeAndDate(employeeId!, now);
    if (!existing) {
      throw new BusinessRuleError(
        "No check-in found for this date. Please check in first.",
        "CHECK_IN_REQUIRED"
      );
    }

    if (existing.checkOut) {
      throw new BusinessRuleError(
        "Employee has already checked out for this date.",
        "DUPLICATE_CHECK_OUT"
      );
    }

    if (existing.checkIn && existing.checkIn.getTime() > now.getTime()) {
      throw new BusinessRuleError(
        "Check-out time cannot be before check-in time.",
        "INVALID_TIMESTAMP"
      );
    }

    const totalMinutes = existing.checkIn
      ? Math.round((now.getTime() - existing.checkIn.getTime()) / 60000)
      : 0;
    const workingHours = Math.round((totalMinutes / 60) * 100) / 100;

    const updated = await this.attendanceRepository.update(existing.attendanceId, {
      checkOut: now,
      totalMinutes,
      workingHours
    });
    if (!updated) {
      throw new NotFoundError("Attendance record was not found.");
    }

    await writeAuditLog(actorRole, "attendance.checked_out", "attendance", existing.attendanceId, actorUserId);

    return this.toDTO(updated);
  }

  async updateAttendance(
    attendanceId: string,
    input: UpdateAttendanceInput,
    actorRole: Role,
    actorUserId: string
  ): Promise<AttendanceDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Only HR or Admin can manage attendance records.");
    }

    const record = await this.attendanceRepository.findById(attendanceId);
    if (!record) {
      throw new NotFoundError("Attendance record was not found.");
    }

    const update: Partial<AttendanceRecord> = {};
    if (input.status !== undefined) {
      update.status = LABEL_STATUS_MAP[input.status];
    }
    if (input.checkIn !== undefined) update.checkIn = input.checkIn;
    if (input.checkOut !== undefined) update.checkOut = input.checkOut;
    if (input.notes !== undefined) update.notes = input.notes;

    if (input.checkIn && input.checkOut && input.checkIn.getTime() > input.checkOut.getTime()) {
      throw new BusinessRuleError(
        "Check-out time cannot be before check-in time.",
        "INVALID_TIMESTAMP"
      );
    }

    if (update.checkIn && update.checkOut) {
      const totalMinutes = Math.round((update.checkOut.getTime() - update.checkIn.getTime()) / 60000);
      update.totalMinutes = totalMinutes;
      update.workingHours = Math.round((totalMinutes / 60) * 100) / 100;
    }

    const updated = await this.attendanceRepository.update(attendanceId, update);
    if (!updated) {
      throw new NotFoundError("Attendance record was not found.");
    }

    await writeAuditLog(actorRole, "attendance.updated", "attendance", attendanceId, actorUserId);

    return this.toDTO(updated);
  }

  async requestCorrection(
    attendanceId: string,
    input: RequestCorrectionInput,
    actorRole: Role,
    requestingEmployeeId: string | undefined,
    actorUserId: string
  ): Promise<AttendanceCorrectionDTO> {
    const record = await this.attendanceRepository.findById(attendanceId);
    if (!record) {
      throw new NotFoundError("Attendance record was not found.");
    }

    if (actorRole === "EMPLOYEE" && record.employeeId !== requestingEmployeeId) {
      throw new NotFoundError("Attendance record was not found.");
    }

    if (record.correctionRequested) {
      throw new BusinessRuleError(
        "A correction request is already pending for this record.",
        "CORRECTION_ALREADY_PENDING"
      );
    }

    const correctionId = await this.generateCorrectionId();
    const correction = await this.attendanceRepository.createCorrection({
      correctionId,
      attendanceId,
      employeeId: record.employeeId,
      reason: input.reason,
      requestedCheckIn: input.requestedCheckIn,
      requestedCheckOut: input.requestedCheckOut,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.attendanceRepository.update(attendanceId, { correctionRequested: true });

    await writeAuditLog(actorRole, "attendance.correction_requested", "attendance", attendanceId, actorUserId);

    return this.toCorrectionDTO(correction);
  }

  async listCorrections(
    filters: { status?: string; page: number; pageSize: number }
  ): Promise<{ corrections: AttendanceCorrectionDTO[]; total: number; page: number; pageSize: number }> {
    const { corrections, total } = await this.attendanceRepository.findCorrections(filters);
    return {
      corrections: corrections.map((c) => this.toCorrectionDTO(c)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async reviewCorrection(
    correctionId: string,
    decision: "APPROVED" | "REJECTED",
    comments: string,
    actorRole: Role,
    actorUserId: string
  ): Promise<AttendanceCorrectionDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Only HR or Admin can review corrections.");
    }

    const correction = await this.attendanceRepository.findCorrectionById(correctionId);
    if (!correction) {
      throw new NotFoundError("Correction request was not found.");
    }

    if (correction.status !== "PENDING") {
      throw new BusinessRuleError(
        `Correction is already ${correction.status.toLowerCase()}.`,
        "CORRECTION_ALREADY_RESOLVED"
      );
    }

    const updated = await this.attendanceRepository.updateCorrection(correctionId, {
      status: decision,
      reviewedBy: actorRole,
      reviewedAt: new Date(),
      reviewComments: comments
    });
    if (!updated) {
      throw new NotFoundError("Correction request was not found.");
    }

    await this.attendanceRepository.update(correction.attendanceId, {
      correctionRequested: false,
      correctionResolution: decision,
      correctionComment: comments,
      correctionReviewedBy: actorRole
    });

    await writeAuditLog(
      actorRole,
      `attendance.correction_${decision.toLowerCase()}`,
      "attendance",
      correction.attendanceId,
      actorUserId
    );

    return this.toCorrectionDTO(updated);
  }

  private toDateOnly(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private toDTO(record: AttendanceRecord): AttendanceDTO {
    return {
      id: record.attendanceId,
      attendanceId: record.attendanceId,
      employeeId: record.employeeId,
      date: formatDateOnly(record.date) ?? "",
      checkIn: toISO(record.checkIn),
      checkOut: toISO(record.checkOut),
      workingHours: record.workingHours,
      status: STATUS_LABEL_MAP[record.status],
      correctionRequested: record.correctionRequested,
      correctionResolution: record.correctionResolution,
      correctionComment: record.correctionComment,
      correctionReviewedBy: record.correctionReviewedBy
    };
  }

  private toCorrectionDTO(correction: {
    correctionId: string;
    attendanceId: string;
    employeeId: string;
    reason: string;
    requestedCheckIn?: Date;
    requestedCheckOut?: Date;
    status: string;
    reviewedBy?: string;
    reviewedAt?: Date;
    reviewComments?: string;
    createdAt: Date;
    updatedAt: Date;
  }): AttendanceCorrectionDTO {
    return {
      id: correction.correctionId,
      correctionId: correction.correctionId,
      attendanceId: correction.attendanceId,
      employeeId: correction.employeeId,
      reason: correction.reason,
      requestedCheckIn: toISO(correction.requestedCheckIn),
      requestedCheckOut: toISO(correction.requestedCheckOut),
      status: correction.status as AttendanceCorrectionDTO["status"],
      reviewedBy: correction.reviewedBy,
      reviewedAt: toISO(correction.reviewedAt),
      reviewComments: correction.reviewComments,
      createdAt: toISO(correction.createdAt) ?? "",
      updatedAt: toISO(correction.updatedAt) ?? ""
    };
  }

  private async generateAttendanceId(): Promise<string> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const maxDoc = await db.collection("attendance_records")
      .findOne({}, { sort: { attendanceId: -1 }, projection: { attendanceId: 1 } });

    let nextNum = 1;
    if (maxDoc?.attendanceId) {
      const match = maxDoc.attendanceId.match(/ATT-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    let id: string;
    do {
      id = `ATT-${String(nextNum).padStart(4, "0")}`;
      nextNum++;
    } while (await this.attendanceRepository.exists(id));

    return id;
  }

  private async generateCorrectionId(): Promise<string> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const maxDoc = await db.collection("attendance_corrections")
      .findOne({}, { sort: { correctionId: -1 }, projection: { correctionId: 1 } });

    let nextNum = 1;
    if (maxDoc?.correctionId) {
      const match = maxDoc.correctionId.match(/COR-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `COR-${String(nextNum).padStart(4, "0")}`;
  }
}
