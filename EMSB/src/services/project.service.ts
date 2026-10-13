import { ProjectRepository } from "../repositories/project.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import type { Project, ProjectStatus, ProjectHealth } from "../models/project.js";
import type { Role } from "../config/constants.js";
import { NotFoundError, ConflictError, BusinessRuleError } from "../utils/errors.js";
import { toISO, formatDateOnly } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectListQuery
} from "../schemas/project.schemas.js";

export interface ProjectDTO {
  id: string;
  projectId: string;
  projectCode: string;
  name: string;
  clientId: string;
  managerId: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: ProjectStatus;
  health: ProjectHealth;
  teamSize: number;
  createdAt: string;
}

const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  PLANNING: ["ACTIVE", "ON_HOLD", "CANCELLED"],
  ACTIVE: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: ["CANCELLED"],
  CANCELLED: []
};

export class ProjectService {
  constructor(
    private projectRepository: ProjectRepository,
    private clientRepository: ClientRepository,
    private employeeRepository: EmployeeRepository
  ) {}

  async listProjects(
    filters: ProjectListQuery,
    actorRole?: Role,
    requestingEmployeeId?: string
  ): Promise<{ projects: ProjectDTO[]; total: number; page: number; pageSize: number }> {
    const { projects, total } = await this.projectRepository.findMany({
      status: filters.status,
      clientId: filters.clientId,
      managerId: filters.managerId,
      page: filters.page,
      pageSize: filters.pageSize
    });

    let filtered = projects;
    if (filters.health) {
      filtered = filtered.filter((p) => p.health === filters.health);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          (p.code ?? "").toLowerCase().includes(search)
      );
    }

    if (actorRole === "EMPLOYEE" && requestingEmployeeId) {
      const assignedIds = await this.getAssignedProjectIds(requestingEmployeeId);
      filtered = filtered.filter((p) => assignedIds.has(p.projectId));
    }

    const projectDTOs = await Promise.all(
      filtered.map((p) => this.toDTO(p))
    );

    return { projects: projectDTOs, total, page: filters.page, pageSize: filters.pageSize };
  }

  async createProject(input: CreateProjectInput, actorRole: Role): Promise<ProjectDTO> {
    const client = await this.clientRepository.findById(input.clientId);
    if (!client) {
      throw new NotFoundError("Client was not found.");
    }

    if (input.code) {
      const existing = await this.projectRepository.findByCode(input.code);
      if (existing) {
        throw new ConflictError("Project code already exists.");
      }
    }

    if (input.managerId) {
      const manager = await this.employeeRepository.findByEmployeeId(input.managerId);
      if (!manager) {
        throw new NotFoundError("Manager (employee) was not found.");
      }
    }

    const projectId = await this.generateProjectId();
    const code = input.code ?? (await this.generateProjectCode());

    const project: Omit<Project, "_id"> = {
      projectId,
      clientId: input.clientId,
      name: input.name,
      code,
      description: input.description,
      status: input.status,
      health: input.health,
      startDate: input.startDate,
      endDate: input.endDate,
      managerId: input.managerId,
      progressPercent: input.progressPercent ?? 0,
      createdBy: actorRole,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.projectRepository.create(project);
    await writeAuditLog(actorRole, "project.created", "project", created.projectId);

    return this.toDTO(created);
  }

  async getProjectById(projectId: string): Promise<ProjectDTO> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project was not found.");
    }
    return this.toDTO(project);
  }

  async updateProject(
    projectId: string,
    input: UpdateProjectInput,
    actorRole: Role
  ): Promise<ProjectDTO> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project was not found.");
    }

    const update: Partial<Project> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.code !== undefined) update.code = input.code;
    if (input.description !== undefined) update.description = input.description;
    if (input.status !== undefined) update.status = input.status;
    if (input.health !== undefined) update.health = input.health;
    if (input.startDate !== undefined) update.startDate = input.startDate;
    if (input.endDate !== undefined) update.endDate = input.endDate;
    if (input.managerId !== undefined) update.managerId = input.managerId;
    if (input.progressPercent !== undefined) update.progressPercent = input.progressPercent;

    const updated = await this.projectRepository.update(projectId, update);
    if (!updated) {
      throw new NotFoundError("Project was not found.");
    }

    await writeAuditLog(actorRole, "project.updated", "project", projectId);

    return this.toDTO(updated);
  }

  async activateProject(projectId: string, actorRole: Role): Promise<ProjectDTO> {
    return this.transitionStatus(projectId, "ACTIVE", actorRole);
  }

  async completeProject(projectId: string, actorRole: Role): Promise<ProjectDTO> {
    const updated = await this.transitionStatus(projectId, "COMPLETED", actorRole);
    if (updated.progress !== 100) {
      const result = await this.projectRepository.update(projectId, {
        progressPercent: 100
      });
      return this.toDTO(result!);
    }
    return updated;
  }

  async archiveProject(projectId: string, actorRole: Role): Promise<ProjectDTO> {
    return this.transitionStatus(projectId, "CANCELLED", actorRole);
  }

  private async transitionStatus(
    projectId: string,
    targetStatus: ProjectStatus,
    actorRole: Role
  ): Promise<ProjectDTO> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project was not found.");
    }

    const allowed = VALID_TRANSITIONS[project.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new BusinessRuleError(
        `Invalid project status transition from ${project.status} to ${targetStatus}`,
        "INVALID_PROJECT_TRANSITION"
      );
    }

    const updated = await this.projectRepository.setStatus(projectId, targetStatus);
    if (!updated) {
      throw new NotFoundError("Project was not found.");
    }

    const actionMap: Record<ProjectStatus, string> = {
      PLANNING: "project.updated",
      ACTIVE: "project.activated",
      ON_HOLD: "project.updated",
      COMPLETED: "project.completed",
      CANCELLED: "project.archived"
    };

    await writeAuditLog(actorRole, actionMap[targetStatus], "project", projectId);

    return this.toDTO(updated);
  }

  private async countTeamSize(projectId: string): Promise<number> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    return db.collection("project_assignments").countDocuments({
      projectId,
      status: "ACTIVE"
    });
  }

  private async getAssignedProjectIds(employeeId: string): Promise<Set<string>> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const assignments = await db.collection("project_assignments")
      .find({ employeeId, status: "ACTIVE" }, { projection: { projectId: 1 } })
      .toArray();
    return new Set(assignments.map((a) => a.projectId as string));
  }

  private async toDTO(project: Project): Promise<ProjectDTO> {
    const teamSize = await this.countTeamSize(project.projectId);
    return {
      id: project.projectId,
      projectId: project.projectId,
      projectCode: project.code ?? project.projectId,
      name: project.name,
      clientId: project.clientId,
      managerId: project.managerId ?? "",
      description: project.description ?? "",
      startDate: formatDateOnly(project.startDate) ?? "",
      endDate: formatDateOnly(project.endDate) ?? "",
      progress: project.progressPercent ?? 0,
      status: project.status,
      health: project.health,
      teamSize,
      createdAt: toISO(project.createdAt) ?? ""
    };
  }

  private async generateProjectId(): Promise<string> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const maxDoc = await db.collection("projects")
      .findOne({}, { sort: { projectId: -1 }, projection: { projectId: 1 } });

    let nextNum = 1;
    if (maxDoc?.projectId) {
      const match = maxDoc.projectId.match(/PRO-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `PRO-${String(nextNum).padStart(3, "0")}`;
  }

  private async generateProjectCode(): Promise<string> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const maxDoc = await db.collection("projects")
      .findOne({}, { sort: { code: -1 }, projection: { code: 1 } });

    let nextNum = 1;
    if (maxDoc?.code) {
      const match = maxDoc.code.match(/PROJ(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `PROJ${String(nextNum).padStart(3, "0")}`;
  }
}
