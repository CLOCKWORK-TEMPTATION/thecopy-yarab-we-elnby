/**
 * BREAKAPP Service — طبقة المنطق الأعلى.
 * تعتمد كلياً على `repository.ts` (Drizzle + PostgreSQL).
 * لا تستخدم أي تخزين محلي JSON.
 */

import crypto from "node:crypto";

import * as repo from "./repository";

import type {
  BreakappMenuItemView,
  BreakappNearbyVendor,
  BreakappOrderItemInput,
  BreakappOrderView,
  BreakappRole,
  BreakappRunnerLocationInput,
  BreakappSessionView,
  BreakappVendorView,
  OrderStatus,
} from "./service.types";

export type { BreakappTokenPayload } from "./service.types";

const VALID_ROLES: readonly BreakappRole[] = [
  "director",
  "crew",
  "runner",
  "vendor",
  "admin",
];

function isBreakappRole(value: string): value is BreakappRole {
  return (VALID_ROLES as readonly string[]).includes(value);
}

class BreakappService {
  async getHealth(): Promise<{
    status: string;
    vendors: number;
    timestamp: string;
  }> {
    try {
      const vendors = await repo.listVendors();
      return {
        status: "ok",
        vendors: vendors.length,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: "degraded",
        vendors: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  parseQrToken(qrToken: string): {
    projectId: string;
    role: BreakappRole;
    userId: string;
  } {
    const [projectId, roleValue, userId] = qrToken.split(":");
    const normalizedRole = roleValue?.trim().toLowerCase() ?? "";

    if (
      !projectId ||
      !userId ||
      !normalizedRole ||
      !isBreakappRole(normalizedRole)
    ) {
      throw new Error("صيغة رمز QR غير صالحة");
    }

    return {
      projectId: projectId.trim(),
      role: normalizedRole,
      userId: userId.trim(),
    };
  }

  async getVendors(): Promise<BreakappVendorView[]> {
    return repo.listVendors();
  }

  async getNearbyVendors(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<BreakappNearbyVendor[]> {
    return repo.findNearbyVendors({ lat, lng, radiusMeters: radius });
  }

  async getVendorMenu(vendorId: string): Promise<BreakappMenuItemView[]> {
    return repo.listMenuItemsForVendor(vendorId, true);
  }

  async createSession(input: {
    projectId: string;
    lat: number;
    lng: number;
    createdBy: string;
  }): Promise<BreakappSessionView> {
    return repo.createSession({
      projectId: input.projectId,
      directorUserId: input.createdBy,
      lat: input.lat,
      lng: input.lng,
    });
  }

  async createOrder(input: {
    sessionId: string;
    userId: string;
    items: BreakappOrderItemInput[];
  }): Promise<BreakappOrderView> {
    if (!input.sessionId) {
      throw new Error("الجلسة غير موجودة");
    }
    const session = await repo.getSession(input.sessionId);
    if (!session) {
      throw new Error("الجلسة غير موجودة");
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("يجب إرسال عنصر واحد على الأقل");
    }

    const normalizedItems = input.items.map((item) => ({
      menuItemId: String(item.menuItemId),
      quantity: Number(item.quantity),
    }));
    if (
      normalizedItems.some(
        (item) =>
          !item.menuItemId ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0,
      )
    ) {
      throw new Error("عنصر قائمة غير صالح");
    }

    const ids = normalizedItems.map((item) => item.menuItemId);
    const menuItems = await repo.getMenuItems(ids);
    if (menuItems.length !== new Set(ids).size) {
      throw new Error("عنصر قائمة غير صالح");
    }
    if (menuItems.some((menuItem) => !menuItem.available)) {
      throw new Error("عنصر قائمة غير صالح");
    }

    const vendorIds = new Set(menuItems.map((menuItem) => menuItem.vendorId));
    if (vendorIds.size !== 1) {
      throw new Error("يجب أن تنتمي عناصر الطلب إلى مورد واحد فقط");
    }
    const [vendorId] = Array.from(vendorIds);
    if (!vendorId) {
      throw new Error("تعذر تحديد المورد");
    }

    return repo.createOrderWithItems({
      sessionId: input.sessionId,
      userId: input.userId,
      vendorId,
      items: normalizedItems,
    });
  }

  async getOrder(orderId: string): Promise<BreakappOrderView | null> {
    return repo.getOrder(orderId);
  }

  async listOrdersForUser(userId: string): Promise<BreakappOrderView[]> {
    return repo.listOrdersForUser(userId);
  }

  async listOrdersForSession(
    sessionId: string,
    status?: OrderStatus,
  ): Promise<BreakappOrderView[]> {
    return repo.listOrdersForSession({ sessionId, status });
  }

  async getSessionBatches(
    sessionId: string,
  ): Promise<{ vendorId: string; vendorName: string; totalItems: number }[]> {
    return repo.aggregateSessionBatches(sessionId);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    await repo.updateOrderStatus(orderId, status);
  }

  async updateRunnerLocation(
    input: BreakappRunnerLocationInput,
  ): Promise<void> {
    if (
      !input.runnerId ||
      !Number.isFinite(input.lat) ||
      !Number.isFinite(input.lng)
    ) {
      return;
    }
    await repo.insertRunnerLocation({
      runnerId: input.runnerId,
      sessionId: input.sessionId ?? null,
      lat: input.lat,
      lng: input.lng,
      accuracy: input.accuracy ?? null,
    });
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(48).toString("base64url");
  }
}

export const breakappService = new BreakappService();
