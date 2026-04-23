import { createHash } from "node:crypto";
import { Router, type Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { signJwt, verifyJwt } from "@/utils/jwt-secret-manager";
import {
  breakappService,
  type BreakappTokenPayload,
} from "./service";
import { websocketService } from "@/services/websocket.service";

const router = Router();

function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.authorization;
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length).trim();
  }
  const cookieToken = request.cookies?.["accessToken"];
  return cookieToken ?? null;
}

function verifyBreakappToken(request: Request): BreakappTokenPayload {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error("مطلوب رمز مصادقة");
  }

  return verifyJwt<BreakappTokenPayload>(token);
}

const breakappPublicAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip ?? "unknown")}`,
  message: { success: false, error: "تم تجاوز حد محاولات المصادقة" },
});

const breakappProtectedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      return `token:${tokenHash}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
  },
  message: { success: false, error: "تم تجاوز حد طلبات الخدمة" },
});

router.get("/health", async (_req, res) => {
  const health = await breakappService.getHealth();
  res.json({ success: true, data: health });
});

router.post("/auth/scan-qr", breakappPublicAuthLimiter, async (req, res) => {
  try {
    const qrToken = typeof req.body?.qr_token === "string" ? req.body.qr_token : "";
    if (!qrToken.trim()) {
      res["status"](400).json({ success: false, error: "رمز QR مطلوب" });
      return;
    }

    const parsed = breakappService.parseQrToken(qrToken);
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 8 * 60 * 60;
    const payload: BreakappTokenPayload = {
      sub: parsed.userId,
      projectId: parsed.projectId,
      role: parsed.role,
      iat: issuedAt,
      exp: expiresAt,
    };

    const accessToken = signJwt(payload);
    res.json({
      access_token: accessToken,
      user: {
        id: parsed.userId,
        projectId: parsed.projectId,
        role: parsed.role,
      },
    });
  } catch (error) {
    res["status"](400).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل تسجيل الدخول",
    });
  }
});

router.post("/auth/verify", breakappPublicAuthLimiter, (req, res) => {
  try {
    const token =
      (typeof req.body?.token === "string" && req.body.token) ||
      getBearerToken(req) ||
      "";

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

router.get("/geo/vendors/nearby", breakappProtectedLimiter, async (req, res) => {
  try {
    verifyBreakappToken(req);
    const lat = Number(req.query["lat"]);
    const lng = Number(req.query["lng"]);
    const radius = Number(req.query["radius"] ?? 3000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res["status"](400).json({ success: false, error: "خط العرض والطول مطلوبان" });
      return;
    }

    const vendors = breakappService.getNearbyVendors(lat, lng, radius);
    res.json(vendors);
  } catch (error) {
    res["status"](401).json({
      success: false,
      error: error instanceof Error ? error.message : "غير مصرح",
    });
  }
});

router.post("/geo/session", breakappProtectedLimiter, async (req, res) => {
  try {
    const auth = verifyBreakappToken(req);
    const projectId =
      typeof req.body?.projectId === "string" && req.body.projectId.trim()
        ? req.body.projectId.trim()
        : auth.projectId;
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res["status"](400).json({ success: false, error: "إحداثيات الجلسة غير صالحة" });
      return;
    }

    const session = await breakappService.createSession({
      projectId,
      lat,
      lng,
      createdBy: auth.sub,
    });

    res.json({ id: session.id });
  } catch (error) {
    res["status"](401).json({
      success: false,
      error: error instanceof Error ? error.message : "تعذر إنشاء الجلسة",
    });
  }
});

router.get("/vendors", breakappProtectedLimiter, (req, res) => {
  try {
    verifyBreakappToken(req);
    res.json(breakappService.getVendors());
  } catch (error) {
    res["status"](401).json({
      success: false,
      error: error instanceof Error ? error.message : "غير مصرح",
    });
  }
});

router.get("/vendors/:id/menu", breakappProtectedLimiter, (req, res) => {
  try {
    verifyBreakappToken(req);
    const vendorId = req.params["id"];
    if (typeof vendorId !== "string") {
      res["status"](400).json({ success: false, error: "معرف المورد مطلوب" });
      return;
    }
    res.json(breakappService.getVendorMenu(vendorId));
  } catch (error) {
    res["status"](401).json({
      success: false,
      error: error instanceof Error ? error.message : "غير مصرح",
    });
  }
});

router.get("/orders/my-orders", breakappProtectedLimiter, async (req, res) => {
  try {
    const auth = verifyBreakappToken(req);
    const orders = await breakappService.listOrdersForUser(auth.sub);
    res.json(orders);
  } catch (error) {
    res["status"](401).json({
      success: false,
      error: error instanceof Error ? error.message : "غير مصرح",
    });
  }
});

router.post("/orders", breakappProtectedLimiter, async (req, res) => {
  try {
    const auth = verifyBreakappToken(req);
    const sessionId =
      typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    const order = await breakappService.createOrder({
      sessionId,
      userId: auth.sub,
      items,
    });

    websocketService.emitCustom("task:new", {
      id: order.id,
      vendorName:
        breakappService
          .getVendors()
          .find((vendor) => vendor.id === order.vendorId)?.name || order.vendorId,
      items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      status: "pending",
    });

    res["status"](201).json(order);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر إنشاء الطلب";
    res["status"](message === "مطلوب رمز مصادقة" ? 401 : 400).json({
      success: false,
      error: message,
    });
  }
});

router.post("/orders/session/:id/batch", breakappProtectedLimiter, async (req, res) => {
  try {
    verifyBreakappToken(req);
    const sessionId = req.params["id"];
    if (typeof sessionId !== "string") {
      res["status"](400).json({ success: false, error: "معرف الجلسة مطلوب" });
      return;
    }
    const batches = await breakappService.getSessionBatches(sessionId);
    res.json(batches);
  } catch (error) {
    res["status"](401).json({
      success: false,
      error: error instanceof Error ? error.message : "غير مصرح",
    });
  }
});

export { router as breakappRouter };
