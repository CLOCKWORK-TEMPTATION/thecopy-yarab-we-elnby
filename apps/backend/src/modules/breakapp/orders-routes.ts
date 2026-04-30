import { Router } from "express";

import { websocketService } from "@/services/websocket.service";

import { breakappGateway } from "./gateway";
import {
  handleCreateSession,
  handleGetOrders,
  handleCreateOrder,
  handleGetOrder,
} from "./handlers";
import { protectedLimiter } from "./limiters";
import { requireAuth, requireRole } from "./middlewares";
import { orderStatusSchema } from "./schemas";
import { breakappService } from "./service";
import { handleValidationError } from "./validation";

import type { AuthenticatedRequest } from "./middlewares";
import type { OrderStatus } from "./service.types";

const router = Router();

router.post(
  "/geo/session",
  protectedLimiter,
  requireAuth,
  requireRole("director", "admin"),
  handleCreateSession,
);

router.get("/orders/my-orders", protectedLimiter, requireAuth, handleGetOrders);

router.post("/orders", protectedLimiter, requireAuth, handleCreateOrder);

router.get("/orders/:id", protectedLimiter, requireAuth, handleGetOrder);

router.get(
  "/orders/session/:sessionId",
  protectedLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const sessionId = req.params["sessionId"];
      if (typeof sessionId !== "string" || !sessionId) {
        res.status(400).json({ success: false, error: "معرف الجلسة مطلوب" });
        return;
      }
      const rawStatus =
        typeof req.query["status"] === "string"
          ? req.query["status"]
          : undefined;
      const allowed: OrderStatus[] = [
        "pending",
        "processing",
        "completed",
        "cancelled",
      ];
      const status =
        rawStatus && (allowed as string[]).includes(rawStatus)
          ? (rawStatus as OrderStatus)
          : undefined;
      const orders = await breakappService.listOrdersForSession(
        sessionId,
        status,
      );
      res.json(orders);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "فشل الجلب",
      });
    }
  },
);

router.post(
  "/orders/session/:id/batch",
  protectedLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const sessionId = req.params["id"];
      if (typeof sessionId !== "string" || !sessionId) {
        res.status(400).json({ success: false, error: "معرف الجلسة مطلوب" });
        return;
      }
      const batches = await breakappService.getSessionBatches(sessionId);
      res.json(batches);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "فشل الجلب",
      });
    }
  },
);

router.patch(
  "/orders/:id/status",
  protectedLimiter,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = req.params["id"];
      if (typeof orderId !== "string" || !orderId) {
        res.status(400).json({ success: false, error: "معرف الطلب مطلوب" });
        return;
      }
      const body = orderStatusSchema.safeParse(req.body);
      if (!body.success) {
        handleValidationError(res, body.error);
        return;
      }
      const auth = req.breakappAuth;
      if (!auth) {
        res.status(401).json({ success: false, error: "غير مصرح" });
        return;
      }
      if (auth.role === "crew") {
        res.status(403).json({ success: false, error: "صلاحيات غير كافية" });
        return;
      }

      const existing = await breakappService.getOrder(orderId);
      if (!existing) {
        res.status(404).json({ success: false, error: "الطلب غير موجود" });
        return;
      }

      await breakappService.updateOrderStatus(orderId, body.data.status);
      breakappGateway.emitOrderStatusUpdate({
        orderId,
        status: body.data.status,
        sessionId: existing.sessionId,
        vendorId: existing.vendorId,
      });
      websocketService.emitCustom("order:status:update", {
        orderId,
        status: body.data.status,
        sessionId: existing.sessionId,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "فشل تحديث الحالة",
      });
    }
  },
);

export { router as ordersRouter };
