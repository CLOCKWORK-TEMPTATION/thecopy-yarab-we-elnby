/**
 * BREAKAPP Routes
 * ---------------
 * كل المسارات التشغيلية تحت /api/breakapp/*
 * - JWT access token قصير الأمد (8 ساعات)
 * - Refresh token في httpOnly cookie
 * - Rate limiting لكل مجموعة
 * - Zod validation لكل write endpoint
 * - حماية حسب الدور عبر requireRole()
 */

import { Router, type Response } from "express";
import { z } from "zod";

import { registerAdminRoutes } from "./admin-routes";
import { registerAuthRoutes } from "./auth-routes";
import { registerGeoVendorRoutes } from "./geo-vendors-routes";
import { registerOrdersRoutes } from "./orders-routes";
import { registerRunnersRoutes } from "./runners-routes";
import { registerVendorRoutes } from "./vendor-routes";
import {
  adminWriteLimiter,
  protectedLimiter,
  requireAuth,
  requireRole,
} from "./middlewares";
import { breakappService } from "./service";

const router = Router();

function handleValidationError(res: Response, error: z.ZodError): void {
  res.status(400).json({
    success: false,
    error: "بيانات غير صالحة",
    details: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

// ---------- Health ----------

router.get("/health", async (_req, res) => {
  const health = await breakappService.getHealth();
  res.json({ success: true, data: health });
});

// ---------- Route Groups ----------

registerAuthRoutes(router);
registerGeoVendorRoutes(router);
registerOrdersRoutes(router, handleValidationError);
registerRunnersRoutes(router, handleValidationError);
registerVendorRoutes(router, handleValidationError);

registerAdminRoutes(router, {
  adminWriteLimiter,
  protectedLimiter,
  requireAuth,
  requireRole,
  handleValidationError,
});

export { router as breakappRouter };
