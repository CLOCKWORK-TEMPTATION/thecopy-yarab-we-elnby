import type { Request } from 'express';

export function readCookie(request: Request, name: string): string | null {
  const rawCookies: unknown = request.cookies;
  if (!rawCookies || typeof rawCookies !== 'object') {
    return null;
  }
  const value = (rawCookies as Record<string, unknown>)[name];
  return typeof value === 'string' && value ? value : null;
}

export function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.authorization;
  if (authorizationHeader?.startsWith('Bearer ')) {
    return authorizationHeader.slice('Bearer '.length).trim();
  }
  return readCookie(request, 'accessToken');
}