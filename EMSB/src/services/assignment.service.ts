import { AssignmentRepository } from "../repositories/assignment.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import type { ProjectAssignment } from "../models/assignment.js";
import type { Role } from "../config/constants.js";
import { NotFoundError, BusinessRuleError } from "../utils/errors.js";
import { formatDateOnly } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import { emitNotification } from "../utils/notification-emitter.js";
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  AssignmentListQuery
} from "../schemas/assignment.schemas.js";

export interface AssignmentDTO {
  id: string;
  assignmentId: string;
  employeeId: string;
  projectId: string;
  role: string;
  allocation: number;
  startDate: string;
  endDate?: string;
  billable: boolean;
  status: string;
  assignedBy: string;
}

export interface CreateAssignmentResult {
  assignment: AssignmentDTO;
  overallocationWarning?: string;
}

export interface EmployeeAllocationDTO {
  employeeId: string;
  totalAllocationPercent: number;
  activeAssignments: AssignmentDTO[];
  overallocated: boolean;
}

export class AssignmentService {
  constructor(
    private assignmentRepository: AssignmentRepository,
    private employeeRepository: EmployeeRepository,
    private projectRepository: ProjectRepository
  ) {}

  async listAssignments(
    filters: AssignmentListQuery,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<{ assignments: AssignmentDTO[]; total: number; page: number; pageSize: number }> {
    if (actorRole === "EMPLOYEE") {
      if (!requestingEmployeeId) {
        return { assignments: [], total: 0, page: filters.page, pageSize: filters.pageSize };
      }
      const { assignments, total } = await this.assignmentRepository.findMany({
        ...filters,
        employeeId: requestingEmployeeId
      });
      return {
        assignments: assignments.map((a) => this.toDTO(a)),
        total,
        page: filters.page,
        pageSize: filters.pageSize
      };
    }

    const { assignments, total } = await this.assignmentRepository.findMany(filters);
    return {
      assignments: assignments.map((a) => this.toDTO(a)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async getAssignmentById(
    assignmentId: string,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<AssignmentDTO> {
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError("Assignment was not found.");
    }

    if (actorRole === "EMPLOYEE" && assignment.employeeId !== requestingEmployeeId) {
      throw new NotFoundError("Assignment was not found.");
    }

    return this.toDTO(assignment);
  }

  async createAssignment(
    input: CreateAssignmentInput,
    actorRole: Role
  ): Promise<CreateAssignmentResult> {
    const employee = await this.employeeRepository.findByEmployeeId(input.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const project = await this.projectRepository.findById(input.projectId);
    if (!project) {
      throw new NotFoundError("Project was not found.");
    }

    const assignmentId = await this.generateAssignmentId();

    const assignment: Omit<ProjectAssignment, "_id"> = {
      assignmentId,
      employeeId: input.employeeId,
      projectId: input.projectId,
      role: input.role,
      allocationPercent: input.allocationPercent,
      billable: input.billable,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "ACTIVE",
      createdBy: actorRole,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.assignmentRepository.create(assignment);
    await writeAuditLog(actorRole, "assignment.created", "assignment", created.assignmentId);
    await this.emitOnAssignmentCreated(created, employee.firstName, employee.lastName, project.name);

    let overallocationWarning: string | undefined;
    const totalAllocation = await this.assignmentRepository.sumActiveAllocationByEmployee(input.employeeId);
    if (totalAllocation > 100) {
      overallocationWarning = `Employee ${input.employeeId} is now overallocated at ${totalAllocation}% across active assignments.`;
    }

    return {
      assignment: this.toDTO(created),
      overallocationWarning
    };
  }

  async updateAssignment(
    assignmentId: string,
    input: UpdateAssignmentInput,
    actorRole: Role
  ): Promise<AssignmentDTO> {
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError("Assignment was not found.");
    }

    const update: Partial<ProjectAssignment> = {};
    if (input.role !== undefined) update.role = input.role;
    if (input.allocationPercent !== undefined) update.allocationPercent = input.allocationPercent;
    if (input.billable !== undefined) update.billable = input.billable;
    if (input.endDate !== undefined) update.endDate = input.endDate;

    const updated = await this.assignmentRepository.update(assignmentId, update);
    if (!updated) {
      throw new NotFoundError("Assignment was not found.");
    }

    await writeAuditLog(actorRole, "assignment.updated", "assignment", assignmentId);

    return this.toDTO(updated);
  }

  async endAssignment(assignmentId: string, actorRole: Role): Promise<AssignmentDTO> {
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError("Assignment was not found.");
    }

    if (assignment.status !== "ACTIVE") {
      throw new BusinessRuleError(
        `Assignment is already ${assignment.status.toLowerCase()}.`,
        "ASSIGNMENT_ALREADY_ENDED"
      );
    }

    const updated = await this.assignmentRepository.setStatus(assignmentId, "ENDED");
    if (!updated) {
      throw new NotFoundError("Assignment was not found.");
    }

    await writeAuditLog(actorRole, "assignment.ended", "assignment", assignmentId);

    return this.toDTO(updated);
  }

  async getEmployeeAllocation(
    employeeId: string,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<EmployeeAllocationDTO> {
    if (actorRole === "EMPLOYEE" && requestingEmployeeId !== employeeId) {
      throw new NotFoundError("Allocation was not found.");
    }

    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const activeAssignments = await this.assignmentRepository.findActiveByEmployee(employeeId);
    const totalAllocation = activeAssignments.reduce(
      (sum, a) => sum + a.allocationPercent,
      0
    );

    return {
      employeeId,
      totalAllocationPercent: totalAllocation,
      activeAssignments: activeAssignments.map((a) => this.toDTO(a)),
      overallocated: totalAllocation > 100
    };
  }

  private toDTO(assignment: ProjectAssignment): AssignmentDTO {
    return {
      id: assignment.assignmentId,
      assignmentId: assignment.assignmentId,
      employeeId: assignment.employeeId,
      projectId: assignment.projectId,
      role: assignment.role ?? "",
      allocation: assignment.allocationPercent,
      startDate: formatDateOnly(assignment.startDate) ?? "",
      endDate: formatDateOnly(assignment.endDate),
      billable: assignment.billable,
      status: assignment.status,
      assignedBy: assignment.createdBy
    };
  }

  private async generateAssignmentId(): Promise<string> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const maxDoc = await db.collection("project_assignments")
      .findOne({}, { sort: { assignmentId: -1 }, projection: { assignmentId: 1 } });

    let nextNum = 1;
    if (maxDoc?.assignmentId) {
      const match = maxDoc.assignmentId.match(/ASN-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `ASN-${String(nextNum).padStart(4, "0")}`;
  }

   private async emitOnAssignmentCreated(
    assignment: ProjectAssignment,
    employeeName: string,
    _projectName: string,
    role: string
  ): Promise<void> {
    await emitNotification(
      "onAssignmentCreated",
      { assignmentId: assignment.assignmentId },
      assignment.employeeId,
      employeeName,
      role,
      assignment.projectId
    );
  }
}
