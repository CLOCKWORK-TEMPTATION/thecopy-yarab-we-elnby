import { eq, and, inArray } from "drizzle-orm";
import { Response } from "express";
import { z } from "zod";

import { db } from "@/db";
import { scenes, projects } from "@/db/schema";
import { logger } from "@/lib/logger";
import { getParamAsString } from "@/middleware/auth.middleware";

import type { AuthRequest } from "@/middleware/auth.middleware";

function requireAuth(req: AuthRequest, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ success: false, error: "غير مصرح" });
    return false;
  }
  return true;
}

function handleZodError(error: unknown, res: Response): boolean {
  if (error instanceof z.ZodError) {
    res
      .status(400)
      .json({
        success: false,
        error: "بيانات غير صالحة",
        details: error.issues,
      });
    return true;
  }
  return false;
}

async function verifyProjectOwnership(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return project ?? null;
}

const createSceneSchema = z.object({
  projectId: z.string().min(1, "معرف المشروع مطلوب"),
  sceneNumber: z.number().int().positive("رقم المشهد يجب أن يكون موجباً"),
  title: z.string().min(1, "عنوان المشهد مطلوب"),
  location: z.string().min(1, "الموقع مطلوب"),
  timeOfDay: z.string().min(1, "وقت اليوم مطلوب"),
  characters: z.array(z.string()).min(1, "يجب إضافة شخصية واحدة على الأقل"),
  description: z.string().optional(),
  shotCount: z.number().int().nonnegative().default(0),
  status: z.string().default("planned"),
});

const updateSceneSchema = z.object({
  sceneNumber: z.number().int().positive().optional(),
  title: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  timeOfDay: z.string().min(1).optional(),
  characters: z.array(z.string()).min(1).optional(),
  description: z.string().optional(),
  shotCount: z.number().int().nonnegative().optional(),
  status: z.string().optional(),
});

/**
 * متحكم المشاهد
 *
 * @description
 * يدير عمليات CRUD للمشاهد ويتحقق من ملكية المستخدم للمشروع المرتبط
 */
export class ScenesController {
  /**
   * جلب جميع مشاهد مشروع معين
   *
   * @description
   * يتحقق من ملكية المستخدم للمشروع ويُرجع المشاهد مُرتبة حسب رقم المشهد
   */
  async getScenes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "غير مصرح",
        });
        return;
      }

      const projectId = getParamAsString(req.params["projectId"]);

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "معرف المشروع مطلوب",
        });
        return;
      }

      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, projectId), eq(projects.userId, req.user.id)),
        );

      if (!project) {
        res.status(404).json({
          success: false,
          error: "المشروع غير موجود",
        });
        return;
      }

      const projectScenes = await db
        .select()
        .from(scenes)
        .where(eq(scenes.projectId, projectId))
        .orderBy(scenes.sceneNumber);

      res.json({
        success: true,
        data: projectScenes,
      });
    } catch (error) {
      logger.error("Get scenes error:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء جلب المشاهد",
      });
    }
  }

  /**
   * جلب مشهد محدد بالمعرّف
   *
   * @description
   * يستخدم JOIN مُحسّن للتحقق من الملكية وجلب المشهد في استعلام واحد
   */
  async getScene(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "غير مصرح",
        });
        return;
      }

      const id = getParamAsString(req.params["id"]);

      if (!id) {
        res.status(400).json({
          success: false,
          error: "معرف المشهد مطلوب",
        });
        return;
      }

      const [result] = await db
        .select({
          scene: scenes,
        })
        .from(scenes)
        .innerJoin(projects, eq(scenes.projectId, projects.id))
        .where(and(eq(scenes.id, id), eq(projects.userId, req.user.id)))
        .limit(1);

      if (!result) {
        res.status(404).json({
          success: false,
          error: "المشهد غير موجود أو غير مصرح للوصول له",
        });
        return;
      }

      res.json({
        success: true,
        data: result.scene,
      });
    } catch (error) {
      logger.error("Get scene error:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء جلب المشهد",
      });
    }
  }

  /**
   * إنشاء مشهد جديد
   *
   * @description
   * يتحقق من صلاحية البيانات وملكية المستخدم للمشروع
   */
  async createScene(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const validatedData = createSceneSchema.parse(req.body);
      const project = await verifyProjectOwnership(
        validatedData.projectId,
        req.user!.id,
      );
      if (!project) {
        res.status(404).json({ success: false, error: "المشروع غير موجود" });
        return;
      }

      const [newScene] = await db
        .insert(scenes)
        .values(validatedData)
        .returning();
      if (!newScene) {
        res.status(500).json({ success: false, error: "فشل إنشاء المشهد" });
        return;
      }

      res
        .status(201)
        .json({
          success: true,
          message: "تم إنشاء المشهد بنجاح",
          data: newScene,
        });
      logger.info("Scene created successfully", {
        sceneId: newScene.id,
        projectId: validatedData.projectId,
      });
    } catch (error) {
      if (handleZodError(error, res)) return;
      logger.error("Create scene error:", error);
      res
        .status(500)
        .json({ success: false, error: "حدث خطأ أثناء إنشاء المشهد" });
    }
  }

  /**
   * تحديث مشهد موجود
   *
   * @description
   * يستخدم JOIN مُحسّن للتحقق من الملكية والتحديث
   */
  async updateScene(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const id = getParamAsString(req.params["id"]);
      if (!id) {
        res.status(400).json({ success: false, error: "معرف المشهد مطلوب" });
        return;
      }

      const validatedData = updateSceneSchema.parse(req.body);
      const ownedProjectIds = db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, req.user!.id));
      const [updatedScene] = await db
        .update(scenes)
        .set(validatedData)
        .where(
          and(eq(scenes.id, id), inArray(scenes.projectId, ownedProjectIds)),
        )
        .returning();

      if (!updatedScene) {
        res
          .status(404)
          .json({
            success: false,
            error: "المشهد غير موجود أو غير مصرح لتعديله",
          });
        return;
      }

      res.json({
        success: true,
        message: "تم تحديث المشهد بنجاح",
        data: updatedScene,
      });
      logger.info("Scene updated successfully");
    } catch (error) {
      if (handleZodError(error, res)) return;
      logger.error("Update scene error:", error);
      res
        .status(500)
        .json({ success: false, error: "حدث خطأ أثناء تحديث المشهد" });
    }
  }

  /**
   * حذف مشهد
   *
   * @description
   * يستخدم JOIN مُحسّن للتحقق من الملكية قبل الحذف
   */
  async deleteScene(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "غير مصرح",
        });
        return;
      }

      const id = getParamAsString(req.params["id"]);

      if (!id) {
        res.status(400).json({
          success: false,
          error: "معرف المشهد مطلوب",
        });
        return;
      }

      const [result] = await db
        .select({
          sceneId: scenes.id,
        })
        .from(scenes)
        .innerJoin(projects, eq(scenes.projectId, projects.id))
        .where(and(eq(scenes.id, id), eq(projects.userId, req.user.id)))
        .limit(1);

      if (!result) {
        res.status(404).json({
          success: false,
          error: "المشهد غير موجود أو غير مصرح لحذفه",
        });
        return;
      }

      await db.delete(scenes).where(eq(scenes.id, id));

      res.json({
        success: true,
        message: "تم حذف المشهد بنجاح",
      });

      logger.info("Scene deleted successfully", { sceneId: id });
    } catch (error) {
      logger.error("Delete scene error:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء حذف المشهد",
      });
    }
  }
}

export const scenesController = new ScenesController();
