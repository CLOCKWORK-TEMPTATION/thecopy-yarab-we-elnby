import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '@/db';
import { users, refreshTokens, type User } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { signJwt, verifyJwt } from '@/utils/jwt-secret-manager';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
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
  async signup(email: string, password: string, firstName?: string, lastName?: string): Promise<AuthTokens> {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      throw new Error('المستخدم موجود بالفعل');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      firstName,
      lastName,
    }).returning();

    if (!newUser) {
      throw new Error('فشل إنشاء المستخدم');
    }

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    const { accessToken, refreshToken } = await this.generateTokenPair(newUser.id);
    
    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    const { accessToken, refreshToken } = await this.generateTokenPair(user.id);

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  async getUserById(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
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

      const resolvedUserId = payload.sub || payload.userId;
      if (!resolvedUserId) {
        throw new Error('رمز التحقق غير صالح');
      }

      return {
        userId: resolvedUserId,
        sub: resolvedUserId,
        ...(payload.projectId !== undefined && { projectId: payload.projectId }),
        ...(payload.role !== undefined && { role: payload.role }),
        ...(payload.exp !== undefined && { exp: payload.exp }),
        ...(payload.iat !== undefined && { iat: payload.iat }),
      };
    } catch (error) {
      throw new Error('رمز التحقق غير صالح');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.token, refreshToken),
        gt(refreshTokens.expiresAt, new Date())
      ))
      .limit(1);

    if (!tokenRecord) {
      throw new Error('رمز التحديث غير صالح أو منتهي الصلاحية');
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));
    return this.generateTokenPair(tokenRecord.userId);
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  private async generateTokenPair(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = signJwt({ sub: userId, userId, projectId: undefined, role: undefined }, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    const refreshToken = crypto.randomBytes(64).toString('hex');
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
