import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { scenes } from '@/db/schema';
import { breakdownService } from '../service';

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
    const parsedScenes = Array.from({ length: numScenes }).map((_, i) => ({
      header: `Scene ${i}`,
      content: `Content ${i}`,
      headerData: {
        sceneNumber: i,
        location: 'Location',
        timeOfDay: 'DAY',
        rawHeader: '',
        sceneType: 'EXT',
        pageCount: 1,
        storyDay: '1'
      },
      warnings: []
    }));

    const startTime = performance.now();
    await (breakdownService as any).syncScenes('project-id', parsedScenes);
    const endTime = performance.now();

    console.log(`syncScenes took ${endTime - startTime}ms`);
  });
});
