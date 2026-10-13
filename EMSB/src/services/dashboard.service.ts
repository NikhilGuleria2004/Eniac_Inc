import { getDb } from "../config/database.js";
import { toISO } from "../utils/dates.js";
import { logger } from "../logger/logger.js";

export interface AdminDashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  billableEmployees: number;
  nonBillableEmployees: number;
  activeProjects: number;
  activeClients: number;
  pendingLeaveRequests: number;
  pendingDocuments: number;
  upcomingReviews: number;
  attendanceExceptions: {
    missingPunches: number;
    lateArrivals: number;
    absent: number;
  };
  employeeStatusDistribution: { status: string; count: number }[];
  workforceDistribution: { country: string; count: number }[];
  projectHealth: { health: string; count: number }[];
  recentActivity: {
    action: string;
    entityType: string;
    entityId: string;
    actorRole: string;
    createdAt: string;
  }[];
}

export interface HRDashboardMetrics {
  totalEmployees: number;
  pendingOnboarding: number;
  pendingDocuments: number;
  pendingLeaveRequests: number;
  upcomingReviews: number;
  documentsExpiringSoon: number;
  employeeDistribution: {
    country: { name: string; value: number }[];
    billingStatus: { name: string; value: number }[];
    employmentStatus: { name: string; value: number; fill: string }[];
  };
  onboardingPipeline: { stage: string; count: number }[];
  documentStatusDistribution: { status: string; count: number }[];
  leaveStatusDistribution: { status: string; count: number }[];
}

export interface ManagerDashboardMetrics {
  activeClients: number;
  activeProjects: number;
  assignedEmployees: number;
  projectsAtRisk: number;
  projectPortfolio: {
    id: string;
    name: string;
    clientName: string;
    teamSize: number;
    startDate: string;
    endDate: string;
    progress: number;
    status: string;
  }[];
  resourceAllocation: {
    employeeId: string;
    employeeName: string;
    projectName: string;
    allocation: number;
    billable: boolean;
    status: string;
  }[];
  projectHealth: { health: string; count: number }[];
  recentActivity: {
    action: string;
    entityType: string;
    entityId: string;
    actorRole: string;
    createdAt: string;
  }[];
}

export interface SupervisorDashboardMetrics {
  assignedProjects: number;
  teamMembers: number;
  activeAssignments: number;
  projectsRequiringAttention: number;
  myProjects: {
    id: string;
    name: string;
    clientName: string;
    progress: number;
    health: string;
  }[];
  teamAssignments: {
    employeeId: string;
    employeeName: string;
    projectName: string;
    role: string;
    allocation: number;
    status: string;
  }[];
  recentActivity: {
    action: string;
    entityType: string;
    entityId: string;
    actorRole: string;
    createdAt: string;
  }[];
}

export interface EmployeeDashboardMetrics {
  todayAttendance?: {
    status: string;
    checkIn?: string;
    checkOut?: string;
    workingHours?: number;
  };
  leaveBalance: {
    type: string;
    total: number;
    used: number;
    remaining: number;
  }[];
  pendingLeaveRequests: number;
  assignedProjects: {
    id: string;
    name: string;
    clientName: string;
    role: string;
    allocation: number;
    status: string;
    health: string;
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    status: string;
    uploadedAt: string;
    expiryDate?: string;
  }[];
  recentNotifications: {
    notificationId: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    link?: string;
    createdAt: string;
  }[];
}

export class DashboardService {
  private get db(): ReturnType<typeof getDb> {
    return getDb();
  }

  async getAdminDashboard(): Promise<AdminDashboardMetrics> {
    try {
      const [
        employeeStats,
        projectStats,
        clientCount,
        pendingLeave,
        pendingDocs,
        upcomingReviews,
        attendanceExceptions,
        statusDistribution,
        workforceDistribution,
        projectHealth,
        recentActivity
      ] = await Promise.all([
        this.db.collection("employees").aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ["$employmentStatus", "ACTIVE"] }, 1, 0] } },
              billable: { $sum: { $cond: [{ $eq: ["$billingStatus", "BILLABLE"] }, 1, 0] } },
              nonBillable: { $sum: { $cond: [{ $eq: ["$billingStatus", "NON_BILLABLE"] }, 1, 0] } }
            }
          }
        ]).toArray(),
        this.db.collection("projects").aggregate([
          {
            $group: {
              _id: null,
              activeProjects: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } }
            }
          }
        ]).toArray(),
        this.db.collection("clients").countDocuments({ status: "ACTIVE" }),
        this.db.collection("leave_requests").countDocuments({ status: "PENDING" }),
        this.db.collection("documents").countDocuments({ status: { $in: ["PENDING", "UNDER_REVIEW"] } }),
        this.db.collection("employee_reviews").countDocuments({ status: { $in: ["SCHEDULED", "IN_PROGRESS"] } }),
        this.db.collection("attendance_records").aggregate([
          {
            $group: {
              _id: null,
              missingPunches: { $sum: { $cond: [{ $eq: ["$status", "MISSING"] }, 1, 0] } },
              lateArrivals: { $sum: { $cond: [{ $eq: ["$status", "LATE"] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0] } }
            }
          }
        ]).toArray(),
        this.db.collection("employees").aggregate([
          { $group: { _id: "$employmentStatus", count: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("employees").aggregate([
          { $group: { _id: "$country", count: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("projects").aggregate([
          { $group: { _id: "$health", count: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("audit_logs").find({}, { sort: { createdAt: -1 }, limit: 10 }).toArray()
      ]);

      const empStats = employeeStats[0] || { total: 0, active: 0, billable: 0, nonBillable: 0 };
      const projStats = projectStats[0] || { activeProjects: 0 };
      const attendEx = attendanceExceptions[0] || { missingPunches: 0, lateArrivals: 0, absent: 0 };

      return {
        totalEmployees: empStats.total,
        activeEmployees: empStats.active,
        billableEmployees: empStats.billable,
        nonBillableEmployees: empStats.nonBillable,
        activeProjects: projStats.activeProjects,
        activeClients: clientCount,
        pendingLeaveRequests: pendingLeave,
        pendingDocuments: pendingDocs,
        upcomingReviews,
        attendanceExceptions: {
          missingPunches: attendEx.missingPunches,
          lateArrivals: attendEx.lateArrivals,
          absent: attendEx.absent
        },
        employeeStatusDistribution: statusDistribution.map((d) => ({ status: d._id, count: d.count })),
        workforceDistribution: workforceDistribution.map((d) => ({ country: d._id, count: d.count })),
        projectHealth: projectHealth.map((d) => ({ health: d._id, count: d.count })),
        recentActivity: recentActivity.map((log) => ({
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          actorRole: log.actorRole,
          createdAt: toISO(log.createdAt) ?? ""
        }))
      };
    } catch (error) {
      logger.error({ error }, "Failed to fetch admin dashboard");
      throw error;
    }
  }

  async getHRDashboard(): Promise<HRDashboardMetrics> {
    try {
      const [
        totalEmployees,
        pendingOnboarding,
        pendingDocuments,
        pendingLeaveRequests,
        upcomingReviews,
        documentsExpiringSoon,
        countryDistribution,
        billingDistribution,
        statusDistribution,
        onboardingPipeline,
        documentStatusDistribution,
        leaveStatusDistribution
      ] = await Promise.all([
        this.db.collection("employees").countDocuments({}),
        this.db.collection("onboarding_records").countDocuments({ status: "AWAITING_REVIEW" }),
        this.db.collection("documents").countDocuments({ status: { $in: ["PENDING", "UNDER_REVIEW"] } }),
        this.db.collection("leave_requests").countDocuments({ status: "PENDING" }),
        this.db.collection("employee_reviews").countDocuments({ status: { $in: ["SCHEDULED", "IN_PROGRESS"] } }),
        this.db.collection("documents").countDocuments({
          expiresAt: { $lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          status: { $ne: "EXPIRED" }
        }),
        this.db.collection("employees").aggregate([
          { $group: { _id: "$country", value: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("employees").aggregate([
          { $group: { _id: "$billingStatus", value: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("employees").aggregate([
          { $group: { _id: "$employmentStatus", value: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("onboarding_records").aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("documents").aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("leave_requests").aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray()
      ]);

      const statusColors: Record<string, string> = {
        ACTIVE: "#16803C",
        ON_LEAVE: "#B7791F",
        ONBOARDING: "#2563EB",
        INACTIVE: "#667085",
        SUSPENDED: "#C53030",
        RESIGNED: "#9CA3AF",
        TERMINATED: "#7F1D1D"
      };

      return {
        totalEmployees,
        pendingOnboarding,
        pendingDocuments,
        pendingLeaveRequests,
        upcomingReviews,
        documentsExpiringSoon,
        employeeDistribution: {
          country: countryDistribution.map((d) => ({ name: d._id, value: d.value })),
          billingStatus: billingDistribution.map((d) => ({ name: d._id, value: d.value })),
          employmentStatus: statusDistribution.map((d) => ({
            name: d._id,
            value: d.value,
            fill: statusColors[d._id] || "#667085"
          }))
        },
        onboardingPipeline: onboardingPipeline.map((d) => ({ stage: d._id, count: d.count })),
        documentStatusDistribution: documentStatusDistribution.map((d) => ({ status: d._id, count: d.count })),
        leaveStatusDistribution: leaveStatusDistribution.map((d) => ({ status: d._id, count: d.count }))
      };
    } catch (error) {
      logger.error({ error }, "Failed to fetch HR dashboard");
      throw error;
    }
  }

  async getManagerDashboard(): Promise<ManagerDashboardMetrics> {
    try {
      const [
        clientCount,
        projectStats,
        clientNames,
        projectPortfolios,
        projectHealth,
        recentActivity
      ] = await Promise.all([
        this.db.collection("clients").countDocuments({ status: "ACTIVE" }),
        this.db.collection("projects").aggregate([
          {
            $group: {
              _id: null,
              activeProjects: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
              atRisk: { $sum: { $cond: [{ $eq: ["$health", "AT_RISK"] }, 1, 0] } }
            }
          }
        ]).toArray(),
        this.db.collection("clients").find({}, { projection: { clientId: 1, name: 1 } }).toArray(),
        this.db.collection("projects").find({}, { sort: { createdAt: -1 }, limit: 10 }).toArray(),
        this.db.collection("project_assignments").aggregate([
          { $match: { status: "ACTIVE" } },
          {
            $lookup: {
              from: "employees",
              localField: "employeeId",
              foreignField: "employeeId",
              as: "employee"
            }
          },
          { $unwind: "$employee" },
          {
            $lookup: {
              from: "projects",
              localField: "projectId",
              foreignField: "projectId",
              as: "project"
            }
          },
          { $unwind: "$project" },
          {
            $group: {
              _id: null,
              assignedEmployees: { $addToSet: "$employee.employeeId" }
            }
          }
        ]).toArray(),
        this.db.collection("projects").aggregate([
          { $group: { _id: "$health", count: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("audit_logs").find({}, { sort: { createdAt: -1 }, limit: 10 }).toArray()
      ]);

      const projStats = projectStats[0] || { activeProjects: 0, atRisk: 0 };
      const clientMap = new Map(clientNames.map((c) => [c.clientId, c.name]));

      const resourceAllocResult = await this.db
        .collection("project_assignments")
        .aggregate([
          { $match: { status: "ACTIVE" } },
          {
            $lookup: {
              from: "employees",
              localField: "employeeId",
              foreignField: "employeeId",
              as: "employee"
            }
          },
          { $unwind: "$employee" },
          {
            $lookup: {
              from: "projects",
              localField: "projectId",
              foreignField: "projectId",
              as: "project"
            }
          },
          { $unwind: "$project" }
        ])
        .toArray();

      return {
        activeClients: clientCount,
        activeProjects: projStats.activeProjects,
        assignedEmployees: resourceAllocResult.reduce((acc, a) => {
          if (!acc.includes(a.employee.employeeId)) acc.push(a.employee.employeeId);
          return acc;
        }, [] as string[]).length,
        projectsAtRisk: projStats.atRisk,
        projectPortfolio: projectPortfolios.map((p) => ({
          id: p.projectId,
          name: p.name,
          clientName: clientMap.get(p.clientId) || "-",
          teamSize: 0,
          startDate: toISO(p.startDate) ?? "",
          endDate: toISO(p.endDate) ?? "",
          progress: p.progressPercent || 0,
          status: p.status
        })),
        resourceAllocation: resourceAllocResult.map((a) => ({
          employeeId: a.employee.employeeId,
          employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
          projectName: a.project?.name || "-",
          allocation: a.allocationPercent,
          billable: a.billable,
          status: a.status
        })),
        projectHealth: projectHealth.map((d) => ({ health: d._id, count: d.count })),
        recentActivity: recentActivity.map((log) => ({
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          actorRole: log.actorRole,
          createdAt: toISO(log.createdAt) ?? ""
        }))
      };
    } catch (error) {
      logger.error({ error }, "Failed to fetch manager dashboard");
      throw error;
    }
  }

  async getSupervisorDashboard(employeeId?: string): Promise<SupervisorDashboardMetrics> {
    try {
      if (!employeeId) {
        return this.getEmptySupervisorDashboard();
      }

      const employee = await this.db
        .collection("employees")
        .findOne({ employeeId });

      if (!employee) {
        return this.getEmptySupervisorDashboard();
      }

      const managerId = employee.managerId;
      const [
        assignedProjects,
        teamMembers,
        activeAssignments,
        projectsRequiringAttention,
        myProjects,
        teamAssignments,
        recentActivity
      ] = await Promise.all([
        this.db.collection("projects").aggregate([
          { $match: { managerId } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ]).toArray(),
        this.db.collection("employees").countDocuments({ managerId }),
        this.db.collection("project_assignments").countDocuments({ status: "ACTIVE" }),
        this.db.collection("projects").countDocuments({
          managerId,
          health: { $in: ["AT_RISK", "DELAYED"] }
        }),
        this.db.collection("projects").find({ managerId }).toArray(),
        this.db.collection("project_assignments").aggregate([
          { $match: { status: "ACTIVE" } },
          {
            $lookup: {
              from: "employees",
              localField: "employeeId",
              foreignField: "employeeId",
              as: "employee"
            }
          },
          { $unwind: "$employee" },
          {
            $lookup: {
              from: "projects",
              localField: "projectId",
              foreignField: "projectId",
              as: "project"
            }
          },
          { $unwind: "$project" }
        ]).toArray(),
        this.db.collection("audit_logs").find({}, { sort: { createdAt: -1 }, limit: 10 }).toArray()
      ]);

      const clientNames = await this.db
        .collection("clients")
        .find({}, { projection: { clientId: 1, name: 1 } })
        .toArray();
      const clientMap = new Map(clientNames.map((c) => [c.clientId, c.name]));

      return {
        assignedProjects: assignedProjects[0]?.count || 0,
        teamMembers,
        activeAssignments,
        projectsRequiringAttention,
        myProjects: myProjects.map((p) => ({
          id: p.projectId,
          name: p.name,
          clientName: clientMap.get(p.clientId) || "-",
          progress: p.progressPercent || 0,
          health: p.health || "UNKNOWN"
        })),
        teamAssignments: teamAssignments.map((a) => ({
          employeeId: a.employee.employeeId,
          employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
          projectName: a.project?.name || "-",
          role: a.role,
          allocation: a.allocationPercent,
          status: a.status
        })),
        recentActivity: recentActivity.map((log) => ({
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          actorRole: log.actorRole,
          createdAt: toISO(log.createdAt) ?? ""
        }))
      };
    } catch (error) {
      logger.error({ error }, "Failed to fetch supervisor dashboard");
      throw error;
    }
  }

  private getEmptySupervisorDashboard(): SupervisorDashboardMetrics {
    return {
      assignedProjects: 0,
      teamMembers: 0,
      activeAssignments: 0,
      projectsRequiringAttention: 0,
      myProjects: [],
      teamAssignments: [],
      recentActivity: []
    };
  }

  async getEmployeeDashboard(employeeId: string): Promise<EmployeeDashboardMetrics> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const [
        todayAttendance,
        leaveBalances,
        pendingLeaveRequests,
        assignments,
        documents,
        notifications
      ] = await Promise.all([
        this.db.collection("attendance_records").findOne({
          employeeId,
          date: today
        }),
        this.db.collection("leave_balances").find({ employeeId }).toArray(),
        this.db.collection("leave_requests").countDocuments({ employeeId, status: "PENDING" }),
        this.db.collection("project_assignments").aggregate([
          { $match: { employeeId, status: "ACTIVE" } },
          {
            $lookup: {
              from: "projects",
              localField: "projectId",
              foreignField: "projectId",
              as: "project"
            }
          },
          { $unwind: "$project" },
          {
            $lookup: {
              from: "clients",
              localField: "project.clientId",
              foreignField: "clientId",
              as: "client"
            }
          },
          { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } }
        ]).toArray(),
        this.db.collection("documents").find({ employeeId }, { sort: { createdAt: -1 }, limit: 10 }).toArray(),
        this.db.collection("notifications").find(
          { userId: `user_employee`, read: false },
          { sort: { createdAt: -1 }, limit: 10 }
        ).toArray()
      ]);

      return {
        todayAttendance: todayAttendance
          ? {
              status: todayAttendance.status || "MISSING",
              checkIn: toISO(todayAttendance.checkIn),
              checkOut: toISO(todayAttendance.checkOut),
              workingHours: todayAttendance.workingHours
            }
          : undefined,
        leaveBalance: leaveBalances.map((b) => ({
          type: b.leaveType,
          total: 0,
          used: 0,
          remaining: b.balance
        })),
        pendingLeaveRequests,
        assignedProjects: assignments.map((a) => ({
          id: a.project.projectId,
          name: a.project.name,
          clientName: a.client?.name || "-",
          role: a.role,
          allocation: a.allocationPercent,
          status: a.status,
          health: a.project.health || "UNKNOWN"
        })),
        documents: documents.map((d) => ({
          id: d.documentId,
          name: d.name,
          type: d.type,
          status: d.status,
          uploadedAt: toISO(d.uploadedAt) ?? "",
          expiryDate: d.expiresAt ? toISO(d.expiresAt) ?? undefined : undefined
        })),
        recentNotifications: notifications.map((n) => ({
          notificationId: n.notificationId,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          link: n.link,
          createdAt: toISO(n.createdAt) ?? ""
        }))
      };
    } catch (error) {
      logger.error({ error }, "Failed to fetch employee dashboard");
      throw error;
    }
  }
}
