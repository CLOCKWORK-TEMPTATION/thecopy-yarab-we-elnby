import { db } from '@/db';
import { breakappInviteTokens } from '@/db/schema';

import { ensureDatabase } from './_helpers';

import type { BreakappRole } from '../service.types';

export async function createInviteToken(input: {
  projectId: string;
  role: BreakappRole;
  expiresAt: Date;
  createdBy: string;
  qrPayload: string;
}): Promise<{ id: string; qrPayload: string; expiresAt: Date }> {
  ensureDatabase();
  const [row] = await db
    .insert(breakappInviteTokens)
    .values({
      projectId: input.projectId,
      role: input.role,
      expiresAt: input.expiresAt,
      createdBy: input.createdBy,
      qrPayload: input.qrPayload,
    })
    .returning({
      id: breakappInviteTokens.id,
      qrPayload: breakappInviteTokens.qrPayload,
      expiresAt: breakappInviteTokens.expiresAt,
    });
  if (!row) {
    throw new Error('تعذر إنشاء رمز الدعوة');
  }
  return row;
}
