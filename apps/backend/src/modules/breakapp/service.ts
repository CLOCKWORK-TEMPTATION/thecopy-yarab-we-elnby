import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import type {
  BreakappRole,
  OrderStatus,
  BreakappSessionRecord,
  BreakappOrderRecord,
  BreakappOrderItemRecord,
  BreakappRunnerLocation,
  BreakappStore,
} from "./service.types.js";
import { SEEDED_VENDORS, SEEDED_MENU_ITEMS } from "./service.types.js";

export type { BreakappTokenPayload, BreakappSessionRecord, BreakappOrderItemRecord, BreakappOrderRecord } from "./service.types.js";

const STORE_DIRECTORY = path.resolve(process.cwd(), "logs");
const STORE_PATH = path.join(STORE_DIRECTORY, "breakapp-state.json");

const EMPTY_STORE: BreakappStore = {
  sessions: [],
  orders: [],
  runnerLocations: {},
};

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadius = 6371e3;
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

async function ensureStoreFile(): Promise<void> {
  await mkdir(STORE_DIRECTORY, { recursive: true });
  try {
    await readFile(STORE_PATH, "utf-8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf-8");
  }
}

async function readStore(): Promise<BreakappStore> {
  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BreakappStore>;
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      runnerLocations:
        parsed.runnerLocations && typeof parsed.runnerLocations === "object"
          ? parsed.runnerLocations
          : {},
    };
  } catch {
    return { ...EMPTY_STORE };
  }
}

async function writeStore(store: BreakappStore): Promise<void> {
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

class BreakappService {
  async getHealth() {
    const store = await readStore();
    return {
      status: "ok",
      vendors: SEEDED_VENDORS.length,
      menuItems: SEEDED_MENU_ITEMS.length,
      sessions: store.sessions.length,
      orders: store.orders.length,
      runnersOnline: Object.keys(store.runnerLocations).length,
      timestamp: new Date().toISOString(),
    };
  }

  parseQrToken(qrToken: string): {
    projectId: string;
    role: BreakappRole;
    userId: string;
  } {
    const [projectId, roleValue, userId] = qrToken.split(":");
    const role = (roleValue?.trim().toLowerCase() || "crew") as BreakappRole;

    if (!projectId || !userId || !["director", "crew", "runner"].includes(role)) {
      throw new Error("صيغة رمز QR غير صالحة");
    }

    return {
      projectId: projectId.trim(),
      role,
      userId: userId.trim(),
    };
  }

  getVendors() {
    return SEEDED_VENDORS.map((vendor) => ({ ...vendor }));
  }

  getNearbyVendors(lat: number, lng: number, radius: number) {
    return this.getVendors()
      .map((vendor) => ({
        ...vendor,
        distance: haversineDistanceMeters(
          lat,
          lng,
          vendor.fixed_location.lat,
          vendor.fixed_location.lng
        ),
      }))
      .filter((vendor) => vendor.distance <= radius)
      .sort((left, right) => left.distance - right.distance);
  }

  getVendorMenu(vendorId: string) {
    return SEEDED_MENU_ITEMS.filter(
      (menuItem) => menuItem.vendorId === vendorId && menuItem.available
    ).map((menuItem) => ({
      id: menuItem.id,
      name: menuItem.name,
      description: menuItem.description,
      available: menuItem.available,
      vendor: {
        name:
          SEEDED_VENDORS.find((vendor) => vendor.id === vendorId)?.name || "",
      },
    }));
  }

  async createSession(input: {
    projectId: string;
    lat: number;
    lng: number;
    createdBy: string;
  }): Promise<BreakappSessionRecord> {
    const store = await readStore();
    const session: BreakappSessionRecord = {
      id: createId("session"),
      projectId: input.projectId,
      lat: input.lat,
      lng: input.lng,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };

    store.sessions.push(session);
    await writeStore(store);
    return session;
  }

  async createOrder(input: {
    sessionId: string;
    userId: string;
    items: BreakappOrderItemRecord[];
  }): Promise<BreakappOrderRecord> {
    const store = await readStore();
    const session = store.sessions.find((entry) => entry.id === input.sessionId);
    if (!session) {
      throw new Error("الجلسة غير موجودة");
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("يجب إرسال عنصر واحد على الأقل");
    }

    const resolvedItems = input.items.map((item) => {
      const menuItem = SEEDED_MENU_ITEMS.find(
        (candidate) => candidate.id === item.menuItemId && candidate.available
      );
      if (!menuItem) {
        throw new Error("عنصر قائمة غير صالح");
      }
      return menuItem;
    });

    const uniqueVendorIds = new Set(resolvedItems.map((item) => item.vendorId));
    if (uniqueVendorIds.size !== 1) {
      throw new Error("يجب أن تنتمي عناصر الطلب إلى مورد واحد فقط");
    }

    const [vendorId] = Array.from(uniqueVendorIds);
    if (!vendorId) {
      throw new Error("تعذر تحديد المورد");
    }

    const order: BreakappOrderRecord = {
      id: createId("order"),
      sessionId: input.sessionId,
      userId: input.userId,
      vendorId,
      items: input.items,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    store.orders.push(order);
    await writeStore(store);
    return order;
  }

  async listOrdersForUser(userId: string): Promise<BreakappOrderRecord[]> {
    const store = await readStore();
    return store.orders
      .filter((order) => order.userId === userId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async getSessionBatches(sessionId: string): Promise<
    Array<{ vendorId: string; vendorName: string; totalItems: number }>
  > {
    const store = await readStore();
    const sessionOrders = store.orders.filter(
      (order) =>
        order.sessionId === sessionId &&
        (order["status"] === "pending" || order["status"] === "processing")
    );

    const batches = new Map<string, number>();
    for (const order of sessionOrders) {
      const totalItems = order.items.reduce(
        (sum, item) => sum + Math.max(item.quantity, 0),
        0
      );
      batches.set(order.vendorId, (batches.get(order.vendorId) ?? 0) + totalItems);
    }

    return Array.from(batches.entries()).map(([vendorId, totalItems]) => ({
      vendorId,
      vendorName:
        SEEDED_VENDORS.find((vendor) => vendor.id === vendorId)?.name || vendorId,
      totalItems,
    }));
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const store = await readStore();
    const order = store.orders.find((entry) => entry.id === orderId);
    if (!order) {
      return;
    }
    order["status"] = status;
    await writeStore(store);
  }

  async updateRunnerLocation(input: BreakappRunnerLocation): Promise<void> {
    const store = await readStore();
    store.runnerLocations[input.runnerId] = input;
    await writeStore(store);
  }
}

export const breakappService = new BreakappService();
