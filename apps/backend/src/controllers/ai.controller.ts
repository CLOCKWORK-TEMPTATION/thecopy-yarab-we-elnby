import { Response } from "express";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { GeminiService } from "@/services/gemini.service";

import type { AuthRequest } from "@/middleware/auth.middleware";

const chatSchema = z.object({
  message: z.string().min(1, "الرسالة مطلوبة"),
  context: z.unknown().optional(),
});

const shotSuggestionSchema = z.object({
  sceneDescription: z.string().min(1, "وصف المشهد مطلوب"),
  shotType: z.string().min(1, "نوع اللقطة مطلوب"),
});

export class AIController {
  /**
   * Chat with AI
   * POST /api/ai/chat
   */
  async chat(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "غير مصرح",
        });
        return;
      }

      // Validate request body
      const validation = chatSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: "بيانات غير صحيحة",
          details: validation.error.issues,
        });
        return;
      }

      const { message, context } = validation.data;

      logger.info("AI chat request", {
        userId: req.user.id,
        messageLength: message.length,
        hasContext: !!context,
      });

      const geminiService = new GeminiService();
      const response = await geminiService.chatWithAI(message, context);

      res.json({
        success: true,
        data: {
          response,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("AI chat error:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي",
      });
    }
  }

  /**
   * Get shot suggestion
   * POST /api/ai/shot-suggestion
   */
  async getShotSuggestion(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "غير مصرح",
        });
        return;
      }

      // Validate request body
      const validation = shotSuggestionSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: "بيانات غير صحيحة",
          details: validation.error.issues,
        });
        return;
      }

      const { sceneDescription, shotType } = validation.data;

      logger.info("Shot suggestion request", {
        userId: req.user.id,
        shotType,
        sceneLength: sceneDescription.length,
      });

      const geminiService = new GeminiService();
      const suggestion = await geminiService.getShotSuggestion(
        sceneDescription,
        shotType,
      );

      res.json({
        success: true,
        data: suggestion,
      });
    } catch (error) {
      logger.error("Shot suggestion error:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء توليد اقتراحات اللقطة",
      });
    }
  }
}

export const aiController = new AIController();
