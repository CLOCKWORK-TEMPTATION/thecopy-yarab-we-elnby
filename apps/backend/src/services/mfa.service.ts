import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Configure authenticator options
authenticator.options = {
  digits: 6,
  step: 30, // 30 seconds validity
  window: 1, // Allow 1 step before/after for time drift
};

export interface MFASetupResult {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
}

export interface MFAVerifyResult {
  success: boolean;
  message: string;
}

export class MFAService {
  private readonly APP_NAME = 'TheCopy';

  /**
   * Enable MFA for a user - generates secret and QR code
   * @param userId - The user's ID
   * @returns MFA setup data including secret and QR code
   */
  async enableMFA(userId: string): Promise<MFASetupResult> {
    // Get user to check if MFA is already enabled
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    if (user.mfaEnabled) {
      throw new Error('المصادقة الثنائية مفعلة بالفعل');
    }

    // Generate new secret
    const secret = authenticator.generateSecret();

    // Generate otpauth URL for authenticator apps
    const otpauthUrl = authenticator.keyuri(user.email, this.APP_NAME, secret);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Store secret (not enabled yet - user needs to verify first)
    await db
      .update(users)
      .set({
        mfaSecret: secret,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      secret,
      qrCodeDataUrl,
      otpauthUrl,
    };
  }

  /**
   * Verify MFA token and enable MFA if valid (for first-time setup)
   * or just verify if already enabled
   * @param userId - The user's ID
   * @param token - The 6-digit OTP token
   * @returns Verification result
   */
  async verifyMFA(userId: string, token: string): Promise<MFAVerifyResult> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    if (!user.mfaSecret) {
      throw new Error('لم يتم إعداد المصادقة الثنائية');
    }

    // Verify the token
    const isValid = authenticator.verify({
      token,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      return {
        success: false,
        message: 'رمز التحقق غير صحيح',
      };
    }

    // If MFA wasn't enabled yet, enable it now (first-time verification)
    if (!user.mfaEnabled) {
      await db
        .update(users)
        .set({
          mfaEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    return {
      success: true,
      message: 'تم التحقق بنجاح',
    };
  }

  /**
   * Disable MFA for a user
   * @param userId - The user's ID
   */
  async disableMFA(userId: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    if (!user.mfaEnabled) {
      throw new Error('المصادقة الثنائية غير مفعلة');
    }

    // Clear MFA data
    await db
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Check if MFA is enabled for a user
   * @param userId - The user's ID
   * @returns Whether MFA is enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    return user.mfaEnabled;
  }

  /**
   * Validate MFA token during login
   * @param userId - The user's ID
   * @param token - The 6-digit OTP token
   * @returns Whether the token is valid
   */
  async validateToken(userId: string, token: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || !user.mfaSecret || !user.mfaEnabled) {
      return false;
    }

    return authenticator.verify({
      token,
      secret: user.mfaSecret,
    });
  }
}

export const mfaService = new MFAService();
