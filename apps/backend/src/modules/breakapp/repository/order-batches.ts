import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  breakappOrderItems,
  breakappOrders,
  breakappRunnerLocations,
  breakappVendors,
} from "@/db/schema";

import { ensureDatabase } from "./_helpers";

import type { OrderStatus } from "../service.types";

export interface SessionBatchRow {
  vendorId: string;
  vendorName: string;
  totalItems: number;
}

export async function aggregateSessionBatches(
  sessionId: string,
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
      eq(breakappOrderItems.orderId, breakappOrders.id),
    )
    .innerJoin(breakappVendors, eq(breakappVendors.id, breakappOrders.vendorId))
    .where(
      and(
        eq(breakappOrders.sessionId, sessionId),
        inArray(breakappOrders.status, [
          "pending",
          "processing",
        ] as OrderStatus[]),
      ),
    )
    .groupBy(breakappOrders.vendorId, breakappVendors.name);

  return rows.map((row) => ({
    vendorId: row.vendorId,
    vendorName: row.vendorName ?? row.vendorId,
    totalItems: Number(row.totalItems),
  }));
}

export async function listRunnerTasks(runnerId: string): Promise<
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
      eq(breakappOrderItems.orderId, breakappOrders.id),
    )
    .innerJoin(breakappVendors, eq(breakappVendors.id, breakappOrders.vendorId))
    .where(
      and(
        eq(breakappOrders.userId, runnerId),
        inArray(breakappOrders.status, [
          "pending",
          "processing",
        ] as OrderStatus[]),
      ),
    )
    .groupBy(
      breakappOrders.id,
      breakappOrders.sessionId,
      breakappOrders.vendorId,
      breakappVendors.name,
      breakappOrders.status,
      breakappOrders.createdAt,
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
