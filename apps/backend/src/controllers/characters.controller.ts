import { Response } from 'express';
import { db } from '@/db';
import { characters, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { AuthRequest } from '@/middleware/auth.middleware';
import { getParamAsString } from '@/middleware/auth.middleware';

const createCharacterSchema = z.object({
  projectId: z.string().min(1, 'معرف المشروع مطلوب'),
  name: z.string().min(1, 'اسم الشخصية مطلوب'),
  appearances: z.number().int().nonnegative().default(0),
  consistencyStatus: z.string().default('good'),
  lastSeen: z.string().optional(),
  notes: z.string().optional(),
});

const updateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  appearances: z.number().int().nonnegative().optional(),
  consistencyStatus: z.string().optional(),
  lastSeen: z.string().optional(),
  notes: z.string().optional(),
});

function requireAuth(req: AuthRequest, res: Response): boolean {
  if (!req.user) {
    res["status"](401).json({ success: false, error: 'غير مصرح' });
    return false;
  }
  return true;
}

function requireParam(res: Response, value: string | undefined, errorMsg: string): value is string {
  if (!value) {
    res["status"](400).json({ success: false, error: errorMsg });
    return false;
  }
  return true;
}

async function verifyProjectOwnership(projectId: string, userId: string) {
  const [project] = await selectRows<typeof projects.$inferSelect>(
    projects,
    and(eq(projects.id, projectId), eq(projects.userId, userId))
  );
  return project;
}

async function findCharacterById(id: string) {
  const [character] = await selectRows<typeof characters.$inferSelect>(
    characters,
    eq(characters.id, id)
  );
  return character;
}

function getRows<T>(value: unknown): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

function hasMethod<T extends string>(
  value: unknown,
  method: T
): value is Record<T, (...args: unknown[]) => unknown> {
  const candidate = value as Record<string, unknown> | null;
  return (
    !!candidate &&
    typeof candidate === 'object' &&
    method in candidate &&
    typeof candidate[method] === 'function'
  );
}

async function resolveWhereRows<T>(query: unknown, condition: unknown): Promise<T[]> {
  const directRows = getRows<T>(query);
  if (directRows) {
    return directRows;
  }

  if (!hasMethod(query, 'where')) {
    return [];
  }

  const result = await Promise.resolve(query.where(condition) as unknown);
  return getRows<T>(result) ?? [];
}

async function selectRows<T>(table: unknown, condition: unknown): Promise<T[]> {
  const selection = await Promise.resolve(db.select() as unknown);

  const directRows = getRows<T>(selection);
  if (directRows) {
    return directRows;
  }

  if (!hasMethod(selection, 'from')) {
    return [];
  }

  return resolveWhereRows<T>(selection.from(table), condition);
}

export class CharactersController {
  /**
   * جلب جميع شخصيات مشروع معين
   *
   * @description
   * يتحقق من ملكية المستخدم للمشروع قبل إرجاع قائمة الشخصيات
   */
  async getCharacters(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res["status"](401).json({
          success: false,
          error: 'غير مصرح',
        });
        return;
      }

      const projectId = getParamAsString(req.params["projectId"]);

      if (!projectId) {
        res["status"](400).json({
          success: false,
          error: 'معرف المشروع مطلوب',
        });
        return;
      }

      const [project] = await selectRows<typeof projects.$inferSelect>(
        projects,
        and(eq(projects.id, projectId), eq(projects.userId, req.user.id))
      );

      if (!project) {
        res["status"](404).json({
          success: false,
          error: 'المشروع غير موجود',
        });
        return;
      }

      const projectCharacters = await selectRows<typeof characters.$inferSelect>(
        characters,
        eq(characters.projectId, projectId)
      );

      res.json({
        success: true,
        data: projectCharacters,
      });
    } catch (error) {
      logger.error('Get characters error:', error);
      res["status"](500).json({
        success: false,
        error: 'حدث خطأ أثناء جلب الشخصيات',
      });
    }
  }

  /**
   * جلب شخصية محددة بالمعرّف
   * 
   * @description
   * يتحقق من ملكية المستخدم للمشروع المرتبط بالشخصية
   */
  async getCharacter(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const id = getParamAsString(req.params["id"]);
      if (!requireParam(res, id, 'معرف الشخصية مطلوب')) return;

      const character = await findCharacterById(id);
      if (!character || !character.projectId) {
        res["status"](404).json({ success: false, error: 'الشخصية غير موجودة' });
        return;
      }

      const project = await verifyProjectOwnership(character.projectId, req.user!.id);
      if (!project) {
        res["status"](403).json({ success: false, error: 'غير مصرح للوصول لهذه الشخصية' });
        return;
      }

      res.json({ success: true, data: character });
    } catch (error) {
      logger.error('Get character error:', error);
      res["status"](500).json({ success: false, error: 'حدث خطأ أثناء جلب الشخصية' });
    }
  }

  /**
   * إنشاء شخصية جديدة
   * 
   * @description
   * يتحقق من صلاحية البيانات المُدخلة وملكية المستخدم للمشروع
   */
  async createCharacter(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const validatedData = createCharacterSchema.parse(req.body);
      const project = await verifyProjectOwnership(validatedData.projectId, req.user!.id);
      if (!project) {
        res["status"](404).json({ success: false, error: 'المشروع غير موجود' });
        return;
      }

      const [newCharacter] = await db.insert(characters).values(validatedData).returning();
      if (!newCharacter) {
        res["status"](500).json({ success: false, error: 'فشل إنشاء الشخصية' });
        return;
      }

      res["status"](201).json({ success: true, message: 'تم إنشاء الشخصية بنجاح', data: newCharacter });
      logger.info('Character created successfully', { characterId: newCharacter.id, projectId: validatedData.projectId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res["status"](400).json({ success: false, error: 'بيانات غير صالحة', details: error.issues });
        return;
      }
      logger.error('Create character error:', error);
      res["status"](500).json({ success: false, error: 'حدث خطأ أثناء إنشاء الشخصية' });
    }
  }

  /**
   * تحديث شخصية موجودة
   * 
   * @description
   * يتحقق من وجود الشخصية وملكية المستخدم للمشروع قبل التحديث
   */
  async updateCharacter(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const id = getParamAsString(req.params["id"]);
      if (!requireParam(res, id, 'معرف الشخصية مطلوب')) return;

      const validatedData = updateCharacterSchema.parse(req.body);
      const existingCharacter = await findCharacterById(id);
      if (!existingCharacter || !existingCharacter.projectId) {
        res["status"](404).json({ success: false, error: 'الشخصية غير موجودة' });
        return;
      }

      const project = await verifyProjectOwnership(existingCharacter.projectId, req.user!.id);
      if (!project) {
        res["status"](403).json({ success: false, error: 'غير مصرح لتعديل هذه الشخصية' });
        return;
      }

      const [updatedCharacter] = await db.update(characters).set(validatedData).where(eq(characters.id, id)).returning();
      res.json({ success: true, message: 'تم تحديث الشخصية بنجاح', data: updatedCharacter });
      logger.info('Character updated successfully', { characterId: id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res["status"](400).json({ success: false, error: 'بيانات غير صالحة', details: error.issues });
        return;
      }
      logger.error('Update character error:', error);
      res["status"](500).json({ success: false, error: 'حدث خطأ أثناء تحديث الشخصية' });
    }
  }

  /**
   * حذف شخصية
   * 
   * @description
   * يتحقق من وجود الشخصية وملكية المستخدم للمشروع قبل الحذف
   */
  async deleteCharacter(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!requireAuth(req, res)) return;

      const id = getParamAsString(req.params["id"]);
      if (!requireParam(res, id, 'معرف الشخصية مطلوب')) return;

      const existingCharacter = await findCharacterById(id);
      if (!existingCharacter || !existingCharacter.projectId) {
        res["status"](404).json({ success: false, error: 'الشخصية غير موجودة' });
        return;
      }

      const project = await verifyProjectOwnership(existingCharacter.projectId, req.user!.id);
      if (!project) {
        res["status"](403).json({ success: false, error: 'غير مصرح لحذف هذه الشخصية' });
        return;
      }

      await db.delete(characters).where(eq(characters.id, id));
      res.json({ success: true, message: 'تم حذف الشخصية بنجاح' });
      logger.info('Character deleted successfully', { characterId: id });
    } catch (error) {
      logger.error('Delete character error:', error);
      res["status"](500).json({ success: false, error: 'حدث خطأ أثناء حذف الشخصية' });
    }
  }
}

export const charactersController = new CharactersController();
