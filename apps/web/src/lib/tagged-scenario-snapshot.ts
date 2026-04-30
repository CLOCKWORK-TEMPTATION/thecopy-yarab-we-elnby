import {
  ELEMENT_TYPES,
  isElementType,
  type ClassificationMethod,
  type ElementType,
} from "@editor/extensions/classification-types";

import type { ClassifiedDraftWithId } from "@editor/extensions/paste-classifier-helpers";

export const TAGGED_SCENARIO_SNAPSHOT_SCHEMA_VERSION =
  "tagged-scenario-snapshot-v1" as const;

export const TAGGED_SCENARIO_SNAPSHOT_STORAGE_KEY =
  "the-copy.tagged-scenario-snapshots.v1" as const;

export type TaggedScenarioSnapshotSource =
  | "editor-approved"
  | "silent-editor-derived";

export type TaggedScenarioElementSource =
  | "editor-visible"
  | "editor-classifier";

export type EnsureTaggedScenarioSnapshotStatus = "cached" | "created";

type MaybePromise<T> = T | Promise<T>;
type JsonPrimitive = string | number | boolean | null;

export interface TaggedScenarioElementChild {
  readonly type: ElementType;
  readonly text: string;
  readonly normalizedText: string;
}

export interface TaggedScenarioElement {
  readonly elementId: string;
  readonly orderIndex: number;
  readonly type: ElementType;
  readonly text: string;
  readonly normalizedText: string;
  readonly confidence: number;
  readonly classificationMethod: ClassificationMethod;
  readonly source: TaggedScenarioElementSource;
  readonly children?: readonly TaggedScenarioElementChild[];
  readonly approvalState?: "approved" | "unapproved";
  readonly approvedVersionId?: string | null;
  readonly metadata?: Record<string, JsonPrimitive>;
}

export interface TaggedScenarioSnapshot {
  readonly schemaVersion: typeof TAGGED_SCENARIO_SNAPSHOT_SCHEMA_VERSION;
  readonly scenarioId: string;
  readonly title?: string | null;
  readonly source: TaggedScenarioSnapshotSource;
  readonly sourceText: string;
  readonly sourceHash: string;
  readonly createdAt: string;
  readonly approvedAt?: string | null;
  readonly approvedVersionId?: string | null;
  readonly elementTypes: readonly ElementType[];
  readonly elements: readonly TaggedScenarioElement[];
  readonly typeCounts: Readonly<Record<ElementType, number>>;
}

export interface TaggedScenarioSnapshotStore {
  read: (scenarioId: string) => MaybePromise<TaggedScenarioSnapshot | null>;
  write: (snapshot: TaggedScenarioSnapshot) => MaybePromise<void>;
}

export interface CreateTaggedScenarioSnapshotOptions {
  scenarioId: string;
  source: TaggedScenarioSnapshotSource;
  sourceText: string;
  elements: readonly TaggedScenarioElement[];
  title?: string | null;
  approvedAt?: string | null;
  approvedVersionId?: string | null;
  now?: () => string;
}

export interface CreateTaggedScenarioSnapshotFromDraftsOptions {
  scenarioId: string;
  source: TaggedScenarioSnapshotSource;
  sourceText: string;
  drafts: readonly ClassifiedDraftWithId[];
  title?: string | null;
  approvedAt?: string | null;
  approvedVersionId?: string | null;
  now?: () => string;
}

export interface EnsureTaggedScenarioSnapshotOptions {
  scenarioId: string;
  sourceText?: string | null;
  title?: string | null;
  forceRefresh?: boolean;
  store?: TaggedScenarioSnapshotStore;
  classifier?: (
    sourceText: string
  ) => MaybePromise<readonly ClassifiedDraftWithId[]>;
  loadScenarioText?: (scenarioId: string) => MaybePromise<string | null>;
  now?: () => string;
}

export interface EnsureTaggedScenarioSnapshotResult {
  status: EnsureTaggedScenarioSnapshotStatus;
  snapshot: TaggedScenarioSnapshot;
}

export interface TaggedScenarioProjectLike {
  id: string;
  title?: string | null;
  name?: string | null;
  scriptContent?: string | null;
}

const memorySnapshots = new Map<string, TaggedScenarioSnapshot>();

const nowIso = (): string => new Date().toISOString();

const normalizeText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

const normalizeLineText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const normalizeScenarioId = (scenarioId: string): string => {
  const normalized = scenarioId.trim();
  if (normalized.length === 0) {
    throw new Error("scenarioId is required for tagged scenario snapshots.");
  }
  return normalized;
};

const normalizeTitle = (title: string | null | undefined): string | null => {
  if (typeof title !== "string") return null;
  const normalized = title.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeOptionalText = (
  value: string | null | undefined
): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return undefined;
  return normalized;
};

const normalizeConfidence = (value: number): number =>
  Number.isFinite(value) ? value : 0;

export const computeTaggedScenarioSourceHash = (sourceText: string): string => {
  const text = normalizeText(sourceText);
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `fnv1a:${hash.toString(16).padStart(8, "0")}`;
};

const createEmptyTypeCounts = (): Record<ElementType, number> =>
  Object.fromEntries(ELEMENT_TYPES.map((type) => [type, 0])) as Record<
    ElementType,
    number
  >;

const countElementTypes = (
  elements: readonly TaggedScenarioElement[]
): Record<ElementType, number> => {
  const counts = createEmptyTypeCounts();
  for (const element of elements) {
    counts[element.type] = (counts[element.type] ?? 0) + 1;
  }
  return counts;
};

const toTopLineChildren = (
  draft: ClassifiedDraftWithId
): readonly TaggedScenarioElementChild[] | undefined => {
  if (draft.type !== "scene_header_top_line") {
    return undefined;
  }

  const children: TaggedScenarioElementChild[] = [];
  const header1 = normalizeOptionalText(draft.header1);
  const header2 = normalizeOptionalText(draft.header2);

  if (header1 !== undefined) {
    children.push({
      type: "scene_header_1",
      text: header1,
      normalizedText: normalizeLineText(header1),
    });
  }
  if (header2 !== undefined) {
    children.push({
      type: "scene_header_2",
      text: header2,
      normalizedText: normalizeLineText(header2),
    });
  }

  return children.length > 0 ? children : undefined;
};

const toSnapshotElement = (
  draft: ClassifiedDraftWithId,
  orderIndex: number
): TaggedScenarioElement => {
  const children = toTopLineChildren(draft);
  const topLineText = [draft.header1, draft.header2]
    .map(normalizeOptionalText)
    .filter((part): part is string => part !== undefined)
    .join(" - ");
  const text =
    draft.type === "scene_header_top_line" && draft.text.trim().length === 0
      ? topLineText
      : draft.text;
  const draftItemId = normalizeOptionalText(draft._itemId);

  return {
    elementId: draftItemId ?? `silent-element-${String(orderIndex)}`,
    orderIndex,
    type: draft.type,
    text,
    normalizedText: normalizeLineText(text),
    confidence: normalizeConfidence(draft.confidence),
    classificationMethod: draft.classificationMethod,
    source: "editor-classifier",
    ...(children !== undefined ? { children } : {}),
  };
};

const ensureValidElements = (
  elements: readonly TaggedScenarioElement[]
): readonly TaggedScenarioElement[] => {
  if (elements.length === 0) {
    throw new Error("Tagged scenario snapshot requires at least one element.");
  }

  for (const element of elements) {
    const elementType = String(element.type);
    if (!isElementType(elementType)) {
      throw new Error(
        `Unsupported tagged scenario element type: ${elementType}`
      );
    }
  }

  return elements;
};

const freezeSnapshot = (
  snapshot: TaggedScenarioSnapshot
): TaggedScenarioSnapshot => {
  for (const element of snapshot.elements) {
    if (element.children !== undefined) {
      for (const child of element.children) {
        Object.freeze(child);
      }
      Object.freeze(element.children);
    }
    Object.freeze(element);
  }
  Object.freeze(snapshot.elements);
  Object.freeze(snapshot.elementTypes);
  Object.freeze(snapshot.typeCounts);
  return Object.freeze(snapshot);
};

export const createTaggedScenarioSnapshot = (
  options: CreateTaggedScenarioSnapshotOptions
): TaggedScenarioSnapshot => {
  const scenarioId = normalizeScenarioId(options.scenarioId);
  const sourceText = normalizeText(options.sourceText);
  const elements = ensureValidElements(options.elements);
  const snapshot: TaggedScenarioSnapshot = {
    schemaVersion: TAGGED_SCENARIO_SNAPSHOT_SCHEMA_VERSION,
    scenarioId,
    title: normalizeTitle(options.title),
    source: options.source,
    sourceText,
    sourceHash: computeTaggedScenarioSourceHash(sourceText),
    createdAt: options.now?.() ?? nowIso(),
    approvedAt: options.approvedAt ?? null,
    approvedVersionId: options.approvedVersionId ?? null,
    elementTypes: ELEMENT_TYPES,
    elements,
    typeCounts: countElementTypes(elements),
  };

  return freezeSnapshot(snapshot);
};

export const createTaggedScenarioSnapshotFromDrafts = (
  options: CreateTaggedScenarioSnapshotFromDraftsOptions
): TaggedScenarioSnapshot => {
  const createOptions: CreateTaggedScenarioSnapshotOptions = {
    scenarioId: options.scenarioId,
    source: options.source,
    sourceText: options.sourceText,
    elements: options.drafts.map(toSnapshotElement),
  };

  if (options.title !== undefined) {
    createOptions.title = options.title;
  }
  if (options.approvedAt !== undefined) {
    createOptions.approvedAt = options.approvedAt;
  }
  if (options.approvedVersionId !== undefined) {
    createOptions.approvedVersionId = options.approvedVersionId;
  }
  if (options.now !== undefined) {
    createOptions.now = options.now;
  }

  return createTaggedScenarioSnapshot(createOptions);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isElementTypesList = (value: unknown): value is readonly ElementType[] =>
  Array.isArray(value) &&
  value.length === ELEMENT_TYPES.length &&
  value.every((type, index) => type === ELEMENT_TYPES[index]);

const isSource = (value: unknown): value is TaggedScenarioSnapshotSource =>
  value === "editor-approved" || value === "silent-editor-derived";

const isClassificationMethod = (
  value: unknown
): value is ClassificationMethod =>
  value === "regex" ||
  value === "context" ||
  value === "fallback" ||
  value === "ml" ||
  value === "external-engine";

const isElementSource = (
  value: unknown
): value is TaggedScenarioElementSource =>
  value === "editor-visible" || value === "editor-classifier";

const isTaggedScenarioElementChild = (
  value: unknown
): value is TaggedScenarioElementChild =>
  isRecord(value) &&
  typeof value["type"] === "string" &&
  isElementType(value["type"]) &&
  typeof value["text"] === "string" &&
  typeof value["normalizedText"] === "string";

const isTaggedScenarioElement = (
  value: unknown
): value is TaggedScenarioElement => {
  if (!isRecord(value)) return false;
  const children = value["children"];
  return (
    typeof value["elementId"] === "string" &&
    typeof value["orderIndex"] === "number" &&
    typeof value["type"] === "string" &&
    isElementType(value["type"]) &&
    typeof value["text"] === "string" &&
    typeof value["normalizedText"] === "string" &&
    typeof value["confidence"] === "number" &&
    isClassificationMethod(value["classificationMethod"]) &&
    isElementSource(value["source"]) &&
    (children === undefined ||
      (Array.isArray(children) && children.every(isTaggedScenarioElementChild)))
  );
};

const isTypeCounts = (
  value: unknown
): value is Readonly<Record<ElementType, number>> =>
  isRecord(value) &&
  ELEMENT_TYPES.every((type) => typeof value[type] === "number");

export const isTaggedScenarioSnapshot = (
  value: unknown
): value is TaggedScenarioSnapshot => {
  if (!isRecord(value)) return false;
  if (value["schemaVersion"] !== TAGGED_SCENARIO_SNAPSHOT_SCHEMA_VERSION) {
    return false;
  }
  if (
    typeof value["scenarioId"] !== "string" ||
    typeof value["sourceText"] !== "string" ||
    typeof value["sourceHash"] !== "string" ||
    typeof value["createdAt"] !== "string" ||
    !isSource(value["source"]) ||
    !isElementTypesList(value["elementTypes"]) ||
    !isTypeCounts(value["typeCounts"]) ||
    !Array.isArray(value["elements"]) ||
    !value["elements"].every(isTaggedScenarioElement)
  ) {
    return false;
  }

  return (
    value["sourceHash"] ===
    computeTaggedScenarioSourceHash(value["sourceText"])
  );
};

const readLocalSnapshotRecord = (): Record<string, TaggedScenarioSnapshot> => {
  if (typeof window === "undefined") {
    return Object.fromEntries(memorySnapshots);
  }

  try {
    const raw = window.localStorage.getItem(
      TAGGED_SCENARIO_SNAPSHOT_STORAGE_KEY
    );
    if (raw === null || raw.length === 0) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [
        string,
        TaggedScenarioSnapshot,
      ] => isTaggedScenarioSnapshot(entry[1]))
    );
  } catch {
    return {};
  }
};

const writeLocalSnapshotRecord = (
  record: Record<string, TaggedScenarioSnapshot>
): void => {
  memorySnapshots.clear();
  for (const [scenarioId, snapshot] of Object.entries(record)) {
    memorySnapshots.set(scenarioId, snapshot);
  }

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    TAGGED_SCENARIO_SNAPSHOT_STORAGE_KEY,
    JSON.stringify(record)
  );
};

export const createMemoryTaggedScenarioSnapshotStore =
  (): TaggedScenarioSnapshotStore => {
    const snapshots = new Map<string, TaggedScenarioSnapshot>();
    return {
      read: (scenarioId: string) =>
        snapshots.get(normalizeScenarioId(scenarioId)) ?? null,
      write: (snapshot: TaggedScenarioSnapshot) => {
        snapshots.set(snapshot.scenarioId, snapshot);
      },
    };
  };

export const defaultTaggedScenarioSnapshotStore: TaggedScenarioSnapshotStore = {
  read: (scenarioId: string): TaggedScenarioSnapshot | null => {
    const normalizedId = normalizeScenarioId(scenarioId);
    const record = readLocalSnapshotRecord();
    return record[normalizedId] ?? null;
  },
  write: (snapshot: TaggedScenarioSnapshot): void => {
    const record = readLocalSnapshotRecord();
    writeLocalSnapshotRecord({
      ...record,
      [snapshot.scenarioId]: snapshot,
    });
  },
};

export const persistTaggedScenarioSnapshot = async (
  snapshot: TaggedScenarioSnapshot,
  store: TaggedScenarioSnapshotStore = defaultTaggedScenarioSnapshotStore
): Promise<TaggedScenarioSnapshot> => {
  await store.write(snapshot);
  return snapshot;
};

const runDefaultEditorClassifier = async (
  sourceText: string
): Promise<readonly ClassifiedDraftWithId[]> => {
  const { classifyText } = await import(
    "@editor/extensions/paste-classifier/classify-text"
  );
  return classifyText(sourceText, undefined, {
    classificationProfile: "generic-open",
  });
};

const resolveScenarioText = async (
  options: EnsureTaggedScenarioSnapshotOptions
): Promise<string> => {
  if (typeof options.sourceText === "string") {
    return options.sourceText;
  }

  const loaded = await options.loadScenarioText?.(options.scenarioId);
  if (typeof loaded === "string") {
    return loaded;
  }

  return "";
};

export const ensureTaggedScenarioSnapshot = async (
  options: EnsureTaggedScenarioSnapshotOptions
): Promise<EnsureTaggedScenarioSnapshotResult> => {
  const scenarioId = normalizeScenarioId(options.scenarioId);
  const store = options.store ?? defaultTaggedScenarioSnapshotStore;
  const sourceText = normalizeText(await resolveScenarioText(options));
  const expectedHash =
    sourceText.length > 0 ? computeTaggedScenarioSourceHash(sourceText) : null;
  const cached = await store.read(scenarioId);

  if (
    options.forceRefresh !== true &&
    cached !== null &&
    isTaggedScenarioSnapshot(cached) &&
    (expectedHash === null || cached.sourceHash === expectedHash)
  ) {
    return { status: "cached", snapshot: cached };
  }

  if (sourceText.length === 0) {
    throw new Error(
      "Cannot create a tagged scenario snapshot without scenario text."
    );
  }

  const classifier = options.classifier ?? runDefaultEditorClassifier;
  const drafts = await classifier(sourceText);
  if (drafts.length === 0) {
    throw new Error("Silent tagging returned no scenario elements.");
  }

  const createOptions: CreateTaggedScenarioSnapshotFromDraftsOptions = {
    scenarioId,
    source: "silent-editor-derived",
    sourceText,
    drafts,
  };
  if (options.title !== undefined) {
    createOptions.title = options.title;
  }
  if (options.now !== undefined) {
    createOptions.now = options.now;
  }

  const snapshot = createTaggedScenarioSnapshotFromDrafts(createOptions);
  await store.write(snapshot);

  return { status: "created", snapshot };
};

export const ensureProjectTaggedScenarioSnapshot = async (
  project: TaggedScenarioProjectLike,
  options: Omit<
    EnsureTaggedScenarioSnapshotOptions,
    "scenarioId" | "sourceText" | "title"
  > = {}
): Promise<EnsureTaggedScenarioSnapshotResult> =>
  ensureTaggedScenarioSnapshot({
    ...options,
    scenarioId: project.id,
    title: project.title ?? project.name ?? null,
    sourceText: project.scriptContent ?? "",
  });
