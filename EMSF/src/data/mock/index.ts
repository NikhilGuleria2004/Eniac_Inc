import type { Employee, Client, Project, Attendance, LeaveRequest, Document, ProjectAssignment, Review, Notification, AuditLog, EmploymentStatus, EmploymentType, BillingStatus, TimesheetEligibility, Role } from "../../types";
import { apiFetch } from "../../lib/api";

export const mockEmployees: Employee[] = [];
export const mockClients: Client[] = [];
export const mockProjects: Project[] = [];
export const mockAssignments: ProjectAssignment[] = [];
export const mockAttendance: Attendance[] = [];
export const mockLeaveRequests: LeaveRequest[] = [];
export const mockDocuments: Document[] = [];
export const mockReviews: Review[] = [];
export const mockNotifications: Notification[] = [];
export const mockAuditLogs: AuditLog[] = [];

export async function loadBackendData(): Promise<void> {
  const loadEmployees = async () => {
    const res = await apiFetch<Employee[]>("/employees?pageSize=100");
    mockEmployees.length = 0;
    mockEmployees.push(
      ...res.data.map(
        (e: any): Employee => ({
          id: e.employeeCode,
          employeeCode: e.employeeCode,
          firstName: e.firstName,
          lastName: e.lastName,
          email: e.email,
          workMail: e.workMail,
          phone: e.phone ?? "",
          avatar: e.avatar,
          designation: e.designation,
          department: e.department,
          country: e.country === "INDIA" ? "India" : "United States",
          state: e.state,
          city: e.city ?? "",
          employmentStatus: e.employmentStatus as EmploymentStatus,
          employmentType: e.employmentType as EmploymentType,
          billingStatus: e.billingStatus as BillingStatus,
          hourlyRate: e.hourlyRate,
          salary: e.salary,
          compensation: e.compensation as Employee["compensation"],
          billRate: e.billRate as Employee["billRate"],
          joiningDate: e.joiningDate,
          managerId: e.managerId,
          supervisorId: e.managerId,
          timesheetEligibility: e.timesheetEligibility as TimesheetEligibility,
          role: (e.role ?? "EMPLOYEE") as Role,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        }),
      ),
    );
  };

  const loadClients = async () => {
    const res = await apiFetch<Client[]>("/clients?pageSize=100");
    mockClients.length = 0;
    mockClients.push(...res.data);
  };

  const loadProjects = async () => {
    const res = await apiFetch<Project[]>("/projects?pageSize=100");
    mockProjects.length = 0;
    mockProjects.push(...res.data);
  };

  const loadAssignments = async () => {
    const res = await apiFetch<ProjectAssignment[]>("/assignments?pageSize=100");
    mockAssignments.length = 0;
    mockAssignments.push(...res.data);
  };

  const loadAttendance = async () => {
    const res = await apiFetch<Attendance[]>("/attendance?pageSize=100");
    mockAttendance.length = 0;
    mockAttendance.push(...res.data);
  };

  const loadLeave = async () => {
    const res = await apiFetch<LeaveRequest[]>("/leave?pageSize=100");
    mockLeaveRequests.length = 0;
    mockLeaveRequests.push(...res.data);
  };

  const loadDocuments = async () => {
    const res = await apiFetch<Document[]>("/documents?pageSize=100");
    mockDocuments.length = 0;
    mockDocuments.push(...res.data);
  };

  const loadReviews = async () => {
    const res = await apiFetch<Review[]>("/reviews?pageSize=100");
    mockReviews.length = 0;
    mockReviews.push(...res.data);
  };

  const loadNotifications = async () => {
    const res = await apiFetch<Notification[]>("/notifications?pageSize=100");
    mockNotifications.length = 0;
    mockNotifications.push(...res.data);
  };

  const loadAuditLogs = async () => {
    const res = await apiFetch<any[]>("/audit-log?pageSize=100");
    mockAuditLogs.length = 0;
    mockAuditLogs.push(
      ...res.data.map(
        (log: any): AuditLog => ({
          id: log.auditId ?? log.id ?? "",
          timestamp: log.createdAt ?? log.timestamp ?? "",
          userId: log.actorUserId ?? log.userId ?? "",
          userName: log.userName ?? "",
          role: log.actorRole ?? log.role ?? "",
          action: log.action ?? "LOGIN",
          entity: log.entityType ?? log.entity ?? "EMPLOYEE",
          entityId: log.entityId ?? "",
          description: log.description ?? `${log.action ?? "Action"} on ${log.entityType ?? "EMPLOYEE"}`,
          ipAddress: log.ipAddress ?? "",
        }),
      ),
    );
  };

  await Promise.allSettled([
    loadEmployees().catch((e) => console.error("Failed to load employees:", e)),
    loadClients().catch((e) => console.error("Failed to load clients:", e)),
    loadProjects().catch((e) => console.error("Failed to load projects:", e)),
    loadAssignments().catch((e) => console.error("Failed to load assignments:", e)),
    loadAttendance().catch((e) => console.error("Failed to load attendance:", e)),
    loadLeave().catch((e) => console.error("Failed to load leave requests:", e)),
    loadDocuments().catch((e) => console.error("Failed to load documents:", e)),
    loadReviews().catch((e) => console.error("Failed to load reviews:", e)),
    loadNotifications().catch((e) => console.error("Failed to load notifications:", e)),
    loadAuditLogs().catch((e) => console.error("Failed to load audit logs:", e)),
  ]);
}
