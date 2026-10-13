import { createHash, randomBytes } from "crypto";
import { InvitationRepository } from "../repositories/invitation.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import type { InvitationStatus } from "../models/invitation.js";
import type { Role } from "../config/constants.js";
import { env } from "../config/env.js";
import { BusinessRuleError, NotFoundError } from "../utils/errors.js";
import { hashPassword } from "../utils/auth/jwt.js";
import { writeAuditLog } from "../utils/audit.js";
import { logger } from "../logger/logger.js";
import { getMailAdapter, buildInvitationEmail } from "../integrations/mail/index.js";
import { toISO } from "../utils/dates.js";

export interface InvitationDTO {
  employeeId: string;
  email: string;
  workMail?: string;
  role: Role;
  status: InvitationStatus;
  expiresAt: string;
  emailSent: boolean;
  createdAt: string;
}

export interface InvitationPreviewDTO {
  employeeId: string;
  employeeName: string;
  email: string;
  workMail?: string;
  role: Role;
  expiresAt: string;
}

export interface AcceptedInvitationDTO {
  employeeId: string;
  email: string;
  workMail?: string;
  role: Role;
  message: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class InvitationService {
  constructor(
    private invitationRepository: InvitationRepository,
    private userRepository: UserRepository,
     private employeeRepository: EmployeeRepository
  ) {}

   /**
    * Creates (or resends) an account invitation for an employee.
    * Sends the invitation link by email to the employee's workMail (or email).
    * The user account is created with ACTIVE status, so the employee can use
    * the account immediately after accepting the invitation.
    */
  async createInvitation(
    employeeId: string,
    actorRole: Role,
    actorUserId?: string
  ): Promise<InvitationDTO> {
     const employee = await this.employeeRepository.findByEmployeeId(employeeId);
     if (!employee) {
       throw new NotFoundError("Employee was not found.");
     }

       let user = await this.userRepository.findByEmail(employee.email);
      if (!user && employee.workMail) {
        user = await this.userRepository.findByEmail(employee.workMail);
      }

      const inviteEmail = employee.workMail ?? employee.email;

       if (!user) {
        user = await this.userRepository.create({
          userId: `user_${employee.employeeId}`,
          email: employee.email,
          workMail: employee.workMail,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: "EMPLOYEE",
          status: "ACTIVE",
          employeeId: employee.employeeId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

     // Revoke any stale/expired pending invitations for this employee.
     await this.invitationRepository.revokePendingForEmployee(employeeId);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + env.INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

     const invitation = await this.invitationRepository.create({
       tokenHash: hashToken(token),
       userId: user.userId,
       employeeId,
       email: employee.email,
       workMail: employee.workMail,
       role: "EMPLOYEE",
       status: "PENDING",
       invitedByUserId: actorUserId,
       invitedByRole: actorRole,
       expiresAt,
       createdAt: new Date(),
       updatedAt: new Date()
     });

     const inviteUrl = `${env.FRONTEND_BASE_URL.replace(/\/+$/, "")}/accept-invite?token=${token}`;
     const emailSent = await this.sendInvitationEmail({
       to: inviteEmail,
       employeeName: `${employee.firstName} ${employee.lastName}`,
       role: invitation.role,
       inviteUrl,
       expiresAt
     });

     await writeAuditLog(
       actorRole,
       "invitation.created",
       "invitation",
       employeeId,
       actorUserId
     );

     return {
       employeeId,
       email: employee.email,
       workMail: employee.workMail,
       role: invitation.role,
       status: invitation.status,
       expiresAt: toISO(invitation.expiresAt) ?? "",
      emailSent,
      createdAt: toISO(invitation.createdAt) ?? ""
    };
  }

  /**
   * Validates an invitation token and returns a preview of the account it
   * belongs to, for the set-password screen.
   */
  async getInvitationByToken(token: string): Promise<InvitationPreviewDTO> {
    const invitation = await this.loadValidInvitation(token);

    const employee = await this.employeeRepository.findByEmployeeId(invitation.employeeId);
    const employeeName = employee
      ? `${employee.firstName} ${employee.lastName}`
      : invitation.email;

     return {
       employeeId: invitation.employeeId,
       employeeName,
       email: invitation.email,
       workMail: invitation.workMail,
       role: invitation.role,
       expiresAt: toISO(invitation.expiresAt) ?? ""
     };
  }

  /**
   * Validates the token, sets the password, and activates the account.
   */
  async acceptInvitation(token: string, password: string): Promise<AcceptedInvitationDTO> {
    const invitation = await this.loadValidInvitation(token);

    const user = await this.userRepository.findByEmail(invitation.email);
    if (!user) {
      throw new NotFoundError("Account for this invitation was not found.");
    }

    const hashedPassword = await hashPassword(password);
    await this.userRepository.setPasswordAndActivate(user.userId, hashedPassword);
    await this.invitationRepository.updateStatus(invitation.tokenHash, "ACCEPTED", {
      acceptedAt: new Date()
    });

    await writeAuditLog(
      invitation.role,
      "invitation.accepted",
      "invitation",
      invitation.employeeId,
      user.userId
    );

     return {
       employeeId: invitation.employeeId,
       email: invitation.email,
       workMail: invitation.workMail,
       role: invitation.role,
       message: "Password set successfully. You can now sign in."
     };
  }

  private async loadValidInvitation(token: string) {
    const invitation = await this.invitationRepository.findByTokenHash(hashToken(token));
    if (!invitation) {
      throw new NotFoundError("Invitation was not found.");
    }

    if (invitation.status !== "PENDING") {
      throw new BusinessRuleError(
        "This invitation has already been used or was revoked.",
        "INVITATION_INVALID"
      );
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      if (invitation.status === "PENDING") {
        await this.invitationRepository.updateStatus(invitation.tokenHash, "EXPIRED");
      }
      throw new BusinessRuleError(
        "This invitation has expired. Please ask HR for a new one.",
        "INVITATION_EXPIRED"
      );
    }

    return invitation;
  }

  private async sendInvitationEmail(params: {
    to: string;
    employeeName: string;
    role: Role;
    inviteUrl: string;
    expiresAt: Date;
  }): Promise<boolean> {
    try {
      const message = buildInvitationEmail({
        employeeName: params.employeeName,
        role: params.role,
        inviteUrl: params.inviteUrl,
        expiresAt: params.expiresAt
      });
      await getMailAdapter().send({ ...message, to: params.to });
      return true;
    } catch (error) {
      logger.warn(
        { error, to: params.to },
        "Failed to send invitation email"
      );
      return false;
    }
  }
}
