import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '@/utils/jwt-secret-manager';

import type { BreakappRole, BreakappTokenPayload } from './service.types';
import { getBearerToken, readCookie } from './utils';

export interface AuthenticatedRequest extends Request {
  breakappAuth?: BreakappTokenPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const payload = verifyBreakappToken(req);
    req.breakappAuth = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'غير مصرح',
    });
  }
}

export function requireRole(...allowed: BreakappRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    if (!allowed.includes(auth.role)) {
      res.status(403).json({
        success: false,
        error: 'صلاحيات غير كافية',
      });
      return;
    }
    next();
  };
}

function verifyBreakappToken(request: Request): BreakappTokenPayload {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error('مطلوب رمز مصادقة');
  }
  return verifyJwt<BreakappTokenPayload>(token);
}