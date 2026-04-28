import { eq } from "drizzle-orm";

import { db } from "@/db";
import { breakappRefreshTokens } from "@/db/schema";

import { ensureDatabase } from "./_helpers";

export async function insertRefreshToken(input: {
  userId: string;
  projectId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  ensureDatabase();
  await db.insert(breakappRefreshTokens).values({
    userId: input.userId,
    projectId: input.projectId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
  });
}

export async function findRefreshToken(tokenHash: string): Promise<{
  id: string;
  userId: string;
  projectId: string;
  expiresAt: Date;
  revokedAt: Date | null;
} | null> {
  ensureDatabase();
  const rows = await db
    .select({
      id: breakappRefreshTokens.id,
      userId: breakappRefreshTokens.userId,
      projectId: breakappRefreshTokens.projectId,
      expiresAt: breakappRefreshTokens.expiresAt,
      revokedAt: breakappRefreshTokens.revokedAt,
    })
    .from(breakappRefreshTokens)
    .where(eq(breakappRefreshTokens.tokenHash, tokenHash))
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  ensureDatabase();
  await db
    .update(breakappRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(breakappRefreshTokens.tokenHash, tokenHash));
}
