import { eq } from 'drizzle-orm';
import { Response } from 'express';
import { z } from 'zod';

import { db } from '@/db';
import { shots, scenes } from '@/db/schema';
import { logger } from '@/lib/logger';
import { getParamAsString } from '@/middleware/auth.middleware';
import { GeminiService } from '@/services/gemini.service';

import {
  requireAuth,
  requireParam,
  verifyShotOwnership,
  verifySceneOwnership,
} from './shots.helpers';

import type { AuthRequest } from '@/middleware/auth.middleware';


const createShotSchema = z.object({
  sceneId: z.string().min(1, 'معرف المشهد مطلوب'),
  shotNumber: z.number().int().positive('رقم اللقطة يجب أن يكون موجباً'),
  shotType: z.string().min(1, 'نوع اللقطة مطلوب'),
  cameraAngle: z.string().min(1, 'زاوية الكاميرا مطلوبة'),
  cameraMovement: z.string().min(1, 'حركة الكاميرا مطلوبة'),
  lighting: z.string().min(1, 'الإضاءة مطلوبة'),
  aiSuggestion: z.string().optional(),
});

const updateShotSchema = z.object({
  shotNumber: z.number().int().positive().optional(),
  shotType: z.string().min(1).optional(),
  cameraAngle: z.string().min(1).optional(),
  cameraMovement: z.string().min(1).optional(),
  lighting: z.string().min(1).optional(),
  aiSuggestion: z.string().optional(),
});

const shotSuggestionSchema = z.object({
  sceneDescription: z.string().min(1, 'وصف المشهد مطلوب'),
  shotType: z.string().min(1, 'نوع اللقطة مطلوب'),
}).passthrough();

function handleZodError(error: unknown, res: Response): boolean {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: 'بيانات غير صالحة',
      details: error.issues,
    });
    return true;
  }
  return false;
}

export class ShotsController {
  async getShots(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const sceneId = getParamAsString(req.params["sceneId"]);
      if (!requireParam(res, sceneId, 'معرف المشهد مطلوب')) return;

      const verifyResult = await verifySceneOwnership(sceneId, req.user!.id);
      if (!verifyResult) {
        res.status(404).json({ success: false, error: 'المشهد غير موجود أو غير مصرح للوصول له' });
        return;
      }

      const sceneShots = await db
        .select()
        .from(shots)
        .where(eq(shots.sceneId, sceneId))
        .orderBy(shots.shotNumber);

      res.json({ success: true, data: sceneShots });
    } catch (error) {
      logger.error('Get shots error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب اللقطات' });
    }
  }

  async getShot(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const id = getParamAsString(req.params["id"]);
      if (!requireParam(res, id, 'معرف اللقطة مطلوب')) return;

      const result = await verifyShotOwnership(id, req.user!.id);
      if (!result) {
        res.status(404).json({ success: false, error: 'اللقطة غير موجودة أو غير مصرح للوصول لها' });
        return;
      }

      const [shot] = await db.select().from(shots).where(eq(shots.id, id)).limit(1);
      res.json({ success: true, data: shot });
    } catch (error) {
      logger.error('Get shot error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب اللقطة' });
    }
  }

  async createShot(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const validatedData = createShotSchema.parse(req.body);
      const result = await verifySceneOwnership(validatedData.sceneId, req.user!.id);
      if (!result) {
        res.status(404).json({ success: false, error: 'المشهد غير موجود أو غير مصرح لإنشاء لقطة فيه' });
        return;
      }

      const [newShot] = await db.insert(shots).values(validatedData).returning();
      if (!newShot) {
        res.status(500).json({ success: false, error: 'فشل إنشاء اللقطة' });
        return;
      }

      await db.update(scenes).set({ shotCount: result.shotCount + 1 }).where(eq(scenes.id, validatedData.sceneId));
      res.status(201).json({ success: true, message: 'تم إنشاء اللقطة بنجاح', data: newShot });
      logger.info('Shot created successfully', { shotId: newShot.id, sceneId: validatedData.sceneId });
    } catch (error) {
      if (handleZodError(error, res)) return;
      logger.error('Create shot error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء إنشاء اللقطة' });
    }
  }

  async updateShot(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const id = getParamAsString(req.params["id"]);
      if (!requireParam(res, id, 'معرف اللقطة مطلوب')) return;

      const validatedData = updateShotSchema.parse(req.body);
      const result = await verifyShotOwnership(id, req.user!.id);
      if (!result) {
        res.status(404).json({ success: false, error: 'اللقطة غير موجودة أو غير مصرح لتعديلها' });
        return;
      }

      const [updatedShot] = await db.update(shots).set(validatedData).where(eq(shots.id, id)).returning();
      res.json({ success: true, message: 'تم تحديث اللقطة بنجاح', data: updatedShot });
      logger.info('Shot updated successfully', { shotId: id });
    } catch (error) {
      if (handleZodError(error, res)) return;
      logger.error('Update shot error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء تحديث اللقطة' });
    }
  }

  async deleteShot(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const id = getParamAsString(req.params["id"]);
      if (!requireParam(res, id, 'معرف اللقطة مطلوب')) return;

      const result = await verifyShotOwnership(id, req.user!.id);
      if (!result) {
        res.status(404).json({ success: false, error: 'اللقطة غير موجودة أو غير مصرح لحذفها' });
        return;
      }

      await db.delete(shots).where(eq(shots.id, id));
      await db.update(scenes).set({ shotCount: Math.max(0, result.shotCount - 1) }).where(eq(scenes.id, result.sceneId));
      res.json({ success: true, message: 'تم حذف اللقطة بنجاح' });
      logger.info('Shot deleted successfully', { shotId: id });
    } catch (error) {
      logger.error('Delete shot error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء حذف اللقطة' });
    }
  }

  async generateShotSuggestion(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const validation = shotSuggestionSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'وصف المشهد ونوع اللقطة مطلوبان' });
        return;
      }
      const { sceneDescription, shotType } = validation.data;

      const geminiService = new GeminiService();
      const suggestion = await geminiService.getShotSuggestion(sceneDescription, shotType);
      res.json({ success: true, message: 'تم توليد اقتراحات اللقطة بنجاح', data: { suggestion, sceneDescription, shotType } });
      logger.info('Shot suggestion generated successfully', { userId: req.user!.id });
    } catch (error) {
      logger.error('Generate shot suggestion error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء توليد اقتراحات اللقطة' });
    }
  }
}

export const shotsController = new ShotsController();
