import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { actoraiAnalytics } from "@/db/schema";
import { trackAnalyticsPersistence } from "@/utils/connectivity-telemetry";
import { logger } from "@/utils/logger";

type AnalyticsCategory = "voice" | "webcam" | "memorization";

interface SaveAnalyticsResult {
  success: true;
  id: string;
  category: AnalyticsCategory;
  createdAt: string;
  storage?: "database" | "file-fallback";
}

interface AnalyticsRecord {
  id: string;
  userId: string | null;
  category: AnalyticsCategory;
  payload: unknown;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

type ActorAiRecordKind = "voice-analytics" | "webcam-analysis" | "memorization";

interface StoredActorAiRecord {
  id: string;
  kind: ActorAiRecordKind;
  createdAt: string;
  payload: Record<string, unknown>;
}

function resolveStoreRoot(): string {
  return process.env['ACTORAI_STORE_DIR'] || path.join(process.cwd(), ".data", "actorai");
}

function resolveStorePath(kind: ActorAiRecordKind): string {
  return path.join(resolveStoreRoot(), `${kind}.json`);
}

function sanitizePayload(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { value: data ?? null };
  }

  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  return {};
}

function normalizeAnalyticsRecord(record: Omit<AnalyticsRecord, "metadata" | "category"> & { metadata: unknown; category: string }): AnalyticsRecord {
  return {
    ...record,
    category: record.category as AnalyticsCategory,
    metadata: normalizeMetadata(record.metadata),
  };
}

async function readExistingRecords(kind: ActorAiRecordKind): Promise<StoredActorAiRecord[]> {
  const filePath = resolveStorePath(kind);

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredActorAiRecord[]) : [];
  } catch {
    return [];
  }
}

async function persistRecord(
  kind: ActorAiRecordKind,
  payload: unknown
): Promise<StoredActorAiRecord> {
  const filePath = resolveStorePath(kind);
  await mkdir(path.dirname(filePath), { recursive: true });

  const records = await readExistingRecords(kind);
  const record: StoredActorAiRecord = {
    id: randomUUID(),
    kind,
    createdAt: new Date().toISOString(),
    payload: sanitizePayload(payload),
  };

  records.push(record);
  await writeFile(filePath, JSON.stringify(records, null, 2), "utf8");

  return record;
}

function toRecordKind(category: AnalyticsCategory): ActorAiRecordKind {
  switch (category) {
    case "voice":
      return "voice-analytics";
    case "webcam":
      return "webcam-analysis";
    case "memorization":
      return "memorization";
  }
}

export class ActorAiService {
  // eslint-disable-next-line max-lines-per-function, complexity
  private async saveAnalytics(
    category: AnalyticsCategory,
    data: unknown,
    userId?: string
  ): Promise<SaveAnalyticsResult> {
    try {
      const payload =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : { value: data ?? null };

      const [created] = await db
        .insert(actoraiAnalytics)
        .values({
          userId: userId || null,
          category,
          payload: (payload["data"] ?? payload) as Record<string, unknown>,
          metadata: (payload["metadata"] ?? {}) as Record<string, unknown>,
        })
        .returning({
          id: actoraiAnalytics.id,
          category: actoraiAnalytics.category,
          createdAt: actoraiAnalytics.createdAt,
        });

      if (!created) {
        throw new Error("analytics_insert_failed");
      }

      trackAnalyticsPersistence("analytics:persistence:success", {
        category,
        id: created.id,
      });

      logger.info("Persisted actor AI analytics data", {
        id: created.id,
        category,
        storage: "database",
      });

      return {
        success: true,
        id: created.id,
        category,
        createdAt: created.createdAt.toISOString(),
        storage: "database",
      };
    } catch (error) {
      trackAnalyticsPersistence("analytics:persistence:failure", {
        category,
        reason: error instanceof Error ? error.message : "unknown_error",
      });

      logger.warn("Primary actor AI analytics persistence failed, using file fallback", {
        category,
        error,
      });

      const fallbackRecord = await persistRecord(toRecordKind(category), {
        userId: userId ?? null,
        ...(sanitizePayload(data) as Record<string, unknown>),
      });

      logger.info("Persisted actor AI analytics data", {
        id: fallbackRecord.id,
        category,
        storage: "file-fallback",
      });

      return {
        success: true,
        id: fallbackRecord.id,
        category,
        createdAt: fallbackRecord.createdAt,
        storage: "file-fallback",
      };
    }
  }

  async saveVoiceAnalytics(data: unknown, userId?: string): Promise<SaveAnalyticsResult> {
    return this.saveAnalytics("voice", data, userId);
  }

  async saveWebcamAnalysis(data: unknown, userId?: string): Promise<SaveAnalyticsResult> {
    return this.saveAnalytics("webcam", data, userId);
  }

  async saveMemorizationStats(data: unknown, userId?: string): Promise<SaveAnalyticsResult> {
    return this.saveAnalytics("memorization", data, userId);
  }

  async getAnalyticsById(id: string): Promise<AnalyticsRecord | null> {
    const [record] = await db
      .select({
        id: actoraiAnalytics.id,
        userId: actoraiAnalytics.userId,
        category: actoraiAnalytics.category,
        payload: actoraiAnalytics.payload,
        metadata: actoraiAnalytics.metadata,
        createdAt: actoraiAnalytics.createdAt,
      })
      .from(actoraiAnalytics)
      .where(eq(actoraiAnalytics.id, id))
      .limit(1);

    return record ? normalizeAnalyticsRecord(record) : null;
  }

  async listAnalytics(options: {
    category?: AnalyticsCategory;
    limit?: number;
    offset?: number;
  }): Promise<{ records: AnalyticsRecord[]; total: number; limit: number; offset: number }> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);

    const whereClause = options.category
      ? eq(actoraiAnalytics.category, options.category)
      : undefined;

    const records = await db
      .select({
        id: actoraiAnalytics.id,
        userId: actoraiAnalytics.userId,
        category: actoraiAnalytics.category,
        payload: actoraiAnalytics.payload,
        metadata: actoraiAnalytics.metadata,
        createdAt: actoraiAnalytics.createdAt,
      })
      .from(actoraiAnalytics)
      .where(whereClause)
      .orderBy(desc(actoraiAnalytics.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ value: count() })
      .from(actoraiAnalytics)
      .where(whereClause);

    return {
      records: records.map((record) => normalizeAnalyticsRecord(record)),
      total: Number(totalResult[0]?.value ?? 0),
      limit,
      offset,
    };
  }
}

export const actorAiService = new ActorAiService();
