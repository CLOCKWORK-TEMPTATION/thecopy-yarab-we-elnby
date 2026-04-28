import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { breakappVendors } from '@/db/schema';

import { ensureDatabase, mapVendorRow } from './_helpers';

import type {
  BreakappNearbyVendor,
  BreakappVendorView,
} from '../service.types';

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
    .filter(
      (vendor) =>
        Number.isFinite(vendor.distance) && vendor.distance <= input.radiusMeters
    )
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
