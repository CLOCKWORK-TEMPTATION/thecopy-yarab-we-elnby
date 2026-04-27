import { db } from '@/db';
import { breakappRunnerLocations } from '@/db/schema';

import { ensureDatabase } from './_helpers';

export async function insertRunnerLocation(input: {
  runnerId: string;
  sessionId?: string | null | undefined;
  lat: number;
  lng: number;
  accuracy?: number | null | undefined;
}): Promise<void> {
  ensureDatabase();
  await db.insert(breakappRunnerLocations).values({
    runnerId: input.runnerId,
    sessionId: input.sessionId ?? null,
    lat: input.lat,
    lng: input.lng,
    accuracy: input.accuracy ?? null,
  });
}
