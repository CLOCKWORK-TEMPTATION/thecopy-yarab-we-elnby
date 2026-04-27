import { db } from '@/db';
import { breakappOrderItems } from '@/db/schema';
import { inArray } from 'drizzle-orm';

import type {
  BreakappVendorView,
  BreakappSessionView,
  SessionStatus,
} from '../service.types';

export function ensureDatabase(): void {
  if (!db) {
    throw new Error(
      'Database is not available. DATABASE_URL must be set for BREAKAPP to function.'
    );
  }
}

export function mapVendorRow(row: {
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

export function toSessionView(row: {
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

export async function loadItemsForOrders(
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
