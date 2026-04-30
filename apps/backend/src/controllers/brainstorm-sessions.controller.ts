import { z } from "zod";

import { logger } from "@/lib/logger";
import {
  brainstormSessionService,
  createBriefSchema,
} from "@/services/brainstorm/session.service";

import type { AuthRequest } from "@/middleware/auth.middleware";
import type { Response } from "express";

const startSessionSchema = z.object({
  briefId: z.string().uuid(),
});

function requireUserId(req: AuthRequest, res: Response): string | null {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: "غير مصرح" });
    return null;
  }
  return req.user.id;
}

function handleError(res: Response, error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : "خطأ غير متوقع";
  logger.error(`BrainstormSessions: ${context}`, { error });

  const status =
    message.includes("غير موجود") || message.includes("لا تملك")
      ? 404
      : message.includes("مرحلة")
        ? 409
        : 500;

  res.status(status).json({ success: false, error: message });
}

export class BrainstormSessionsController {
  async createBrief(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const input = createBriefSchema.parse(req.body);
      const brief = await brainstormSessionService.createBrief(input, userId);
      res.status(201).json({ success: true, data: brief });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "بيانات غير صالحة",
          details: error.flatten(),
        });
        return;
      }
      handleError(res, error, "createBrief");
    }
  }

  async listBriefs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const briefs = await brainstormSessionService.listBriefs(userId);
      res.json({ success: true, data: briefs });
    } catch (error) {
      handleError(res, error, "listBriefs");
    }
  }

  async startSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const { briefId } = startSessionSchema.parse(req.body);
      const result = await brainstormSessionService.startSession(
        briefId,
        userId,
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "معرف الـ brief غير صالح",
          details: error.flatten(),
        });
        return;
      }
      handleError(res, error, "startSession");
    }
  }

  async getSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const { id } = req.params as { id: string };
      const result = await brainstormSessionService.getSession(id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error, "getSession");
    }
  }

  async runDivergent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const { id } = req.params as { id: string };
      const result = await brainstormSessionService.runDivergent(id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error, "runDivergent");
    }
  }

  async runConvergent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const { id } = req.params as { id: string };
      const result = await brainstormSessionService.runConvergent(id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error, "runConvergent");
    }
  }

  async runCritique(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const { id } = req.params as { id: string };
      const result = await brainstormSessionService.runCritique(id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error, "runCritique");
    }
  }

  async runSynthesis(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const { id } = req.params as { id: string };
      const result = await brainstormSessionService.runSynthesis(id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error, "runSynthesis");
    }
  }

  async getConcepts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const { id } = req.params as { id: string };
      const result = await brainstormSessionService.getConcepts(id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error, "getConcepts");
    }
  }
}

export const brainstormSessionsController = new BrainstormSessionsController();
