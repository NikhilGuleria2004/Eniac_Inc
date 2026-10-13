import { getDb } from "../config/database.js";
import { toISO } from "../utils/dates.js";
import type { Document } from "mongodb";

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

export const REPORT_CATEGORIES = [
  { id: "workforce", label: "Workforce", description: "Employee headcount, status, and composition reports" },
  { id: "attendance", label: "Attendance", description: "Daily, monthly, and attendance exception reports" },
  { id: "leave", label: "Leave", description: "Leave utilization, balance, and request reports" },
  { id: "compensation", label: "Compensation", description: "Salary, pay rate, and bill rate reports" },
  { id: "documents", label: "Documents", description: "Document status, expiry, and type reports" },
  { id: "projects", label: "Projects", description: "Project workforce, allocation, and status reports" },
  { id: "assignments", label: "Assignments", description: "Employee project assignment reports" }
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
  { id: "assignments-report", name: "Assignment Report", description: "All active and past assignments.", category: "assignments" }
];

export interface ReportQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  department?: string;
  employeeId?: string;
  projectId?: string;
  clientId?: string;
  status?: string;
  documentType?: string;
  startDate?: string;
  endDate?: string;
}

export class ReportService {
  private get db(): ReturnType<typeof getDb> {
    return getDb();
  }

  getReportDefinitions(category?: string): ReportDefinition[] {
    if (category) {
      return REPORT_DEFINITIONS.filter((r) => r.category === category);
    }
    return REPORT_DEFINITIONS;
  }

  getCategories(): typeof REPORT_CATEGORIES {
    return REPORT_CATEGORIES;
  }

  async generateReport(reportId: string, query: ReportQuery): Promise<ReportResult> {
    const report = REPORT_DEFINITIONS.find((r) => r.id === reportId);
    if (!report) {
      return {
        reportId,
        title: "Unknown Report",
        generatedAt: new Date().toISOString(),
        columns: ["ID"],
        rows: [],
        summary: { message: "Report not found." }
      };
    }

    switch (reportId) {
      case "workforce-headcount":
        return this.workforceHeadcount(query);
      case "workforce-status":
        return this.workforceStatus(query);
      case "workforce-new-joiners":
        return this.workforceNewJoiners(query);
      case "workforce-attrition":
        return this.workforceAttrition();
      case "workforce-billable":
        return this.workforceBillable();
      case "attendance-monthly":
        return this.attendanceMonthly(query);
      case "attendance-exceptions":
        return this.attendanceExceptions();
      case "attendance-late":
        return this.attendanceLate();
      case "leave-utilization":
        return this.leaveUtilization();
      case "leave-balance":
        return this.leaveBalance();
      case "leave-requests":
        return this.leaveRequests(query);
      case "compensation-salary":
        return this.compensationSalary();
      case "compensation-pay-history":
        return this.compensationPayHistory();
      case "compensation-bill-rate":
        return this.compensationBillRate();
      case "documents-status":
        return this.documentsStatus();
      case "documents-expiry":
        return this.documentsExpiry();
      case "projects-workforce":
        return this.projectsWorkforce();
      case "projects-allocation":
        return this.projectsAllocation();
      case "projects-status":
        return this.projectsStatus();
      case "assignments-report":
        return this.assignmentsReport(query);
      default:
        return {
          reportId,
         title: report.name,
          generatedAt: new Date().toISOString(),
          columns: ["ID"],
          rows: [],
          summary: { message: "Report not yet implemented." }
        };
    }
  }

  private async workforceHeadcount(query: ReportQuery): Promise<ReportResult> {
    const pipeline: Document[] = [];
    if (query.department) {
      pipeline.push({ $match: { department: query.department } });
    }
    pipeline.push({
      $group: {
        _id: "$department",
        headcount: { $sum: 1 },
        billableCount: { $sum: { $cond: [{ $eq: ["$billingStatus", "BILLABLE"] }, 1, 0] } },
        nonBillableCount: { $sum: { $cond: [{ $eq: ["$billingStatus", "NON_BILLABLE"] }, 1, 0] } }
      }
    });

    const rows = await this.db.collection("employees").aggregate(pipeline).toArray();
    const total = await this.db.collection("employees").countDocuments(
      query.department ? { department: query.department } : {}
    );

    return {
      reportId: "workforce-headcount",
      title: "Employee Headcount Report",
      generatedAt: new Date().toISOString(),
      columns: ["Department", "Headcount", "Billable", "Non-Billable"],
      rows: rows.map((r) => ({
        Department: r._id,
        Headcount: r.headcount,
        Billable: r.billableCount,
        "Non-Billable": r.nonBillableCount
      })),
      summary: { totalEmployees: total, totalDepartments: rows.length }
    };
  }

  private async workforceStatus(query: ReportQuery): Promise<ReportResult> {
    const { page = 1, pageSize = 50 } = query;
    const skip = (page - 1) * pageSize;

    const pipeline: Document[] = [];
    if (query.department) {
      pipeline.push({ $match: { department: query.department } });
    }
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
      {
        $lookup: {
          from: "users",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }
    );

    const rows = await this.db.collection("employees").aggregate(pipeline).toArray();
    const total = await this.db.collection("employees").countDocuments(
      query.department ? { department: query.department } : {}
    );

    return {
      reportId: "workforce-status",
      title: "Employee Status Report",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Code", "Department", "Designation", "Status", "Employment Type", "Country", "Joining Date"],
      rows: rows.map((e) => ({
        Employee: `${e.firstName} ${e.lastName}`,
        Code: e.employeeId,
        Department: e.department,
        Designation: e.designation,
        Status: e.employmentStatus,
        "Employment Type": e.employmentType,
        Country: e.country === "INDIA" ? "India" : e.country === "USA" ? "United States" : e.country,
        "Joining Date": toISO(e.joiningDate)
      })),
      summary: {
        total,
        ...(await this.db.collection("employees").aggregate([
          { $group: { _id: "$employmentStatus", count: { $sum: 1 } } }
        ]).toArray()).reduce((acc, d) => { acc[d._id] = d.count; return acc; }, {} as Record<string, number>)
      }
    };
  }

  private async workforceNewJoiners(query: ReportQuery): Promise<ReportResult> {
    const { page = 1, pageSize = 50 } = query;
    const skip = (page - 1) * pageSize;

    const pipeline: Document[] = [];
    const currentYear = new Date().getFullYear();
    const matchStage: Record<string, unknown> = {
      joiningDate: {
        $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`)
      }
    };
    if (query.department) {
      matchStage.department = query.department;
    }
    pipeline.push({ $match: matchStage });
    pipeline.push(
      { $sort: { joiningDate: -1 } },
      { $skip: skip },
      { $limit: pageSize }
    );

    const rows = await this.db.collection("employees").aggregate(pipeline).toArray();
    const total = await this.db.collection("employees").countDocuments(matchStage);

    const now = new Date();

    return {
      reportId: "workforce-new-joiners",
      title: "New Joiners Report",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Code", "Department", "Designation", "Country", "Joining Date", "Days Employed"],
      rows: rows.map((e) => ({
        Employee: `${e.firstName} ${e.lastName}`,
        Code: e.employeeId,
        Department: e.department,
        Designation: e.designation,
        Country: e.country === "INDIA" ? "India" : e.country === "USA" ? "United States" : e.country,
        "Joining Date": toISO(e.joiningDate),
        "Days Employed": Math.round((now.getTime() - new Date(e.joiningDate).getTime()) / (1000 * 60 * 60 * 24))
      })),
      summary: { total, year: currentYear }
    };
  }

  private async workforceAttrition(): Promise<ReportResult> {
    const pipeline = [
      {
        $match: {
          employmentStatus: { $in: ["RESIGNED", "TERMINATED", "INACTIVE"] }
        }
      },
      { $sort: { updatedAt: -1 } }
    ];

    const rows = await this.db.collection("employees").aggregate(pipeline).toArray();

    return {
      reportId: "workforce-attrition",
      title: "Employee Attrition Report",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Code", "Department", "Designation", "Status", "Country", "Joining Date"],
      rows: rows.map((e) => ({
        Employee: `${e.firstName} ${e.lastName}`,
        Code: e.employeeId,
        Department: e.department,
        Designation: e.designation,
        Status: e.employmentStatus,
        Country: e.country === "INDIA" ? "India" : e.country === "USA" ? "United States" : e.country,
        "Joining Date": toISO(e.joiningDate)
      })),
      summary: { total: rows.length }
    };
  }

  private async workforceBillable(): Promise<ReportResult> {
    const pipeline = [
      {
        $group: {
          _id: null,
          billable: { $sum: { $cond: [{ $eq: ["$billingStatus", "BILLABLE"] }, 1, 0] } },
          nonBillable: { $sum: { $cond: [{ $eq: ["$billingStatus", "NON_BILLABLE"] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ];

    const result = await this.db.collection("employees").aggregate(pipeline).toArray();
    const stats = result[0] || { billable: 0, nonBillable: 0, total: 0 };

    const detailPipeline = [
      {
        $project: {
          Employee: { $concat: ["$firstName", " ", "$lastName"] },
          Code: "$employeeId",
          Department: 1,
          Designation: 1,
          "Billing Status": "$billingStatus",
          Country: {
            $switch: {
              branches: [
                { case: { $eq: ["$country", "INDIA"] }, then: "India" },
                { case: { $eq: ["$country", "USA"] }, then: "United States" }
              ],
              default: "$country"
            }
          }
        }
      }
    ];

    const details = await this.db.collection("employees").aggregate(detailPipeline).toArray();

    return {
      reportId: "workforce-billable",
      title: "Billable Workforce Report",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Code", "Department", "Designation", "Billing Status", "Country"],
      rows: details,
      summary: { billable: stats.billable, nonBillable: stats.nonBillable, total: stats.total }
    };
  }

  private async attendanceMonthly(query: ReportQuery): Promise<ReportResult> {
    const pipeline: Document[] = [];
    if (query.employeeId) {
      pipeline.push({ $match: { employeeId: query.employeeId } });
    }
    pipeline.push(
      { $sort: { date: 1 } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } }
    );

    const rows = await this.db.collection("attendance_records").aggregate(pipeline).toArray();
    const total = await this.db.collection("attendance_records").countDocuments(
      query.employeeId ? { employeeId: query.employeeId } : {}
    );

    return {
      reportId: "attendance-monthly",
      title: "Monthly Attendance Report",
      generatedAt: new Date().toISOString(),
      columns: ["Date", "Employee", "Status", "Check In", "Check Out", "Working Hours"],
      rows: rows.map((r) => ({
        Date: toISO(r.date),
        Employee: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
        Status: r.status,
        "Check In": r.checkIn ? toISO(r.checkIn) : "—",
        "Check Out": r.checkOut ? toISO(r.checkOut) : "—",
        "Working Hours": r.workingHours ? `${r.workingHours}h` : "—"
      })),
      summary: { totalRecords: total }
    };
  }

  private async attendanceExceptions(): Promise<ReportResult> {
    const pipeline = [
      {
        $match: {
          status: { $in: ["ABSENT", "LATE", "MISSING"] }
        }
      },
      { $sort: { date: 1 } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } }
    ];

    const rows = await this.db.collection("attendance_records").aggregate(pipeline).toArray();

    return {
      reportId: "attendance-exceptions",
      title: "Attendance Exceptions",
      generatedAt: new Date().toISOString(),
      columns: ["Date", "Employee", "Status", "Check In", "Check Out"],
      rows: rows.map((r) => ({
        Date: toISO(r.date),
        Employee: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
        Status: r.status,
        "Check In": r.checkIn ? toISO(r.checkIn) : "—",
        "Check Out": r.checkOut ? toISO(r.checkOut) : "—"
      })),
      summary: { totalExceptions: rows.length }
    };
  }

  private async attendanceLate(): Promise<ReportResult> {
    const pipeline = [
      {
        $match: { status: "LATE" }
      },
      { $sort: { date: -1 } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } }
    ];

    const rows = await this.db.collection("attendance_records").aggregate(pipeline).toArray();

    return {
      reportId: "attendance-late",
      title: "Late Arrival Report",
      generatedAt: new Date().toISOString(),
      columns: ["Date", "Employee", "Check In", "Working Hours"],
      rows: rows.map((r) => ({
        Date: toISO(r.date),
        Employee: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
        "Check In": r.checkIn ? toISO(r.checkIn) : "—",
        "Working Hours": r.workingHours ? `${r.workingHours}h` : "—"
      })),
      summary: { totalLate: rows.length }
    };
  }

  private async leaveUtilization(): Promise<ReportResult> {
    const pipeline = [
      { $match: { status: "APPROVED" } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } }
    ];

    const rows = await this.db.collection("leave_requests").aggregate(pipeline).toArray();
    const totalDays = rows.reduce((sum, r) => sum + (r.days || 0), 0);

    const byEmployee = rows.reduce((acc, r) => {
      const name = r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId;
      acc[name] = (acc[name] || 0) + (r.days || 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      reportId: "leave-utilization",
      title: "Leave Utilization",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Type", "Start Date", "End Date", "Days", "Status", "Approver"],
      rows: rows.map((r) => ({
        Employee: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
        Type: r.leaveType,
        "Start Date": toISO(r.startDate),
        "End Date": toISO(r.endDate),
        Days: r.days,
        Status: r.status,
        Approver: "—"
      })),
      summary: { totalDaysTaken: totalDays, byEmployee }
    };
  }

  private async leaveBalance(): Promise<ReportResult> {
    const pipeline = [
      {
        $lookup: {
          from: "leave_types",
          localField: "leaveType",
          foreignField: "code",
          as: "type"
        }
      },
      { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } }
    ];

    const balances = await this.db.collection("leave_balances").aggregate(pipeline).toArray();

    const totalAllocated = balances.reduce((sum, b) => sum + ((b.type?.annualAllowance as number) || 0), 0);

    return {
      reportId: "leave-balance",
      title: "Leave Balance",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Department", "Type", "Allocated Days", "Taken Days", "Remaining Days"],
      rows: balances.map((b) => ({
        Employee: b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : b.employeeId,
        Department: b.employee?.department || "—",
        Type: b.type?.name || b.leaveType,
        "Allocated Days": b.type?.annualAllowance || 0,
        "Taken Days": 0,
        "Remaining Days": b.balance
      })),
      summary: { totalAllocated }
    };
  }

  private async leaveRequests(query: ReportQuery): Promise<ReportResult> {
    const { page = 1, pageSize = 50 } = query;
    const skip = (page - 1) * pageSize;

    const pipeline: Document[] = [
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } }
    ];

    if (query.status) {
      pipeline.unshift({ $match: { status: query.status } });
    }

    const rows = await this.db.collection("leave_requests").aggregate(pipeline).toArray();
    const total = await this.db.collection("leave_requests").countDocuments(
      query.status ? { status: query.status } : {}
    );

    return {
      reportId: "leave-requests",
      title: "Leave Requests",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Type", "Start Date", "End Date", "Days", "Status", "Approver", "Request Date"],
      rows: rows.map((r) => ({
        Employee: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId,
        Type: r.leaveType,
        "Start Date": toISO(r.startDate),
        "End Date": toISO(r.endDate),
        Days: r.days,
        Status: r.status,
        Approver: "—",
        "Request Date": toISO(r.createdAt)
      })),
      summary: { totalRequests: total }
    };
  }

  private async compensationSalary(): Promise<ReportResult> {
    const pipeline = [
      { $match: { compensation: { $exists: true } } },
      {
        $project: {
          Employee: { $concat: ["$firstName", " ", "$lastName"] },
          Code: "$employeeId",
          Department: 1,
          Designation: 1,
          "Billing Status": "$billingStatus",
          "Salary Amount": { $ifNull: ["$compensation.salary.amount", 0] },
          "Salary Currency": { $ifNull: ["$compensation.salary.currency", "USD"] },
          "Pay Frequency": { $ifNull: ["$compensation.salary.payFrequency", "MONTHLY"] },
          Country: {
            $switch: {
              branches: [
                { case: { $eq: ["$country", "INDIA"] }, then: "India" },
                { case: { $eq: ["$country", "USA"] }, then: "United States" }
              ],
              default: "$country"
            }
          }
        }
      }
    ];

    const rows = await this.db.collection("employees").aggregate(pipeline).toArray();
    const billableCount = await this.db.collection("employees").countDocuments({ billingStatus: "BILLABLE" });

    return {
      reportId: "compensation-salary",
      title: "Salary Summary",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Code", "Department", "Designation", "Billing Status", "Salary Amount", "Salary Currency", "Pay Frequency", "Country"],
      rows,
      summary: { total: rows.length, billableEmployees: billableCount }
    };
  }

  private async compensationPayHistory(): Promise<ReportResult> {
    const pipeline = [
      {
        $lookup: {
          from: "employee_compensation_history",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "history"
        }
      },
      { $unwind: { path: "$history", preserveNullAndEmptyArrays: true } },
      { $sort: { "history.effectiveFrom": -1 } },
      {
        $project: {
          Employee: { $concat: ["$firstName", " ", "$lastName"] },
          Code: "$employeeId",
          Department: 1,
          "Current Rate": { $ifNull: ["$history.amount", 0] },
          "Billing Status": "$billingStatus",
          "Updated At": { $ifNull: ["$history.effectiveFrom", "$updatedAt"] }
        }
      }
    ];

    const rows = await this.db.collection("employees").aggregate(pipeline).toArray();

    return {
      reportId: "compensation-pay-history",
      title: "Pay Rate History",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Code", "Department", "Current Rate", "Billing Status", "Updated At"],
      rows,
      summary: { total: rows.length }
    };
  }

  private async compensationBillRate(): Promise<ReportResult> {
    const pipeline = [
      { $match: { billingStatus: "BILLABLE" } },
      {
        $project: {
          Employee: { $concat: ["$firstName", " ", "$lastName"] },
          Code: "$employeeId",
          Department: 1,
          Designation: 1,
          "Hourly Rate": { $ifNull: ["$compensation.billRate.amount", 0] },
          Country: {
            $switch: {
              branches: [
                { case: { $eq: ["$country", "INDIA"] }, then: "India" },
                { case: { $eq: ["$country", "USA"] }, then: "United States" }
              ],
              default: "$country"
            }
          }
        }
      }
    ];

    const rows = await this.db.collection("employees").aggregate(pipeline).toArray();

    return {
      reportId: "compensation-bill-rate",
      title: "Bill Rate Summary",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Code", "Department", "Designation", "Hourly Rate", "Country"],
      rows,
      summary: { billableEmployees: rows.length }
    };
  }

  private async documentsStatus(): Promise<ReportResult> {
    const pipeline = [
      { $sort: { uploadedAt: -1 } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } }
    ];

    const rows = await this.db.collection("documents").aggregate(pipeline).toArray();

    const statusCounts = await this.db.collection("documents").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();

    return {
      reportId: "documents-status",
      title: "Document Status Report",
      generatedAt: new Date().toISOString(),
      columns: ["Document", "Type", "Employee", "Status", "Uploaded", "Expiry", "Reviewer"],
      rows: rows.map((d) => ({
        Document: d.name,
        Type: d.type?.replace(/_/g, " "),
        Employee: d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : d.employeeId,
        Status: d.status,
        Uploaded: toISO(d.uploadedAt),
        Expiry: d.expiresAt ? toISO(d.expiresAt) : "—",
        Reviewer: d.reviewedBy || "—"
      })),
      summary: {
        totalDocuments: rows.length,
        statusCounts: statusCounts.reduce((acc, d) => { acc[d._id] = d.count; return acc; }, {} as Record<string, number>)
      }
    };
  }

  private async documentsExpiry(): Promise<ReportResult> {
    const today = new Date();
    const upcomingDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          expiresAt: {
            $gte: today,
            $lte: upcomingDate
          },
          status: { $ne: "EXPIRED" }
        }
      },
      { $sort: { expiresAt: 1 } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } }
    ];

    const rows = await this.db.collection("documents").aggregate(pipeline).toArray();

    return {
      reportId: "documents-expiry",
      title: "Document Expiry Report",
      generatedAt: new Date().toISOString(),
      columns: ["Document", "Type", "Employee", "Status", "Expiry Date"],
      rows: rows.map((d) => ({
        Document: d.name,
        Type: d.type?.replace(/_/g, " "),
        Employee: d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : d.employeeId,
        Status: d.status,
        "Expiry Date": toISO(d.expiresAt)
      })),
      summary: { totalExpiring: rows.length }
    };
  }

  private async projectsWorkforce(): Promise<ReportResult> {
    const pipeline = [
      { $match: { status: "ACTIVE" } },
      {
        $lookup: {
          from: "project_assignments",
          localField: "projectId",
          foreignField: "projectId",
          as: "assignments"
        }
      },
      { $unwind: "$assignments" },
      {
        $lookup: {
          from: "employees",
          localField: "assignments.employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      { $sort: { "assignments.startDate": 1 } }
    ];

    const rows = await this.db.collection("projects").aggregate(pipeline).toArray();

    return {
      reportId: "projects-workforce",
      title: "Project Workforce",
      generatedAt: new Date().toISOString(),
      columns: ["Project", "Employee", "Role", "Allocation", "Billable", "Start Date", "End Date"],
      rows: rows.map((r) => ({
        Project: r.name,
        Employee: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.assignments.employeeId,
        Role: r.assignments.role,
        Allocation: `${r.assignments.allocationPercent}%`,
        Billable: r.assignments.billable ? "Yes" : "No",
        "Start Date": toISO(r.assignments.startDate),
        "End Date": r.assignments.endDate ? toISO(r.assignments.endDate) : "—"
      })),
      summary: { totalProjects: rows.length, totalAssignments: rows.length }
    };
  }

  private async projectsAllocation(): Promise<ReportResult> {
    const pipeline = [
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "clientId",
          as: "client"
        }
      },
      { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "project_assignments",
          localField: "projectId",
          foreignField: "projectId",
          as: "assignments"
        }
      },
      {
        $addFields: {
          teamSize: {
            $size: {
              $filter: {
                input: "$assignments",
                cond: { $eq: ["$$this.status", "ACTIVE"] }
              }
            }
          }
        }
      },
      {
        $project: {
          Project: "$name",
          Client: { $ifNull: ["$client.name", "-"] },
          "Team Size": "$teamSize",
          Progress: { $concat: [{ $toString: { $ifNull: ["$progressPercent", 0] } }, "%"] },
          Status: "$status",
          Health: { $ifNull: ["$health", "UNKNOWN"] },
          "Start Date": { $ifNull: ["$startDate", "$createdAt"] },
          "End Date": { $ifNull: ["$endDate", null] }
        }
      }
    ];

    const rows = await this.db.collection("projects").aggregate(pipeline).toArray();
    const totalTeam = rows.reduce((sum, r) => sum + (r["Team Size"] as number), 0);

    return {
      reportId: "projects-allocation",
      title: "Project Allocation",
      generatedAt: new Date().toISOString(),
      columns: ["Project", "Client", "Team Size", "Progress", "Status", "Health", "Start Date", "End Date"],
      rows: rows.map((r) => ({
        Project: r.Project,
        Client: r.Client,
        "Team Size": r["Team Size"],
        Progress: r.Progress,
        Status: r.Status,
        Health: r.Health,
        "Start Date": toISO(r["Start Date"]),
        "End Date": r["End Date"] ? toISO(r["End Date"] as Date) : "—"
      })),
      summary: {
        totalProjects: rows.length,
        totalTeamMembers: totalTeam,
        avgTeamSize: rows.length > 0 ? Math.round(totalTeam / rows.length) : 0
      }
    };
  }

  private async projectsStatus(): Promise<ReportResult> {
    const pipeline = [
      { $sort: { progressPercent: -1 } },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "clientId",
          as: "client"
        }
      },
      { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "project_assignments",
          localField: "projectId",
          foreignField: "projectId",
          as: "assignments"
        }
      },
      {
        $addFields: {
          teamSize: {
            $size: {
              $filter: {
                input: "$assignments",
                cond: { $eq: ["$$this.status", "ACTIVE"] }
              }
            }
          }
        }
      },
      {
        $project: {
          Project: "$name",
          Client: { $ifNull: ["$client.name", "-"] },
          Progress: { $concat: [{ $toString: { $ifNull: ["$progressPercent", 0] } }, "%"] },
          Status: "$status",
          Health: { $ifNull: ["$health", "UNKNOWN"] },
          "Team Size": "$teamSize",
          "Start Date": { $ifNull: ["$startDate", "$createdAt"] },
          "End Date": { $ifNull: ["$endDate", null] }
        }
      }
    ];

    const rows = await this.db.collection("projects").aggregate(pipeline).toArray();

    return {
      reportId: "projects-status",
      title: "Project Status",
      generatedAt: new Date().toISOString(),
      columns: ["Project", "Client", "Progress", "Status", "Health", "Team Size", "Start Date", "End Date"],
      rows: rows.map((r) => ({
        Project: r.Project,
        Client: r.Client,
        Progress: r.Progress,
        Status: r.Status,
        Health: r.Health,
        "Team Size": r["Team Size"],
        "Start Date": toISO(r["Start Date"]),
        "End Date": r["End Date"] ? toISO(r["End Date"] as Date) : "—"
      })),
      summary: { totalProjects: rows.length }
    };
  }

  private async assignmentsReport(query: ReportQuery): Promise<ReportResult> {
    const { page = 1, pageSize = 50 } = query;
    const skip = (page - 1) * pageSize;

    const pipeline: Document[] = [
      { $sort: { startDate: -1 } },
      { $skip: skip },
      { $limit: pageSize },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "employeeId",
          as: "employee"
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "projects",
          localField: "projectId",
          foreignField: "projectId",
          as: "project"
        }
      },
      { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } }
    ];

    if (query.employeeId) {
      pipeline.unshift({ $match: { employeeId: query.employeeId } });
    }
    if (query.projectId) {
      pipeline.unshift({ $match: { projectId: query.projectId } });
    }

    const rows = await this.db.collection("project_assignments").aggregate(pipeline).toArray();

    const total = await this.db.collection("project_assignments").countDocuments(
      query.employeeId
        ? { employeeId: query.employeeId }
        : query.projectId
          ? { projectId: query.projectId }
          : {}
    );

    const active = await this.db.collection("project_assignments").countDocuments({
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      status: "ACTIVE"
    });

    return {
      reportId: "assignments-report",
      title: "Assignment Report",
      generatedAt: new Date().toISOString(),
      columns: ["Employee", "Project", "Role", "Allocation", "Status", "Billable", "Start Date", "End Date"],
      rows: rows.map((a) => ({
        Employee: a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : a.employeeId,
        Project: a.project?.name || "-",
        Role: a.role,
        Allocation: `${a.allocationPercent}%`,
        Status: a.status,
        Billable: a.billable ? "Yes" : "No",
        "Start Date": toISO(a.startDate),
        "End Date": a.endDate ? toISO(a.endDate) : "—"
      })),
      summary: {
        totalAssignments: total,
        active,
        ended: total - active
      }
    };
  }
}
