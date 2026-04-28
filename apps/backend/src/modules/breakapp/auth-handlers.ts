import { logger } from "@/lib/logger";
import { verifyJwt } from "@/utils/jwt-secret-manager";


import {
  issueAccessToken,
  issueRefreshCookie,
  clearRefreshCookie,
} from "./auth";
import { REFRESH_COOKIE_NAME } from "./constants";
import {
  addProjectMember,
  findRefreshToken,
  getUserRoleInProject,
  revokeRefreshToken,
} from "./repository";
import { scanQrSchema } from "./schemas";
import { breakappService } from "./service";
import { readCookie, getBearerToken } from "./utils";

import type { AuthenticatedRequest } from "./middlewares";
import type { BreakappTokenPayload } from "./service.types";
import type { Response } from "express";

export async function handleScanQr(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const body = scanQrSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        success: false,
        error: "بيانات غير صالحة",
        details: body.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    const parsed = breakappService.parseQrToken(body.data.qr_token);

    try {
      await Promise.resolve(
        addProjectMember({
          projectId: parsed.projectId,
          userId: parsed.userId,
          role: parsed.role,
        }),
      );
    } catch (error) {
      // إذا فشل الإدخال (مثلاً المشروع غير موجود) نستمر لكن لا نصدر refresh cookie.
      logger.warn("[breakapp] Failed to persist project member on scan-qr", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const accessToken = issueAccessToken({
      userId: parsed.userId,
      projectId: parsed.projectId,
      role: parsed.role,
    });

    try {
      await issueRefreshCookie(res, {
        userId: parsed.userId,
        projectId: parsed.projectId,
      });
    } catch (error) {
      logger.warn("[breakapp] Failed to issue refresh cookie", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    res.json({
      access_token: accessToken,
      user: {
        id: parsed.userId,
        projectId: parsed.projectId,
        role: parsed.role,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل تسجيل الدخول",
    });
  }
}

export function handleVerifyToken(
  req: AuthenticatedRequest,
  res: Response,
): void {
  try {
    const body: Record<string, unknown> =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};
    const rawToken = body["token"];
    const bodyToken = typeof rawToken === "string" ? rawToken : "";
    const token = bodyToken !== "" ? bodyToken : (getBearerToken(req) ?? "");

    const payload = verifyJwt<BreakappTokenPayload>(token);
    res.json({
      valid: true,
      payload: {
        userId: payload.sub,
        projectId: payload.projectId,
        role: payload.role,
      },
    });
  } catch {
    res.json({ valid: false, payload: null });
  }
}

export async function handleRefreshToken(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const cookieValue = readCookie(req, REFRESH_COOKIE_NAME);
    if (!cookieValue) {
      res.status(401).json({ success: false, error: "رمز التحديث مفقود" });
      return;
    }

    const hash = breakappService.hashRefreshToken(cookieValue);
    const stored = await findRefreshToken(hash);
    if (!stored) {
      res.status(401).json({ success: false, error: "رمز التحديث غير صالح" });
      return;
    }
    if (stored.revokedAt) {
      res.status(401).json({ success: false, error: "رمز التحديث مُبطَل" });
      return;
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      res.status(401).json({ success: false, error: "رمز التحديث منتهي" });
      return;
    }

    const role = await getUserRoleInProject(stored.projectId, stored.userId);
    if (!role) {
      res.status(401).json({ success: false, error: "العضوية غير موجودة" });
      return;
    }

    const accessToken = issueAccessToken({
      userId: stored.userId,
      projectId: stored.projectId,
      role,
    });
    res.json({ access_token: accessToken });
  } catch (error) {
    logger.warn("[breakapp] refresh failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(401).json({ success: false, error: "تعذر تجديد الجلسة" });
  }
}

export async function handleLogout(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const cookieValue = readCookie(req, REFRESH_COOKIE_NAME);
    if (cookieValue) {
      const hash = breakappService.hashRefreshToken(cookieValue);
      await revokeRefreshToken(hash);
    }
    clearRefreshCookie(res);
    res.json({ success: true });
  } catch (error) {
    logger.warn("[breakapp] logout failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    clearRefreshCookie(res);
    res.json({ success: true });
  }
}
