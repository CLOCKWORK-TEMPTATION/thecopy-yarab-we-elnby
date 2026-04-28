import { env } from "@/config/env";
import { logger } from "@/lib/logger";

import type { NextFunction, Request, Response } from "express";

/**
 * Additional CSRF Protection — validates Origin/Referer for state-changing requests.
 * Runs AFTER csrfProtection to add a defense-in-depth layer alongside the
 * token-based middleware.
 *
 * SECURITY: مجموعة origins المسموح بها مُطبّعة عبر URL parsing —
 * تمنع المطابقة الحرفية عبر startsWith التي كانت عرضة لهجمات من نوع
 * "http://localhost:5000EVIL.com" تُطابق "http://localhost:5000".
 */
export function csrfOriginRefererValidator(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Only check state-changing methods
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    next();
    return;
  }

  // Skip for health endpoints and metrics
  const safePaths = ["/health", "/api/health", "/metrics"];
  if (safePaths.some((path) => req.path.startsWith(path))) {
    next();
    return;
  }

  const origin = req.get("Origin");
  const referer = req.get("Referer");
  const contentType = req.get("Content-Type") ?? "";
  const userAgent = req.get("User-Agent") ?? "";

  const rawAllowed = [
    ...env.CORS_ORIGIN.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    "http://localhost:5000",
    "http://localhost:3000",
    `http://localhost:${env.PORT}`,
  ];

  const allowedOriginSet = new Set<string>();
  for (const entry of rawAllowed) {
    try {
      const parsed = new URL(entry);
      allowedOriginSet.add(`${parsed.protocol}//${parsed.host}`);
    } catch {
      // تجاهل المدخلات التي لا تُحلَّل كعنوان URL صالح
    }
  }

  // SECURITY: تحليل origin الوارد عبر URL constructor ومقارنته بالمجموعة بالمساواة الصارمة فقط
  const parseOriginStrict = (candidate: string): string | null => {
    try {
      const parsed = new URL(candidate);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return null;
    }
  };

  // SECURITY: Require Origin or Referer for state-changing requests
  if (!origin && !referer) {
    const isBrowserRequest =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data") ||
      (contentType.includes("application/json") &&
        userAgent.toLowerCase().includes("mozilla"));

    if (isBrowserRequest) {
      const sanitizedPath = req.path.replace(/[^\w\-/]/g, "");
      const sanitizedMethod = req.method.replace(/[^A-Z]/g, "");
      logger.warn("CSRF: Missing Origin/Referer", {
        path: sanitizedPath,
        method: sanitizedMethod,
      });
      res.status(403).json({
        success: false,
        error: "طلب غير مصرح به",
        code: "CSRF_MISSING_ORIGIN",
      });
      return;
    }
    next();
    return;
  }

  // Validate Origin بالمساواة الصارمة على protocol+host بعد URL parsing
  if (origin) {
    const normalizedOrigin = parseOriginStrict(origin);
    if (!normalizedOrigin || !allowedOriginSet.has(normalizedOrigin)) {
      const sanitizedOrigin = origin.replace(/[^\w\-:.]/g, "");
      logger.warn("CSRF: Origin mismatch", { origin: sanitizedOrigin });
      res.status(403).json({
        success: false,
        error: "طلب غير مصرح به",
        code: "CSRF_ORIGIN_MISMATCH",
      });
      return;
    }
  }

  // Validate Referer بنفس الأسلوب المُحكم عند غياب Origin
  if (!origin && referer) {
    const refererOrigin = parseOriginStrict(referer);
    if (!refererOrigin) {
      logger.warn("CSRF: Invalid Referer URL");
      res.status(403).json({
        success: false,
        error: "طلب غير مصرح به",
        code: "CSRF_INVALID_REFERER",
      });
      return;
    }
    if (!allowedOriginSet.has(refererOrigin)) {
      const sanitizedReferer = refererOrigin.replace(/[^\w\-:.]/g, "");
      logger.warn("CSRF: Referer mismatch", { referer: sanitizedReferer });
      res.status(403).json({
        success: false,
        error: "طلب غير مصرح به",
        code: "CSRF_REFERER_MISMATCH",
      });
      return;
    }
  }

  // Origin/Referer validation passed
  next();
}
