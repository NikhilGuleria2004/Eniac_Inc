import type { ObjectId } from "mongodb";
import type { Role } from "../config/constants.js";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface Invitation {
  _id: ObjectId;
  tokenHash: string;
  userId: string;
  employeeId: string;
  email: string;
  workMail?: string;
  role: Role;
  status: InvitationStatus;
  invitedByUserId?: string;
  invitedByRole: Role;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
}
