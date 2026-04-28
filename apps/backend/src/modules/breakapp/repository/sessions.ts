import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { breakappSessions } from '@/db/schema';

import { ensureDatabase, toSessionView } from './_helpers';

import type { BreakappSessionView } from '../service.types';

export async function createSession(input: {
  projectId: string;
  directorUserId: string;
  lat: number;
  lng: number;
}): Promise<BreakappSessionView> {
  ensureDatabase();
  const [row] = await db
    .insert(breakappSessions)
    .values({
      projectId: input.projectId,
      directorUserId: input.directorUserId,
      lat: input.lat,
      lng: input.lng,
    })
    .returning();
  if (!row) throw new Error('تعذر إنشاء الجلسة');
  return toSessionView(row);
}

export async function getSession(
  sessionId: string
): Promise<BreakappSessionView | null> {
  ensureDatabase();
  const rows = await db
    .select()
    .from(breakappSessions)
    .where(eq(breakappSessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  return row ? toSessionView(row) : null;
}
