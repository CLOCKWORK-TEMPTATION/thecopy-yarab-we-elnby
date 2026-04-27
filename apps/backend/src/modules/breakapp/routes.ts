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

import { Router } from 'express';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { websocketService } from '@/services/websocket.service';

import { registerAdminRoutes } from './admin-routes';
import { breakappGateway } from './gateway';
import * as repo from './repository';
import { breakappService } from './service';

import type { BreakappRole, BreakappTokenPayload, OrderStatus } from './service.types';

import { requireAuth, requireRole, type AuthenticatedRequest } from './middlewares';
import { publicAuthLimiter, protectedLimiter, runnerLocationLimiter, adminWriteLimiter } from './limiters';
import {
  orderStatusSchema,
  runnerLocationSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from './schemas';
import { handleScanQr, handleVerifyToken, handleRefreshToken, handleLogout } from './auth-handlers';
import { handleCreateSession, handleGetOrders, handleCreateOrder, handleGetOrder } from './handlers';

const router = Router();

function handleValidationError(res: Response, error: z.ZodError): void {
  res.status(400).json({
    success: false,
    error: 'بيانات غير صالحة',
    details: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}









// ---------- Health ----------

router.get('/health', async (_req, res) => {
  const health = await breakappService.getHealth();
  res.json({ success: true, data: health });
});

// ---------- Auth ----------

router.post('/auth/scan-qr', publicAuthLimiter, handleScanQr);

router.post('/auth/verify', publicAuthLimiter, handleVerifyToken);

router.post('/auth/refresh', publicAuthLimiter, handleRefreshToken);

router.post('/auth/logout', publicAuthLimiter, handleLogout);

router.get('/auth/me', protectedLimiter, requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.breakappAuth;
  if (!auth) {
    res.status(401).json({ success: false, error: 'غير مصرح' });
    return;
  }
  res.json({
    user: {
      id: auth.sub,
      projectId: auth.projectId,
      role: auth.role,
    },
  });
});

// ---------- Geo / vendors ----------

router.get('/geo/vendors/nearby', protectedLimiter, requireAuth, async (req, res) => {
  try {
    const lat = Number(req.query['lat']);
    const lng = Number(req.query['lng']);
    const radius = Number(req.query['radius'] ?? 3000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ success: false, error: 'خط العرض والطول مطلوبان' });
      return;
    }

    const vendors = await breakappService.getNearbyVendors(lat, lng, radius);
    res.json(vendors);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل جلب الموردين',
    });
  }
});

router.get('/vendors', protectedLimiter, requireAuth, async (_req, res) => {
  try {
    const vendors = await breakappService.getVendors();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل جلب الموردين',
    });
  }
});

router.get('/vendors/:id/menu', protectedLimiter, requireAuth, async (req, res) => {
  try {
    const vendorId = req.params['id'];
    if (typeof vendorId !== 'string' || !vendorId) {
      res.status(400).json({ success: false, error: 'معرف المورد مطلوب' });
      return;
    }
    const menu = await breakappService.getVendorMenu(vendorId);
    res.json(menu);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل جلب القائمة',
    });
  }
});

// ---------- Sessions ----------

router.post('/geo/session', protectedLimiter, requireAuth, requireRole('director', 'admin'), handleCreateSession);

// ---------- Orders ----------

router.get('/orders/my-orders', protectedLimiter, requireAuth, handleGetOrders);
  }
});

router.post('/orders', protectedLimiter, requireAuth, handleCreateOrder);

router.get('/orders/:id', protectedLimiter, requireAuth, handleGetOrder);
  }
});

router.get('/orders/session/:sessionId', protectedLimiter, requireAuth, async (req, res) => {
  try {
    const sessionId = req.params['sessionId'];
    if (typeof sessionId !== 'string' || !sessionId) {
      res.status(400).json({ success: false, error: 'معرف الجلسة مطلوب' });
      return;
    }
    const rawStatus = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const allowed: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];
    const status = rawStatus && (allowed as string[]).includes(rawStatus)
      ? (rawStatus as OrderStatus)
      : undefined;
    const orders = await breakappService.listOrdersForSession(sessionId, status);
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الجلب',
    });
  }
});

router.patch('/orders/:id/status', protectedLimiter, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orderId = req.params['id'];
    if (typeof orderId !== 'string' || !orderId) {
      res.status(400).json({ success: false, error: 'معرف الطلب مطلوب' });
      return;
    }
    const body = orderStatusSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    // crew عادي لا يحق له تعديل حالة الطلبات
    if (auth.role === 'crew') {
      res.status(403).json({ success: false, error: 'صلاحيات غير كافية' });
      return;
    }

    const existing = await breakappService.getOrder(orderId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    await breakappService.updateOrderStatus(orderId, body.data.status);
    breakappGateway.emitOrderStatusUpdate({
      orderId,
      status: body.data.status,
      sessionId: existing.sessionId,
      vendorId: existing.vendorId,
    });
    websocketService.emitCustom('order:status:update', {
      orderId,
      status: body.data.status,
      sessionId: existing.sessionId,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل تحديث الحالة',
    });
  }
});

router.post('/orders/session/:id/batch', protectedLimiter, requireAuth, async (req, res) => {
  try {
    const sessionId = req.params['id'];
    if (typeof sessionId !== 'string' || !sessionId) {
      res.status(400).json({ success: false, error: 'معرف الجلسة مطلوب' });
      return;
    }
    const batches = await breakappService.getSessionBatches(sessionId);
    res.json(batches);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الجلب',
    });
  }
});

// ---------- Runners ----------

router.post('/runners/location', runnerLocationLimiter, requireAuth, requireRole('runner'), async (req: AuthenticatedRequest, res) => {
  try {
    const body = runnerLocationSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    // runnerId لازم يطابق الـ sub لمنع انتحال الهوية
    if (body.data.runnerId !== auth.sub) {
      res.status(403).json({ success: false, error: 'تعذر التحقق من هوية الراسل' });
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
      websocketService.emitCustom('runner:location:update', {
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
      error: error instanceof Error ? error.message : 'فشل تسجيل الموقع',
    });
  }
});

router.get('/runners/me/tasks', protectedLimiter, requireAuth, requireRole('runner'), async (req: AuthenticatedRequest, res) => {
  try {
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    const tasks = await repo.listRunnerTasks(auth.sub);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل جلب المهام',
    });
  }
});

router.patch('/runners/tasks/:id/status', protectedLimiter, requireAuth, requireRole('runner'), async (req, res) => {
  try {
    const orderId = req.params['id'];
    if (typeof orderId !== 'string' || !orderId) {
      res.status(400).json({ success: false, error: 'معرف المهمة مطلوب' });
      return;
    }
    const body = orderStatusSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const existing = await breakappService.getOrder(orderId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
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
      error: error instanceof Error ? error.message : 'فشل التحديث',
    });
  }
});

router.get('/runners/session/:sessionId', protectedLimiter, requireAuth, requireRole('director', 'admin'), async (req, res) => {
  try {
    const sessionId = req.params['sessionId'];
    if (typeof sessionId !== 'string' || !sessionId) {
      res.status(400).json({ success: false, error: 'معرف الجلسة مطلوب' });
      return;
    }
    const runners = await repo.listRunnersForSession(sessionId);
    res.json(runners);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الجلب',
    });
  }
});

// ---------- Vendor endpoints ----------

router.get('/vendor/orders', protectedLimiter, requireAuth, requireRole('vendor'), async (req: AuthenticatedRequest, res) => {
  try {
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    const vendor = await repo.getVendorOwnedByUser(auth.sub);
    if (!vendor) {
      res.status(404).json({ success: false, error: 'لا يوجد مورد مرتبط' });
      return;
    }
    const rawStatus = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const allowed: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];
    const status = rawStatus && (allowed as string[]).includes(rawStatus)
      ? (rawStatus as OrderStatus)
      : undefined;
    const orders = await repo.listOrdersForVendor(vendor.id, status);
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الجلب',
    });
  }
});

router.patch('/vendor/orders/:id/status', protectedLimiter, requireAuth, requireRole('vendor'), async (req: AuthenticatedRequest, res) => {
  try {
    const orderId = req.params['id'];
    if (typeof orderId !== 'string' || !orderId) {
      res.status(400).json({ success: false, error: 'معرف الطلب مطلوب' });
      return;
    }
    const body = orderStatusSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    const vendor = await repo.getVendorOwnedByUser(auth.sub);
    if (!vendor) {
      res.status(404).json({ success: false, error: 'لا يوجد مورد مرتبط' });
      return;
    }
    const order = await breakappService.getOrder(orderId);
    if (order?.vendorId !== vendor.id) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
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
      error: error instanceof Error ? error.message : 'فشل التحديث',
    });
  }
});

router.post('/vendor/menu-items', protectedLimiter, requireAuth, requireRole('vendor'), async (req: AuthenticatedRequest, res) => {
  try {
    const body = createMenuItemSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    const vendor = await repo.getVendorOwnedByUser(auth.sub);
    if (!vendor) {
      res.status(404).json({ success: false, error: 'لا يوجد مورد مرتبط' });
      return;
    }
    const vendorId = body.data.vendorId && body.data.vendorId === vendor.id
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
      error: error instanceof Error ? error.message : 'فشل الإنشاء',
    });
  }
});

router.patch('/vendor/menu-items/:id', protectedLimiter, requireAuth, requireRole('vendor'), async (req: AuthenticatedRequest, res) => {
  try {
    const menuItemId = req.params['id'];
    if (typeof menuItemId !== 'string' || !menuItemId) {
      res.status(400).json({ success: false, error: 'معرف العنصر مطلوب' });
      return;
    }
    const body = updateMenuItemSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    const patch: Parameters<typeof repo.updateMenuItem>[2] = {};
    if (body.data.name !== undefined) patch.name = body.data.name;
    if (body.data.description !== undefined) patch.description = body.data.description;
    if (body.data.price !== undefined) patch.price = body.data.price;
    if (body.data.available !== undefined) patch.available = body.data.available;

    const updated = await repo.updateMenuItem(menuItemId, auth.sub, patch);
    if (!updated) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل التحديث',
    });
  }
});

router.delete('/vendor/menu-items/:id', protectedLimiter, requireAuth, requireRole('vendor'), async (req: AuthenticatedRequest, res) => {
  try {
    const menuItemId = req.params['id'];
    if (typeof menuItemId !== 'string' || !menuItemId) {
      res.status(400).json({ success: false, error: 'معرف العنصر مطلوب' });
      return;
    }
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    const deleted = await repo.softDeleteMenuItem(menuItemId, auth.sub);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الحذف',
    });
  }
});

registerAdminRoutes(router, {
  adminWriteLimiter,
  protectedLimiter,
  requireAuth,
  requireRole,
  handleValidationError,
});

export { router as breakappRouter };
