import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required.")
});

export type LoginRequest = z.infer<typeof loginSchema>;

export const tokenPayloadSchema = z.object({
  userId: z.string(),
  employeeId: z.string().optional(),
  email: z.string().email(),
  role: z.enum(["ADMIN", "HR", "MANAGER", "SUPERVISOR", "EMPLOYEE"])
});

export type TokenPayload = z.infer<typeof tokenPayloadSchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(["ADMIN", "HR", "MANAGER", "SUPERVISOR", "EMPLOYEE"])
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export const loginResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
    user: userResponseSchema
  })
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required.")
});

export type RefreshRequest = z.infer<typeof refreshSchema>;
