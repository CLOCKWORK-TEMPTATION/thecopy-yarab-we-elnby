import { Request, Response } from "express";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { issueCsrfCookie } from "@/middleware/csrf.middleware";
import { authService } from "@/services/auth.service";

import type { AuthRequest } from "@/middleware/auth.middleware";

const signupSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z
    .string()
    .min(12, "كلمة المرور يجب أن تكون 12 حرفاً على الأقل")
    .regex(/[A-Z]/, "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل")
    .regex(/[a-z]/, "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل")
    .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل")
    .regex(
      /[^A-Za-z0-9]/,
      "كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل",
    ),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

function getCookie(req: Request, name: string): string | undefined {
  const cookies = (req as unknown as { cookies?: Record<string, unknown> })
    .cookies;
  if (!cookies || typeof cookies !== "object") {
    return undefined;
  }

  const value = cookies[name];
  return typeof value === "string" ? value : undefined;
}

export class AuthController {
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = signupSchema.parse(req.body);

      const { accessToken, refreshToken, user } = await authService.signup(
        validatedData.email,
        validatedData.password,
        validatedData.firstName,
        validatedData.lastName,
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60 * 1000, // 15 minutes
        sameSite: "strict",
      });
      issueCsrfCookie(res);

      res.status(201).json({
        success: true,
        message: "تم إنشاء الحساب بنجاح",
        data: { user, token: accessToken },
      });

      logger.info("User signed up successfully", { userId: user.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "بيانات غير صالحة",
          details: error.issues,
        });
        return;
      }

      logger.error("Signup error:", error);
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الحساب",
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = loginSchema.parse(req.body);

      const { accessToken, refreshToken, user } = await authService.login(
        validatedData.email,
        validatedData.password,
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60 * 1000, // 15 minutes
        sameSite: "strict",
      });
      issueCsrfCookie(res);

      res.json({
        success: true,
        message: "تم تسجيل الدخول بنجاح",
        data: { user, token: accessToken },
      });

      logger.info("User logged in successfully", { userId: user.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "بيانات غير صالحة",
          details: error.issues,
        });
        return;
      }

      logger.error("Login error:", error);
      res.status(401).json({
        success: false,
        error:
          error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الدخول",
      });
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    const refreshToken = getCookie(req, "refreshToken");
    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = getCookie(req, "refreshToken");
      if (!refreshToken) {
        res.status(401).json({ success: false, error: "رمز التحديث مطلوب" });
        return;
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await authService.refreshAccessToken(refreshToken);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60 * 1000, // 15 minutes
        sameSite: "strict",
      });
      issueCsrfCookie(res);

      res.json({ success: true, data: { token: accessToken } });
    } catch (error) {
      logger.error("Refresh token error:", error);
      res.status(401).json({ success: false, error: "رمز التحديث غير صالح" });
    }
  }

  getCurrentUser(req: AuthRequest, res: Response): void {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "غير مصرح",
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      logger.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ",
      });
    }
  }
}

export const authController = new AuthController();
