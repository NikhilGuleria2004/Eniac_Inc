import type { UserDocument } from "../repositories/user.repository.js";
import type { Role } from "../config/constants.js";
import { env } from "../config/env.js";
import { JwtPayload, generateAccessToken, generateRefreshToken, verifyToken } from "../utils/auth/jwt.js";

export class AuthService {
     constructor(private userRepository: {
     findByEmailOrWorkMail: (email: string) => Promise<UserDocument | null>;
     findByUserId: (userId: string) => Promise<UserDocument | null>;
   }) {}

  async login(
    email: string,
    password: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; user: LoginUserResponse }> {
    const { comparePassword } = await import("../utils/auth/jwt.js");
    const { AuthenticationError } = await import("../utils/errors.js");

     const user = await this.userRepository.findByEmailOrWorkMail(email);
    if (!user) {
      throw new AuthenticationError("Invalid email or password.");
    }

    if (!user.hashedPassword) {
      throw new AuthenticationError(
        "Account setup is incomplete. Please accept your email invitation to set a password."
      );
    }

    const isPasswordValid = await comparePassword(password, user.hashedPassword);
    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid email or password.");
    }

    if (user.status !== "ACTIVE") {
      throw new AuthenticationError("Account is not active.");
    }

    const payload: JwtPayload = {
      userId: user.userId,
      employeeId: user.employeeId,
      email: user.email,
      role: user.role as Role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(env.JWT_EXPIRES_IN),
      user: {
        id: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as Role,
        employeeId: user.employeeId
      }
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const { AuthenticationError } = await import("../utils/errors.js");

    let payload: JwtPayload;
    try {
      payload = verifyToken(refreshToken);
    } catch {
      throw new AuthenticationError("Invalid or expired refresh token.");
    }

    if (payload.tokenType !== "refresh") {
      throw new AuthenticationError("Invalid token type. Expected refresh token.");
    }

    const user = await this.userRepository.findByUserId(payload.userId);
    if (!user) {
      throw new AuthenticationError("User not found.");
    }

    if (user.status !== "ACTIVE") {
      throw new AuthenticationError("Account is not active.");
    }

    const newPayload: JwtPayload = {
      userId: user.userId,
      employeeId: user.employeeId,
      email: user.email,
      role: user.role as Role
    };

    const newAccessToken = generateAccessToken(newPayload);

    return {
      accessToken: newAccessToken,
      expiresIn: this.parseExpiresIn(env.JWT_EXPIRES_IN)
    };
  }

  async getMe(userId: string): Promise<MeResponse> {
    const { AuthenticationError } = await import("../utils/errors.js");

    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      throw new AuthenticationError("User not found.");
    }

    return {
      id: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as Role,
      employeeId: user.employeeId
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 3600);
  }
}

export interface LoginUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  employeeId?: string;
}

export interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  employeeId?: string;
}
