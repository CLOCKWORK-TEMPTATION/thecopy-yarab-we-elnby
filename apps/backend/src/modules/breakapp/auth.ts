import type { Response } from 'express';
import { signJwt } from '@/utils/jwt-secret-manager';
import { env } from '@/config/env';

import { REFRESH_COOKIE_NAME, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_MS } from './constants';
import { breakappService } from './service';
import * as repo from './repository';
import type { BreakappTokenPayload } from './service.types';

export function issueAccessToken(params: {
  userId: string;
  projectId: string;
  role: BreakappTokenPayload['role'];
}): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: BreakappTokenPayload = {
    sub: params.userId,
    projectId: params.projectId,
    role: params.role,
    iat: issuedAt,
    exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
  };
  return signJwt(payload);
}

export async function issueRefreshCookie(
  res: Response,
  params: { userId: string; projectId: string }
): Promise<void> {
  const token = breakappService.generateRefreshToken();
  const tokenHash = breakappService.hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await repo.insertRefreshToken({
    userId: params.userId,
    projectId: params.projectId,
    tokenHash,
    expiresAt,
  });

  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/breakapp/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/breakapp/auth',
  });
}