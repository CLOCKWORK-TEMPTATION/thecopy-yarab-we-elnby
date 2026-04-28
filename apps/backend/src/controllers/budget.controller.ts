import { Request, Response } from "express";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { budgetService } from "@/services/budget.service";

const generateBudgetSchema = z.object({
  scenario: z.string().min(1, "Scenario is required"),
  title: z.string().optional(),
});

const analyzeBudgetSchema = z.object({
  scenario: z.string().min(1, "Scenario is required"),
});

const exportBudgetSchema = z.object({
  budget: z.any(),
});

function sanitizeAttachmentFilename(value: string | undefined): string {
  const sanitized = value
    ?.normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, "")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);

  return sanitized ?? "budget";
}

function encodeAttachmentFilename(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildAttachmentHeader(title: string | undefined): string {
  const fallbackFilename = `${sanitizeAttachmentFilename(title)}.xlsx`;
  const encodedFilename = `${encodeAttachmentFilename(title ?? "budget")}.xlsx`;

  return `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`;
}

export class BudgetController {
  async generate(req: Request, res: Response): Promise<void> {
    try {
      const validation = generateBudgetSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: "Invalid request payload",
          details: validation.error.flatten(),
        });
        return;
      }

      const runtimeResult = await budgetService.generateBudgetRuntime(
        validation.data.scenario,
        validation.data.title,
      );
      res.status(200).json({
        success: true,
        data: runtimeResult,
      });
    } catch (error) {
      logger.error("Failed to generate budget:", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate budget";
      res
        .status(
          message.includes("API_KEY") || message.includes("not configured")
            ? 503
            : 500,
        )
        .json({
          success: false,
          error: message,
        });
    }
  }

  async analyze(req: Request, res: Response): Promise<void> {
    try {
      const validation = analyzeBudgetSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: "Invalid request payload",
          details: validation.error.flatten(),
        });
        return;
      }

      const runtimeResult = await budgetService.analyzeBudgetRuntime(
        validation.data.scenario,
      );
      res.status(200).json({
        success: true,
        data: runtimeResult,
      });
    } catch (error) {
      logger.error("Failed to analyze budget scenario:", error);
      const message =
        error instanceof Error ? error.message : "Failed to analyze script";
      res
        .status(
          message.includes("API_KEY") || message.includes("not configured")
            ? 503
            : 500,
        )
        .json({
          success: false,
          error: message,
        });
    }
  }

  async export(req: Request, res: Response): Promise<void> {
    try {
      const validation = exportBudgetSchema.safeParse(req.body);
      if (
        !validation.success ||
        !budgetService.isValidBudget(validation.data.budget)
      ) {
        res.status(400).json({
          success: false,
          error: "A valid budget document is required.",
        });
        return;
      }

      const buffer = await budgetService.exportBudget(validation.data.budget);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        buildAttachmentHeader(validation.data.budget.metadata?.title),
      );
      res.status(200).send(buffer);
    } catch (error) {
      logger.error("Failed to export budget:", error);
      const message =
        error instanceof Error ? error.message : "Failed to export budget";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
}

export const budgetController = new BudgetController();
