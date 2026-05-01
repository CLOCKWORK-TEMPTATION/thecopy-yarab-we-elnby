import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  clearAppPersistenceRecord,
  readAppPersistenceRecord,
  saveAppPersistenceRecord,
} from "@/services/app-persistence.service";

interface AppStateEnvelope {
  version: 1;
  app: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

const writeQueues = new Map<string, Promise<void>>();

function resolveStoreRoot(): string {
  return (
    process.env["APP_STATE_STORE_DIR"] ??
    path.join(process.cwd(), ".data", "app-state")
  );
}

function resolveStorePath(appId: string): string {
  return path.join(resolveStoreRoot(), `${appId}.json`);
}

function createEmptyEnvelope(appId: string): AppStateEnvelope {
  return {
    version: 1,
    app: appId,
    updatedAt: new Date().toISOString(),
    data: {},
  };
}

function sanitizePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

async function ensureStoreFile(appId: string): Promise<string> {
  const filePath = resolveStorePath(appId);
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(
      filePath,
      JSON.stringify(createEmptyEnvelope(appId), null, 2),
      "utf8",
    );
  }

  return filePath;
}

async function writeEnvelope(
  appId: string,
  payload: Record<string, unknown>,
): Promise<AppStateEnvelope> {
  const filePath = await ensureStoreFile(appId);
  const envelope: AppStateEnvelope = {
    version: 1,
    app: appId,
    updatedAt: new Date().toISOString(),
    data: sanitizePayload(payload),
  };

  await writeFile(filePath, JSON.stringify(envelope, null, 2), "utf8");
  return envelope;
}

async function enqueueWrite<T>(
  appId: string,
  work: () => Promise<T>,
): Promise<T> {
  const key = resolveStorePath(appId);
  const previous = writeQueues.get(key) ?? Promise.resolve();
  let result!: T;

  const next = previous.then(async () => {
    result = await work();
  });

  writeQueues.set(
    key,
    next.catch(() => {
      // Preserve queue progression even if one write fails.
    }),
  );

  await next;
  return result;
}

export async function readAppState(appId: string): Promise<AppStateEnvelope> {
  try {
    const stored = await readAppPersistenceRecord(appId);
    return stored ?? createEmptyEnvelope(appId);
  } catch {
    const filePath = await ensureStoreFile(appId);
    const raw = await readFile(filePath, "utf8");

    try {
      const parsed = JSON.parse(raw) as Partial<AppStateEnvelope>;
      if (
        parsed.version === 1 &&
        parsed.app === appId &&
        parsed.data &&
        typeof parsed.data === "object" &&
        !Array.isArray(parsed.data) &&
        typeof parsed.updatedAt === "string"
      ) {
        return parsed as AppStateEnvelope;
      }
    } catch {
      // Reset the malformed file below.
    }

    return enqueueWrite(appId, () => writeEnvelope(appId, {}));
  }
}

export async function saveAppState(
  appId: string,
  payload: Record<string, unknown>,
): Promise<AppStateEnvelope> {
  try {
    return await saveAppPersistenceRecord(appId, payload);
  } catch {
    return enqueueWrite(appId, () => writeEnvelope(appId, payload));
  }
}

export async function clearAppState(appId: string): Promise<AppStateEnvelope> {
  try {
    return await clearAppPersistenceRecord(appId);
  } catch {
    return enqueueWrite(appId, () => writeEnvelope(appId, {}));
  }
}
