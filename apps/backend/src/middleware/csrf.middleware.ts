/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 *
 * Implements Double Submit Cookie pattern for CSRF protection
 * - Generates a random token stored in a cookie
 * - Requires the token to be sent in a header for state-changing requests
 * - Validates that the cookie token matches the header token
 */

import { randomBytes } from "crypto";

import { Request, Response, NextFunction } from "express";

import { logger } from "@/lib/logger";

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random CSRF token
 */
function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Methods that require CSRF protection (state-changing operations)
 */
const PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

/**
 * Paths that are exempt from CSRF protection
 * Typically auth endpoints that need to establish the session first
 */
const CSRF_EXEMPT_PATHS = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
  "/api/auth/zk-signup",
  "/api/auth/zk-login-init",
  "/api/auth/zk-login-verify",
  "/api/budget",
  "/api/brainstorm",
  "/api/styleist",
  "/api/cineai",
  "/api/file-extract",
  "/api/files/extract",
  "/api/text-extract",
  "/api/suspicion-review",
  "/api/final-review",
  "/api/ai/context-enhance",
  "/api/export/pdfa",
  "/api/editor-runtime/health",
  "/health",
  "/health/live",
  "/health/ready",
  "/health/startup",
  "/healthz",
  "/readyz",
  "/metrics",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getCookieValue(req: Request, name: string): string | undefined {
  const cookies: unknown = req.cookies;
  if (!isRecord(cookies)) {
    return undefined;
  }
  const value = cookies[name];
  return typeof value === "string" ? value : undefined;
}

function getHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Check if a path is exempt from CSRF protection
 */
function isExemptPath(path: string): boolean {
  return CSRF_EXEMPT_PATHS.some(
    (exemptPath) => path === exemptPath || path.startsWith(exemptPath + "/"),
  );
}

/**
 * CSRF Protection Middleware
 *
 * For GET/HEAD/OPTIONS requests:
 * - Sets a CSRF token cookie if not present
 *
 * For POST/PUT/PATCH/DELETE requests:
 * - Validates that the token in the header matches the token in the cookie
 * - Returns 403 if validation fails
 *
 * SECURITY: Uses Double Submit Cookie pattern to prevent CSRF attacks
 */
function ensureCsrfCookie(req: Request, res: Response): void {
  if (!getCookieValue(req, CSRF_COOKIE_NAME)) {
    issueCsrfCookie(res);
  }
}

export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const method = req.method;
  const path = req.path;

  if (isExemptPath(path)) {
    return next();
  }

  if (!PROTECTED_METHODS.includes(method)) {
    ensureCsrfCookie(req, res);
    return next();
  }

  const cookieToken = getCookieValue(req, CSRF_COOKIE_NAME);
  const headerToken = getHeaderValue(
    req.headers[CSRF_HEADER_NAME.toLowerCase()],
  );

  if (!cookieToken || !headerToken) {
    logger.warn("CSRF validation failed: Missing token", {
      path,
      method,
      ip: req.ip,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
    });
    res.status(403).json({
      success: false,
      error: "CSRF token missing",
      code: "CSRF_TOKEN_MISSING",
    });
    return;
  }

  if (!constantTimeCompare(cookieToken, headerToken)) {
    logger.warn("CSRF validation failed: Token mismatch", {
      path,
      method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.status(403).json({
      success: false,
      error: "CSRF token invalid",
      code: "CSRF_TOKEN_INVALID",
    });
    return;
  }

  next();
}

/**
 * Constant-time string comparison to prevent timing attacks
 * SECURITY: Prevents attackers from using timing differences to guess tokens
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware to explicitly set/refresh CSRF token
 * Can be used on login or other authentication endpoints
 */
export function setCsrfToken(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  issueCsrfCookie(res);
  next();
}

export function issueCsrfCookie(res: Response): string {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });
  return token;
}

/**
 * Get the current CSRF token from the request
 * Useful for including in API responses
 */
export function getCsrfToken(req: Request): string | undefined {
  return getCookieValue(req, CSRF_COOKIE_NAME);
}
