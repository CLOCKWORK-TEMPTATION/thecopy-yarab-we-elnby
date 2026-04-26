import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, recoveryArtifacts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { signJwt } from '@/utils/jwt-secret-manager';
import { issueCsrfCookie } from '@/middleware/csrf.middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const zkSignupBodySchema = z.object({
  email: z.string().min(1),
  authVerifier: z.string().min(1),
  kdfSalt: z.string().min(1),
  recoveryArtifact: z.string().optional(),
  recoveryIv: z.string().optional(),
}).passthrough();

const zkLoginInitBodySchema = z.object({
  email: z.string().min(1),
}).passthrough();

const zkLoginVerifyBodySchema = z.object({
  email: z.string().min(1),
  authVerifier: z.string().min(1),
}).passthrough();

const recoveryArtifactBodySchema = z.union([
  z.object({ action: z.literal('get') }).passthrough(),
  z.object({
    action: z.literal('update'),
    recoveryArtifact: z.string().min(1),
    iv: z.string().min(1),
  }).passthrough(),
]);

function setAuthCookie(res: Response, token: string): void {
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'strict',
  });
}

function createToken(userId: string, email: string): string {
  return signJwt({ userId, email }, { expiresIn: TOKEN_EXPIRY });
}

async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

async function saveRecoveryIfProvided(userId: string, artifact?: string, iv?: string): Promise<void> {
  if (artifact && iv) {
    await db.insert(recoveryArtifacts).values({
      userId,
      encryptedRecoveryArtifact: artifact,
      iv,
    });
  }
}

export async function zkSignup(req: Request, res: Response): Promise<void> {
  try {
    const validation = zkSignupBodySchema.safeParse(req.body);
    if (!validation.success) {
      res["status"](400).json({ success: false, error: 'البيانات المطلوبة: email, authVerifier, kdfSalt' });
      return;
    }

    const { email, authVerifier, kdfSalt, recoveryArtifact, recoveryIv } = validation.data;

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res["status"](409).json({ success: false, error: 'البريد الإلكتروني مستخدم بالفعل' });
      return;
    }

    const authVerifierHash = await bcrypt.hash(authVerifier, SALT_ROUNDS);
    const [newUser] = await db
      .insert(users)
      .values({ email, passwordHash: authVerifierHash, authVerifierHash, kdfSalt, accountStatus: 'active' })
      .returning();

    if (!newUser) {
      res["status"](500).json({ success: false, error: 'تعذر إنشاء المستخدم' });
      return;
    }

    await saveRecoveryIfProvided(newUser.id, recoveryArtifact, recoveryIv);
    const token = createToken(newUser.id, newUser.email);
    setAuthCookie(res, token);
    issueCsrfCookie(res);

    res["status"](201).json({
      success: true,
      data: { userId: newUser.id, email: newUser.email, token, kdfSalt: newUser.kdfSalt },
    });
  } catch (error) {
    logger.error('Error in ZK signup:', error);
    res["status"](500).json({ success: false, error: 'خطأ في التسجيل' });
  }
}

export async function zkLoginInit(req: Request, res: Response): Promise<void> {
  try {
    const validation = zkLoginInitBodySchema.safeParse(req.body);
    if (!validation.success) {
      res["status"](400).json({ success: false, error: 'البريد الإلكتروني مطلوب' });
      return;
    }
    const { email } = validation.data;

    const [user] = await db
      .select({ id: users.id, kdfSalt: users.kdfSalt, accountStatus: users.accountStatus })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.kdfSalt) {
      res["status"](404).json({ success: false, error: 'المستخدم غير موجود أو لا يستخدم Zero-Knowledge' });
      return;
    }

    if (user.accountStatus !== 'active') {
      res["status"](403).json({ success: false, error: 'الحساب غير نشط' });
      return;
    }

    res.json({ success: true, data: { kdfSalt: user.kdfSalt } });
  } catch (error) {
    logger.error('Error in ZK login init:', error);
    res["status"](500).json({ success: false, error: 'خطأ في بدء تسجيل الدخول' });
  }
}

export async function zkLoginVerify(req: Request, res: Response): Promise<void> {
  try {
    const validation = zkLoginVerifyBodySchema.safeParse(req.body);
    if (!validation.success) {
      res["status"](400).json({ success: false, error: 'البيانات المطلوبة: email, authVerifier' });
      return;
    }

    const { email, authVerifier } = validation.data;

    const user = await findUserByEmail(email);
    if (!user || !user.authVerifierHash) {
      res["status"](401).json({ success: false, error: 'بيانات اعتماد غير صحيحة' });
      return;
    }

    const isValid = await bcrypt.compare(authVerifier, user.authVerifierHash);
    if (!isValid) {
      res["status"](401).json({ success: false, error: 'بيانات اعتماد غير صحيحة' });
      return;
    }

    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));
    const token = createToken(user.id, user.email);
    setAuthCookie(res, token);
    issueCsrfCookie(res);

    res.json({
      success: true,
      data: { userId: user.id, email: user.email, token, kdfSalt: user.kdfSalt },
    });
  } catch (error) {
    logger.error('Error in ZK login verify:', error);
    res["status"](500).json({ success: false, error: 'خطأ في تسجيل الدخول' });
  }
}

async function handleGetRecovery(userId: string, res: Response): Promise<void> {
  const [artifact] = await db
    .select()
    .from(recoveryArtifacts)
    .where(eq(recoveryArtifacts.userId, userId))
    .limit(1);

  if (!artifact) {
    res["status"](404).json({ success: false, error: 'لا توجد مادة استرداد' });
    return;
  }

  res.json({
    success: true,
    data: {
      encryptedRecoveryArtifact: artifact.encryptedRecoveryArtifact,
      iv: artifact.iv,
      createdAt: artifact.createdAt,
    },
  });
}

async function handleUpdateRecovery(userId: string, recoveryArtifact: string, iv: string, res: Response): Promise<void> {
  const [updated] = await db
    .update(recoveryArtifacts)
    .set({ encryptedRecoveryArtifact: recoveryArtifact, iv, updatedAt: new Date() })
    .where(eq(recoveryArtifacts.userId, userId))
    .returning();

  if (!updated) {
    await db.insert(recoveryArtifacts).values({ userId, encryptedRecoveryArtifact: recoveryArtifact, iv });
  }

  res.json({ success: true, data: { message: 'تم تحديث مادة الاسترداد بنجاح' } });
}

export async function manageRecoveryArtifact(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res["status"](401).json({ success: false, error: 'غير مصرح. يرجى تسجيل الدخول.' });
      return;
    }

    const validation = recoveryArtifactBodySchema.safeParse(req.body);
    if (!validation.success) {
      res["status"](400).json({ success: false, error: 'الإجراء غير صالح أو البيانات المطلوبة غير مكتملة' });
      return;
    }

    const { action } = validation.data;

    if (action === 'get') {
      await handleGetRecovery(userId, res);
    } else {
      const { recoveryArtifact, iv } = validation.data;
      await handleUpdateRecovery(userId, recoveryArtifact, iv, res);
    }
  } catch (error) {
    logger.error('Error managing recovery artifact:', error);
    res["status"](500).json({ success: false, error: 'خطأ في إدارة مادة الاسترداد' });
  }
}
