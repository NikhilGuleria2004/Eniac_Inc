import { NotificationRepository } from "../repositories/notification.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { Notification, NotificationType } from "../models/notification.js";
import type { Role } from "../config/constants.js";
import { NotFoundError } from "../utils/errors.js";
import { toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import { getDb } from "../config/database.js";
import type {
  NotificationListQuery,
  CreateNotificationInput
} from "../schemas/notification.schemas.js";

export interface NotificationDTO {
  id: string;
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
  readAt?: string;
}

export class NotificationService {
  constructor(
    private notificationRepository: NotificationRepository,
    private userRepository: UserRepository
  ) {}

  async listNotifications(
    userId: string,
    filters: NotificationListQuery
  ): Promise<{ notifications: NotificationDTO[]; total: number; page: number; pageSize: number }> {
    const { notifications, total } = await this.notificationRepository.findMany({
      ...filters,
      userId
    });

    return {
      notifications: notifications.map((n) => this.toDTO(n)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.getUnreadCountByUser(userId);
    return { count };
  }

  async markRead(notificationId: string, userId: string): Promise<NotificationDTO> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new NotFoundError("Notification was not found.");
    }

    if (notification.userId !== userId) {
      throw new NotFoundError("Notification was not found.");
    }

    const updated = await this.notificationRepository.markRead(notificationId);
    if (!updated) {
      throw new NotFoundError("Notification was not found.");
    }

    return this.toDTO(updated);
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.markAllRead(userId);
    return { count };
  }

  /**
   * Centralized notification creation. Called by event triggers across services.
   */
  async create(input: CreateNotificationInput): Promise<NotificationDTO> {
    const notificationId = await this.generateNotificationId();

    const notification: Omit<Notification, "_id"> = {
      notificationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      read: false,
      link: input.link,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.notificationRepository.create(notification);
    return this.toDTO(created);
  }

  /**
   * Notify all users with a specific role about an event.
   */
  async notifyRole(
    role: Role,
    type: NotificationType,
    title: string,
    message: string,
    link?: string
  ): Promise<void> {
    if (role === "ADMIN") {
      const adminUsers = await this.userRepository.findByRole("ADMIN");
      for (const user of adminUsers) {
        await this.create({ userId: user.userId, type, title, message, link });
      }
      return;
    }

    const roleLabel: Record<Role, string> = {
      HR: "HR",
      MANAGER: "MANAGER",
      SUPERVISOR: "SUPERVISOR",
      EMPLOYEE: "EMPLOYEE",
      ADMIN: "ADMIN"
    };

    const users = await this.userRepository.findByRole(roleLabel[role]);
    for (const user of users) {
      await this.create({ userId: user.userId, type, title, message, link });
    }
  }

  /**
   * Notify a specific employee (by employeeId) — resolves the user.
   */
  async notifyEmployee(
    employeeId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string
  ): Promise<void> {
    const user = await this.userRepository.findByEmployeeId(employeeId);
    if (user) {
      await this.create({ userId: user.userId, type, title, message, link });
    }
  }

  /**
   * Event: Leave request submitted — notify HR.
   */
  async onLeaveRequestSubmitted(
    _employeeId: string,
    employeeName: string,
    leaveType: string,
    days: number
  ): Promise<void> {
    await this.notifyRole(
      "HR",
      "LEAVE",
      "Leave request pending approval",
      `${employeeName} requested ${leaveType} leave for ${days} day(s).`,
      "/leave"
    );
  }

  /**
   * Event: Leave approved/rejected — notify the employee.
   */
  async onLeaveRequestResolved(
    employeeId: string,
    employeeName: string,
    leaveType: string,
    status: "APPROVED" | "REJECTED"
  ): Promise<void> {
    const title = status === "APPROVED" ? "Leave approved" : "Leave rejected";
    const message =
      status === "APPROVED"
        ? `${employeeName}'s ${leaveType} leave request was approved.`
        : `${employeeName}'s ${leaveType} leave request was rejected.`;

    await this.notifyEmployee(employeeId, "LEAVE", title, message, "/leave");
  }

  /**
   * Event: Document reviewed — notify the employee.
   */
  async onDocumentReviewed(
    employeeId: string,
    _employeeName: string,
    documentName: string,
    status: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"
  ): Promise<void> {
    const statusLabel =
      status === "APPROVED" ? "approved"
      : status === "REJECTED" ? "rejected"
      : "requires changes";
    const title = `Document ${status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : "requires changes"}`;
    const message = `Your document "${documentName}" was ${statusLabel} by HR.`;

    await this.notifyEmployee(employeeId, "DOCUMENT", title, message, "/documents");
  }

  /**
   * Event: Document expiring — notify the employee and HR.
   */
  async onDocumentExpiring(
    employeeId: string,
    _employeeName: string,
    documentName: string,
    daysUntilExpiry: number
  ): Promise<void> {
    const title = "Document expiring soon";
    const message = `"${documentName}" expires in ${daysUntilExpiry} day(s).`;
    await this.notifyEmployee(employeeId, "DOCUMENT", title, message, "/documents");
    await this.notifyRole("HR", "DOCUMENT", title, message, "/documents");
  }

  /**
   * Event: Onboarding awaiting review — notify HR.
   */
  async onOnboardingAwaitingReview(
    _employeeId: string,
    employeeName: string
  ): Promise<void> {
    await this.notifyRole(
      "HR",
      "ONBOARDING",
      "Onboarding awaiting review",
      `${employeeName}'s onboarding is ready for review.`,
      "/onboarding"
    );
  }

  /**
   * Event: Employee activated — notify the employee and their manager.
   */
  async onEmployeeActivated(
    employeeId: string,
    employeeName: string,
    managerId?: string
  ): Promise<void> {
    const title = "Employee activated";
    const message = `${employeeName} has been activated.`;
    await this.notifyEmployee(employeeId, "ONBOARDING", title, message, "/employees");

    if (managerId) {
      await this.notifyEmployee(
        managerId,
        "SYSTEM",
        "Team member activated",
        `${employeeName} has been activated on your team.`,
        "/employees"
      );
    }
  }

  /**
   * Event: Project assignment created — notify the employee.
   */
  async onAssignmentCreated(
    employeeId: string,
    _employeeName: string,
    projectName: string,
    role: string
  ): Promise<void> {
    await this.notifyEmployee(
      employeeId,
      "PROJECT",
      "Assigned to project",
      `You have been assigned to "${projectName}" as ${role}.`,
      "/projects"
    );
  }

  /**
   * Event: Review due — notify the reviewer.
   */
  async onReviewDue(
    reviewerEmployeeId: string,
    employeeName: string
  ): Promise<void> {
    await this.notifyEmployee(
      reviewerEmployeeId,
      "ONBOARDING",
      "Review due",
      `A performance review for ${employeeName} is scheduled.`,
      "/reviews"
    );
  }

  /**
   * Event: Timesheet provisioning failed — notify HR.
   */
  async onTimesheetProvisioningFailed(
    employeeId: string,
    employeeName: string,
    failureReason?: string
  ): Promise<void> {
    await this.notifyRole(
      "HR",
      "SYSTEM",
      "Timesheet provisioning failed",
      `Timesheet provisioning failed for ${employeeName}. ${failureReason ?? ""}`,
      `/employees/${employeeId}/timesheet`
    );
  }

  /**
   * CMS event: timesheet submitted — notify reviewers (ADMIN/MANAGER/SUPERVISOR).
   * Reviewer permissions live in the CMSB permission set, so roles with
   * `timesheet.approve` are resolved from the collection.
   */
  async onTimesheetSubmitted(
    timesheetId: string,
    employeeName: string,
    periodLabel: string
  ): Promise<void> {
    await this.notifyCmsReviewers(
      "TIMESHEET",
      "Timesheet submitted for review",
      `${employeeName} submitted a timesheet for ${periodLabel}.`,
      `/timesheets/${timesheetId}`
    );
  }

  /**
   * CMS event: timesheet resolved (approved/rejected) — notify the employee.
   */
  async onTimesheetReviewed(
    employeeId: string,
    timesheetId: string,
    status: "APPROVED" | "REJECTED",
    reviewNotes?: string
  ): Promise<void> {
    const statusLabel = status === "APPROVED" ? "approved" : "rejected";
    await this.notifyEmployee(
      employeeId,
      "TIMESHEET",
      `Timesheet ${statusLabel}`,
      `Your timesheet was ${statusLabel}.${reviewNotes ? ` ${reviewNotes}` : ""}`,
      `/timesheets/${timesheetId}`
    );
  }

  /**
   * CMS event: invoice sent — notify ADMIN/MANAGER (holders of invoice.send).
   */
  async onInvoiceSent(invoiceNumber: string, clientName: string): Promise<void> {
    await this.notifyCmsReviewers(
      "INVOICE",
      "Invoice sent",
      `Invoice ${invoiceNumber} was sent to ${clientName}.`,
      `/invoices`
    );
  }

  /**
   * Resolves the users that hold a CMS permission. Payment and permission
   * checks are shared with the EMS layer, so recipients are computed from the
   * permission set rather than a single role.
   */
  private async notifyCmsReviewers(
    type: NotificationType,
    title: string,
    message: string,
    link: string
  ): Promise<void> {
    for (const role of ["ADMIN", "MANAGER", "SUPERVISOR"]) {
      const users = await this.userRepository.findByRole(role);
      for (const user of users) {
        await this.create({ userId: user.userId, type, title, message, link });
      }
    }
  }

  async createAuditLog(
    actorRole: Role,
    action: string,
    entityType: string,
    entityId: string,
    actorUserId: string
  ): Promise<void> {
    await writeAuditLog(actorRole, action, entityType, entityId, actorUserId);
  }

  private async generateNotificationId(): Promise<string> {
    const db = getDb();
    // Only numeric IDs participate in the sequence: test fixtures with
    // non-numeric IDs (e.g. NOT-TEST-1) must not skew the lexical max and
    // fall back to a colliding NOT-0001.
    const latest = await db
      .collection("notifications")
      .find({ notificationId: { $regex: /^NOT-\d+$/ } })
      .sort({ notificationId: -1 })
      .limit(1)
      .project({ notificationId: 1 })
      .next();

    let nextNum = 1;
    const match = latest?.notificationId?.match(/NOT-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }

    return `NOT-${String(nextNum).padStart(4, "0")}`;
  }

  private toDTO(notification: Notification): NotificationDTO {
    return {
      id: notification.notificationId,
      notificationId: notification.notificationId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      link: notification.link,
      createdAt: toISO(notification.createdAt) ?? "",
      readAt: toISO(notification.readAt)
    };
  }
}
