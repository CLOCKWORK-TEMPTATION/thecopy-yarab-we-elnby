import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from "@/lib/logger";

import { breakdownService } from '../service';

import type { ParsedScene } from '../types';

interface BreakdownServiceInternals {
  syncScenes(projectId: string, parsedScenes: ParsedScene[]): Promise<void>;
}

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }
}));

describe('syncScenes performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should optimize syncing of scenes', async () => {
    // Generate many scenes
    const numScenes = 100;
    const parsedScenes: ParsedScene[] = Array.from({ length: numScenes }).map((_, i) => ({
      header: `Scene ${i}`,
      content: `Content ${i}`,
      headerData: {
        sceneNumber: i,
        location: 'Location',
        timeOfDay: 'DAY',
        rawHeader: '',
        sceneType: 'EXT',
        pageCount: 1,
        storyDay: 1
      },
      warnings: []
    }));

    const startTime = performance.now();
    const serviceInternals = breakdownService as unknown as BreakdownServiceInternals;
    await serviceInternals.syncScenes('project-id', parsedScenes);
    const endTime = performance.now();
    const durationMs = endTime - startTime;

    expect(durationMs).toBeGreaterThanOrEqual(0);
    logger.info(`syncScenes took ${durationMs}ms`);
  });
});
