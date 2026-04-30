import { Router } from "express";

import { breakappGateway } from "./gateway";
import { protectedLimiter } from "./limiters";
import { requireAuth, requireRole } from "./middlewares";
import * as repo from "./repository";
import {
  orderStatusSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from "./schemas";
import { breakappService } from "./service";
import { handleValidationError } from "./validation";

import type { AuthenticatedRequest } from "./middlewares";
import type { OrderStatus } from "./service.types";

const router = Router();

router.get(
  "/vendor/orders",
  protectedLimiter,
  requireAuth,
  requireRole("vendor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const auth = req.breakappAuth;
      if (!auth) {
        res.status(401).json({ success: false, error: "غير مصرح" });
        return;
      }
      const vendor = await repo.getVendorOwnedByUser(auth.sub);
      if (!vendor) {
        res.status(404).json({ success: false, error: "لا يوجد مورد مرتبط" });
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
      const orders = await repo.listOrdersForVendor(vendor.id, status);
      res.json(orders);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "فشل الجلب",
      });
    }
  },
);

router.patch(
  "/vendor/orders/:id/status",
  protectedLimiter,
  requireAuth,
  requireRole("vendor"),
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
      const vendor = await repo.getVendorOwnedByUser(auth.sub);
      if (!vendor) {
        res.status(404).json({ success: false, error: "لا يوجد مورد مرتبط" });
        return;
      }
      const order = await breakappService.getOrder(orderId);
      if (order?.vendorId !== vendor.id) {
        res.status(404).json({ success: false, error: "الطلب غير موجود" });
        return;
      }
      await breakappService.updateOrderStatus(orderId, body.data.status);
      breakappGateway.emitOrderStatusUpdate({
        orderId,
        status: body.data.status,
        sessionId: order.sessionId,
        vendorId: order.vendorId,
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

router.post(
  "/vendor/menu-items",
  protectedLimiter,
  requireAuth,
  requireRole("vendor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = createMenuItemSchema.safeParse(req.body);
      if (!body.success) {
        handleValidationError(res, body.error);
        return;
      }
      const auth = req.breakappAuth;
      if (!auth) {
        res.status(401).json({ success: false, error: "غير مصرح" });
        return;
      }
      const vendor = await repo.getVendorOwnedByUser(auth.sub);
      if (!vendor) {
        res.status(404).json({ success: false, error: "لا يوجد مورد مرتبط" });
        return;
      }
      const vendorId =
        body.data.vendorId && body.data.vendorId === vendor.id
          ? body.data.vendorId
          : vendor.id;
      const created = await repo.createMenuItem({
        vendorId,
        name: body.data.name,
        description: body.data.description ?? null,
        price: body.data.price ?? null,
        available: body.data.available,
      });
      res.status(201).json({ id: created.id });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "فشل الإنشاء",
      });
    }
  },
);

router.patch(
  "/vendor/menu-items/:id",
  protectedLimiter,
  requireAuth,
  requireRole("vendor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const menuItemId = req.params["id"];
      if (typeof menuItemId !== "string" || !menuItemId) {
        res.status(400).json({ success: false, error: "معرف العنصر مطلوب" });
        return;
      }
      const body = updateMenuItemSchema.safeParse(req.body);
      if (!body.success) {
        handleValidationError(res, body.error);
        return;
      }
      const auth = req.breakappAuth;
      if (!auth) {
        res.status(401).json({ success: false, error: "غير مصرح" });
        return;
      }
      const patch: Parameters<typeof repo.updateMenuItem>[2] = {};
      if (body.data.name !== undefined) patch.name = body.data.name;
      if (body.data.description !== undefined)
        patch.description = body.data.description;
      if (body.data.price !== undefined) patch.price = body.data.price;
      if (body.data.available !== undefined)
        patch.available = body.data.available;

      const updated = await repo.updateMenuItem(menuItemId, auth.sub, patch);
      if (!updated) {
        res.status(404).json({ success: false, error: "العنصر غير موجود" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "فشل التحديث",
      });
    }
  },
);

router.delete(
  "/vendor/menu-items/:id",
  protectedLimiter,
  requireAuth,
  requireRole("vendor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const menuItemId = req.params["id"];
      if (typeof menuItemId !== "string" || !menuItemId) {
        res.status(400).json({ success: false, error: "معرف العنصر مطلوب" });
        return;
      }
      const auth = req.breakappAuth;
      if (!auth) {
        res.status(401).json({ success: false, error: "غير مصرح" });
        return;
      }
      const deleted = await repo.softDeleteMenuItem(menuItemId, auth.sub);
      if (!deleted) {
        res.status(404).json({ success: false, error: "العنصر غير موجود" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "فشل الحذف",
      });
    }
  },
);

export { router as vendorRouter };
