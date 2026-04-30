import { z } from "zod";

import { logger } from "@/lib/logger";
import { breakdownService } from "@/services/breakdown/service";

import type { AuthRequest } from "@/middleware/auth.middleware";
import type { Request, Response } from "express";

const bootstrapSchema = z.object({
  title: z.string().optional(),
  scriptContent: z.string().min(1, "نص السيناريو مطلوب"),
});

const parseSchema = z.object({
  scriptContent: z.string().optional(),
  title: z.string().optional(),
});

const chatSchema = z.object({
  message: z.string().min(1, "رسالة المحادثة مطلوبة"),
  context: z.record(z.unknown()).optional(),
});

function getParam(req: Request, key: string): string {
  const value = req.params[key];
  return typeof value === "string" ? value : "";
}

export class BreakdownController {
  private requireUserId(req: AuthRequest, res: Response): string | null {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: "غير مصرح",
      });
      return null;
    }

    return req.user.id;
  }

  health(_req: AuthRequest, res: Response): void {
    res.json({
      success: true,
      data: {
        service: "breakdown",
        status: "ok",
        timestamp: new Date().toISOString(),
      },
    });
  }

  async bootstrapProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) {
        return;
      }

      const body = bootstrapSchema.parse(req.body);
      const result = await breakdownService.createProjectAndParse(
        body.scriptContent,
        body.title,
        userId,
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "bootstrapProject");
    }
  }

  async parseProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) {
        return;
      }

      const projectId = getParam(req, "projectId");
      const body = parseSchema.parse(req.body ?? {});
      const parsed = await breakdownService.parseProject(
        projectId,
        userId,
        body.scriptContent,
        body.title,
      );

      res.json({
        success: true,
        data: parsed,
      });
    } catch (error) {
      this.handleError(res, error, "parseProject");
    }
  }

  async analyzeProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) {
        return;
      }

      const projectId = getParam(req, "projectId");
      const report = await breakdownService.analyzeProject(projectId, userId);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      this.handleError(res, error, "analyzeProject");
    }
  }

  async getProjectReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) {
        return;
      }

      const projectId = getParam(req, "projectId");
      const report = await breakdownService.getProjectReport(projectId, userId);

      if (!report) {
        res.status(404).json({
          success: false,
          error: "لم يتم العثور على تقرير بريك دون للمشروع",
        });
        return;
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      this.handleError(res, error, "getProjectReport");
    }
  }

  async getProjectSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) {
        return;
      }

      const projectId = getParam(req, "projectId");
      const schedule = await breakdownService.getProjectSchedule(
        projectId,
        userId,
      );

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      this.handleError(res, error, "getProjectSchedule");
    }
  }

  async getSceneBreakdown(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) {
        return;
      }

      const sceneId = getParam(req, "sceneId");
      const scene = await breakdownService.getSceneBreakdown(sceneId, userId);

      if (!scene) {
        res.status(404).json({
          success: false,
          error: "تفكيك المشهد غير موجود",
        });
        return;
      }

      res.json({
        success: true,
        data: scene,
      });
    } catch (error) {
      this.handleError(res, error, "getSceneBreakdown");
    }
  }

  async reanalyzeScene(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) {
        return;
      }

      const sceneId = getParam(req, "sceneId");
      const scene = await breakdownService.reanalyzeScene(sceneId, userId);

      res.json({
        success: true,
        data: scene,
      });
    } catch (error) {
      this.handleError(res, error, "reanalyzeScene");
    }
  }

  async exportReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) {
        return;
      }

      const reportId = getParam(req, "reportId");
      const format =
        req.query["format"] === "csv" || req.query["format"] === "json"
          ? req.query["format"]
          : "json";
      const result = await breakdownService.exportReport(
        reportId,
        userId,
        format,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "exportReport");
    }
  }

  async chat(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) {
        return;
      }

      const body = chatSchema.parse(req.body);
      const result = await breakdownService.chat(body.message, body.context);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "chat");
    }
  }

  private handleError(res: Response, error: unknown, context: string): void {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "بيانات الطلب غير صالحة",
        details: error.issues,
      });
      return;
    }

    if (error instanceof Error) {
      const message = error.message;

      if (message.includes("غير موجود")) {
        res.status(404).json({
          success: false,
          error: message,
        });
        return;
      }

      if (
        message.includes("مطلوب") ||
        message.includes("لا يوجد") ||
        message.includes("تعذر")
      ) {
        res.status(400).json({
          success: false,
          error: message,
        });
        return;
      }
    }

    logger.error(`BreakdownController.${context}`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    });
  }
}

export const breakdownController = new BreakdownController();

// ============================================================
// Session-style aliases + 9-category categorize endpoint
// feat/brainstorm-and-breakdown-integration
// ============================================================

const screenplayUploadSchema = z.object({
  title: z.string().optional(),
  scriptContent: z.string().min(1, "نص السيناريو مطلوب"),
});

export class BreakdownSessionsController {
  private requireUserId(req: AuthRequest, res: Response): string | null {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: "غير مصرح" });
      return null;
    }
    return req.user.id;
  }

  async createScreenplay(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = this.requireUserId(req, res);
      if (!userId) return;

      const body = screenplayUploadSchema.parse(req.body);
      const result = await breakdownService.createProjectAndParse(
        body.scriptContent,
        body.title,
        userId,
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      logger.error("BreakdownSessions.createScreenplay", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      });
    }
  }

  async createSession(req: AuthRequest, res: Response): Promise<void> {
    const parsed = z
      .object({ projectId: z.string().min(1) })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "projectId مطلوب" });
      return;
    }
    req.params = { ...req.params, projectId: parsed.data.projectId };
    return breakdownController.analyzeProject(req, res);
  }

  async getSession(req: AuthRequest, res: Response): Promise<void> {
    const id = getParam(req, "id");
    req.params = { ...req.params, projectId: id };
    return breakdownController.getProjectReport(req, res);
  }

  categorizeScene(req: AuthRequest, res: Response): void {
    const sceneId = getParam(req, "sceneId");
    req.params = { ...req.params, sceneId };
    void breakdownController.getSceneBreakdown(req, res);
  }

  async getReport(req: AuthRequest, res: Response): Promise<void> {
    const id = getParam(req, "id");
    const type = getParam(req, "type") || "full";

    req.params = { ...req.params, projectId: id };

    const SCHEDULE_TYPES = ["schedule", "budget"];

    if (SCHEDULE_TYPES.includes(type)) {
      return breakdownController.getProjectSchedule(req, res);
    }

    return breakdownController.getProjectReport(req, res);
  }
}

export const breakdownSessionsController = new BreakdownSessionsController();
