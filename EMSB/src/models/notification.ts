import type { ObjectId } from "mongodb";

export type NotificationType =
  | "LEAVE"
  | "DOCUMENT"
  | "PROJECT"
  | "ONBOARDING"
  | "ATTENDANCE"
  | "SYSTEM";

export interface Notification {
  _id: ObjectId;
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
