import { db } from '../src/db';
import { scenes, projects } from '../src/db/schema';
import { breakdownService } from '../src/services/breakdown/service';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function runBenchmark() {
  console.log('Setting up benchmark...');
  const projectId = randomUUID();

  // Insert a mock project
  await db.insert(projects).values({
    id: projectId,
    title: 'Bench Project',
    userId: 'user_123',
    scriptContent: 'some content'
  });

  // Generate 200 parsed scenes
  const parsedScenes = Array.from({ length: 200 }, (_, i) => ({
    header: `Scene ${i}`,
    content: `Description ${i}`,
    headerData: {
      sceneNumber: i + 1,
      location: `Location ${i}`,
      timeOfDay: 'DAY',
      rawHeader: 'raw',
      sceneType: 'EXT',
      pageCount: 1,
      storyDay: '1'
    },
    warnings: []
  }));

  console.log('Running initial sync (all inserts)...');
  const startInsert = performance.now();
  // @ts-ignore
  await breakdownService.syncScenes(projectId, parsedScenes);
  const endInsert = performance.now();
  console.log(`Insert time: ${endInsert - startInsert}ms`);

  // Verify inserted
  const inserted = await db.select().from(scenes).where(eq(scenes.projectId, projectId));
  console.log(`Inserted ${inserted.length} scenes.`);

  // Mutate parsed scenes to test updates
  const updatedParsedScenes = parsedScenes.map(s => ({
    ...s,
    header: s.header + ' updated'
  }));

  console.log('Running second sync (all updates)...');
  const startUpdate = performance.now();
  // @ts-ignore
  await breakdownService.syncScenes(projectId, updatedParsedScenes);
  const endUpdate = performance.now();
  console.log(`Update time: ${endUpdate - startUpdate}ms`);

  // Cleanup
  await db.delete(scenes).where(eq(scenes.projectId, projectId));
  await db.delete(projects).where(eq(projects.id, projectId));

  console.log('Done.');
  process.exit(0);
}

runBenchmark().catch(console.error);
