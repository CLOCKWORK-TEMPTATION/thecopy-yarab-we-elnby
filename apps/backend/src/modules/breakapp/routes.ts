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

import { Router } from "express";

import { adminRouter } from "./admin-routes";
import { authRouter } from "./auth-routes";
import { geoVendorRouter } from "./geo-vendors-routes";
import { ordersRouter } from "./orders-routes";
import { runnersRouter } from "./runners-routes";
import { breakappService } from "./service";
import { vendorRouter } from "./vendor-routes";

const router = Router();

// ---------- Health ----------

router.get("/health", async (_req, res) => {
  const health = await breakappService.getHealth();
  res.json({ success: true, data: health });
});

// ---------- Route Groups ----------

router.use("/", authRouter);
router.use("/", geoVendorRouter);
router.use("/", ordersRouter);
router.use("/", runnersRouter);
router.use("/", vendorRouter);
router.use("/", adminRouter);

export { router as breakappRouter };
