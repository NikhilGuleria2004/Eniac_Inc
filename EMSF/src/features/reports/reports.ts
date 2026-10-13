import { getEmployees, getAttendance, getLeaveRequests, getProjects, getAssignments, getDocuments, getClients } from "../../data/mock/repositories";

export interface ReportCategory {
  id: string;
  label: string;
  description: string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface ReportResult {
  reportId: string;
  title: string;
  generatedAt: string;
  columns: string[];
  rows: Record<string, unknown>[];
  summary?: Record<string, unknown>;
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  { id: "workforce", label: "Workforce", description: "Employee headcount, status, and composition reports" },
  { id: "attendance", label: "Attendance", description: "Daily, monthly, and attendance exception reports" },
  { id: "leave", label: "Leave", description: "Leave utilization, balance, and request reports" },
  { id: "compensation", label: "Compensation", description: "Salary, pay rate, and bill rate reports" },
  { id: "documents", label: "Documents", description: "Document status, expiry, and type reports" },
  { id: "projects", label: "Projects", description: "Project workforce, allocation, and status reports" },
  { id: "assignments", label: "Assignments", description: "Employee project assignment reports" },
];

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: "workforce-headcount", name: "Employee Headcount Report", description: "Total employees by department, role, and employment status.", category: "workforce" },
  { id: "workforce-status", name: "Employee Status Report", description: "Active, terminated, and onboarding employees.", category: "workforce" },
  { id: "workforce-new-joiners", name: "New Joiners Report", description: "Employees who joined in the selected period.", category: "workforce" },
  { id: "workforce-attrition", name: "Employee Attrition Report", description: "Employees who resigned or were terminated.", category: "workforce" },
  { id: "workforce-billable", name: "Billable Workforce Report", description: "Billable vs non-billable employee breakdown.", category: "workforce" },
  { id: "attendance-monthly", name: "Monthly Attendance Report", description: "Daily attendance for a given month.", category: "attendance" },
  { id: "attendance-exceptions", name: "Attendance Exceptions", description: "Missing, late, or absent records.", category: "attendance" },
  { id: "attendance-late", name: "Late Arrival Report", description: "Late arrival incidents.", category: "attendance" },
  { id: "leave-utilization", name: "Leave Utilization", description: "Leave days taken by type and employee.", category: "leave" },
  { id: "leave-balance", name: "Leave Balance", description: "Remaining leave balance by employee.", category: "leave" },
  { id: "leave-requests", name: "Leave Requests", description: "All leave requests with status and approver.", category: "leave" },
  { id: "compensation-salary", name: "Salary Summary", description: "Salary information by employee and department.", category: "compensation" },
  { id: "compensation-pay-history", name: "Pay Rate History", description: "Historical pay rate changes.", category: "compensation" },
  { id: "compensation-bill-rate", name: "Bill Rate Summary", description: "Bill rate information for billable employees.", category: "compensation" },
  { id: "documents-status", name: "Document Status Report", description: "Documents by status and type.", category: "documents" },
  { id: "documents-expiry", name: "Document Expiry Report", description: "Documents expiring within a date range.", category: "documents" },
  { id: "projects-workforce", name: "Project Workforce", description: "Employees assigned per project with allocation.", category: "projects" },
  { id: "projects-allocation", name: "Project Allocation", description: "Allocation summary across all projects.", category: "projects" },
  { id: "projects-status", name: "Project Status", description: "Project status and progress overview.", category: "projects" },
  { id: "assignments-report", name: "Assignment Report", description: "All active and past assignments.", category: "assignments" },
];

export function getReportsByCategory(category: string): ReportDefinition[] {
  return REPORT_DEFINITIONS.filter((r) => r.category === category);
}

export function getAllReports(): ReportDefinition[] {
  return [...REPORT_DEFINITIONS];
}

function getEmployeeName(id: string): string {
  const employees = getEmployees();
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
}

function getClientId(id: string): string {
  const clients = getClients();
  const c = clients.find((cl) => cl.id === id);
  return c ? c.name : id;
}

function formatDate(date: string): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function currentDateTime(): string {
  return new Date().toISOString();
}

export function generateReportData(report: ReportDefinition): ReportResult {
  const employees = getEmployees();
  const attendance = getAttendance();
  const leaveRequests = getLeaveRequests();
  const projects = getProjects();
  const assignments = getAssignments();
  const documents = getDocuments();

  const baseResult = {
    reportId: report.id,
    title: report.name,
    generatedAt: currentDateTime(),
    columns: [] as string[],
    rows: [] as Record<string, unknown>[],
  };

  switch (report.id) {
    case "workforce-headcount": {
      const deptCounts: Record<string, number> = {};
      employees.forEach((e) => {
        deptCounts[e.department] = (deptCounts[e.department] || 0) + 1;
      });
      const rows = Object.entries(deptCounts).map(([dept, count]) => ({ Department: dept, "Headcount": count }));
      return {
        ...baseResult,
        columns: ["Department", "Headcount"],
        rows,
        summary: { totalEmployees: employees.length, totalDepartments: Object.keys(deptCounts).length },
      };
    }
    case "workforce-status": {
      const statusCounts: Record<string, number> = {};
      employees.forEach((e) => {
        statusCounts[e.employmentStatus] = (statusCounts[e.employmentStatus] || 0) + 1;
      });
      const rows = employees.map((e) => ({
        Employee: `${e.firstName} ${e.lastName}`,
        Code: e.employeeCode,
        Department: e.department,
        Designation: e.designation,
        Status: e.employmentStatus,
        "Employment Type": e.employmentType,
        Country: e.country,
        "Joining Date": formatDate(e.joiningDate),
      }));
      return {
        ...baseResult,
        columns: ["Employee", "Code", "Department", "Designation", "Status", "Employment Type", "Country", "Joining Date"],
        rows,
        summary: { total: employees.length, statusCounts },
      };
    }
    case "workforce-new-joiners": {
      const currentYear = new Date().getFullYear();
      const recent = employees.filter((e) => new Date(e.joiningDate).getFullYear() === currentYear);
      const rows = recent
        .sort((a, b) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime())
        .map((e) => ({
          Employee: `${e.firstName} ${e.lastName}`,
          Code: e.employeeCode,
          Department: e.department,
          Designation: e.designation,
          Country: e.country,
          "Joining Date": formatDate(e.joiningDate),
          "Days Employed": Math.round((Date.now() - new Date(e.joiningDate).getTime()) / (1000 * 60 * 60 * 24)),
        }));
      return {
        ...baseResult,
        columns: ["Employee", "Code", "Department", "Designation", "Country", "Joining Date", "Days Employed"],
        rows,
        summary: { total: recent.length, year: currentYear },
      };
    }
    case "workforce-attrition": {
      const exited = employees.filter((e) => ["RESIGNED", "TERMINATED", "INACTIVE"].includes(e.employmentStatus));
      const rows = exited.map((e) => ({
        Employee: `${e.firstName} ${e.lastName}`,
        Code: e.employeeCode,
        Department: e.department,
        Designation: e.designation,
        Status: e.employmentStatus,
        Country: e.country,
        "Joining Date": formatDate(e.joiningDate),
      }));
      return {
        ...baseResult,
        columns: ["Employee", "Code", "Department", "Designation", "Status", "Country", "Joining Date"],
        rows,
        summary: { total: exited.length },
      };
    }
    case "workforce-billable": {
      const billable = employees.filter((e) => e.billingStatus === "BILLABLE");
      const nonBillable = employees.filter((e) => e.billingStatus === "NON_BILLABLE");
      const rows = employees.map((e) => ({
        Employee: `${e.firstName} ${e.lastName}`,
        Code: e.employeeCode,
        Department: e.department,
        Designation: e.designation,
        "Billing Status": e.billingStatus,
        Country: e.country,
        "Hourly Rate": e.hourlyRate ?? "—",
      }));
      return {
        ...baseResult,
        columns: ["Employee", "Code", "Department", "Designation", "Billing Status", "Country", "Hourly Rate"],
        rows,
        summary: { billable: billable.length, nonBillable: nonBillable.length, total: employees.length },
      };
    }
    case "attendance-monthly": {
      const rows = attendance
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((a) => ({
          Date: formatDate(a.date),
          Employee: getEmployeeName(a.employeeId),
          Status: a.status,
          "Check In": a.checkIn || "—",
          "Check Out": a.checkOut || "—",
          "Working Hours": a.workingHours ? `${a.workingHours}h` : "—",
        }));
      return {
        ...baseResult,
        columns: ["Date", "Employee", "Status", "Check In", "Check Out", "Working Hours"],
        rows,
        summary: { totalRecords: attendance.length },
      };
    }
    case "attendance-exceptions": {
      const exceptions = attendance.filter((a) => a.status === "ABSENT" || a.status === "LATE" || a.status === "MISSING");
      const rows = exceptions
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((a) => ({
          Date: formatDate(a.date),
          Employee: getEmployeeName(a.employeeId),
          Status: a.status,
          "Check In": a.checkIn || "—",
          "Check Out": a.checkOut || "—",
        }));
      return {
        ...baseResult,
        columns: ["Date", "Employee", "Status", "Check In", "Check Out"],
        rows,
        summary: { totalExceptions: exceptions.length },
      };
    }
    case "attendance-late": {
      const late = attendance.filter((a) => a.status === "LATE");
      const rows = late
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((a) => ({
          Date: formatDate(a.date),
          Employee: getEmployeeName(a.employeeId),
          "Check In": a.checkIn || "—",
          "Working Hours": a.workingHours ? `${a.workingHours}h` : "—",
        }));
      return {
        ...baseResult,
        columns: ["Date", "Employee", "Check In", "Working Hours"],
        rows,
        summary: { totalLate: late.length },
      };
    }
    case "leave-utilization": {
      const approved = leaveRequests.filter((r) => r.status === "APPROVED");
      const rows = approved.map((r) => ({
        "Employee": getEmployeeName(r.employeeId),
        "Type": r.type,
        "Start Date": formatDate(r.startDate),
        "End Date": formatDate(r.endDate),
        "Days": r.days,
        "Status": r.status,
        "Approver": r.approvedBy ? getEmployeeName(r.approvedBy) : "—",
      }));
      const utilizationByEmployee: Record<string, number> = {};
      approved.forEach((r) => {
        const name = getEmployeeName(r.employeeId);
        utilizationByEmployee[name] = (utilizationByEmployee[name] || 0) + r.days;
      });
      return {
        ...baseResult,
        columns: ["Employee", "Type", "Start Date", "End Date", "Days", "Status", "Approver"],
        rows,
        summary: { totalDaysTaken: approved.reduce((s, r) => s + r.days, 0), byEmployee: utilizationByEmployee },
      };
    }
    case "leave-balance": {
      const rows = employees.map((e) => {
        const allocated = 20;
        const taken = leaveRequests
          .filter((r) => r.employeeId === e.id && r.status === "APPROVED")
          .reduce((sum, r) => sum + r.days, 0);
        const remaining = allocated - taken;
        return {
          Employee: `${e.firstName} ${e.lastName}`,
          Department: e.department,
          "Allocated Days": allocated,
          "Taken Days": taken,
          "Remaining Days": remaining,
        };
      });
      return {
        ...baseResult,
        columns: ["Employee", "Department", "Allocated Days", "Taken Days", "Remaining Days"],
        rows,
        summary: { totalAllocated: employees.length * 20 },
      };
    }
    case "leave-requests": {
      const rows = leaveRequests
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((r) => ({
          "Employee": getEmployeeName(r.employeeId),
          "Type": r.type,
          "Start Date": formatDate(r.startDate),
          "End Date": formatDate(r.endDate),
          "Days": r.days,
          "Status": r.status,
          "Approver": r.approvedBy ? getEmployeeName(r.approvedBy) : "—",
          "Request Date": formatDate(r.createdAt),
        }));
      return {
        ...baseResult,
        columns: ["Employee", "Type", "Start Date", "End Date", "Days", "Status", "Approver", "Request Date"],
        rows,
        summary: { totalRequests: leaveRequests.length },
      };
    }
    case "compensation-salary": {
      const rows = employees
        .filter((e) => e.hourlyRate !== undefined)
        .map((e) => ({
          "Employee": `${e.firstName} ${e.lastName}`,
          "Code": e.employeeCode,
          "Department": e.department,
          "Designation": e.designation,
          "Billing Status": e.billingStatus,
          "Hourly Rate": `$${e.hourlyRate ?? 0}`,
          "Country": e.country,
        }));
      const billableCount = employees.filter((e) => e.billingStatus === "BILLABLE").length;
      return {
        ...baseResult,
        columns: ["Employee", "Code", "Department", "Designation", "Billing Status", "Hourly Rate", "Country"],
        rows,
        summary: { total: rows.length, billableEmployees: billableCount },
      };
    }
    case "compensation-pay-history": {
      const rows = employees.map((e) => ({
        "Employee": `${e.firstName} ${e.lastName}`,
        "Code": e.employeeCode,
        "Department": e.department,
        "Current Rate": `$${e.hourlyRate ?? 0}`,
        "Billing Status": e.billingStatus,
        "Updated At": formatDate(e.updatedAt),
      }));
      return {
        ...baseResult,
        columns: ["Employee", "Code", "Department", "Current Rate", "Billing Status", "Updated At"],
        rows,
        summary: { total: rows.length },
      };
    }
    case "compensation-bill-rate": {
      const rows = employees
        .filter((e) => e.billingStatus === "BILLABLE" && e.hourlyRate !== undefined)
        .map((e) => ({
          "Employee": `${e.firstName} ${e.lastName}`,
          "Code": e.employeeCode,
          "Department": e.department,
          "Designation": e.designation,
          "Hourly Rate": `$${e.hourlyRate ?? 0}`,
          "Country": e.country,
        }));
      return {
        ...baseResult,
        columns: ["Employee", "Code", "Department", "Designation", "Hourly Rate", "Country"],
        rows,
        summary: { billableCount: rows.length },
      };
    }
    case "documents-status": {
      const rows = documents
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .map((d) => ({
          "Document": d.name,
          "Type": d.type.replace(/_/g, " "),
          "Employee": getEmployeeName(d.employeeId),
          "Status": d.status,
          "Uploaded": formatDate(d.uploadedAt),
          "Expiry": d.expiryDate ? formatDate(d.expiryDate) : "—",
          "Reviewer": d.reviewedBy ? getEmployeeName(d.reviewedBy) : "—",
        }));
      const statusCounts: Record<string, number> = {};
      documents.forEach((d) => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
      });
      return {
        ...baseResult,
        columns: ["Document", "Type", "Employee", "Status", "Uploaded", "Expiry", "Reviewer"],
        rows,
        summary: { totalDocuments: documents.length, statusCounts },
      };
    }
    case "documents-expiry": {
      const today = new Date();
      const upcoming = documents.filter(
        (d) => d.expiryDate && new Date(d.expiryDate) >= today && new Date(d.expiryDate) <= new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
      );
      const rows = upcoming
        .sort((a, b) => (a.expiryDate ? new Date(a.expiryDate).getTime() : 0) - (b.expiryDate ? new Date(b.expiryDate).getTime() : 0))
        .map((d) => ({
          "Document": d.name,
          "Type": d.type.replace(/_/g, " "),
          "Employee": getEmployeeName(d.employeeId),
          "Status": d.status,
          "Expiry Date": formatDate(d.expiryDate!),
        }));
      return {
        ...baseResult,
        columns: ["Document", "Type", "Employee", "Status", "Expiry Date"],
        rows,
        summary: { totalExpiring: upcoming.length },
      };
    }
    case "projects-workforce": {
      const rows: Record<string, unknown>[] = [];
      projects.forEach((p) => {
        const projectAssignments = assignments.filter((a) => a.projectId === p.id && a.status === "ACTIVE");
        projectAssignments.forEach((a) => {
          rows.push({
            "Project": p.name,
            "Employee": getEmployeeName(a.employeeId),
            "Role": a.role,
            "Allocation": `${a.allocation}%`,
            "Billable": a.billable ? "Yes" : "No",
            "Start Date": formatDate(a.startDate),
            "End Date": a.endDate ? formatDate(a.endDate) : "—",
          });
        });
      });
      return {
        ...baseResult,
        columns: ["Project", "Employee", "Role", "Allocation", "Billable", "Start Date", "End Date"],
        rows,
        summary: { totalProjects: projects.length, totalAssignments: rows.length },
      };
    }
    case "projects-allocation": {
      const rows = projects.map((p) => ({
        "Project": p.name,
        "Client": getClientId(p.clientId),
        "Team Size": p.teamSize,
        "Progress": `${p.progress}%`,
        "Status": p.status,
        "Health": p.health,
        "Start Date": formatDate(p.startDate),
        "End Date": formatDate(p.endDate),
      }));
      const totalAllocation = projects.reduce((s, p) => s + p.teamSize, 0);
      return {
        ...baseResult,
        columns: ["Project", "Client", "Team Size", "Progress", "Status", "Health", "Start Date", "End Date"],
        rows,
        summary: { totalProjects: projects.length, totalTeamMembers: totalAllocation, avgTeamSize: projects.length > 0 ? Math.round(totalAllocation / projects.length) : 0 },
      };
    }
    case "projects-status": {
      const rows = projects
        .sort((a, b) => b.progress - a.progress)
        .map((p) => ({
          "Project": p.name,
          "Client": getClientId(p.clientId),
          "Progress": `${p.progress}%`,
          "Status": p.status,
          "Health": p.health,
          "Team Size": p.teamSize,
          "Start Date": formatDate(p.startDate),
          "End Date": formatDate(p.endDate),
        }));
      return {
        ...baseResult,
        columns: ["Project", "Client", "Progress", "Status", "Health", "Team Size", "Start Date", "End Date"],
        rows,
        summary: { totalProjects: projects.length },
      };
    }
    case "assignments-report": {
      const rows = assignments
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        .map((a) => ({
          "Employee": getEmployeeName(a.employeeId),
          "Project": getProjectName(a.projectId),
          "Role": a.role,
          "Allocation": `${a.allocation}%`,
          "Status": a.status,
          "Billable": a.billable ? "Yes" : "No",
          "Start Date": formatDate(a.startDate),
          "End Date": a.endDate ? formatDate(a.endDate) : "—",
        }));
      const activeCount = assignments.filter((a) => a.status === "ACTIVE").length;
      return {
        ...baseResult,
        columns: ["Employee", "Project", "Role", "Allocation", "Status", "Billable", "Start Date", "End Date"],
        rows,
        summary: { totalAssignments: assignments.length, active: activeCount, ended: assignments.filter((a) => a.status === "ENDED").length, pending: assignments.filter((a) => a.status === "PENDING").length },
      };
    }
    default: {
      return {
        ...baseResult,
        columns: ["ID"],
        rows: [],
        summary: { message: "Report not yet implemented." },
      };
    }
  }
}

function getProjectName(id: string): string {
  const projects = getProjects();
  const p = projects.find((proj) => proj.id === id);
  return p ? p.name : id;
}
