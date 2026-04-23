/**
 * BREAKAPP Repository — طبقة الوصول الوحيدة لقاعدة البيانات.
 * كل وصول لجداول `breakapp_*` يمر عبر هذه الوحدة.
 */

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  breakappInviteTokens,
  breakappMenuItems,
  breakappOrderItems,
  breakappOrders,
  breakappProjectMembers,
  breakappProjects,
  breakappRefreshTokens,
  breakappRunnerLocations,
  breakappSessions,
  breakappVendors,
} from '@/db/schema';

import type {
  BreakappMenuItemView,
  BreakappNearbyVendor,
  BreakappOrderItemInput,
  BreakappOrderView,
  BreakappRole,
  BreakappSessionView,
  BreakappVendorView,
  OrderStatus,
  SessionStatus,
} from './service.types';

function ensureDatabase(): void {
  if (!db) {
    throw new Error(
      'Database is not available. DATABASE_URL must be set for BREAKAPP to function.'
    );
  }
}

function mapVendorRow(row: {
  id: string;
  name: string;
  isMobile: boolean;
  lat: number | null;
  lng: number | null;
  ownerUserId: string | null;
}): BreakappVendorView {
  return {
    id: row.id,
    name: row.name,
    isMobile: row.isMobile,
    lat: row.lat,
    lng: row.lng,
    ownerUserId: row.ownerUserId,
  };
}

// ---------- Projects ----------

export async function createProject(input: {
  name: string;
  directorUserId: string;
}): Promise<{ id: string; name: string }> {
  ensureDatabase();
  const [row] = await db
    .insert(breakappProjects)
    .values({
      name: input.name,
      directorUserId: input.directorUserId,
    })
    .returning({ id: breakappProjects.id, name: breakappProjects.name });
  if (!row) {
    throw new Error('تعذر إنشاء المشروع');
  }
  return row;
}

export async function listProjects(): Promise<
  { id: string; name: string; directorUserId: string; createdAt: Date }[]
> {
  ensureDatabase();
  const rows = await db
    .select({
      id: breakappProjects.id,
      name: breakappProjects.name,
      directorUserId: breakappProjects.directorUserId,
      createdAt: breakappProjects.createdAt,
    })
    .from(breakappProjects)
    .where(isNull(breakappProjects.deletedAt))
    .orderBy(desc(breakappProjects.createdAt));
  return rows;
}

export async function projectExists(projectId: string): Promise<boolean> {
  ensureDatabase();
  const rows = await db
    .select({ id: breakappProjects.id })
    .from(breakappProjects)
    .where(
      and(eq(breakappProjects.id, projectId), isNull(breakappProjects.deletedAt))
    )
    .limit(1);
  return rows.length > 0;
}

// ---------- Project members ----------

export async function addProjectMember(input: {
  projectId: string;
  userId: string;
  role: BreakappRole;
}): Promise<void> {
  ensureDatabase();
  await db
    .insert(breakappProjectMembers)
    .values({
      projectId: input.projectId,
      userId: input.userId,
      role: input.role,
    })
    .onConflictDoNothing();
}

export async function listUsers(): Promise<
  { userId: string; projectId: string; role: BreakappRole; joinedAt: Date }[]
> {
  ensureDatabase();
  const rows = await db
    .select({
      userId: breakappProjectMembers.userId,
      projectId: breakappProjectMembers.projectId,
      role: breakappProjectMembers.role,
      joinedAt: breakappProjectMembers.joinedAt,
    })
    .from(breakappProjectMembers)
    .orderBy(desc(breakappProjectMembers.joinedAt));
  return rows.map((row) => ({
    userId: row.userId,
    projectId: row.projectId,
    role: row.role,
    joinedAt: row.joinedAt,
  }));
}

// ---------- Invite tokens ----------

export async function createInviteToken(input: {
  projectId: string;
  role: BreakappRole;
  expiresAt: Date;
  createdBy: string;
  qrPayload: string;
}): Promise<{ id: string; qrPayload: string; expiresAt: Date }> {
  ensureDatabase();
  const [row] = await db
    .insert(breakappInviteTokens)
    .values({
      projectId: input.projectId,
      role: input.role,
      expiresAt: input.expiresAt,
      createdBy: input.createdBy,
      qrPayload: input.qrPayload,
    })
    .returning({
      id: breakappInviteTokens.id,
      qrPayload: breakappInviteTokens.qrPayload,
      expiresAt: breakappInviteTokens.expiresAt,
    });
  if (!row) {
    throw new Error('تعذر إنشاء رمز الدعوة');
  }
  return row;
}

// ---------- Vendors ----------

export async function listVendors(): Promise<BreakappVendorView[]> {
  ensureDatabase();
  const rows = await db
    .select({
      id: breakappVendors.id,
      name: breakappVendors.name,
      isMobile: breakappVendors.isMobile,
      lat: breakappVendors.lat,
      lng: breakappVendors.lng,
      ownerUserId: breakappVendors.ownerUserId,
    })
    .from(breakappVendors)
    .where(isNull(breakappVendors.deletedAt))
    .orderBy(asc(breakappVendors.name));
  return rows.map(mapVendorRow);
}

export async function getVendorById(
  vendorId: string
): Promise<BreakappVendorView | null> {
  ensureDatabase();
  const rows = await db
    .select({
      id: breakappVendors.id,
      name: breakappVendors.name,
      isMobile: breakappVendors.isMobile,
      lat: breakappVendors.lat,
      lng: breakappVendors.lng,
      ownerUserId: breakappVendors.ownerUserId,
    })
    .from(breakappVendors)
    .where(
      and(eq(breakappVendors.id, vendorId), isNull(breakappVendors.deletedAt))
    )
    .limit(1);
  const row = rows[0];
  return row ? mapVendorRow(row) : null;
}

export async function findNearbyVendors(input: {
  lat: number;
  lng: number;
  radiusMeters: number;
}): Promise<BreakappNearbyVendor[]> {
  ensureDatabase();
  // Haversine صيغة SQL جاهزة — نصف قطر الأرض 6371000 متر.
  const distanceExpr = sql<number>`(
    6371000 * acos(
      cos(radians(${input.lat})) * cos(radians(${breakappVendors.lat})) *
      cos(radians(${breakappVendors.lng}) - radians(${input.lng})) +
      sin(radians(${input.lat})) * sin(radians(${breakappVendors.lat}))
    )
  )`;

  const rows = await db
    .select({
      id: breakappVendors.id,
      name: breakappVendors.name,
      isMobile: breakappVendors.isMobile,
      lat: breakappVendors.lat,
      lng: breakappVendors.lng,
      ownerUserId: breakappVendors.ownerUserId,
      distance: distanceExpr,
    })
    .from(breakappVendors)
    .where(
      and(
        isNull(breakappVendors.deletedAt),
        sql`${breakappVendors.lat} IS NOT NULL AND ${breakappVendors.lng} IS NOT NULL`
      )
    );

  return rows
    .map((row) => ({
      ...mapVendorRow(row),
      distance: Number(row.distance),
    }))
    .filter((vendor) => Number.isFinite(vendor.distance) && vendor.distance <= input.radiusMeters)
    .sort((left, right) => left.distance - right.distance);
}

export async function createVendor(input: {
  name: string;
  isMobile: boolean;
  lat: number | null;
  lng: number | null;
  ownerUserId: string | null;
}): Promise<BreakappVendorView> {
  ensureDatabase();
  const [row] = await db
    .insert(breakappVendors)
    .values({
      name: input.name,
      isMobile: input.isMobile,
      lat: input.lat,
      lng: input.lng,
      ownerUserId: input.ownerUserId,
    })
    .returning({
      id: breakappVendors.id,
      name: breakappVendors.name,
      isMobile: breakappVendors.isMobile,
      lat: breakappVendors.lat,
      lng: breakappVendors.lng,
      ownerUserId: breakappVendors.ownerUserId,
    });
  if (!row) {
    throw new Error('تعذر إنشاء المورد');
  }
  return mapVendorRow(row);
}

export async function updateVendor(
  vendorId: string,
  patch: {
    name?: string;
    isMobile?: boolean;
    lat?: number | null;
    lng?: number | null;
    ownerUserId?: string | null;
  }
): Promise<BreakappVendorView | null> {
  ensureDatabase();
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values['name'] = patch.name;
  if (patch.isMobile !== undefined) values['isMobile'] = patch.isMobile;
  if (patch.lat !== undefined) values['lat'] = patch.lat;
  if (patch.lng !== undefined) values['lng'] = patch.lng;
  if (patch.ownerUserId !== undefined) values['ownerUserId'] = patch.ownerUserId;

  if (Object.keys(values).length === 0) {
    return getVendorById(vendorId);
  }

  const [row] = await db
    .update(breakappVendors)
    .set(values)
    .where(
      and(eq(breakappVendors.id, vendorId), isNull(breakappVendors.deletedAt))
    )
    .returning({
      id: breakappVendors.id,
      name: breakappVendors.name,
      isMobile: breakappVendors.isMobile,
      lat: breakappVendors.lat,
      lng: breakappVendors.lng,
      ownerUserId: breakappVendors.ownerUserId,
    });
  return row ? mapVendorRow(row) : null;
}

export async function softDeleteVendor(vendorId: string): Promise<boolean> {
  ensureDatabase();
  const rows = await db
    .update(breakappVendors)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(breakappVendors.id, vendorId), isNull(breakappVendors.deletedAt))
    )
    .returning({ id: breakappVendors.id });
  return rows.length > 0;
}

export async function getVendorOwnedByUser(
  userId: string
): Promise<BreakappVendorView | null> {
  ensureDatabase();
  const rows = await db
    .select({
      id: breakappVendors.id,
      name: breakappVendors.name,
      isMobile: breakappVendors.isMobile,
      lat: breakappVendors.lat,
      lng: breakappVendors.lng,
      ownerUserId: breakappVendors.ownerUserId,
    })
    .from(breakappVendors)
    .where(
      and(
        eq(breakappVendors.ownerUserId, userId),
        isNull(breakappVendors.deletedAt)
      )
    )
    .limit(1);
  const row = rows[0];
  return row ? mapVendorRow(row) : null;
}

// ---------- Menu items ----------

export async function listMenuItemsForVendor(
  vendorId: string,
  onlyAvailable: boolean
): Promise<BreakappMenuItemView[]> {
  ensureDatabase();
  const conditions = [
    eq(breakappMenuItems.vendorId, vendorId),
    isNull(breakappMenuItems.deletedAt),
  ];
  if (onlyAvailable) {
    conditions.push(eq(breakappMenuItems.available, true));
  }

  const rows = await db
    .select({
      id: breakappMenuItems.id,
      vendorId: breakappMenuItems.vendorId,
      name: breakappMenuItems.name,
      description: breakappMenuItems.description,
      price: breakappMenuItems.price,
      available: breakappMenuItems.available,
      vendorName: breakappVendors.name,
    })
    .from(breakappMenuItems)
    .leftJoin(
      breakappVendors,
      eq(breakappVendors.id, breakappMenuItems.vendorId)
    )
    .where(and(...conditions))
    .orderBy(asc(breakappMenuItems.name));

  return rows.map((row) => ({
    id: row.id,
    vendorId: row.vendorId,
    name: row.name,
    description: row.description,
    price: row.price,
    available: row.available,
    vendor: { name: row.vendorName ?? '' },
  }));
}

export async function getMenuItems(
  menuItemIds: string[]
): Promise<
  {
    id: string;
    vendorId: string;
    name: string;
    available: boolean;
  }[]
> {
  ensureDatabase();
  if (menuItemIds.length === 0) return [];
  const rows = await db
    .select({
      id: breakappMenuItems.id,
      vendorId: breakappMenuItems.vendorId,
      name: breakappMenuItems.name,
      available: breakappMenuItems.available,
    })
    .from(breakappMenuItems)
    .where(
      and(
        inArray(breakappMenuItems.id, menuItemIds),
        isNull(breakappMenuItems.deletedAt)
      )
    );
  return rows;
}

export async function createMenuItem(input: {
  vendorId: string;
  name: string;
  description: string | null;
  price: number | null;
  available: boolean;
}): Promise<{ id: string }> {
  ensureDatabase();
  const [row] = await db
    .insert(breakappMenuItems)
    .values({
      vendorId: input.vendorId,
      name: input.name,
      description: input.description,
      price: input.price,
      available: input.available,
    })
    .returning({ id: breakappMenuItems.id });
  if (!row) throw new Error('تعذر إنشاء عنصر القائمة');
  return row;
}

export async function updateMenuItem(
  menuItemId: string,
  ownerUserId: string,
  patch: {
    name?: string;
    description?: string | null;
    price?: number | null;
    available?: boolean;
  }
): Promise<boolean> {
  ensureDatabase();
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values['name'] = patch.name;
  if (patch.description !== undefined) values['description'] = patch.description;
  if (patch.price !== undefined) values['price'] = patch.price;
  if (patch.available !== undefined) values['available'] = patch.available;

  if (Object.keys(values).length === 0) {
    return true;
  }

  const vendor = await getVendorOwnedByUser(ownerUserId);
  if (!vendor) return false;

  const rows = await db
    .update(breakappMenuItems)
    .set(values)
    .where(
      and(
        eq(breakappMenuItems.id, menuItemId),
        eq(breakappMenuItems.vendorId, vendor.id),
        isNull(breakappMenuItems.deletedAt)
      )
    )
    .returning({ id: breakappMenuItems.id });
  return rows.length > 0;
}

export async function softDeleteMenuItem(
  menuItemId: string,
  ownerUserId: string
): Promise<boolean> {
  ensureDatabase();
  const vendor = await getVendorOwnedByUser(ownerUserId);
  if (!vendor) return false;
  const rows = await db
    .update(breakappMenuItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(breakappMenuItems.id, menuItemId),
        eq(breakappMenuItems.vendorId, vendor.id),
        isNull(breakappMenuItems.deletedAt)
      )
    )
    .returning({ id: breakappMenuItems.id });
  return rows.length > 0;
}

// ---------- Sessions ----------

export async function createSession(input: {
  projectId: string;
  directorUserId: string;
  lat: number;
  lng: number;
}): Promise<BreakappSessionView> {
  ensureDatabase();
  const [row] = await db
    .insert(breakappSessions)
    .values({
      projectId: input.projectId,
      directorUserId: input.directorUserId,
      lat: input.lat,
      lng: input.lng,
    })
    .returning();
  if (!row) throw new Error('تعذر إنشاء الجلسة');
  return toSessionView(row);
}

export async function getSession(
  sessionId: string
): Promise<BreakappSessionView | null> {
  ensureDatabase();
  const rows = await db
    .select()
    .from(breakappSessions)
    .where(eq(breakappSessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  return row ? toSessionView(row) : null;
}

function toSessionView(row: {
  id: string;
  projectId: string;
  directorUserId: string;
  lat: number;
  lng: number;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  createdAt: Date;
}): BreakappSessionView {
  return {
    id: row.id,
    projectId: row.projectId,
    directorUserId: row.directorUserId,
    lat: row.lat,
    lng: row.lng,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    status: (row.status as SessionStatus) ?? 'active',
    createdAt: row.createdAt.toISOString(),
  };
}

// ---------- Orders ----------

export async function createOrderWithItems(input: {
  sessionId: string;
  userId: string;
  vendorId: string;
  items: BreakappOrderItemInput[];
}): Promise<BreakappOrderView> {
  ensureDatabase();
  const result = await db.transaction(async (tx) => {
    const [orderRow] = await tx
      .insert(breakappOrders)
      .values({
        sessionId: input.sessionId,
        userId: input.userId,
        vendorId: input.vendorId,
      })
      .returning();
    if (!orderRow) throw new Error('تعذر إنشاء الطلب');

    const itemRows = input.items.map((item) => ({
      orderId: orderRow.id,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
    }));
    await tx.insert(breakappOrderItems).values(itemRows);

    return {
      id: orderRow.id,
      sessionId: orderRow.sessionId,
      userId: orderRow.userId,
      vendorId: orderRow.vendorId,
      status: orderRow.status,
      createdAt: orderRow.createdAt.toISOString(),
      items: input.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
    } satisfies BreakappOrderView;
  });

  return result;
}

export async function loadOrderItems(
  orderId: string
): Promise<{ menuItemId: string; quantity: number }[]> {
  ensureDatabase();
  const rows = await db
    .select({
      menuItemId: breakappOrderItems.menuItemId,
      quantity: breakappOrderItems.quantity,
    })
    .from(breakappOrderItems)
    .where(eq(breakappOrderItems.orderId, orderId));
  return rows;
}

export async function getOrder(
  orderId: string
): Promise<BreakappOrderView | null> {
  ensureDatabase();
  const rows = await db
    .select()
    .from(breakappOrders)
    .where(eq(breakappOrders.id, orderId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const items = await loadOrderItems(orderId);
  return {
    id: row.id,
    sessionId: row.sessionId,
    userId: row.userId,
    vendorId: row.vendorId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    items,
  };
}

export async function listOrdersForUser(
  userId: string
): Promise<BreakappOrderView[]> {
  ensureDatabase();
  const rows = await db
    .select()
    .from(breakappOrders)
    .where(eq(breakappOrders.userId, userId))
    .orderBy(desc(breakappOrders.createdAt));

  const orderIds = rows.map((row) => row.id);
  const itemsMap = await loadItemsForOrders(orderIds);

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    userId: row.userId,
    vendorId: row.vendorId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    items: itemsMap.get(row.id) ?? [],
  }));
}

export async function listOrdersForSession(input: {
  sessionId: string;
  status?: OrderStatus | undefined;
}): Promise<BreakappOrderView[]> {
  ensureDatabase();
  const conditions = [eq(breakappOrders.sessionId, input.sessionId)];
  if (input.status) {
    conditions.push(eq(breakappOrders.status, input.status));
  }
  const rows = await db
    .select()
    .from(breakappOrders)
    .where(and(...conditions))
    .orderBy(desc(breakappOrders.createdAt));

  const orderIds = rows.map((row) => row.id);
  const itemsMap = await loadItemsForOrders(orderIds);

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    userId: row.userId,
    vendorId: row.vendorId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    items: itemsMap.get(row.id) ?? [],
  }));
}

export async function listOrdersForVendor(
  vendorId: string,
  status?: OrderStatus
): Promise<BreakappOrderView[]> {
  ensureDatabase();
  const conditions = [eq(breakappOrders.vendorId, vendorId)];
  if (status) conditions.push(eq(breakappOrders.status, status));
  const rows = await db
    .select()
    .from(breakappOrders)
    .where(and(...conditions))
    .orderBy(desc(breakappOrders.createdAt));

  const orderIds = rows.map((row) => row.id);
  const itemsMap = await loadItemsForOrders(orderIds);

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    userId: row.userId,
    vendorId: row.vendorId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    items: itemsMap.get(row.id) ?? [],
  }));
}

async function loadItemsForOrders(
  orderIds: string[]
): Promise<Map<string, { menuItemId: string; quantity: number }[]>> {
  const map = new Map<string, { menuItemId: string; quantity: number }[]>();
  if (orderIds.length === 0) return map;
  const rows = await db
    .select({
      orderId: breakappOrderItems.orderId,
      menuItemId: breakappOrderItems.menuItemId,
      quantity: breakappOrderItems.quantity,
    })
    .from(breakappOrderItems)
    .where(inArray(breakappOrderItems.orderId, orderIds));
  for (const row of rows) {
    const existing = map.get(row.orderId) ?? [];
    existing.push({ menuItemId: row.menuItemId, quantity: row.quantity });
    map.set(row.orderId, existing);
  }
  return map;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<boolean> {
  ensureDatabase();
  const rows = await db
    .update(breakappOrders)
    .set({ status })
    .where(eq(breakappOrders.id, orderId))
    .returning({ id: breakappOrders.id });
  return rows.length > 0;
}

// ---------- Order batches (tasks for runners) ----------

export interface SessionBatchRow {
  vendorId: string;
  vendorName: string;
  totalItems: number;
}

export async function aggregateSessionBatches(
  sessionId: string
): Promise<SessionBatchRow[]> {
  ensureDatabase();
  const rows = await db
    .select({
      vendorId: breakappOrders.vendorId,
      vendorName: breakappVendors.name,
      totalItems: sql<number>`COALESCE(SUM(${breakappOrderItems.quantity}), 0)`,
    })
    .from(breakappOrders)
    .innerJoin(
      breakappOrderItems,
      eq(breakappOrderItems.orderId, breakappOrders.id)
    )
    .innerJoin(
      breakappVendors,
      eq(breakappVendors.id, breakappOrders.vendorId)
    )
    .where(
      and(
        eq(breakappOrders.sessionId, sessionId),
        inArray(breakappOrders.status, ['pending', 'processing'] as OrderStatus[])
      )
    )
    .groupBy(breakappOrders.vendorId, breakappVendors.name);

  return rows.map((row) => ({
    vendorId: row.vendorId,
    vendorName: row.vendorName ?? row.vendorId,
    totalItems: Number(row.totalItems),
  }));
}

export async function listRunnerTasks(
  runnerId: string
): Promise<
  {
    id: string;
    sessionId: string;
    vendorId: string;
    vendorName: string;
    totalItems: number;
    status: string;
    createdAt: string;
  }[]
> {
  ensureDatabase();
  const rows = await db
    .select({
      id: breakappOrders.id,
      sessionId: breakappOrders.sessionId,
      vendorId: breakappOrders.vendorId,
      vendorName: breakappVendors.name,
      status: breakappOrders.status,
      createdAt: breakappOrders.createdAt,
      totalItems: sql<number>`COALESCE(SUM(${breakappOrderItems.quantity}), 0)`,
    })
    .from(breakappOrders)
    .innerJoin(
      breakappOrderItems,
      eq(breakappOrderItems.orderId, breakappOrders.id)
    )
    .innerJoin(
      breakappVendors,
      eq(breakappVendors.id, breakappOrders.vendorId)
    )
    .where(
      and(
        eq(breakappOrders.userId, runnerId),
        inArray(breakappOrders.status, ['pending', 'processing'] as OrderStatus[])
      )
    )
    .groupBy(
      breakappOrders.id,
      breakappOrders.sessionId,
      breakappOrders.vendorId,
      breakappVendors.name,
      breakappOrders.status,
      breakappOrders.createdAt
    )
    .orderBy(desc(breakappOrders.createdAt));

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    vendorId: row.vendorId,
    vendorName: row.vendorName ?? row.vendorId,
    totalItems: Number(row.totalItems),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listRunnersForSession(sessionId: string): Promise<
  {
    runnerId: string;
    lat: number;
    lng: number;
    accuracy: number | null;
    recordedAt: string;
  }[]
> {
  ensureDatabase();
  // آخر موقع لكل runner في هذه الجلسة
  const rows = await db
    .select({
      runnerId: breakappRunnerLocations.runnerId,
      lat: breakappRunnerLocations.lat,
      lng: breakappRunnerLocations.lng,
      accuracy: breakappRunnerLocations.accuracy,
      recordedAt: breakappRunnerLocations.recordedAt,
    })
    .from(breakappRunnerLocations)
    .where(eq(breakappRunnerLocations.sessionId, sessionId))
    .orderBy(desc(breakappRunnerLocations.recordedAt));

  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.runnerId)) {
      latest.set(row.runnerId, row);
    }
  }
  return Array.from(latest.values()).map((row) => ({
    runnerId: row.runnerId,
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy,
    recordedAt: row.recordedAt.toISOString(),
  }));
}

// ---------- Runner locations ----------

export async function insertRunnerLocation(input: {
  runnerId: string;
  sessionId?: string | null | undefined;
  lat: number;
  lng: number;
  accuracy?: number | null | undefined;
}): Promise<void> {
  ensureDatabase();
  await db.insert(breakappRunnerLocations).values({
    runnerId: input.runnerId,
    sessionId: input.sessionId ?? null,
    lat: input.lat,
    lng: input.lng,
    accuracy: input.accuracy ?? null,
  });
}

// ---------- Refresh tokens ----------

export async function insertRefreshToken(input: {
  userId: string;
  projectId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  ensureDatabase();
  await db.insert(breakappRefreshTokens).values({
    userId: input.userId,
    projectId: input.projectId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
  });
}

export async function findRefreshToken(tokenHash: string): Promise<
  | {
      id: string;
      userId: string;
      projectId: string;
      expiresAt: Date;
      revokedAt: Date | null;
    }
  | null
> {
  ensureDatabase();
  const rows = await db
    .select({
      id: breakappRefreshTokens.id,
      userId: breakappRefreshTokens.userId,
      projectId: breakappRefreshTokens.projectId,
      expiresAt: breakappRefreshTokens.expiresAt,
      revokedAt: breakappRefreshTokens.revokedAt,
    })
    .from(breakappRefreshTokens)
    .where(eq(breakappRefreshTokens.tokenHash, tokenHash))
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  ensureDatabase();
  await db
    .update(breakappRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(breakappRefreshTokens.tokenHash, tokenHash));
}

// ---------- User role lookup ----------

export async function getUserRoleInProject(
  projectId: string,
  userId: string
): Promise<BreakappRole | null> {
  ensureDatabase();
  const rows = await db
    .select({ role: breakappProjectMembers.role })
    .from(breakappProjectMembers)
    .where(
      and(
        eq(breakappProjectMembers.projectId, projectId),
        eq(breakappProjectMembers.userId, userId)
      )
    )
    .limit(1);
  const row = rows[0];
  return row ? (row.role) : null;
}
