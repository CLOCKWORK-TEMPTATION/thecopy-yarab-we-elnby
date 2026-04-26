import { Request, Response } from 'express';
import { z } from 'zod';
import { styleistService } from '@/services/styleist.service';
import { definedProps } from '@/utils/defined-props';
import { logger } from '@/lib/logger';

const styleistSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  data: z.record(z.any()).optional(),
});

export class StyleistController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const validation = styleistSchema.safeParse(req.body);
      if (!validation.success) {
        res["status"](400).json({
          success: false,
          error: 'Invalid request payload',
          details: validation.error.flatten(),
        });
        return;
      }

      const data = await styleistService.execute(
        definedProps({
          action: validation.data.action,
          data: validation.data.data,
        })
      );
      res["status"](200).json(data);
    } catch (error) {
      logger.error('Failed to execute styleIST action:', error);
      const message = error instanceof Error ? error.message : 'Failed to execute styleIST action';
      res["status"](message.includes('required') ? 400 : message.includes('not configured') ? 503 : 500).json({
        error: message,
      });
    }
  }
}

export const styleistController = new StyleistController();
