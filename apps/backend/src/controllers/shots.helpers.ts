import { eq, and } from "drizzle-orm";
import { Response } from "express";

import { db } from "@/db";
import { shots, scenes, projects } from "@/db/schema";

import type { AuthRequest } from "@/middleware/auth.middleware";

export function requireAuth(req: AuthRequest, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "غير مصرح",
    });
    return false;
  }
  return true;
}

export function requireParam(
  res: Response,
  value: string | undefined,
  errorMsg: string,
): value is string {
  if (!value) {
    res.status(400).json({
      success: false,
      error: errorMsg,
    });
    return false;
  }
  return true;
}

export async function verifyShotOwnership(
  shotId: string,
  userId: string,
): Promise<{ shotId: string; sceneId: string; shotCount: number } | null> {
  const [result] = await db
    .select({
      shotId: shots.id,
      sceneId: shots.sceneId,
      shotCount: scenes.shotCount,
    })
    .from(shots)
    .innerJoin(scenes, eq(shots.sceneId, scenes.id))
    .innerJoin(projects, eq(scenes.projectId, projects.id))
    .where(and(eq(shots.id, shotId), eq(projects.userId, userId)))
    .limit(1);
  return result ?? null;
}

export async function verifySceneOwnership(
  sceneId: string,
  userId: string,
): Promise<{ sceneId: string; shotCount: number } | null> {
  const [result] = await db
    .select({
      sceneId: scenes.id,
      shotCount: scenes.shotCount,
    })
    .from(scenes)
    .innerJoin(projects, eq(scenes.projectId, projects.id))
    .where(and(eq(scenes.id, sceneId), eq(projects.userId, userId)))
    .limit(1);
  return result ?? null;
}
