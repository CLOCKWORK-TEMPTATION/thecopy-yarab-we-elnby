/**
 * Encrypted Documents Controller
 * Zero-Knowledge Document Management
 */

import type { Request, Response } from 'express';
import { db } from '../db';
import { encryptedDocuments } from '../db/zkSchema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { z } from 'zod';

function getRouteId(req: Request): string | null {
  const { id } = req.params;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

const BASE64_REGEX = /^[A-Za-z0-9+/=]+$/;

const encryptedDocumentBodySchema = z.object({
  ciphertext: z.string().min(1).regex(BASE64_REGEX, 'البيانات لا تبدو مشفرة'),
  iv: z.string().min(1),
  wrappedDEK: z.string().min(1),
  wrappedDEKiv: z.string().min(1),
  authTag: z.string().min(1),
  version: z.number(),
}).passthrough();

function requireUserId(req: Request, res: Response): string | null {
  const userId = req.user?.id;
  if (!userId) {
    res["status"](401).json({ success: false, error: 'غير مصرح. يرجى تسجيل الدخول.' });
    return null;
  }
  return userId;
}

function requireRouteId(req: Request, res: Response): string | null {
  const id = getRouteId(req);
  if (!id) {
    res["status"](400).json({ success: false, error: 'معرف المستند غير صالح' });
    return null;
  }
  return id;
}

/**
 * إنشاء مستند مشفر جديد
 * POST /api/docs
 */
export async function createEncryptedDocument(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const validation = encryptedDocumentBodySchema.safeParse(req.body);
    if (!validation.success) {
      res["status"](400).json({ success: false, error: validation.error.issues[0]?.message ?? 'بيانات المستند غير صالحة' });
      return;
    }

    const { ciphertext, iv, authTag, wrappedDEK, wrappedDEKiv, version } = validation.data;
    const [document] = await db
      .insert(encryptedDocuments)
      .values({ userId, ciphertext, iv, authTag, wrappedDEK, wrappedDEKiv, version, ciphertextSize: ciphertext.length })
      .returning();

    if (!document) {
      res["status"](500).json({ success: false, error: 'تعذر إنشاء المستند' });
      return;
    }

    res["status"](201).json({
      success: true,
      data: { id: document.id, version: document.version, ciphertextSize: document.ciphertextSize, createdAt: document.createdAt, lastModified: document.lastModified },
    });
  } catch (error) {
    logger.error('Error creating encrypted document:', error);
    res["status"](500).json({ success: false, error: 'خطأ في إنشاء المستند' });
  }
}

/**
 * جلب مستند مشفر
 * GET /api/docs/:id
 */
export async function getEncryptedDocument(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const id = requireRouteId(req, res);
    if (!id) return;

    const [document] = await db.select().from(encryptedDocuments)
      .where(and(eq(encryptedDocuments.id, id), eq(encryptedDocuments.userId, userId))).limit(1);

    if (!document) {
      res["status"](404).json({ success: false, error: 'المستند غير موجود' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: document.id, ciphertext: document.ciphertext, iv: document.iv,
        wrappedDEK: document.wrappedDEK, wrappedDEKiv: document.wrappedDEKiv,
        version: document.version, ciphertextSize: document.ciphertextSize,
        createdAt: document.createdAt, lastModified: document.lastModified,
      },
    });
  } catch (error) {
    logger.error('Error fetching encrypted document:', error);
    res["status"](500).json({ success: false, error: 'خطأ في جلب المستند' });
  }
}

/**
 * تحديث مستند مشفر
 * PUT /api/docs/:id
 */
export async function updateEncryptedDocument(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const id = requireRouteId(req, res);
    if (!id) return;

    const validation = encryptedDocumentBodySchema.safeParse(req.body);
    if (!validation.success) {
      res["status"](400).json({ success: false, error: validation.error.issues[0]?.message ?? 'بيانات المستند غير صالحة' });
      return;
    }

    const { ciphertext, iv, authTag, wrappedDEK, wrappedDEKiv, version } = validation.data;

    const [existingDoc] = await db.select().from(encryptedDocuments)
      .where(and(eq(encryptedDocuments.id, id), eq(encryptedDocuments.userId, userId))).limit(1);

    if (!existingDoc) {
      res["status"](404).json({ success: false, error: 'المستند غير موجود' });
      return;
    }

    const [updated] = await db.update(encryptedDocuments)
      .set({ ciphertext, iv, authTag, wrappedDEK, wrappedDEKiv, version, ciphertextSize: ciphertext.length, lastModified: new Date() })
      .where(and(eq(encryptedDocuments.id, id), eq(encryptedDocuments.userId, userId))).returning();

    if (!updated) {
      res["status"](500).json({ success: false, error: 'تعذر تحديث المستند' });
      return;
    }

    res.json({
      success: true,
      data: { id: updated.id, version: updated.version, ciphertextSize: updated.ciphertextSize, lastModified: updated.lastModified },
    });
  } catch (error) {
    logger.error('Error updating encrypted document:', error);
    res["status"](500).json({ success: false, error: 'خطأ في تحديث المستند' });
  }
}

/**
 * حذف مستند مشفر
 * DELETE /api/docs/:id
 */
export async function deleteEncryptedDocument(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const id = requireRouteId(req, res);
    if (!id) return;

    const [deleted] = await db.delete(encryptedDocuments)
      .where(and(eq(encryptedDocuments.id, id), eq(encryptedDocuments.userId, userId))).returning();

    if (!deleted) {
      res["status"](404).json({ success: false, error: 'المستند غير موجود' });
      return;
    }

    res.json({ success: true, data: { id: deleted.id } });
  } catch (error) {
    logger.error('Error deleting encrypted document:', error);
    res["status"](500).json({ success: false, error: 'خطأ في حذف المستند' });
  }
}

export async function listEncryptedDocuments(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const documents = await db
      .select({
        id: encryptedDocuments.id, version: encryptedDocuments.version,
        ciphertextSize: encryptedDocuments.ciphertextSize, createdAt: encryptedDocuments.createdAt,
        lastModified: encryptedDocuments.lastModified,
      })
      .from(encryptedDocuments)
      .where(eq(encryptedDocuments.userId, userId))
      .orderBy(desc(encryptedDocuments.lastModified));

    res.json({ success: true, data: documents });
  } catch (error) {
    logger.error('Error listing encrypted documents:', error);
    res["status"](500).json({ success: false, error: 'خطأ في جلب قائمة المستندات' });
  }
}
