/**
 * @module controllers/appState.controller
 * @description وحدة تحكم لإدارة حالة التطبيقات (App State)
 *
 * السبب: الفرونت إند (stations-pipeline.tsx) يستدعي
 * loadRemoteAppState و persistRemoteAppState لحفظ واستعادة
 * حالة التحليل عبر الجلسات. هذا الـ Controller يوفر
 * المسارات المطلوبة: GET / PUT / DELETE على /api/app-state/:appId
 *
 * التخزين: ملف JSON محلي تحت `.data/app-state` أو APP_STATE_STORE_DIR
 * لضمان بقاء الحالة عبر إعادة التشغيل وعدم تضاربها مع تخزين الويب المحلي.
 */

import { Request, Response } from "express";
import { z } from "zod";

import { logger } from "@/lib/logger";
import {
  clearAppState,
  readAppState,
  saveAppState,
} from "@/services/app-state.service";

/** معرّفات التطبيقات المسموح بها */
const VALID_APP_IDS = new Set([
  "BREAKAPP",
  "BUDGET",
  "actorai-arabic",
  "actorai-arabic-self-tape",
  "analysis",
  "art-director",
  "arabic-creative-writing-studio",
  "arabic-prompt-engineering-studio",
  "brain-storm-ai",
  "breakdown",
  "cinematography-studio",
  "development",
  "directors-studio",
  "editor",
  "styleIST",
]);

const appStateBodySchema = z
  .object({
    data: z.record(z.string(), z.unknown()),
  })
  .passthrough();

/**
 * التحقق من صحة معرّف التطبيق
 */
function isValidAppId(appId: string): boolean {
  return VALID_APP_IDS.has(appId);
}

function getAppIdParam(req: Request): string | null {
  return typeof req.params["appId"] === "string" ? req.params["appId"] : null;
}

export class AppStateController {
  /**
   * GET /api/app-state/:appId
   * استرجاع حالة التطبيق المحفوظة
   */
  async getState(req: Request, res: Response): Promise<void> {
    try {
      const appId = getAppIdParam(req);

      if (!appId || !isValidAppId(appId)) {
        res.status(400).json({
          success: false,
          error: `معرّف التطبيق غير صالح: ${appId}`,
          code: "INVALID_APP_ID",
        });
        return;
      }

      const stored = await readAppState(appId);

      if (Object.keys(stored.data).length === 0) {
        // لا توجد حالة محفوظة - إرجاع استجابة فارغة ناجحة
        res.json({
          success: true,
          data: null,
          updatedAt: null,
        });
        return;
      }

      res.json({
        success: true,
        data: stored.data,
        updatedAt: stored.updatedAt,
      });

      logger.debug("تم استرجاع حالة التطبيق", { appId });
    } catch (error) {
      logger.error("فشل في استرجاع حالة التطبيق:", error);
      res.status(500).json({
        success: false,
        error: "فشل في استرجاع حالة التطبيق",
        code: "STATE_FETCH_FAILED",
      });
    }
  }

  /**
   * PUT /api/app-state/:appId
   * حفظ أو تحديث حالة التطبيق
   */
  async setState(req: Request, res: Response): Promise<void> {
    try {
      const appId = getAppIdParam(req);

      if (!appId || !isValidAppId(appId)) {
        res.status(400).json({
          success: false,
          error: `معرّف التطبيق غير صالح: ${appId}`,
          code: "INVALID_APP_ID",
        });
        return;
      }

      const validation = appStateBodySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: "البيانات مطلوبة ويجب أن تكون كائناً",
          code: "INVALID_DATA",
        });
        return;
      }
      const { data } = validation.data;

      const newState = await saveAppState(appId, data);

      res.json({
        success: true,
        data: newState.data,
        updatedAt: newState.updatedAt,
      });

      logger.debug("تم حفظ حالة التطبيق", {
        appId,
        updatedAt: newState.updatedAt,
      });
    } catch (error) {
      logger.error("فشل في حفظ حالة التطبيق:", error);
      res.status(500).json({
        success: false,
        error: "فشل في حفظ حالة التطبيق",
        code: "STATE_SAVE_FAILED",
      });
    }
  }

  /**
   * DELETE /api/app-state/:appId
   * حذف حالة التطبيق المحفوظة
   */
  async clearState(req: Request, res: Response): Promise<void> {
    try {
      const appId = getAppIdParam(req);

      if (!appId || !isValidAppId(appId)) {
        res.status(400).json({
          success: false,
          error: `معرّف التطبيق غير صالح: ${appId}`,
          code: "INVALID_APP_ID",
        });
        return;
      }

      const envelope = await clearAppState(appId);

      res.json({
        success: true,
        data: envelope.data,
        updatedAt: envelope.updatedAt,
      });

      logger.debug("تم مسح حالة التطبيق", { appId });
    } catch (error) {
      logger.error("فشل في مسح حالة التطبيق:", error);
      res.status(500).json({
        success: false,
        error: "فشل في مسح حالة التطبيق",
        code: "STATE_CLEAR_FAILED",
      });
    }
  }
}

export const appStateController = new AppStateController();
