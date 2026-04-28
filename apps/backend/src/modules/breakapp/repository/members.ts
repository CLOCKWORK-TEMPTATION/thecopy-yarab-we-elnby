import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { breakappProjectMembers } from "@/db/schema";

import { ensureDatabase } from "./_helpers";

import type { BreakappRole } from "../service.types";

export async function addProjectMember(input: {
  projectId: string;
  userId: string;
  role: BreakappRole;
}): Promise<void> {
  ensureDatabase();
  await db
    .insert(breakappProjectMembers)
    .values({
      projectId: input.projectId,
      userId: input.userId,
      role: input.role,
    })
    .onConflictDoNothing();
}

export async function listUsers(): Promise<
  { userId: string; projectId: string; role: BreakappRole; joinedAt: Date }[]
> {
  ensureDatabase();
  const rows = await db
    .select({
      userId: breakappProjectMembers.userId,
      projectId: breakappProjectMembers.projectId,
      role: breakappProjectMembers.role,
      joinedAt: breakappProjectMembers.joinedAt,
    })
    .from(breakappProjectMembers)
    .orderBy(desc(breakappProjectMembers.joinedAt));
  return rows.map((row) => ({
    userId: row.userId,
    projectId: row.projectId,
    role: row.role,
    joinedAt: row.joinedAt,
  }));
}

export async function getUserRoleInProject(
  projectId: string,
  userId: string,
): Promise<BreakappRole | null> {
  ensureDatabase();
  const rows = await db
    .select({ role: breakappProjectMembers.role })
    .from(breakappProjectMembers)
    .where(
      and(
        eq(breakappProjectMembers.projectId, projectId),
        eq(breakappProjectMembers.userId, userId),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? row.role : null;
}
