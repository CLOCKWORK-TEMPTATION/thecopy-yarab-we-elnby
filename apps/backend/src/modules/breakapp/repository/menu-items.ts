import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { breakappMenuItems, breakappVendors } from '@/db/schema';

import type { BreakappMenuItemView } from '../service.types';
import { ensureDatabase } from './_helpers';
import { getVendorOwnedByUser } from './vendors';

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
