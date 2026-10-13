import { z } from "zod";

const notificationTypeEnum = z.enum([
  "LEAVE",
  "DOCUMENT",
  "PROJECT",
  "ONBOARDING",
  "ATTENDANCE",
  "SYSTEM"
] as const);

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: notificationTypeEnum.optional(),
  read: z.enum(["true", "false"]).transform((val) => val === "true").optional()
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const markReadSchema = z.object({});

export type MarkReadInput = z.infer<typeof markReadSchema>;

export interface CreateNotificationInput {
  userId: string;
  type: "LEAVE" | "DOCUMENT" | "PROJECT" | "ONBOARDING" | "ATTENDANCE" | "SYSTEM";
  title: string;
  message: string;
  link?: string;
}

export { notificationTypeEnum };
