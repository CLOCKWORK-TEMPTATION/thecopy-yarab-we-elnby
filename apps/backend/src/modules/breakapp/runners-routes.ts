import { Router, type Response } from "express";
import { z } from "zod";

import { websocketService } from "@/services/websocket.service";

import { breakappService } from "./service";
import { breakappGateway } from "./gateway";
import {
  protectedLimiter,
  runnerLocationLimiter,
  requireAuth,
  requireRole,
} from "./middlewares";
import type { AuthenticatedRequest } from "./middlewares";
import { orderStatusSchema, runnerLocationSchema } from "./schemas";
import * as repo from "./repository";

export function registerRunnersRoutes(
  router: Router,
  handleValidationError: (res: Response, error: z.ZodError) => void,
): void {
  router.post(
    "/runners/location",
    runnerLocationLimiter,
    requireAuth,
    requireRole("runner"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const body = runnerLocationSchema.safeParse(req.body);
        if (!body.success) {
          handleValidationError(res, body.error);
          return;
        }
        const auth = req.breakappAuth;
        if (!auth) {
          res.status(401).json({ success: false, error: "غير مصرح" });
          return;
        }
        if (body.data.runnerId !== auth.sub) {
          res
            .status(403)
            .json({ success: false, error: "تعذر التحقق من هوية الراسل" });
          return;
        }

        await breakappService.updateRunnerLocation({
          runnerId: body.data.runnerId,
          lat: body.data.lat,
          lng: body.data.lng,
          accuracy: body.data.accuracy ?? undefined,
          sessionId: body.data.sessionId ?? undefined,
        });

        if (body.data.sessionId) {
          websocketService.emitCustom("runner:location:update", {
            runnerId: body.data.runnerId,
            sessionId: body.data.sessionId,
            lat: body.data.lat,
            lng: body.data.lng,
            accuracy: body.data.accuracy ?? null,
          });
        }

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل تسجيل الموقع",
        });
      }
    },
  );

  router.get(
    "/runners/me/tasks",
    protectedLimiter,
    requireAuth,
    requireRole("runner"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const auth = req.breakappAuth;
        if (!auth) {
          res.status(401).json({ success: false, error: "غير مصرح" });
          return;
        }
        const tasks = await repo.listRunnerTasks(auth.sub);
        res.json(tasks);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل جلب المهام",
        });
      }
    },
  );

  router.patch(
    "/runners/tasks/:id/status",
    protectedLimiter,
    requireAuth,
    requireRole("runner"),
    async (req, res) => {
      try {
        const orderId = req.params["id"];
        if (typeof orderId !== "string" || !orderId) {
          res.status(400).json({ success: false, error: "معرف المهمة مطلوب" });
          return;
        }
        const body = orderStatusSchema.safeParse(req.body);
        if (!body.success) {
          handleValidationError(res, body.error);
          return;
        }
        const existing = await breakappService.getOrder(orderId);
        if (!existing) {
          res.status(404).json({ success: false, error: "المهمة غير موجودة" });
          return;
        }
        await breakappService.updateOrderStatus(orderId, body.data.status);
        breakappGateway.emitOrderStatusUpdate({
          orderId,
          status: body.data.status,
          sessionId: existing.sessionId,
          vendorId: existing.vendorId,
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل التحديث",
        });
      }
    },
  );

  router.get(
    "/runners/session/:sessionId",
    protectedLimiter,
    requireAuth,
    requireRole("director", "admin"),
    async (req, res) => {
      try {
        const sessionId = req.params["sessionId"];
        if (typeof sessionId !== "string" || !sessionId) {
          res.status(400).json({ success: false, error: "معرف الجلسة مطلوب" });
          return;
        }
        const runners = await repo.listRunnersForSession(sessionId);
        res.json(runners);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل الجلب",
        });
      }
    },
  );
}
