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

import { createHash, randomBytes } from 'node:crypto';

import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';

import { env } from '@/config/env';
import { websocketService } from '@/services/websocket.service';
import { signJwt, verifyJwt } from '@/utils/jwt-secret-manager';
import { logger } from '@/lib/logger';

import { breakappGateway } from './gateway';
import * as repo from './repository';
import { breakappService } from './service';

import type { BreakappRole, BreakappTokenPayload, OrderStatus } from './service.types';

const router = Router();

const REFRESH_COOKIE_NAME = 'breakapp_refresh';
const ACCESS_TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 ساعات
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 يوماً

// ---------- Helpers ----------

function readCookie(request: Request, name: string): string | null {
  const rawCookies: unknown = request.cookies;
  if (!rawCookies || typeof rawCookies !== 'object') {
    return null;
  }
  const value = (rawCookies as Record<string, unknown>)[name];
  return typeof value === 'string' && value ? value : null;
}

function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.authorization;
  if (authorizationHeader?.startsWith('Bearer ')) {
    return authorizationHeader.slice('Bearer '.length).trim();
  }
  return readCookie(request, 'accessToken');
}

function verifyBreakappToken(request: Request): BreakappTokenPayload {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error('مطلوب رمز مصادقة');
  }
  return verifyJwt<BreakappTokenPayload>(token);
}

interface AuthenticatedRequest extends Request {
  breakappAuth?: BreakappTokenPayload;
}

function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const payload = verifyBreakappToken(req);
    req.breakappAuth = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'غير مصرح',
    });
  }
}

function requireRole(...allowed: BreakappRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    if (!allowed.includes(auth.role)) {
      res.status(403).json({
        success: false,
        error: 'صلاحيات غير كافية',
      });
      return;
    }
    next();
  };
}

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

function signAccessToken(params: {
  userId: string;
  projectId: string;
  role: BreakappRole;
}): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: BreakappTokenPayload = {
    sub: params.userId,
    projectId: params.projectId,
    role: params.role,
    iat: issuedAt,
    exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
  };
  return signJwt(payload);
}

async function issueRefreshCookie(
  res: Response,
  params: { userId: string; projectId: string }
): Promise<void> {
  const token = breakappService.generateRefreshToken();
  const tokenHash = breakappService.hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await repo.insertRefreshToken({
    userId: params.userId,
    projectId: params.projectId,
    tokenHash,
    expiresAt,
  });

  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/breakapp/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/breakapp/auth',
  });
}

// ---------- Rate limiters ----------

const publicAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`,
  message: { success: false, error: 'تم تجاوز حد محاولات المصادقة' },
});

const protectedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      return `token:${tokenHash}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
  message: { success: false, error: 'تم تجاوز حد طلبات الخدمة' },
});

const runnerLocationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240, // runners قد يبثّون الموقع مرتين في الثانية
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) {
      return `token:${createHash('sha256').update(token).digest('hex')}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
  message: { success: false, error: 'تم تجاوز حد تحديثات الموقع' },
});

// Admin write endpoints — أصرم (10 طلبات / 5 دقائق)
const adminWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) {
      return `token:${createHash('sha256').update(token).digest('hex')}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
  message: { success: false, error: 'تم تجاوز حد عمليات الإدارة' },
});

// ---------- Zod schemas ----------

const scanQrSchema = z.object({ qr_token: z.string().min(1) });
const createSessionBodySchema = z.object({
  projectId: z.string().uuid().optional(),
  lat: z.number(),
  lng: z.number(),
});
const orderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
const createOrderSchema = z.object({
  sessionId: z.string().uuid(),
  items: z.array(orderItemSchema).min(1),
});
const orderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
});
const runnerLocationSchema = z.object({
  runnerId: z.string().min(1),
  sessionId: z.string().uuid().optional(),
  lat: z.number().finite(),
  lng: z.number().finite(),
  accuracy: z.number().finite().nonnegative().optional(),
});
const createProjectSchema = z.object({ name: z.string().min(1) });
const createInviteSchema = z.object({
  role: z.enum(['director', 'crew', 'runner', 'vendor', 'admin']),
  ttlMinutes: z.number().int().positive().max(60 * 24).optional(),
});
const createVendorSchema = z.object({
  name: z.string().min(1),
  isMobile: z.boolean().optional().default(false),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
  ownerUserId: z.string().min(1).optional(),
});
const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  isMobile: z.boolean().optional(),
  lat: z.number().finite().nullable().optional(),
  lng: z.number().finite().nullable().optional(),
  ownerUserId: z.string().min(1).nullable().optional(),
});
const createMenuItemSchema = z.object({
  vendorId: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().max(500).optional(),
  price: z.number().int().nonnegative().optional(),
  available: z.boolean().optional().default(true),
});
const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(500).nullable().optional(),
  price: z.number().int().nonnegative().nullable().optional(),
  available: z.boolean().optional(),
});

// ---------- Health ----------

router.get('/health', async (_req, res) => {
  const health = await breakappService.getHealth();
  res.json({ success: true, data: health });
});

// ---------- Auth ----------

router.post('/auth/scan-qr', publicAuthLimiter, async (req, res) => {
  try {
    const body = scanQrSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }

    const parsed = breakappService.parseQrToken(body.data.qr_token);
    const accessToken = signAccessToken({
      userId: parsed.userId,
      projectId: parsed.projectId,
      role: parsed.role,
    });

    try {
      await repo.addProjectMember({
        projectId: parsed.projectId,
        userId: parsed.userId,
        role: parsed.role,
      });
    } catch (error) {
      // إذا فشل الإدخال (مثلاً المشروع غير موجود) نستمر لكن لا نصدر refresh cookie.
      logger.warn('[breakapp] Failed to persist project member on scan-qr', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      await issueRefreshCookie(res, {
        userId: parsed.userId,
        projectId: parsed.projectId,
      });
    } catch (error) {
      logger.warn('[breakapp] Failed to issue refresh cookie', {
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
      error: error instanceof Error ? error.message : 'فشل تسجيل الدخول',
    });
  }
});

router.post('/auth/verify', publicAuthLimiter, (req, res) => {
  try {
    const body: Record<string, unknown> =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : {};
    const rawToken = body['token'];
    const bodyToken = typeof rawToken === 'string' ? rawToken : '';
    const token = bodyToken !== '' ? bodyToken : (getBearerToken(req) ?? '');

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
});

router.post('/auth/refresh', publicAuthLimiter, async (req, res) => {
  try {
    const cookieValue = readCookie(req, REFRESH_COOKIE_NAME);
    if (!cookieValue) {
      res.status(401).json({ success: false, error: 'رمز التحديث مفقود' });
      return;
    }

    const hash = breakappService.hashRefreshToken(cookieValue);
    const stored = await repo.findRefreshToken(hash);
    if (!stored) {
      res.status(401).json({ success: false, error: 'رمز التحديث غير صالح' });
      return;
    }
    if (stored.revokedAt) {
      res.status(401).json({ success: false, error: 'رمز التحديث مُبطَل' });
      return;
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      res.status(401).json({ success: false, error: 'رمز التحديث منتهي' });
      return;
    }

    const role = await repo.getUserRoleInProject(
      stored.projectId,
      stored.userId
    );
    if (!role) {
      res.status(401).json({ success: false, error: 'العضوية غير موجودة' });
      return;
    }

    const accessToken = signAccessToken({
      userId: stored.userId,
      projectId: stored.projectId,
      role,
    });
    res.json({ access_token: accessToken });
  } catch (error) {
    logger.warn('[breakapp] refresh failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(401).json({ success: false, error: 'تعذر تجديد الجلسة' });
  }
});

router.post('/auth/logout', publicAuthLimiter, async (req, res) => {
  try {
    const cookieValue = readCookie(req, REFRESH_COOKIE_NAME);
    if (cookieValue) {
      const hash = breakappService.hashRefreshToken(cookieValue);
      await repo.revokeRefreshToken(hash);
    }
    clearRefreshCookie(res);
    res.json({ success: true });
  } catch (error) {
    logger.warn('[breakapp] logout failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    clearRefreshCookie(res);
    res.json({ success: true });
  }
});

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

router.post('/geo/session', protectedLimiter, requireAuth, requireRole('director', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const body = createSessionBodySchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }

    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const projectId = body.data.projectId ?? auth.projectId;
    const session = await breakappService.createSession({
      projectId,
      lat: body.data.lat,
      lng: body.data.lng,
      createdBy: auth.sub,
    });

    breakappGateway.emitSessionStarted(session.id, projectId);

    res.json({ id: session.id });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'تعذر إنشاء الجلسة',
    });
  }
});

// ---------- Orders ----------

router.get('/orders/my-orders', protectedLimiter, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    const orders = await breakappService.listOrdersForUser(auth.sub);
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الجلب',
    });
  }
});

router.post('/orders', protectedLimiter, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const body = createOrderSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }

    const order = await breakappService.createOrder({
      sessionId: body.data.sessionId,
      userId: auth.sub,
      items: body.data.items,
    });

    const vendor = await repo.getVendorById(order.vendorId);
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    websocketService.emitCustom('task:new', {
      id: order.id,
      vendorId: order.vendorId,
      vendorName: vendor?.name ?? order.vendorId,
      items: totalItems,
      status: 'pending',
    });
    breakappGateway.emitTaskNew({
      id: order.id,
      vendorId: order.vendorId,
      vendorName: vendor?.name ?? order.vendorId,
      items: totalItems,
      sessionId: order.sessionId,
    });

    res.status(201).json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر إنشاء الطلب';
    res.status(message === 'مطلوب رمز مصادقة' ? 401 : 400).json({
      success: false,
      error: message,
    });
  }
});

router.get('/orders/:id', protectedLimiter, requireAuth, async (req, res) => {
  try {
    const orderId = req.params['id'];
    if (typeof orderId !== 'string' || !orderId) {
      res.status(400).json({ success: false, error: 'معرف الطلب مطلوب' });
      return;
    }
    const order = await breakappService.getOrder(orderId);
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل جلب الطلب',
    });
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

// ---------- Admin endpoints ----------

router.post('/admin/projects', adminWriteLimiter, requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const body = createProjectSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    const project = await repo.createProject({
      name: body.data.name,
      directorUserId: auth.sub,
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الإنشاء',
    });
  }
});

router.get('/admin/projects', protectedLimiter, requireAuth, requireRole('admin', 'director'), async (_req, res) => {
  try {
    const projects = await repo.listProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الجلب',
    });
  }
});

router.post('/admin/projects/:id/invites', adminWriteLimiter, requireAuth, requireRole('admin', 'director'), async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = req.params['id'];
    if (typeof projectId !== 'string' || !projectId) {
      res.status(400).json({ success: false, error: 'معرف المشروع مطلوب' });
      return;
    }
    const body = createInviteSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const exists = await repo.projectExists(projectId);
    if (!exists) {
      res.status(404).json({ success: false, error: 'المشروع غير موجود' });
      return;
    }

    const ttlMinutes = body.data.ttlMinutes ?? 60 * 24; // 24h
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    // شكل qr_token المتوقّع: <projectId>:<role>:<userId>
    // المعرف يُستخدم في رمز دعوة، فلا يجوز توليده عبر Math.random (قابل للتخمين).
    const invitedUserId = `invite-${Date.now()}-${randomBytes(12).toString('hex')}`;
    const qrPayload = `${projectId}:${body.data.role}:${invitedUserId}`;

    const token = await repo.createInviteToken({
      projectId,
      role: body.data.role,
      expiresAt,
      createdBy: auth.sub,
      qrPayload,
    });
    res.status(201).json({
      id: token.id,
      qr_token: token.qrPayload,
      expires_at: token.expiresAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل إنشاء الدعوة',
    });
  }
});

router.get('/admin/vendors', protectedLimiter, requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const vendors = await repo.listVendors();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الجلب',
    });
  }
});

router.post('/admin/vendors', adminWriteLimiter, requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const body = createVendorSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const vendor = await repo.createVendor({
      name: body.data.name,
      isMobile: body.data.isMobile,
      lat: body.data.lat ?? null,
      lng: body.data.lng ?? null,
      ownerUserId: body.data.ownerUserId ?? null,
    });
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الإنشاء',
    });
  }
});

router.patch('/admin/vendors/:id', adminWriteLimiter, requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const vendorId = req.params['id'];
    if (typeof vendorId !== 'string' || !vendorId) {
      res.status(400).json({ success: false, error: 'معرف المورد مطلوب' });
      return;
    }
    const body = updateVendorSchema.safeParse(req.body);
    if (!body.success) {
      handleValidationError(res, body.error);
      return;
    }
    const patch: Parameters<typeof repo.updateVendor>[1] = {};
    if (body.data.name !== undefined) patch.name = body.data.name;
    if (body.data.isMobile !== undefined) patch.isMobile = body.data.isMobile;
    if (body.data.lat !== undefined) patch.lat = body.data.lat;
    if (body.data.lng !== undefined) patch.lng = body.data.lng;
    if (body.data.ownerUserId !== undefined) patch.ownerUserId = body.data.ownerUserId;
    const updated = await repo.updateVendor(vendorId, patch);
    if (!updated) {
      res.status(404).json({ success: false, error: 'المورد غير موجود' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل التحديث',
    });
  }
});

router.delete('/admin/vendors/:id', adminWriteLimiter, requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const vendorId = req.params['id'];
    if (typeof vendorId !== 'string' || !vendorId) {
      res.status(400).json({ success: false, error: 'معرف المورد مطلوب' });
      return;
    }
    const deleted = await repo.softDeleteVendor(vendorId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'المورد غير موجود' });
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

router.get('/admin/users', protectedLimiter, requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const users = await repo.listUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل الجلب',
    });
  }
});

export { router as breakappRouter };
