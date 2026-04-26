import { Request, Response } from 'express';
import { z } from 'zod';
import { cineAIService } from '@/services/cineai.service';
import { definedProps } from '@/utils/defined-props';
import { logger } from '@/lib/logger';

const validateShotSchema = z.object({
  imageBase64: z.string().optional(),
  mimeType: z.string().optional(),
  mood: z.string().optional(),
  analysisType: z.string().optional(),
});

const colorGradingSchema = z.object({
  sceneType: z.string().min(1, 'Scene type is required'),
  mood: z.string().optional(),
  temperature: z.number().optional(),
});

interface UploadedFile {
  buffer?: Buffer;
  mimetype?: string;
}

interface MultipartRequest extends Request {
  file?: UploadedFile;
}

function readMultipartImage(req: Request): { imageBase64?: string; mimeType?: string } {
  const file = (req as MultipartRequest).file;
  if (file?.buffer) {
    return {
      imageBase64: Buffer.from(file.buffer).toString('base64'),
      mimeType: file.mimetype || 'image/png',
    };
  }

  return {};
}

export class CineAIController {
  async validateShot(req: Request, res: Response): Promise<void> {
    try {
      const multipart = readMultipartImage(req);
      const payload = {
        ...req.body,
        ...multipart,
      };

      const validation = validateShotSchema.safeParse(payload);
      if (!validation.success) {
        res["status"](400).json({
          success: false,
          error: 'Invalid request payload',
          details: validation.error.flatten(),
        });
        return;
      }

      const result = await cineAIService.validateShot(
        definedProps({
          analysisType: validation.data.analysisType,
          mimeType: validation.data.mimeType,
          imageBase64: validation.data.imageBase64,
          mood: validation.data.mood,
        })
      );
      res["status"](200).json({
        success: true,
        validation: result,
        analyzedAt: new Date().toISOString(),
        source: 'backend',
      });
    } catch (error) {
      logger.error('Failed to validate shot:', error);
      const message = error instanceof Error ? error.message : 'Failed to validate shot';
      res["status"](message.includes('not configured') ? 503 : 502).json({
        success: false,
        error: message,
      });
    }
  }

  async colorGrading(req: Request, res: Response): Promise<void> {
    try {
      const validation = colorGradingSchema.safeParse(req.body);
      if (!validation.success) {
        res["status"](400).json({
          success: false,
          error: 'Invalid request payload',
          details: validation.error.flatten(),
        });
        return;
      }

      const result = await cineAIService.generateColorPalette(
        definedProps({
          sceneType: validation.data.sceneType,
          temperature: validation.data.temperature,
          mood: validation.data.mood,
        })
      );
      res["status"](200).json({
        success: true,
        ...result,
        sceneType: validation.data.sceneType,
        mood: validation.data.mood || 'neutral',
        temperature: validation.data.temperature || 5500,
        generatedAt: new Date().toISOString(),
        source: 'backend',
      });
    } catch (error) {
      logger.error('Failed to generate color grading palette:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to generate color palette';
      res["status"](message.includes('required') ? 400 : message.includes('not configured') ? 503 : 502).json({
        success: false,
        error: message,
      });
    }
  }
}

export const cineAIController = new CineAIController();
