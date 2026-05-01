import crypto from "crypto";

import bcrypt from "bcrypt";
import { eq, and, gt } from "drizzle-orm";

import { db } from "@/db";
import { users, refreshTokens, type User } from "@/db/schema";
import { signJwt, verifyJwt } from "@/utils/jwt-secret-manager";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10;

type SafeUser = Omit<
  User,
  "passwordHash" | "authVerifierHash" | "kdfSalt" | "mfaSecret"
>;

const safeUserColumns = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  accountStatus: users.accountStatus,
  mfaEnabled: users.mfaEnabled,
  lastLogin: users.lastLogin,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

const loginUserColumns = {
  ...safeUserColumns,
  passwordHash: users.passwordHash,
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getDbErrorCode(error: unknown): string | undefined {
  const err = error as { code?: string; cause?: { code?: string } };
  return err.cause?.code ?? err.code;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

export interface VerifiedTokenPayload {
  userId: string;
  sub: string;
  projectId?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

export class AuthService {
  async signup(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ): Promise<AuthTokens> {
    const normalizedEmail = normalizeEmail(email);

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      throw new Error("المستخدم موجود بالفعل");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          firstName,
          lastName,
        })
        .returning(safeUserColumns);

      if (!newUser) {
        throw new Error("فشل إنشاء المستخدم");
      }

      const { accessToken, refreshToken } = await this.generateTokenPair(
        newUser.id,
      );

      return {
        accessToken,
        refreshToken,
        user: newUser,
      };
    } catch (error) {
      if (getDbErrorCode(error) === "23505") {
        throw new Error("المستخدم موجود بالفعل");
      }

      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const normalizedEmail = normalizeEmail(email);

    const [user] = await db
      .select(loginUserColumns)
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    if (user.accountStatus !== "active") {
      throw new Error("الحساب غير نشط");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    const { passwordHash: _, ...safeUser } = user;
    const { accessToken, refreshToken } = await this.generateTokenPair(user.id);

    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }

  async getUserById(userId: string): Promise<SafeUser | null> {
    const [user] = await db
      .select(safeUserColumns)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user ?? null;
  }

  verifyToken(token: string): VerifiedTokenPayload {
    try {
      const payload = verifyJwt<{
        userId?: string;
        sub?: string;
        projectId?: string;
        role?: string;
        exp?: number;
        iat?: number;
      }>(token);

      const resolvedUserId = payload.sub ?? payload.userId;
      if (!resolvedUserId) {
        throw new Error("رمز التحقق غير صالح");
      }

      return {
        userId: resolvedUserId,
        sub: resolvedUserId,
        ...(payload.projectId !== undefined && {
          projectId: payload.projectId,
        }),
        ...(payload.role !== undefined && { role: payload.role }),
        ...(payload.exp !== undefined && { exp: payload.exp }),
        ...(payload.iat !== undefined && { iat: payload.iat }),
      };
    } catch {
      throw new Error("رمز التحقق غير صالح");
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, refreshToken),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!tokenRecord) {
      throw new Error("رمز التحديث غير صالح أو منتهي الصلاحية");
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));
    return this.generateTokenPair(tokenRecord.userId);
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  private async generateTokenPair(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = signJwt(
      { sub: userId, userId, projectId: undefined, role: undefined },
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

    await db.insert(refreshTokens).values({
      userId,
      token: refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
