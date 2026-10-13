export type Role = "ADMIN" | "HR" | "MANAGER" | "SUPERVISOR" | "EMPLOYEE";

export type EmploymentStatus =
  | "ONBOARDING"
  | "ACTIVE"
  | "ON_LEAVE"
  | "SUSPENDED"
  | "RESIGNED"
  | "TERMINATED"
  | "INACTIVE";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT";

export type BillingStatus = "BILLABLE" | "NON_BILLABLE";

export type TimesheetEligibility =
  | "NOT_ELIGIBLE"
  | "ELIGIBLE"
  | "PENDING_PROVISIONING"
  | "PROVISIONED"
  | "PROVISIONING_FAILED";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatar?: string;
  designation?: string;
  department?: string;
  employeeId?: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  workMail?: string;
  phone: string;
  avatar?: string;
  designation: string;
  department: string;
  country: "India" | "United States";
  state?: string;
  city: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  billingStatus: BillingStatus;
  hourlyRate?: number;
  salary?: number;
  compensation?: {
    currency?: string;
    salary?: number;
    payFrequency?: "MONTHLY" | "YEARLY" | "HOURLY";
  };
  billRate?: {
    currency?: string;
    amount?: number;
    unit?: "HOURLY" | "DAILY" | "MONTHLY";
  };
  joiningDate: string;
  managerId?: string;
  supervisorId?: string;
  timesheetEligibility: TimesheetEligibility;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  clientCode: string;
  name: string;
  country: string;
  industry: string;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  status: "PROSPECT" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CLOSED";
  activeProjectCount: number;
  createdAt: string;
}

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  clientId: string;
  managerId: string;
  supervisorId?: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED";
  teamSize: number;
  createdAt: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workingHours?: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE" | "MISSING";
  correctionRequested?: boolean;
  /** Optional review outcome set when HR/ADMIN resolves a correction request (Phase 12). */
  correctionResolution?: "APPROVED" | "REJECTED";
  correctionComment?: string;
  correctionReviewedBy?: string;
  attendanceId?: string;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: "PAID" | "SICK" | "CASUAL" | "UNPAID";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  approvedBy?: string;
  reviewComment?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  employeeId: string;
  name: string;
  type:
    | "RESUME"
    | "OFFER_LETTER"
    | "EMPLOYMENT_AGREEMENT"
    | "ID_PROOF"
    | "ADDRESS_PROOF"
    | "TAX_DOCUMENT"
    | "BANK_DOCUMENT"
    | "CERTIFICATE"
    | "NDA"
    | "OTHER";
  uploadedAt: string;
  expiryDate?: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED" | "CHANGES_REQUESTED";
  reviewedBy?: string;
  comments?: string;
  url?: string;
  documentUrl?: string;
  updatedAt?: string;
}

export interface ProjectAssignment {
  id: string;
  employeeId: string;
  projectId: string;
  role: string;
  allocation: number;
  startDate: string;
  endDate?: string;
  billable: boolean;
  status: "ACTIVE" | "ENDED" | "PENDING";
  assignedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  employeeId: string;
  reviewerId: string;
  reviewPeriod: string;
  rating: number;
  strengths: string;
  improvementAreas: string;
  goals: string;
  comments: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ACKNOWLEDGED";
  reviewDate: string;
  acknowledgedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "LEAVE" | "DOCUMENT" | "PROJECT" | "ONBOARDING" | "ATTENDANCE" | "SYSTEM";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  readAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: "CREATE" | "UPDATE" | "APPROVE" | "REJECT" | "ASSIGN" | "DEACTIVATE" | "LOGIN";
  entity: "EMPLOYEE" | "CLIENT" | "PROJECT" | "DOCUMENT" | "LEAVE" | "ATTENDANCE" | "REVIEW";
  entityId: string;
  description: string;
  ipAddress: string;
}

export type Permission =
  | "employee.view"
  | "employee.create"
  | "employee.edit"
  | "employee.delete"
  | "employee.deactivate"
  | "onboarding.manage"
  | "document.manage"
  | "document.view"
  | "document.review"
  | "attendance.manage"
  | "attendance.view"
  | "attendance.mark"
  | "leave.manage"
  | "leave.approve"
  | "leave.view"
  | "review.manage"
  | "review.view"
  | "compensation.view"
  | "compensation.manage"
  | "client.manage"
  | "client.view"
  | "project.manage"
  | "project.view"
  | "assignment.manage"
  | "assignment.view"
  | "report.view"
  | "audit.view"
  | "settings.manage"
  | "notification.view"
  | "profile.edit"
  | "salary.view"
  | "billRate.view";

export interface LeaveBalance {
  id: string;
  employeeId: string;
  type: "PAID" | "SICK" | "CASUAL" | "UNPAID";
  total: number;
  used: number;
  remaining: number;
  year: number;
}

export interface TimesheetStatus {
  employeeId: string;
  status: "NOT_ELIGIBLE" | "ELIGIBLE" | "PENDING_PROVISIONING" | "PROVISIONED" | "PROVISIONING_FAILED";
  eligible: boolean;
  reason?: string;
}
