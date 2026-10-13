import { getEmployees, getProjects, getClients, getAssignments, getLeaveRequests, getAttendance, getReviews } from "../../data/mock/repositories";

export interface AnalyticsKPIs {
  totalEmployees: number;
  totalProjects: number;
  totalClients: number;
  activeAssignments: number;
  pendingLeave: number;
  billableAllocation: number;
  totalHours: number;
  pendingReviews: number;
}

export function computeAnalyticsKPIs(): AnalyticsKPIs {
  const employees = getEmployees();
  const projects = getProjects();
  const clients = getClients();
  const assignments = getAssignments();
  const leaveRequests = getLeaveRequests();
  const attendance = getAttendance();
  const reviews = getReviews();

  const activeAssignments = assignments.filter((a) => a.status === "ACTIVE");

  const billableEmployees = employees.filter((e) => e.billingStatus === "BILLABLE");
  const billableAllocation =
    billableEmployees.length > 0
      ? Math.round((billableEmployees.length / employees.length) * 100)
      : 0;

  const totalHours = attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);

  return {
    totalEmployees: employees.length,
    totalProjects: projects.filter((p) => p.status !== "CANCELLED").length,
    totalClients: clients.filter((c) => c.status === "ACTIVE").length,
    activeAssignments: activeAssignments.length,
    pendingLeave: leaveRequests.filter((l) => l.status === "PENDING").length,
    billableAllocation,
    totalHours: Math.round(totalHours),
    pendingReviews: reviews.filter((r) => r.status === "SCHEDULED" || r.status === "IN_PROGRESS").length,
  };
}
