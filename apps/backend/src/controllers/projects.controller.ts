import { Response } from 'express';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { AnalysisService } from '@/services/analysis.service';
import { eq, desc, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { AuthRequest } from '@/middleware/auth.middleware';
import { getParamAsString } from '@/middleware/auth.middleware';

const createProjectSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  scriptContent: z.string().optional(),
});

const updateProjectSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').optional(),
  scriptContent: z.string().optional(),
});

/**
 * متحكم المشاريع
 * 
 * @description
 * يدير عمليات CRUD للمشاريع ويتحقق من ملكية المستخدم لكل عملية
 */
export class ProjectsController {
  /**
   * جلب جميع مشاريع المستخدم
   * 
   * @description
   * يُرجع قائمة المشاريع مُرتبة حسب تاريخ آخر تحديث
   */
  async getProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res["status"](401).json({
          success: false,
          error: 'غير مصرح',
        });
        return;
      }

      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, req.user.id))
        .orderBy(desc(projects.updatedAt));

      res.json({
        success: true,
        data: userProjects,
      });
    } catch (error) {
      logger.error('Get projects error:', error);
      res["status"](500).json({
        success: false,
        error: 'حدث خطأ أثناء جلب المشاريع',
      });
    }
  }

  /**
   * جلب مشروع محدد بالمعرّف
   * 
   * @description
   * يتحقق من ملكية المستخدم للمشروع قبل إرجاعه
   */
  async getProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res["status"](401).json({
          success: false,
          error: 'غير مصرح',
        });
        return;
      }

      const id = getParamAsString(req.params["id"]);

      if (!id) {
        res["status"](400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
        });
        return;
      }

      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, req.user.id)));

      if (!project) {
        res["status"](404).json({
          success: false,
          error: 'المشروع غير موجود',
        });
        return;
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      logger.error('Get project error:', error);
      res["status"](500).json({
        success: false,
        error: 'حدث خطأ أثناء جلب المشروع',
      });
    }
  }

  /**
   * إنشاء مشروع جديد
   * 
   * @description
   * يتحقق من صلاحية البيانات ويربط المشروع بالمستخدم الحالي
   */
  async createProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res["status"](401).json({
          success: false,
          error: 'غير مصرح',
        });
        return;
      }

      const validatedData = createProjectSchema.parse(req.body);

      const [newProject] = await db
        .insert(projects)
        .values({
          title: validatedData["title"],
          scriptContent: validatedData.scriptContent,
          userId: req.user.id,
        })
        .returning();

      if (!newProject) {
        res["status"](500).json({
          success: false,
          error: 'فشل إنشاء المشروع',
        });
        return;
      }

      res["status"](201).json({
        success: true,
        message: 'تم إنشاء المشروع بنجاح',
        data: newProject,
      });

      logger.info('Project created successfully', { projectId: newProject.id, userId: req.user.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res["status"](400).json({
          success: false,
          error: 'بيانات غير صالحة',
          details: error.issues,
        });
        return;
      }

      logger.error('Create project error:', error);
      res["status"](500).json({
        success: false,
        error: 'حدث خطأ أثناء إنشاء المشروع',
      });
    }
  }

  /**
   * تحديث مشروع موجود
   * 
   * @description
   * يتحقق من وجود المشروع وملكية المستخدم قبل التحديث
   */
  /**
   * Perform the actual project update in the database
   */
  private async performProjectUpdate(
    id: string,
    validatedData: z.infer<typeof updateProjectSchema>
  ) {
    const [updatedProject] = await db
      .update(projects)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    return updatedProject;
  }

  async updateProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res["status"](401).json({ success: false, error: 'غير مصرح' });
        return;
      }

      const id = getParamAsString(req.params["id"]);
      const validatedData = updateProjectSchema.parse(req.body);

      if (!id) {
        res["status"](400).json({ success: false, error: 'معرف المشروع مطلوب' });
        return;
      }

      const [existingProject] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, req.user.id)));

      if (!existingProject) {
        res["status"](404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      const updatedProject = await this.performProjectUpdate(id, validatedData);

      res.json({ success: true, message: 'تم تحديث المشروع بنجاح', data: updatedProject });
      logger.info('Project updated successfully', { projectId: id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res["status"](400).json({ success: false, error: 'بيانات غير صالحة', details: error.issues });
        return;
      }

      logger.error('Update project error:', error);
      res["status"](500).json({ success: false, error: 'حدث خطأ أثناء تحديث المشروع' });
    }
  }

  /**
   * حذف مشروع
   * 
   * @description
   * يتحقق من وجود المشروع وملكية المستخدم قبل الحذف
   */
  async deleteProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res["status"](401).json({
          success: false,
          error: 'غير مصرح',
        });
        return;
      }

      const id = getParamAsString(req.params["id"]);

      if (!id) {
        res["status"](400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
        });
        return;
      }

      const [existingProject] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, req.user.id)));

      if (!existingProject) {
        res["status"](404).json({
          success: false,
          error: 'المشروع غير موجود',
        });
        return;
      }

      await db.delete(projects).where(eq(projects.id, id));

      res.json({
        success: true,
        message: 'تم حذف المشروع بنجاح',
      });

      logger.info('Project deleted successfully', { projectId: id });
    } catch (error) {
      logger.error('Delete project error:', error);
      res["status"](500).json({
        success: false,
        error: 'حدث خطأ أثناء حذف المشروع',
      });
    }
  }

  /**
   * تحليل نص السيناريو
   * 
   * @description
   * يستخدم خدمة التحليل AI لاستخراج المشاهد والشخصيات
   */
  /**
   * Run the AI analysis pipeline on script content
   */
  private async runScriptAnalysis(project: { title: string; scriptContent: string }) {
    const analysisService = new AnalysisService();
    return analysisService.runFullPipeline({
      projectName: project["title"],
      fullText: project.scriptContent,
      language: 'ar',
      context: {},
      flags: {
        runStations: true,
        fastMode: false,
        skipValidation: false,
        verboseLogging: false,
      },
      agents: { temperature: 0.2 },
    });
  }

  async analyzeScript(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res["status"](401).json({ success: false, error: 'غير مصرح' });
        return;
      }

      const id = getParamAsString(req.params["id"]);

      if (!id) {
        res["status"](400).json({ success: false, error: 'معرف المشروع مطلوب' });
        return;
      }

      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, req.user.id)));

      if (!project) {
        res["status"](404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      if (!project.scriptContent) {
        res["status"](400).json({ success: false, error: 'لا يوجد نص سيناريو للتحليل' });
        return;
      }

      const analysisResult = await this.runScriptAnalysis(project as { title: string; scriptContent: string });

      res.json({
        success: true,
        message: 'تم تحليل السيناريو بنجاح',
        data: { analysis: analysisResult, projectId: id },
      });
      logger.info('Script analysis requested', { projectId: id });
    } catch (error) {
      logger.error('Analyze script error:', error);
      res["status"](500).json({ success: false, error: 'حدث خطأ أثناء تحليل السيناريو' });
    }
  }
}

export const projectsController = new ProjectsController();
