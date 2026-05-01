import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { appPersistenceRecords } from "@/db/schema";

export interface AppPersistenceEnvelope {
  version: 1;
  app: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

interface AppPersistenceOptions {
  scope?: string;
  recordKey?: string;
}

const DEFAULT_SCOPE = "global";
const DEFAULT_RECORD_KEY = "state";

function sanitizePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function normalizePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return sanitizePayload(payload as Record<string, unknown>);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function envelopeFromRecord(record: {
  appId: string;
  payload: unknown;
  updatedAt: Date | string;
}): AppPersistenceEnvelope {
  return {
    version: 1,
    app: record.appId,
    updatedAt: toIsoString(record.updatedAt),
    data: normalizePayload(record.payload),
  };
}

function resolveScope(options?: AppPersistenceOptions): string {
  return options?.scope ?? DEFAULT_SCOPE;
}

function resolveRecordKey(options?: AppPersistenceOptions): string {
  return options?.recordKey ?? DEFAULT_RECORD_KEY;
}

export async function readAppPersistenceRecord(
  appId: string,
  options?: AppPersistenceOptions,
): Promise<AppPersistenceEnvelope | null> {
  const scope = resolveScope(options);
  const recordKey = resolveRecordKey(options);
  const [record] = await db
    .select({
      appId: appPersistenceRecords.appId,
      payload: appPersistenceRecords.payload,
      updatedAt: appPersistenceRecords.updatedAt,
    })
    .from(appPersistenceRecords)
    .where(
      and(
        eq(appPersistenceRecords.appId, appId),
        eq(appPersistenceRecords.scope, scope),
        eq(appPersistenceRecords.recordKey, recordKey),
      ),
    )
    .limit(1);

  return record ? envelopeFromRecord(record) : null;
}

export async function saveAppPersistenceRecord(
  appId: string,
  payload: Record<string, unknown>,
  options?: AppPersistenceOptions,
): Promise<AppPersistenceEnvelope> {
  const scope = resolveScope(options);
  const recordKey = resolveRecordKey(options);
  const cleanPayload = sanitizePayload(payload);
  const updatedAt = new Date();

  const [record] = await db
    .insert(appPersistenceRecords)
    .values({
      appId,
      scope,
      recordKey,
      payload: cleanPayload,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [
        appPersistenceRecords.appId,
        appPersistenceRecords.scope,
        appPersistenceRecords.recordKey,
      ],
      set: {
        payload: cleanPayload,
        updatedAt,
      },
    })
    .returning({
      appId: appPersistenceRecords.appId,
      payload: appPersistenceRecords.payload,
      updatedAt: appPersistenceRecords.updatedAt,
    });

  if (!record) {
    throw new Error("app_persistence_write_failed");
  }

  return envelopeFromRecord(record);
}

export async function clearAppPersistenceRecord(
  appId: string,
  options?: AppPersistenceOptions,
): Promise<AppPersistenceEnvelope> {
  return saveAppPersistenceRecord(appId, {}, options);
}
