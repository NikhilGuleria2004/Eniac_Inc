import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { Role } from "../../config/constants.js";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export interface JwtPayload {
  userId: string;
  employeeId?: string;
  email: string;
  role: Role;
  tokenType?: "access" | "refresh";
}

export function generateToken(payload: JwtPayload, expiresIn?: string): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: (expiresIn ?? env.JWT_EXPIRES_IN) as jwt.SignOptions["expiresIn"]
  });
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, tokenType: "access" }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, tokenType: "refresh" }, env.JWT_SECRET, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"]
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  return decoded;
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
