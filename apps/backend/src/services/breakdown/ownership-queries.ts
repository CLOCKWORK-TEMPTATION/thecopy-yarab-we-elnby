import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { breakdownReports, projects, scenes } from "@/db/schema";

export async function getOwnedProject(
  projectId: string,
  userId: string,
): Promise<typeof projects.$inferSelect | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  return project ?? null;
}

export async function getOwnedScene(
  sceneId: string,
  userId: string,
): Promise<{
  scene: typeof scenes.$inferSelect;
  project: typeof projects.$inferSelect;
} | null> {
  const [result] = await db
    .select({
      scene: scenes,
      project: projects,
    })
    .from(scenes)
    .innerJoin(projects, eq(projects.id, scenes.projectId))
    .where(and(eq(scenes.id, sceneId), eq(projects.userId, userId)))
    .limit(1);

  return result ?? null;
}

export async function getOwnedReport(
  reportId: string,
  userId: string,
): Promise<typeof breakdownReports.$inferSelect | null> {
  const [result] = await db
    .select({
      report: breakdownReports,
    })
    .from(breakdownReports)
    .innerJoin(projects, eq(projects.id, breakdownReports.projectId))
    .where(and(eq(breakdownReports.id, reportId), eq(projects.userId, userId)))
    .limit(1);

  return result?.report ?? null;
}
