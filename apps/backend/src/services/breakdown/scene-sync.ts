import { eq } from "drizzle-orm";

import { db } from "@/db";
import { scenes } from "@/db/schema";

import type { ParsedScene } from "./types";

type SceneInsert = typeof scenes.$inferInsert;
type SceneSelect = typeof scenes.$inferSelect;
type SceneUpdate = {
  id: string;
  values: Partial<SceneInsert>;
};

const CHUNK_SIZE = 50;

async function processSceneInserts(inserts: SceneInsert[]): Promise<void> {
  for (let index = 0; index < inserts.length; index += CHUNK_SIZE) {
    const chunk = inserts.slice(index, index + CHUNK_SIZE);
    if (chunk.length > 0) {
      await db.insert(scenes).values(chunk);
    }
  }
}

async function processSceneUpdates(updates: SceneUpdate[]): Promise<void> {
  for (let index = 0; index < updates.length; index += CHUNK_SIZE) {
    const chunk = updates.slice(index, index + CHUNK_SIZE);
    await Promise.all(
      chunk.map((update) =>
        db.update(scenes).set(update.values).where(eq(scenes.id, update.id)),
      ),
    );
  }
}

export async function getScenesByProject(
  projectId: string,
): Promise<SceneSelect[]> {
  return db.select().from(scenes).where(eq(scenes.projectId, projectId));
}

export async function syncProjectScenes(
  projectId: string,
  parsedScenes: ParsedScene[],
): Promise<void> {
  const existingScenes = await getScenesByProject(projectId);
  const existingByNumber = new Map(
    existingScenes.map((scene) => [scene.sceneNumber, scene]),
  );

  const inserts: SceneInsert[] = [];
  const updates: SceneUpdate[] = [];

  for (const parsedScene of parsedScenes) {
    const sceneNumber = parsedScene.headerData.sceneNumber;
    const existing = existingByNumber.get(sceneNumber);
    const values = {
      projectId,
      sceneNumber,
      title: parsedScene.header,
      location: parsedScene.headerData.location,
      timeOfDay: parsedScene.headerData.timeOfDay,
      characters: existing?.characters ?? [],
      description: parsedScene.content.slice(0, 4000),
      shotCount: existing?.shotCount ?? 0,
      status: existing?.status ?? "planned",
    };

    if (existing) {
      updates.push({ id: existing.id, values });
    } else {
      inserts.push(values);
    }
  }

  await processSceneInserts(inserts);
  await processSceneUpdates(updates);
}
