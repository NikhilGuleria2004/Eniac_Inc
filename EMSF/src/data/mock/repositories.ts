import type { Employee, Client, Project, Attendance, LeaveRequest, LeaveBalance, Document, ProjectAssignment, Review, Notification, AuditLog, TimesheetStatus, EmploymentStatus, BillingStatus, TimesheetEligibility } from "../../types";
import { apiFetch, ApiRequestError } from "../../lib/api";
import { mockEmployees, refreshEmployees, mockClients, mockProjects, mockAssignments, mockAttendance, mockLeaveRequests, mockDocuments, mockReviews, mockNotifications, mockAuditLogs } from "./index";
export { subscribeEmployees, getEmployeesVersion } from "./index";

export function getEmployees(): Employee[] {
  return [...mockEmployees];
}

export function getEmployeeById(id: string): Employee | undefined {
  return mockEmployees.find((e) => e.id === id || e.employeeCode === id);
}

export function getEmployeeByCode(code: string): Employee | undefined {
  return mockEmployees.find((e) => e.employeeCode === code);
}

export async function createEmployee(data: Omit<Employee, "id" | "createdAt" | "updatedAt">): Promise<Employee> {
  const newEmployee: Employee = {
    ...data,
    id: data.employeeCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await apiFetch("/employees", {
    method: "POST",
    body: JSON.stringify({
      employeeId: data.employeeCode,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      workMail: data.workMail,
      phone: data.phone,
      designation: data.designation,
      department: data.department,
      country: data.country === "India" ? "INDIA" : "USA",
      employmentStatus: data.employmentStatus,
      billingStatus: data.billingStatus,
      employmentType: data.employmentType,
      joiningDate: data.joiningDate,
      address: { city: data.city, state: data.state, country: data.country === "India" ? "INDIA" : "USA" },
      compensation: data.compensation
        ? {
            currency: data.compensation.currency,
            salary: data.compensation.salary,
            payFrequency: data.compensation.payFrequency
          }
        : undefined,
      billRate: data.billRate
        ? {
            currency: data.billRate.currency,
            amount: data.billRate.amount,
            unit: data.billRate.unit
          }
        : undefined
    })
  });
  mockEmployees.push(newEmployee);
  refreshEmployees();
  return newEmployee;
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | undefined> {
  const index = mockEmployees.findIndex((e) => e.id === id || e.employeeCode === id);
  if (index === -1) return undefined;
  mockEmployees[index] = { ...mockEmployees[index], ...data, updatedAt: new Date().toISOString() };
  // Only HR-updatable fields are sent, with backend field shapes/enums.
  const body: Record<string, unknown> = {};
  if (data.firstName !== undefined) body.firstName = data.firstName;
  if (data.lastName !== undefined) body.lastName = data.lastName;
  if (data.email !== undefined) body.email = data.email;
  if (data.workMail !== undefined) body.workMail = data.workMail;
  if (data.phone !== undefined) body.phone = data.phone;
  if (data.designation !== undefined) body.designation = data.designation;
  if (data.department !== undefined) body.department = data.department;
  if (data.managerId !== undefined) body.managerId = data.managerId;
  if (data.country !== undefined) body.country = data.country === "India" ? "INDIA" : "USA";
  if (data.employmentStatus !== undefined) body.employmentStatus = data.employmentStatus;
  if (data.billingStatus !== undefined) body.billingStatus = data.billingStatus;
  if (data.employmentType !== undefined) body.employmentType = data.employmentType;
  if (data.joiningDate !== undefined) body.joiningDate = data.joiningDate;
  if (data.state !== undefined || data.city !== undefined) {
    body.address = { city: data.city, state: data.state, country: mockEmployees[index].country === "India" ? "INDIA" : "USA" };
  }
  if (data.compensation !== undefined) body.compensation = data.compensation;
  if (data.billRate !== undefined) body.billRate = data.billRate;
  await apiFetch(`/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
  refreshEmployees();
  return mockEmployees[index];
}

export async function deleteEmployee(id: string): Promise<void> {
  const index = mockEmployees.findIndex((e) => e.id === id || e.employeeCode === id);
  if (index !== -1) {
    mockEmployees.splice(index, 1);
  }
  await apiFetch(`/employees/${id}`, { method: "DELETE" }).catch((e: unknown) => console.warn("API write failed:", e));
  refreshEmployees();
}

export async function createOnboardingRecord(employeeId: string): Promise<void> {
  await apiFetch("/onboarding", {
    method: "POST",
    body: JSON.stringify({ employeeId })
  });
}

export async function updateOnboardingBilling(
  employeeId: string,
  billingStatus: "BILLABLE" | "NON_BILLABLE"
): Promise<void> {
  await apiFetch(`/onboarding/${employeeId}`, {
    method: "PATCH",
    body: JSON.stringify({ billingStatus })
  });
  const index = mockEmployees.findIndex((e) => e.id === employeeId || e.employeeCode === employeeId);
  if (index !== -1) {
    mockEmployees[index] = { ...mockEmployees[index], billingStatus };
  }
}

export interface CompensationData {
  employeeId: string;
  salary: { currency: string; amount: number; payFrequency: string } | null;
  billRate: { currency: string; amount: number; unit: string } | null;
}

export async function getCompensation(employeeId: string): Promise<CompensationData> {
  const res = await apiFetch<CompensationData>(`/employees/${employeeId}/compensation`);
  return res.data;
}

export async function saveCompensation(
  employeeId: string,
  input: {
    salary?: { currency: string; amount: number; payFrequency: "MONTHLY" | "YEARLY" | "HOURLY" };
    billRate?: { currency: string; amount: number; unit: "HOURLY" | "DAILY" | "MONTHLY" };
    reason?: string;
  }
): Promise<CompensationData> {
  const res = await apiFetch<CompensationData>(`/employees/${employeeId}/compensation`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return res.data;
}

export async function uploadEmployeeDocument(
  employeeId: string,
  doc: { name: string; type: Document["type"]; expiryDate?: string; file?: File }
): Promise<Document> {
  const newDoc: Document = {
    id: `doc-${mockDocuments.length + 1}`,
    employeeId,
    name: doc.name,
    type: doc.type,
    uploadedAt: new Date().toISOString(),
    expiryDate: doc.expiryDate,
    status: "PENDING"
  };
  await apiFetch("/documents", {
    method: "POST",
    body: JSON.stringify({
      employeeId,
      type: doc.type,
      name: doc.name,
      expiresAt: doc.expiryDate,
      metadata: doc.file
        ? {
            fileName: doc.file.name,
            mimeType: doc.file.type || "application/octet-stream",
            size: doc.file.size
          }
        : undefined
    })
  });
  mockDocuments.push(newDoc);
  return newDoc;
}

export function getClients(): Client[] {
  return [...mockClients];
}

export function getClientById(id: string): Client | undefined {
  return mockClients.find((c) => c.id === id || c.clientCode === id);
}

export function getClientsByStatus(status: Client["status"]): Client[] {
  return mockClients.filter((c) => c.status === status);
}

function nextClientId(): string {
  let max = 0;
  for (const c of mockClients) {
    const n = Number(c.id.replace(/^client-/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `client-${max + 1}`;
}

function nextClientCode(): string {
  let max = 0;
  for (const c of mockClients) {
    const n = Number(c.clientCode.replace(/^CL-/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `CL-${String(max + 1).padStart(3, "0")}`;
}

export function createClient(
  data: Omit<Client, "id" | "clientCode" | "createdAt" | "activeProjectCount">
): Client {
  const newClient: Client = {
    ...data,
    id: nextClientId(),
    clientCode: nextClientCode(),
    activeProjectCount: 0,
    createdAt: new Date().toISOString(),
  };
  mockClients.push(newClient);
  apiFetch("/clients", {
     method: "POST",
     body: JSON.stringify({
       code: nextClientCode(),
       name: data.name,
       contactPerson: data.primaryContact.name,
       email: data.primaryContact.email,
       status: data.status
     })
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return newClient;
}

export function updateClient(
  id: string,
  data: Partial<Client>
): Client | undefined {
  const index = mockClients.findIndex((c) => c.id === id || c.clientCode === id);
  if (index === -1) return undefined;
  mockClients[index] = { ...mockClients[index], ...data };
  apiFetch(`/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return mockClients[index];
}

export function getProjects(): Project[] {
  return [...mockProjects];
}

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id || p.projectCode === id);
}

export function getProjectsByClient(clientId: string): Project[] {
  return mockProjects.filter((p) => p.clientId === clientId);
}

export function getProjectsByManager(managerId: string): Project[] {
  return mockProjects.filter((p) => p.managerId === managerId);
}

function nextProjectId(): string {
  let max = 0;
  for (const p of mockProjects) {
    const n = Number(p.id.replace(/^proj-/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `proj-${max + 1}`;
}

function nextProjectCode(): string {
  let max = 0;
  for (const p of mockProjects) {
    const n = Number(p.projectCode.replace(/^PRJ-/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `PRJ-${String(max + 1).padStart(3, "0")}`;
}

export function createProject(
  data: Omit<Project, "id" | "projectCode" | "createdAt" | "teamSize">
): Project {
  const newProject: Project = {
    ...data,
    id: nextProjectId(),
    projectCode: nextProjectCode(),
    teamSize: 0,
    createdAt: new Date().toISOString(),
  };
  mockProjects.push(newProject);
  apiFetch("/projects", {
    method: "POST",
    body: JSON.stringify(data)
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return newProject;
}

export function updateProject(
  id: string,
  data: Partial<Project>
): Project | undefined {
  const index = mockProjects.findIndex((p) => p.id === id || p.projectCode === id);
  if (index === -1) return undefined;
  mockProjects[index] = { ...mockProjects[index], ...data };
  apiFetch(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return mockProjects[index];
}

export function getAssignments(): ProjectAssignment[] {
  return [...mockAssignments];
}

export function getAssignmentById(id: string): ProjectAssignment | undefined {
  return mockAssignments.find((a) => a.id === id || a.id === id);
}

function nextAssignmentId(): string {
  let max = 0;
  for (const a of mockAssignments) {
    const n = Number(a.id.replace(/^pa-/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `pa-${max + 1}`;
}

export function createAssignment(
  data: Omit<ProjectAssignment, "id" | "createdAt" | "updatedAt">
): ProjectAssignment {
  const newAssignment: ProjectAssignment = {
    ...data,
    id: nextAssignmentId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockAssignments.push(newAssignment);
  apiFetch("/assignments", {
    method: "POST",
    body: JSON.stringify(data)
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return newAssignment;
}

export function updateAssignment(
  id: string,
  data: Partial<ProjectAssignment>
): ProjectAssignment | undefined {
  const index = mockAssignments.findIndex((a) => a.id === id);
  if (index === -1) return undefined;
  mockAssignments[index] = { ...mockAssignments[index], ...data, updatedAt: new Date().toISOString() };
  apiFetch(`/assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return mockAssignments[index];
}

export function deleteAssignment(id: string, endDate?: string): boolean {
  const index = mockAssignments.findIndex((a) => a.id === id);
  if (index === -1) return false;
  mockAssignments.splice(index, 1);
  apiFetch(`/assignments/${id}/end`, {
    method: "POST",
    body: JSON.stringify({ endDate: endDate ?? new Date().toISOString() })
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return true;
}

export function getAssignmentsByEmployee(employeeId: string): ProjectAssignment[] {
  return mockAssignments.filter((a) => a.employeeId === employeeId);
}

export function getAttendance(): Attendance[] {
  return [...mockAttendance];
}

export function getAttendanceByEmployee(employeeId: string): Attendance[] {
  return mockAttendance.filter((a) => a.employeeId === employeeId);
}

export async function checkIn(data: { employeeId?: string; checkIn?: string }): Promise<Attendance | null> {
  try {
    const res = await apiFetch<Attendance>("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify(data)
    });
    const att: Attendance = {
      id: res.data.id || res.data.attendanceId || `att-${mockAttendance.length + 1}`,
      employeeId: res.data.employeeId,
      date: res.data.date,
      checkIn: res.data.checkIn,
      checkOut: res.data.checkOut,
      workingHours: res.data.workingHours,
      status: res.data.status,
      notes: res.data.notes || ""
    };
    mockAttendance.push(att);
    return att;
  } catch (error) {
    console.error(
      "Attendance check-in failed:",
      error instanceof ApiRequestError ? `${error.message} (${error.code})` : error
    );
    return null;
  }
}

export async function checkOut(data: { employeeId?: string; checkOut?: string }): Promise<Attendance | null> {
  try {
    const res = await apiFetch<Attendance>("/attendance/check-out", {
      method: "POST",
      body: JSON.stringify(data)
    });
    const today = res.data.date || new Date().toISOString().split("T")[0];
    const idx = data.employeeId
      ? mockAttendance.findIndex((a) => a.employeeId === data.employeeId && a.date === today)
      : -1;
    if (idx >= 0) {
      mockAttendance[idx] = { ...mockAttendance[idx], checkOut: res.data.checkOut, workingHours: res.data.workingHours };
      return mockAttendance[idx];
    }
    return null;
  } catch (error) {
    console.error(
      "Attendance check-out failed:",
      error instanceof ApiRequestError ? `${error.message} (${error.code})` : error
    );
    return null;
  }
}

export function requestAttendanceCorrection(
  attendanceId: string,
  data?: { reason: string; requestedCheckIn?: string; requestedCheckOut?: string }
): boolean {
  apiFetch(`/attendance/${attendanceId}/correction`, {
    method: "POST",
    body: JSON.stringify(data ?? { reason: "Correction request" })
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return true;
}

export function reviewAttendanceCorrection(
  correctionId: string,
  decision: "APPROVED" | "REJECTED",
  comments?: string
): boolean {
  apiFetch(`/attendance/corrections/${correctionId}/${decision.toLowerCase()}`, {
    method: "POST",
    body: JSON.stringify({ comments })
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return true;
}

export function getLeaveRequests(): LeaveRequest[] {
  return [...mockLeaveRequests];
}

export function getLeaveRequestById(id: string): LeaveRequest | undefined {
  return mockLeaveRequests.find((r) => r.id === id || r.id === id);
}

export function getLeaveRequestsByEmployee(employeeId: string): LeaveRequest[] {
  return mockLeaveRequests.filter((r) => r.employeeId === employeeId);
}

export async function createLeaveRequest(
  data: Omit<LeaveRequest, "id" | "createdAt" | "updatedAt">
): Promise<LeaveRequest | null> {
  try {
    const res = await apiFetch<LeaveRequest>("/leave/request", {
      method: "POST",
      body: JSON.stringify({
        employeeId: data.employeeId,
        leaveType: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        days: data.days,
        reason: data.reason
      })
    });
    return res.data;
  } catch {
    const newRequest: LeaveRequest = {
      ...data,
      id: `lr-${mockLeaveRequests.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockLeaveRequests.push(newRequest);
    return newRequest;
  }
}

export async function decideLeaveRequest(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  comments?: string
): Promise<LeaveRequest | null> {
  const index = mockLeaveRequests.findIndex((r) => r.id === requestId);
  if (index === -1) return null;

  try {
    await apiFetch(`/leave/${requestId}/${decision === "APPROVED" ? "approve" : "reject"}`, {
      method: "POST",
      body: JSON.stringify({ comments })
    });
    mockLeaveRequests[index] = { ...mockLeaveRequests[index], status: decision, updatedAt: new Date().toISOString() };
    return mockLeaveRequests[index];
  } catch {
    return null;
  }
}

export function getLeaveBalances(): LeaveBalance[] {
  return [];
}

export function getLeaveBalancesByEmployee(_employeeId: string): LeaveBalance[] {
  return [];
}

export function getDocuments(): Document[] {
  return [...mockDocuments];
}

export function getDocumentById(id: string): Document | undefined {
  return mockDocuments.find((d) => d.id === id);
}

export function getDocumentsByEmployee(employeeId: string): Document[] {
  return mockDocuments.filter((d) => d.employeeId === employeeId);
}

export function createDocument(
  data: Omit<Document, "id" | "uploadedAt"> & { file?: File }
): Document {
  const newDoc: Document = {
    ...data,
    id: `doc-${mockDocuments.length + 1}`,
    uploadedAt: new Date().toISOString(),
  };
  mockDocuments.push(newDoc);
  apiFetch("/documents", {
    method: "POST",
    body: JSON.stringify({
      employeeId: data.employeeId,
      type: data.type,
      name: data.name,
      url: data.url
    })
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return newDoc;
}

export function updateDocument(id: string, data: Partial<Document>): Document | undefined {
  const index = mockDocuments.findIndex((d) => d.id === id);
  if (index === -1) return undefined;
  mockDocuments[index] = { ...mockDocuments[index], ...data };
  apiFetch(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return mockDocuments[index];
}

export function deleteDocument(id: string): boolean {
  const index = mockDocuments.findIndex((d) => d.id === id);
  if (index === -1) return false;
  mockDocuments.splice(index, 1);
  apiFetch(`/documents/${id}`, {
    method: "DELETE"
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return true;
}

export function reviewDocument(
  id: string,
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
  comments?: string
): Document | null {
  const index = mockDocuments.findIndex((d) => d.id === id);
  if (index === -1) return null;
  const statusMap: Record<string, Document["status"]> = {
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CHANGES_REQUESTED: "CHANGES_REQUESTED"
  };
  mockDocuments[index] = { ...mockDocuments[index], status: statusMap[decision], comments: comments ?? "", updatedAt: new Date().toISOString() };
  const path = `/documents/${id}/${decision.toLowerCase().replace("_", "-")}`;
  apiFetch(path, {
    method: "POST",
    body: JSON.stringify({ comments })
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return mockDocuments[index];
}

export function getReviews(): Review[] {
  return [...mockReviews];
}

export function getReviewById(id: string): Review | undefined {
  return mockReviews.find((r) => r.id === id);
}

export function getReviewsByEmployee(employeeId: string): Review[] {
  return mockReviews.filter((r) => r.employeeId === employeeId);
}

export function getReviewsByReviewer(reviewerId: string): Review[] {
  return mockReviews.filter((r) => r.reviewerId === reviewerId);
}

export function createReview(data: Omit<Review, "id" | "status">): Review {
  const newReview: Review = {
    ...data,
    id: `rev-${mockReviews.length + 1}`,
    status: "SCHEDULED",
  };
  mockReviews.push(newReview);
  apiFetch("/reviews", {
    method: "POST",
    body: JSON.stringify(data)
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return newReview;
}

export function updateReview(id: string, data: Partial<Review>): Review | undefined {
  const index = mockReviews.findIndex((r) => r.id === id);
  if (index === -1) return undefined;
  mockReviews[index] = { ...mockReviews[index], ...data };
  apiFetch(`/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  }).catch((e: unknown) => console.warn("API write failed:", e));
  return mockReviews[index];
}

export function submitReview(id: string): Review | null {
  const index = mockReviews.findIndex((r) => r.id === id);
  if (index === -1) return null;
  mockReviews[index] = { ...mockReviews[index], status: "IN_PROGRESS" };
  apiFetch(`/reviews/${id}/submit`, { method: "POST" }).catch((e: unknown) => console.warn("API write failed:", e));
  return mockReviews[index];
}

export function completeReview(id: string): Review | null {
  const index = mockReviews.findIndex((r) => r.id === id);
  if (index === -1) return null;
  mockReviews[index] = { ...mockReviews[index], status: "COMPLETED" };
  apiFetch(`/reviews/${id}/complete`, { method: "POST" }).catch((e: unknown) => console.warn("API write failed:", e));
  return mockReviews[index];
}

export function getNotifications(): Notification[] {
  return [...mockNotifications];
}

export function getNotificationsByUser(userId: string): Notification[] {
  return mockNotifications.filter((n) => n.userId === userId);
}

export function getUnreadNotificationCount(userId: string): number {
  return mockNotifications.filter((n) => n.userId === userId && !n.read).length;
}

export function markNotificationAsRead(id: string): boolean {
  const index = mockNotifications.findIndex((n) => n.id === id);
  if (index === -1) return false;
  mockNotifications[index] = { ...mockNotifications[index], read: true, readAt: new Date().toISOString() };
  apiFetch(`/notifications/${id}/read`, { method: "POST" }).catch((e: unknown) => console.warn("API write failed:", e));
  return true;
}

export function markAllNotificationsAsRead(userId: string): number {
  let count = 0;
  mockNotifications.forEach((n, i) => {
    if (n.userId === userId && !n.read) {
      mockNotifications[i] = { ...n, read: true, readAt: new Date().toISOString() };
      count++;
    }
  });
  apiFetch("/notifications/read-all", { method: "POST" }).catch((e: unknown) => console.warn("API write failed:", e));
  return count;
}

export function getAuditLogs(): AuditLog[] {
  return [...mockAuditLogs];
}

export async function getTimesheetStatus(_employeeId: string): Promise<TimesheetStatus> {
  return {
    employeeId: _employeeId,
    status: "NOT_ELIGIBLE",
    eligible: false,
    reason: "Status check requires API integration"
  };
}

export function getSettings(): Record<string, unknown> {
  return {};
}

export interface OnboardingInviteResult {
  employeeId: string;
  email: string;
  workMail?: string;
  role: string;
  status: string;
  expiresAt: string;
  emailSent: boolean;
  createdAt: string;
}

/**
 * Sends an account invitation for a completed onboarding.
 * Unlike the fire-and-forget mutations above, this returns the API result so
 * the caller can surface success/failure (including `emailSent: false`).
 */
export async function sendOnboardingInvite(employeeId: string): Promise<OnboardingInviteResult> {
  const res = await apiFetch<OnboardingInviteResult>(`/onboarding/${employeeId}/invite`, {
    method: "POST"
  });
  return res.data;
}

export interface OnboardingApproveResult {
  employeeId: string;
  employmentStatus: EmploymentStatus;
  billingStatus: BillingStatus;
  timesheetEligibility: TimesheetEligibility;
}

export async function approveOnboarding(employeeId: string): Promise<OnboardingApproveResult> {
  const res = await apiFetch<OnboardingApproveResult>(`/onboarding/${employeeId}/approve`, {
    method: "POST"
  });
  const employee = getEmployeeById(employeeId);
  if (employee) {
    employee.employmentStatus = res.data.employmentStatus;
    employee.billingStatus = res.data.billingStatus;
    employee.timesheetEligibility = res.data.timesheetEligibility;
  }
  return res.data;
}

export async function rejectOnboarding(
  employeeId: string,
  rejectionReason: string
): Promise<{ employeeId: string; employmentStatus: EmploymentStatus }> {
  const res = await apiFetch<{ employeeId: string; employmentStatus: EmploymentStatus }>(
    `/onboarding/${employeeId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ rejectionReason })
    }
  );
  const employee = getEmployeeById(employeeId);
  if (employee) {
   employee.employmentStatus = res.data.employmentStatus;
   }
   return res.data;
 }

export interface OnboardingActivateResult {
  employeeId: string;
  employmentStatus: EmploymentStatus;
  timesheetEligibility: TimesheetEligibility;
  invitationSent: boolean;
}

export async function activateOnboarding(employeeId: string): Promise<OnboardingActivateResult> {
  const res = await apiFetch<OnboardingActivateResult>(`/onboarding/${employeeId}/activate`, {
    method: "POST"
  });
  const employee = getEmployeeById(employeeId);
  if (employee) {
    employee.employmentStatus = res.data.employmentStatus;
    employee.timesheetEligibility = res.data.timesheetEligibility;
  }
  return res.data;
}
