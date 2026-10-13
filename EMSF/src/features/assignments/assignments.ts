import type { ProjectAssignment, Employee, Project, Client } from "../../types";
import { getEmployees, getProjects, getClients } from "../../data/mock/repositories";

export interface AssignmentKPIs {
  total: number;
  active: number;
  ended: number;
  pending: number;
  billable: number;
  nonBillable: number;
}

export interface AssignmentFilters {
  search: string;
  status: string;
  project: string;
}

export function getAssignmentKPIs(assignments: ProjectAssignment[]): AssignmentKPIs {
  return {
    total: assignments.length,
    active: assignments.filter((a) => a.status === "ACTIVE").length,
    ended: assignments.filter((a) => a.status === "ENDED").length,
    pending: assignments.filter((a) => a.status === "PENDING").length,
    billable: assignments.filter((a) => a.billable === true).length,
    nonBillable: assignments.filter((a) => a.billable === false).length,
  };
}

export function filterAssignments(assignments: ProjectAssignment[], filters: AssignmentFilters): ProjectAssignment[] {
  return assignments.filter((assignment) => {
    const emp = getEmployees().find((e) => e.id === assignment.employeeId);
    const project = getProjects().find((p) => p.id === assignment.projectId);
    const client = project ? getClients().find((c) => c.id === project.clientId) : undefined;

    const empName = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : "";
    const projName = project ? project.name.toLowerCase() : "";
    const clientName = client ? client.name.toLowerCase() : "";
    const role = assignment.role.toLowerCase();

    const matchesSearch =
      filters.search === "" ||
      empName.includes(filters.search.toLowerCase()) ||
      projName.includes(filters.search.toLowerCase()) ||
      clientName.includes(filters.search.toLowerCase()) ||
      role.includes(filters.search.toLowerCase());

    const matchesStatus = filters.status === "all" || assignment.status === filters.status;
    const matchesProject = filters.project === "all" || assignment.projectId === filters.project;

    return matchesSearch && matchesStatus && matchesProject;
  });
}

export function getAssignmentEmployee(assignment: ProjectAssignment): Employee | undefined {
  return getEmployees().find((e) => e.id === assignment.employeeId);
}

export function getAssignmentProject(assignment: ProjectAssignment): Project | undefined {
  return getProjects().find((p) => p.id === assignment.projectId);
}

export function getAssignmentClient(assignment: ProjectAssignment): Client | undefined {
  const project = getAssignmentProject(assignment);
  return project ? getClients().find((c) => c.id === project.clientId) : undefined;
}

export function getAssignmentStatusColor(status: ProjectAssignment["status"]): string {
  const colors: Record<ProjectAssignment["status"], string> = {
    ACTIVE: "badge-success",
    ENDED: "badge-neutral",
    PENDING: "badge-warning",
  };
  return colors[status] || "badge-neutral";
}

export function getAssignmentBillableVariant(billable: boolean): string {
  return billable ? "badge-success" : "badge-neutral";
}
