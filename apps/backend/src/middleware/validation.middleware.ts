/**
 * Input Validation Middleware using Zod
 * 
 * Provides type-safe validation for API requests
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { logger } from '@/lib/logger';

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body as unknown);
    if (result.success) {
      const validatedBody: unknown = result.data;
      req.body = validatedBody;
      next();
      return;
    }

    logger.warn('Validation error:', { errors: result.error.issues, path: req.path });
    res.status(400).json({
      success: false,
      error: 'بيانات غير صالحة',
      details: result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  };
}

/**
 * Validate request query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (result.success) {
      req.query = result.data as Record<string, string | string[] | undefined>;
      next();
      return;
    }

    logger.warn('Query validation error:', { errors: result.error.issues, path: req.path });
    res.status(400).json({
      success: false,
      error: 'معاملات استعلام غير صالحة',
      details: result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  };
}

/**
 * Validate request params
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (result.success) {
      req.params = result.data as Record<string, string>;
      next();
      return;
    }

    logger.warn('Params validation error:', { errors: result.error.issues, path: req.path });
    res.status(400).json({
      success: false,
      error: 'معاملات المسار غير صالحة',
      details: result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  };
}

// Common validation schemas
export const commonSchemas = {
  // ID parameter
  idParam: z.object({
    id: z.string().uuid('معرف غير صالح'),
  }),

  // Pagination query
  paginationQuery: z.object({
    page: z.string().regex(/^\d+$/).optional().default('1').transform(Number),
    limit: z.string().regex(/^\d+$/).optional().default('10').transform(Number),
    sort: z.enum(['asc', 'desc']).optional(),
  }),

  // AI Analysis request
  analysisRequest: z.object({
    text: z.string().min(50, 'النص قصير جداً - يجب أن يكون 50 حرفاً على الأقل')
      .max(50000, 'النص طويل جداً - الحد الأقصى 50000 حرف'),
    options: z.object({
      depth: z.enum(['quick', 'standard', 'deep']).optional().default('standard'),
      language: z.enum(['ar', 'en']).optional().default('ar'),
    }).optional(),
  }),

  // Project creation
  createProject: z.object({
    title: z.string().min(1, 'العنوان مطلوب').max(200, 'العنوان طويل جداً'),
    scriptContent: z.string().optional(),
  }),

  // Scene creation
  createScene: z.object({
    projectId: z.string().uuid('معرف المشروع غير صالح'),
    sceneNumber: z.number().int().positive('رقم المشهد يجب أن يكون موجباً'),
    title: z.string().min(1, 'العنوان مطلوب'),
    location: z.string().min(1, 'الموقع مطلوب'),
    timeOfDay: z.string().min(1, 'وقت اليوم مطلوب'),
    characters: z.array(z.string()).min(1, 'يجب إضافة شخصية واحدة على الأقل'),
    description: z.string().optional(),
  }),

  // Character creation
  createCharacter: z.object({
    projectId: z.string().uuid('معرف المشروع غير صالح'),
    name: z.string().min(1, 'الاسم مطلوب').max(100, 'الاسم طويل جداً'),
    notes: z.string().optional(),
  }),

  // Shot creation
  createShot: z.object({
    sceneId: z.string().uuid('معرف المشهد غير صالح'),
    shotNumber: z.number().int().positive('رقم اللقطة يجب أن يكون موجباً'),
    shotType: z.string().min(1, 'نوع اللقطة مطلوب'),
    cameraAngle: z.string().min(1, 'زاوية الكاميرا مطلوبة'),
    cameraMovement: z.string().min(1, 'حركة الكاميرا مطلوبة'),
    lighting: z.string().min(1, 'الإضاءة مطلوبة'),
    aiSuggestion: z.string().optional(),
  }),
};

/**
 * Security validation middleware - detect potential attacks
 */
import { logSecurityEvent, SecurityEventType } from './security-logger.middleware';

// SECURITY: Detection patterns for potential attacks
// Using simpler patterns to avoid ReDoS and improve detection accuracy
// Fixed: Better HTML filtering regexp patterns that are safe and comprehensive
const suspiciousPatterns = [
  { regex: /(%27|'|--|%23|#)/i, type: SecurityEventType.SQL_INJECTION_ATTEMPT },
  // XSS detection: comprehensive script/tag detection using safe patterns
  // Detect opening script/iframe/object/embed tags
  { regex: /<\s*script/gi, type: SecurityEventType.XSS_ATTEMPT },
  { regex: /<\s*iframe/gi, type: SecurityEventType.XSS_ATTEMPT },
  { regex: /<\s*object/gi, type: SecurityEventType.XSS_ATTEMPT },
  { regex: /<\s*embed/gi, type: SecurityEventType.XSS_ATTEMPT },
  // Detect event handlers (safe pattern without nested quantifiers)
  { regex: /\bon(error|load|click|mouseover|mouseout|focus|blur|keyup|keydown|keypress|submit|change|input)\s*=/gi, type: SecurityEventType.XSS_ATTEMPT },
  // Detect javascript: and data: URIs
  { regex: /javascript\s*:/gi, type: SecurityEventType.XSS_ATTEMPT },
  { regex: /data\s*:\s*text\/html/gi, type: SecurityEventType.XSS_ATTEMPT },
  // Detect SVG with event handlers
  { regex: /<\s*svg[^>]*\s+on\w+\s*=/gi, type: SecurityEventType.XSS_ATTEMPT },
  // Path traversal detection
  { regex: /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\/etc\/passwd/gi, type: SecurityEventType.PATH_TRAVERSAL_ATTEMPT },
];

export function detectAttacks(req: Request, res: Response, next: NextFunction) {
  const allInputs = JSON.stringify(req.body) + JSON.stringify(req.query);

  for (const pattern of suspiciousPatterns) {
    if (pattern.regex.test(allInputs)) {
      // Log security event with full context
      logSecurityEvent(pattern.type, req, {
        input: allInputs.substring(0, 200),
        detectedPattern: pattern.regex.toString(),
      });

      logger.warn('🚨 Potential attack detected', {
        type: pattern.type,
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        input: allInputs.substring(0, 200),
      });

      res.status(400).json({
        success: false,
        error: 'طلب غير صالح',
      });
      return;
    }
  }

  next();
}

