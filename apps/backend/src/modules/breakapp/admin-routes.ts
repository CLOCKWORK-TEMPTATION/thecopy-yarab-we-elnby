import { randomBytes } from "node:crypto";

import { z } from "zod";

import * as repo from "./repository";

import type { BreakappRole, BreakappTokenPayload } from "./service.types";
import type { NextFunction, Request, Response, Router } from "express";

interface AuthenticatedRequest extends Request {
  breakappAuth?: BreakappTokenPayload;
}

type BreakappMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => void;

interface AdminRouteContext {
  adminWriteLimiter: BreakappMiddleware;
  protectedLimiter: BreakappMiddleware;
  requireAuth: BreakappMiddleware;
  requireRole: (...allowed: BreakappRole[]) => BreakappMiddleware;
  handleValidationError: (res: Response, error: z.ZodError) => void;
}

const createProjectSchema = z.object({ name: z.string().min(1) });
const createInviteSchema = z.object({
  role: z.enum(["director", "crew", "runner", "vendor", "admin"]),
  ttlMinutes: z
    .number()
    .int()
    .positive()
    .max(60 * 24)
    .optional(),
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

function registerProjectAdminRoutes(
  router: Router,
  context: AdminRouteContext,
): void {
  const { adminWriteLimiter, protectedLimiter, requireAuth, requireRole } =
    context;

  router.post(
    "/admin/projects",
    adminWriteLimiter,
    requireAuth,
    requireRole("admin"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const body = createProjectSchema.safeParse(req.body);
        if (!body.success) {
          context.handleValidationError(res, body.error);
          return;
        }
        const auth = req.breakappAuth;
        if (!auth) {
          res.status(401).json({ success: false, error: "غير مصرح" });
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
          error: error instanceof Error ? error.message : "فشل الإنشاء",
        });
      }
    },
  );

  router.get(
    "/admin/projects",
    protectedLimiter,
    requireAuth,
    requireRole("admin", "director"),
    async (_req, res) => {
      try {
        const projects = await repo.listProjects();
        res.json(projects);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل الجلب",
        });
      }
    },
  );

  router.post(
    "/admin/projects/:id/invites",
    adminWriteLimiter,
    requireAuth,
    requireRole("admin", "director"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const projectId = req.params["id"];
        if (typeof projectId !== "string" || !projectId) {
          res.status(400).json({ success: false, error: "معرف المشروع مطلوب" });
          return;
        }
        const body = createInviteSchema.safeParse(req.body);
        if (!body.success) {
          context.handleValidationError(res, body.error);
          return;
        }
        const auth = req.breakappAuth;
        if (!auth) {
          res.status(401).json({ success: false, error: "غير مصرح" });
          return;
        }

        const exists = await repo.projectExists(projectId);
        if (!exists) {
          res.status(404).json({ success: false, error: "المشروع غير موجود" });
          return;
        }

        const ttlMinutes = body.data.ttlMinutes ?? 60 * 24;
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
        const invitedUserId = `invite-${Date.now()}-${randomBytes(12).toString("hex")}`;
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
          error: error instanceof Error ? error.message : "فشل إنشاء الدعوة",
        });
      }
    },
  );
}

function registerVendorAdminRoutes(
  router: Router,
  context: AdminRouteContext,
): void {
  const { adminWriteLimiter, protectedLimiter, requireAuth, requireRole } =
    context;

  router.get(
    "/admin/vendors",
    protectedLimiter,
    requireAuth,
    requireRole("admin"),
    async (_req, res) => {
      try {
        const vendors = await repo.listVendors();
        res.json(vendors);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل الجلب",
        });
      }
    },
  );

  router.post(
    "/admin/vendors",
    adminWriteLimiter,
    requireAuth,
    requireRole("admin"),
    async (req, res) => {
      try {
        const body = createVendorSchema.safeParse(req.body);
        if (!body.success) {
          context.handleValidationError(res, body.error);
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
          error: error instanceof Error ? error.message : "فشل الإنشاء",
        });
      }
    },
  );

  router.patch(
    "/admin/vendors/:id",
    adminWriteLimiter,
    requireAuth,
    requireRole("admin"),
    async (req, res) => {
      try {
        const vendorId = req.params["id"];
        if (typeof vendorId !== "string" || !vendorId) {
          res.status(400).json({ success: false, error: "معرف المورد مطلوب" });
          return;
        }
        const body = updateVendorSchema.safeParse(req.body);
        if (!body.success) {
          context.handleValidationError(res, body.error);
          return;
        }
        const patch: Parameters<typeof repo.updateVendor>[1] = {};
        if (body.data.name !== undefined) patch.name = body.data.name;
        if (body.data.isMobile !== undefined)
          patch.isMobile = body.data.isMobile;
        if (body.data.lat !== undefined) patch.lat = body.data.lat;
        if (body.data.lng !== undefined) patch.lng = body.data.lng;
        if (body.data.ownerUserId !== undefined) {
          patch.ownerUserId = body.data.ownerUserId;
        }
        const updated = await repo.updateVendor(vendorId, patch);
        if (!updated) {
          res.status(404).json({ success: false, error: "المورد غير موجود" });
          return;
        }
        res.json(updated);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل التحديث",
        });
      }
    },
  );

  router.delete(
    "/admin/vendors/:id",
    adminWriteLimiter,
    requireAuth,
    requireRole("admin"),
    async (req, res) => {
      try {
        const vendorId = req.params["id"];
        if (typeof vendorId !== "string" || !vendorId) {
          res.status(400).json({ success: false, error: "معرف المورد مطلوب" });
          return;
        }
        const deleted = await repo.softDeleteVendor(vendorId);
        if (!deleted) {
          res.status(404).json({ success: false, error: "المورد غير موجود" });
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
}

function registerAdminUserRoutes(
  router: Router,
  context: AdminRouteContext,
): void {
  router.get(
    "/admin/users",
    context.protectedLimiter,
    context.requireAuth,
    context.requireRole("admin"),
    async (_req, res) => {
      try {
        const users = await repo.listUsers();
        res.json(users);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "فشل الجلب",
        });
      }
    },
  );
}

export function registerAdminRoutes(
  router: Router,
  context: AdminRouteContext,
): void {
  registerProjectAdminRoutes(router, context);
  registerVendorAdminRoutes(router, context);
  registerAdminUserRoutes(router, context);
}
