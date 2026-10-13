import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/[A-Za-z]/, "Password must contain at least one letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const invitationTokenParamSchema = z.object({
  token: z.string().min(20).max(200)
});

export type InvitationTokenParam = z.infer<typeof invitationTokenParamSchema>;

export const acceptInvitationSchema = z.object({
  password: passwordSchema
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
