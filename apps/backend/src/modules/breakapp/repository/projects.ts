import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { breakappProjects } from "@/db/schema";

import { ensureDatabase } from "./_helpers";

export async function createProject(input: {
  name: string;
  directorUserId: string;
}): Promise<{ id: string; name: string }> {
  ensureDatabase();
  const [row] = await db
    .insert(breakappProjects)
    .values({
      name: input.name,
      directorUserId: input.directorUserId,
    })
    .returning({ id: breakappProjects.id, name: breakappProjects.name });
  if (!row) {
    throw new Error("تعذر إنشاء المشروع");
  }
  return row;
}

export async function listProjects(): Promise<
  { id: string; name: string; directorUserId: string; createdAt: Date }[]
> {
  ensureDatabase();
  const rows = await db
    .select({
      id: breakappProjects.id,
      name: breakappProjects.name,
      directorUserId: breakappProjects.directorUserId,
      createdAt: breakappProjects.createdAt,
    })
    .from(breakappProjects)
    .where(isNull(breakappProjects.deletedAt))
    .orderBy(desc(breakappProjects.createdAt));
  return rows;
}

export async function projectExists(projectId: string): Promise<boolean> {
  ensureDatabase();
  const rows = await db
    .select({ id: breakappProjects.id })
    .from(breakappProjects)
    .where(
      and(
        eq(breakappProjects.id, projectId),
        isNull(breakappProjects.deletedAt),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
