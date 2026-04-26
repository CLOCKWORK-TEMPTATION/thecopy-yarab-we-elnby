import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

const StoredLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string(),
  type: z.string(),
  address: z.string(),
  features: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const StoredSetPieceSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string(),
  category: z.string(),
  condition: z.string(),
  reusabilityScore: z.number(),
  estimatedValue: z.number(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    depth: z.number(),
  }),
  createdAt: z.string(),
});

const StoredTimeEntrySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  taskName: z.string(),
  department: z.string(),
  assignee: z.string(),
  plannedHours: z.number(),
  actualHours: z.number(),
  status: z.string(),
  notes: z.string(),
  createdAt: z.string(),
});

const StoredDelaySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  reason: z.string(),
  reasonAr: z.string(),
  hoursLost: z.number(),
  category: z.string(),
  createdAt: z.string(),
});

const StoredBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleAr: z.string(),
  productionId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      titleAr: z.string(),
      type: z.string(),
      content: z.string(),
      contentAr: z.string(),
      images: z.array(z.string()),
      order: z.number(),
    })
  ),
  metadata: z.record(z.unknown()),
});

const StoredStyleGuideSchema = z.object({
  id: z.string(),
  productionId: z.string(),
  title: z.string(),
  titleAr: z.string(),
  colorPalettes: z.array(z.record(z.unknown())),
  typography: z.record(z.unknown()),
  visualReferences: z.array(z.record(z.unknown())),
  moodDescriptions: z.array(z.record(z.unknown())),
  createdAt: z.string(),
});

const StoredDecisionSchema = z.object({
  id: z.string(),
  productionId: z.string(),
  decision: z.string(),
  decisionAr: z.string(),
  rationale: z.string(),
  rationaleAr: z.string(),
  madeBy: z.string(),
  madeAt: z.string(),
  category: z.string(),
  status: z.string(),
  relatedDecisions: z.array(z.string()),
});

const RawEntitySchema = z.record(z.unknown());

const ArtDirectorStoreSchema = z.object({
  version: z.literal(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  locations: z.array(StoredLocationSchema),
  setPieces: z.array(StoredSetPieceSchema),
  timeEntries: z.array(StoredTimeEntrySchema),
  delays: z.array(StoredDelaySchema),
  productionBooks: z.array(StoredBookSchema),
  styleGuides: z.array(StoredStyleGuideSchema),
  decisions: z.array(StoredDecisionSchema),
  previzScenes: z.array(RawEntitySchema),
  virtualSets: z.array(RawEntitySchema),
  conceptProjects: z.array(RawEntitySchema),
  virtualProductions: z.array(RawEntitySchema),
  lastProductionId: z.string().nullable(),
  lastBookId: z.string().nullable(),
  lastStyleGuideId: z.string().nullable(),
});

export type StoredLocation = z.infer<typeof StoredLocationSchema>;
export type StoredSetPiece = z.infer<typeof StoredSetPieceSchema>;
export type StoredTimeEntry = z.infer<typeof StoredTimeEntrySchema>;
export type StoredDelay = z.infer<typeof StoredDelaySchema>;
export type StoredProductionBook = z.infer<typeof StoredBookSchema>;
export type StoredStyleGuide = z.infer<typeof StoredStyleGuideSchema>;
export type StoredDecision = z.infer<typeof StoredDecisionSchema>;
export type RawEntity = z.infer<typeof RawEntitySchema>;
export type ArtDirectorStore = z.infer<typeof ArtDirectorStoreSchema>;

let writeQueue = Promise.resolve();

export function createEmptyStore(): ArtDirectorStore {
  const now = new Date().toISOString();

  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    locations: [],
    setPieces: [],
    timeEntries: [],
    delays: [],
    productionBooks: [],
    styleGuides: [],
    decisions: [],
    previzScenes: [],
    virtualSets: [],
    conceptProjects: [],
    virtualProductions: [],
    lastProductionId: null,
    lastBookId: null,
    lastStyleGuideId: null,
  };
}

export function resolveStorePath(): string {
  return (
    process.env['ART_DIRECTOR_STORE_PATH'] ||
    path.join(process.cwd(), ".data", "art-director", "store.json")
  );
}

async function ensureStoreFile(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(
      filePath,
      JSON.stringify(createEmptyStore(), null, 2),
      "utf8"
    );
  }
}

async function readStoreFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await ensureStoreFile(filePath);
      return await readFile(filePath, "utf8");
    }

    throw error;
  }
}

async function writeStoreFile(filePath: string, content: string): Promise<void> {
  try {
    await writeFile(filePath, content, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await ensureStoreFile(filePath);
      await writeFile(filePath, content, "utf8");
      return;
    }

    throw error;
  }
}

export async function readStore(): Promise<ArtDirectorStore> {
  const filePath = resolveStorePath();
  await ensureStoreFile(filePath);

  const raw = await readStoreFile(filePath);
  const parsed = JSON.parse(raw) as unknown;
  const result = ArtDirectorStoreSchema.safeParse(parsed);

  if (!result.success) {
    const emptyStore = createEmptyStore();
    await writeStoreFile(filePath, JSON.stringify(emptyStore, null, 2));
    return emptyStore;
  }

  return result.data;
}

export async function saveStore(store: ArtDirectorStore): Promise<void> {
  const filePath = resolveStorePath();
  await ensureStoreFile(filePath);

  await writeStoreFile(
    filePath,
    JSON.stringify(
      {
        ...store,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

export async function updateStore<T>(
  updater: (store: ArtDirectorStore) => Promise<T> | T
): Promise<T> {
  let result!: T;

  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    result = await updater(store);
    await saveStore(store);
  });

  await writeQueue;
  return result;
}

export async function resetStoreForTests(): Promise<void> {
  await saveStore(createEmptyStore());
}
