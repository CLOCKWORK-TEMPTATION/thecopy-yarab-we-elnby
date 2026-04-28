import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { breakappOrderItems, breakappOrders } from '@/db/schema';

import { ensureDatabase, loadItemsForOrders } from './_helpers';

import type {
  BreakappOrderItemInput,
  BreakappOrderView,
  OrderStatus,
} from '../service.types';

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
