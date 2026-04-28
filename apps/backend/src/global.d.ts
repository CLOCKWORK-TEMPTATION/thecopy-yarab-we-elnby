/**
 * توسيعات TypeScript العامة للمشروع
 * Global TypeScript type augmentations for the project
 */

declare global {
  // توسيع namespace Express لإضافة خصائص المصادقة إلى Request
  // Extend Express namespace to add authentication properties to Request
  namespace Express {
    interface Request {
      /** معرف المستخدم الفريد — يُعيّنه وسيط المصادقة */
      userId?: string;
      /** بيانات المستخدم كاملة (بدون كلمة المرور) — يُعيّنها وسيط المصادقة */
      user?: {
        id: string;
        email: string;
        passwordHash?: never; // منع تسرب الهاش عبر النوع
        firstName?: string | null;
        lastName?: string | null;
        profileImageUrl?: string | null;
        mfaEnabled?: boolean;
        mfaSecret?: string | null;
        authVerifierHash?: string | null;
        kdfSalt?: string | null;
        publicKey?: string | null;
        createdAt?: Date;
        updatedAt?: Date;
        lastLogin?: Date | null;
        accountStatus?: string | null;
      };
    }
  }
}

// تصدير فارغ لجعل الملف module بدلاً من script
// Empty export to make this file a module instead of a script
export {};
