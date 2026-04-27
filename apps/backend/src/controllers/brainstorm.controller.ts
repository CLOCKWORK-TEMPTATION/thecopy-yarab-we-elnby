import { Request, Response } from "express";
import { z } from "zod";

import { logger } from "@/lib/logger";
import {
  getBrainstormAgentById,
  getBrainstormAgents,
  getBrainstormPhases,
  getBrainstormStats,
} from "@/modules/brainstorm/catalog";
import { brainstormService } from "@/services/brainstorm.service";

const brainstormCatalogResponseSchema = z.object({
  agents: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      nameAr: z.string(),
      role: z.string(),
      description: z.string(),
      category: z.string(),
      icon: z.string(),
      capabilities: z.object({
        canAnalyze: z.boolean(),
        canGenerate: z.boolean(),
        canPredict: z.boolean(),
        hasMemory: z.boolean(),
        usesSelfReflection: z.boolean(),
        supportsRAG: z.boolean(),
      }),
      collaboratesWith: z.array(z.string()),
      enhances: z.array(z.string()),
      complexityScore: z.number(),
      phaseRelevance: z.array(z.number()),
    })
  ),
  phases: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      nameEn: z.string(),
      description: z.string(),
      primaryAction: z.enum(["analyze", "generate", "debate", "decide"]),
    })
  ),
  stats: z.object({
    total: z.number(),
    byCategory: z.record(z.number()),
    withRAG: z.number(),
    withSelfReflection: z.number(),
    withMemory: z.number(),
    averageComplexity: z.number(),
  }),
});

const brainstormRequestSchema = z.object({
  task: z.string().trim().min(1, "المهمة مطلوبة"),
  context: z.record(z.unknown()).default({}),
  agentIds: z.array(z.string().trim().min(1)).min(1, "يجب اختيار وكيل واحد على الأقل"),
});

type BrainstormRequestPayload = z.infer<typeof brainstormRequestSchema>;

function buildDebateContext(payload: BrainstormRequestPayload): Record<string, unknown> {
  const context = payload.context ?? {};

  return {
    ...context,
    originalText:
      typeof context["originalText"] === "string" && context["originalText"].trim().length > 0
        ? context["originalText"]
        : payload.task,
    brief:
      typeof context["brief"] === "string" && context["brief"].trim().length > 0
        ? context["brief"]
        : payload.task,
    sessionId:
      typeof context["sessionId"] === "string" && context["sessionId"].trim().length > 0
        ? context["sessionId"]
        : `session-${Date.now()}`,
  };
}

async function executeDebate(
  payload: BrainstormRequestPayload
): Promise<{
  result: Awaited<ReturnType<typeof brainstormService.conductDebate>>;
  meta: {
    selectedAgents: { id: string; nameAr: string }[];
  };
}> {
  const result = await brainstormService.conductDebate(
    payload.task,
    buildDebateContext(payload),
    payload.agentIds
  );

  return {
    result,
    meta: {
      selectedAgents: payload.agentIds.map((agentId) => ({
        id: agentId,
        nameAr: getBrainstormAgentById(agentId)?.nameAr ?? agentId,
      })),
    },
  };
}

export class BrainstormController {
  getCatalog(_req: Request, res: Response): void {
    try {
      const payload = {
        agents: getBrainstormAgents(),
        phases: getBrainstormPhases(),
        stats: getBrainstormStats(),
      };

      const parsed = brainstormCatalogResponseSchema.safeParse(payload);
      if (!parsed.success) {
        logger.error("Brainstorm catalog payload validation failed", {
          issues: parsed.error.issues,
        });
        res.status(500).json({
          success: false,
          error: "فشل في تجهيز كتالوج Brain Storm AI",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: parsed.data,
      });
    } catch (error) {
      logger.error("Failed to build brainstorm catalog", { error });
      res.status(500).json({
        success: false,
        error: "فشل في تحميل كتالوج Brain Storm AI",
      });
    }
  }

  async conduct(req: Request, res: Response): Promise<void> {
    try {
      const parsed = brainstormRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "حمولة الطلب غير صالحة",
          details: parsed.error.flatten(),
        });
        return;
      }

      const response = await executeDebate(parsed.data);
      res.status(200).json({
        success: true,
        result: response.result,
        meta: response.meta,
      });
    } catch (error) {
      logger.error("Failed to conduct brainstorm debate", { error });
      const message =
        error instanceof Error ? error.message : "Failed to conduct debate";
      res
        .status(
          message.includes("API_KEY") || message.includes("not configured") ? 503 : 500
        )
        .json({
          success: false,
          error: message,
        });
    }
  }

  async conductDebate(req: Request, res: Response): Promise<void> {
    return this.conduct(req, res);
  }
}

export const brainstormController = new BrainstormController();
