/* eslint-disable no-restricted-syntax -- experimental memory API routes */
/**
 * Memory System API Routes
 * نقاط نهاية API لنظام الذاكرة
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { definedProps } from "@/utils/defined-props";

import { mrlOptimizer } from "../embeddings/mrl-optimizer";
import { weaviateIndexingService } from "../indexer/weaviate-indexing.service";
import { contextBuilder } from "../retrieval/context-builder";
import { weaviateStore } from "../vector-store/client";
import {
  AdHocChunksSchema,
  ArchitectureSchema,
  CodeChunksSchema,
  DecisionsSchema,
  DocumentationSchema,
} from "../vector-store/schema";

import type { ContextQuery } from "../types";

const router = Router();

const memorySearchBodySchema = z
  .object({
    query: z.string().min(1),
    collection: z.string().optional(),
    topK: z.number().int().positive().optional(),
  })
  .passthrough();

const memoryIndexBodySchema = z
  .object({
    repoPath: z.string().optional(),
    specificFiles: z.array(z.string()).optional(),
    reset: z.boolean().optional(),
    dimensionality: z
      .union([z.literal(768), z.literal(1536), z.literal(3072)])
      .optional(),
  })
  .passthrough();

const contextQueryBodySchema = z
  .object({
    query: z.string().min(1),
    agentId: z.string().min(1),
    conversationId: z.string().optional(),
    filePath: z.string().optional(),
    contentType: z
      .array(
        z.enum(["code", "documentation", "decision", "architecture", "ad-hoc"]),
      )
      .optional(),
    profile: z
      .enum(["analysis", "completion", "summarization", "code"])
      .optional(),
    topK: z.number().int().positive().optional(),
    recencyBias: z.number().optional(),
  })
  .passthrough();

const memoryRememberBodySchema = z
  .object({
    type: z.enum(["decision", "documentation"]),
    content: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();

/**
 * GET /api/memory/health
 * التحقق من صحة النظام
 */
export const memoryHealthHandler = async (_req: Request, res: Response) => {
  try {
    const statusBefore = weaviateStore.getStatus();
    const weaviateHealthy = statusBefore.enabled
      ? await weaviateStore.healthCheck()
      : true;
    const statusAfter = weaviateStore.getStatus();
    const status = !statusAfter.enabled
      ? "disabled"
      : weaviateHealthy
        ? "healthy"
        : statusAfter.required
          ? "unhealthy"
          : "degraded";

    res.status(status === "unhealthy" ? 503 : 200).json({
      status,
      weaviate: !statusAfter.enabled
        ? "disabled"
        : weaviateHealthy
          ? "connected"
          : "disconnected",
      required: statusAfter.required,
      details: statusAfter,
      gemini:
        process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY
          ? "configured"
          : "missing",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

router.get("/health", memoryHealthHandler);

/**
 * POST /api/memory/context
 * الحصول على سياق للوكيل (النقطة الرئيسية)
 */
router.post("/context", async (req, res): Promise<void> => {
  try {
    const parsed = contextQueryBodySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Missing required fields: query, agentId",
      });
      return;
    }

    const queryData = parsed.data;
    const query: ContextQuery = {
      query: queryData.query,
      agentId: queryData.agentId,
      ...definedProps({
        conversationId: queryData.conversationId,
        filePath: queryData.filePath,
        contentType: queryData.contentType,
        profile: queryData.profile,
        topK: queryData.topK,
        recencyBias: queryData.recencyBias,
      }),
    };
    const context = await contextBuilder.buildContext(query);

    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    logger.error("Error building context", { error });
    res.status(500).json({
      error: "Failed to build context",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/memory/search
 * بحث دلالي مباشر
 */
router.post("/search", async (req, res): Promise<void> => {
  try {
    const validation = memorySearchBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: "Query is required" });
      return;
    }
    const { query, collection, topK = 10 } = validation.data;

    const results = await contextBuilder.quickSearch(query, collection, topK);

    res.json({
      success: true,
      count: results.length,
      results: results.map((result) => ({
        content:
          result.content.substring(0, 500) +
          (result.content.length > 500 ? "..." : ""),
        source: result.source,
        type: result.type,
        relevance: result.relevance,
        metadata: result.metadata,
      })),
    });
  } catch (error) {
    logger.error("Search error", { error });
    res.status(500).json({
      error: "Search failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/memory/index
 * فهرسة المستودع أو ملفات محددة
 */
router.post("/index", async (req, res): Promise<void> => {
  try {
    const validation = memoryIndexBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Invalid indexing request",
      });
      return;
    }
    const {
      repoPath = process.cwd(),
      specificFiles,
      reset = false,
      dimensionality = 1536,
    } = validation.data;

    if (![768, 1536, 3072].includes(dimensionality)) {
      res.status(400).json({
        error: "Invalid dimensionality. Must be 768, 1536, or 3072",
      });
      return;
    }

    if (reset) {
      logger.info("Resetting collections");
      await weaviateStore.deleteCollection("CodeChunks");
      await weaviateStore.deleteCollection("Documentation");
      await weaviateStore.deleteCollection("Decisions");
      await weaviateStore.deleteCollection("Architecture");
      await weaviateStore.deleteCollection("AdHocChunks");
    }

    await Promise.all([
      weaviateStore.ensureCollection("CodeChunks", CodeChunksSchema),
      weaviateStore.ensureCollection("Documentation", DocumentationSchema),
      weaviateStore.ensureCollection("Decisions", DecisionsSchema),
      weaviateStore.ensureCollection("Architecture", ArchitectureSchema),
      weaviateStore.ensureCollection("AdHocChunks", AdHocChunksSchema),
    ]);

    const stats = await weaviateIndexingService.indexRepository({
      repoPath,
      maxFiles: 5000,
      ...definedProps({ specificFiles }),
    });

    res.json({
      success: true,
      message: `Indexed ${stats.chunksIndexed} chunks from ${stats.filesProcessed} files`,
      filesCount: stats.filesProcessed,
      chunksIndexed: stats.chunksIndexed,
      collections: stats.collections,
      dimensionality,
    });
  } catch (error) {
    logger.error("Indexing error", { error });
    res.status(500).json({
      error: "Indexing failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/memory/stats
 * إحصائيات النظام
 */
router.get("/stats", async (_req, res) => {
  try {
    const collections = [
      "CodeChunks",
      "Documentation",
      "Decisions",
      "Architecture",
      "AdHocChunks",
    ];
    const stats: Record<string, number> = {};

    for (const collection of collections) {
      try {
        const count = await weaviateStore.getCollectionCount(collection);
        stats[collection] = count;
      } catch {
        stats[collection] = 0;
      }
    }

    res.json({
      collections: stats,
      totalDocuments: Object.values(stats).reduce((a, b) => a + b, 0),
      storage: {
        weaviate: process.env.WEAVIATE_URL ?? "http://localhost:8080",
      },
    });
  } catch (error) {
    logger.error("Stats error", { error });
    res.status(500).json({ error: "Failed to get stats" });
  }
});

/**
 * POST /api/memory/remember
 * تخزين معلومة جديدة (decision, note, etc.)
 */
router.post("/remember", async (req, res): Promise<void> => {
  try {
    const validation = memoryRememberBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: "Type and content are required" });
      return;
    }
    const { type, content, metadata = {}, tags = [] } = validation.data;

    const result = await weaviateIndexingService.storeMemoryEntry({
      type,
      content,
      metadata,
      tags,
    });

    res.json({
      success: true,
      message: `Stored ${type} successfully`,
      id: result.id,
      collection: result.collection,
    });
  } catch (error) {
    logger.error("Remember error", { error });
    res.status(500).json({
      error: "Failed to store memory",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/memory/mrl/recommend
 * توصية بُعد MRL
 */
router.get("/mrl/recommend", (req, res) => {
  const {
    documentCount,
    queryFrequency,
    precisionRequirement,
    storageBudgetMB,
  } = req.query;

  const recommendation = mrlOptimizer.suggestDimension({
    expectedDocumentCount: parseInt(documentCount as string) || 1000,
    queryFrequency: (queryFrequency as "high" | "medium" | "low") || "medium",
    precisionRequirement:
      (precisionRequirement as "critical" | "standard" | "flexible") ||
      "standard",
    ...definedProps({
      storageBudgetMB: storageBudgetMB
        ? parseInt(storageBudgetMB as string)
        : undefined,
    }),
  });

  const savings = mrlOptimizer.calculateStorageSavings(
    3072,
    recommendation,
    parseInt(documentCount as string) || 1000,
  );

  res.json({
    recommendedDimension: recommendation,
    alternatives: {
      precision: 3072,
      balanced: 1536,
      storage: 768,
    },
    storageComparison: {
      dimension3072: mrlOptimizer.calculateStorageSavings(
        3072,
        3072,
        parseInt(documentCount as string) || 1000,
      ),
      recommended: savings,
    },
  });
});

export default router;
