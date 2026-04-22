import { Request, Response, NextFunction } from 'express';
import { authService } from '@/services/auth.service';

/**
 * نوع الطلب المصادق عليه
 * 
 * @description
 * اسم مستعار لـ Request — الخصائص userId و user مُعرّفة عبر module augmentation
 * في global.d.ts، لذا كل Request يحملها تلقائياً بعد مرور وسيط المصادقة.
 * 
 * @deprecated استخدم Request مباشرة — هذا الاسم المستعار للتوافق مع الكود القديم فقط
 */
export type AuthRequest = Request;

/**
 * استخراج قيمة المعرّف من معاملات الطلب بشكل آمن
 * 
 * @description
 * Express 5 يُرجع params كـ string | string[] - هذه الدالة تضمن إرجاع string فقط
 * 
 * @param paramValue - قيمة المعامل من req.params
 * @returns القيمة كـ string أو undefined إذا كانت مصفوفة
 */
export function getParamAsString(paramValue: string | string[] | undefined): string | undefined {
  if (Array.isArray(paramValue)) {
    return paramValue[0];
  }
  return paramValue;
}

function resolveToken(req: Request): string {
  const authHeader = String(req.headers.authorization || '');
  const [headerType, headerTokenValue] = authHeader.split(' ');
  const cookieToken = String(req.cookies?.["accessToken"] || '');

  const headerTokensMap: Record<string, string | undefined> = {
    'Bearer': headerTokenValue
  };

  const headerToken =
    typeof headerType === 'string' ? headerTokensMap[headerType] : undefined;

  return String(headerToken || cookieToken || '');
}

async function verifyAndAttachUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const tokenToVerify = resolveToken(req);
  const { userId } = authService.verifyToken(tokenToVerify);
  const user = await authService.getUserById(userId);

  if (!user) {
    res.status(401).json({ success: false, error: 'المستخدم غير موجود' });
    return;
  }

  req.userId = userId;
  req.user = user!;
  next();
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await verifyAndAttachUser(req, res, next);
  } catch (innerError: unknown) {
    const message = innerError instanceof Error ? innerError.message : '';
    if (message.includes('jwt must be provided')) {
      res.status(401).json({ success: false, error: 'غير مصرح - يرجى تسجيل الدخول' });
      return;
    }
    res.status(401).json({ success: false, error: 'رمز التحقق غير صالح' });
  }
};
