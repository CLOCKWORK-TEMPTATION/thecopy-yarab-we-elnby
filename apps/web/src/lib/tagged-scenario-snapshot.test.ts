import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ELEMENT_TYPES,
  type ElementType,
} from "@editor/extensions/classification-types";

import {
  TAGGED_SCENARIO_SNAPSHOT_SCHEMA_VERSION,
  createMemoryTaggedScenarioSnapshotStore,
  createTaggedScenarioSnapshotFromDrafts,
  ensureTaggedScenarioSnapshot,
  isTaggedScenarioSnapshot,
} from "./tagged-scenario-snapshot";

import type { ClassifiedDraftWithId } from "@editor/extensions/paste-classifier-helpers";

const SOURCE_TEXT = [
  "بسم الله الرحمن الرحيم",
  "الحارة - نهار",
  "داخلي",
  "غرفة واسعة",
  "يدخل أحمد",
  "أحمد:",
  "(بهدوء)",
  "السلام عليكم",
  "قطع إلى:",
  "مشهد علوي",
].join("\n");

const textForType = (type: ElementType, index: number): string =>
  type === "scene_header_top_line"
    ? "الحارة - نهار"
    : `${type} ${String(index + 1)}`;

const buildDrafts = (): ClassifiedDraftWithId[] =>
  ELEMENT_TYPES.map((type, index) => ({
    _itemId: `line-${String(index + 1)}`,
    type,
    text: textForType(type, index),
    ...(type === "scene_header_top_line"
      ? { header1: "الحارة", header2: "نهار" }
      : {}),
    confidence: 0.9,
    classificationMethod: "regex",
  }));

describe("tagged scenario snapshots", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("creates an immutable snapshot that preserves the ten element types", () => {
    const snapshot = createTaggedScenarioSnapshotFromDrafts({
      scenarioId: "scenario-1",
      source: "editor-approved",
      sourceText: SOURCE_TEXT,
      drafts: buildDrafts(),
      approvedVersionId: "approved-version-1",
      now: () => "2026-04-30T12:00:00.000Z",
    });

    expect(snapshot.schemaVersion).toBe(
      TAGGED_SCENARIO_SNAPSHOT_SCHEMA_VERSION
    );
    expect(snapshot.elementTypes).toEqual(ELEMENT_TYPES);
    expect(snapshot.elements.map((element) => element.type)).toEqual(
      ELEMENT_TYPES
    );
    expect(snapshot.typeCounts.scene_header_top_line).toBe(1);

    const topLine = snapshot.elements.find(
      (element) => element.type === "scene_header_top_line"
    );
    expect(topLine?.children?.map((child) => child.type)).toEqual([
      "scene_header_1",
      "scene_header_2",
    ]);
    expect(topLine?.children?.map((child) => child.text)).toEqual([
      "الحارة",
      "نهار",
    ]);
    expect(isTaggedScenarioSnapshot(snapshot)).toBe(true);
  });

  it("returns a valid cached snapshot without rerunning silent tagging", async () => {
    const store = createMemoryTaggedScenarioSnapshotStore();
    const cached = createTaggedScenarioSnapshotFromDrafts({
      scenarioId: "scenario-2",
      source: "editor-approved",
      sourceText: SOURCE_TEXT,
      drafts: buildDrafts(),
      approvedVersionId: "approved-version-2",
    });
    await store.write(cached);

    const classifier = vi.fn<() => ClassifiedDraftWithId[]>(() => []);
    const result = await ensureTaggedScenarioSnapshot({
      scenarioId: "scenario-2",
      sourceText: SOURCE_TEXT,
      store,
      classifier,
    });

    expect(result.status).toBe("cached");
    expect(result.snapshot).toEqual(cached);
    expect(classifier).not.toHaveBeenCalled();
  });

  it("runs editor-derived silent tagging when no valid snapshot exists", async () => {
    const store = createMemoryTaggedScenarioSnapshotStore();
    const drafts = buildDrafts().slice(0, 4);
    const classifier = vi.fn<(text: string) => ClassifiedDraftWithId[]>(
      () => drafts
    );

    const result = await ensureTaggedScenarioSnapshot({
      scenarioId: "scenario-3",
      sourceText: SOURCE_TEXT,
      store,
      classifier,
      now: () => "2026-04-30T13:00:00.000Z",
    });

    expect(result.status).toBe("created");
    expect(result.snapshot.source).toBe("silent-editor-derived");
    expect(result.snapshot.createdAt).toBe("2026-04-30T13:00:00.000Z");
    expect(result.snapshot.elements.map((element) => element.type)).toEqual(
      drafts.map((draft) => draft.type)
    );
    expect(classifier).toHaveBeenCalledWith(SOURCE_TEXT);
    await expect(Promise.resolve(store.read("scenario-3"))).resolves.toEqual(
      result.snapshot
    );
  });

  it("rebuilds a stale cached snapshot when the source text changes", async () => {
    const store = createMemoryTaggedScenarioSnapshotStore();
    const cached = createTaggedScenarioSnapshotFromDrafts({
      scenarioId: "scenario-4",
      source: "editor-approved",
      sourceText: "نص قديم",
      drafts: buildDrafts().slice(0, 2),
      approvedVersionId: "approved-version-4",
    });
    await store.write(cached);

    const nextDrafts = buildDrafts().slice(2, 5);
    const classifier = vi.fn<(text: string) => ClassifiedDraftWithId[]>(
      () => nextDrafts
    );
    const result = await ensureTaggedScenarioSnapshot({
      scenarioId: "scenario-4",
      sourceText: SOURCE_TEXT,
      store,
      classifier,
    });

    expect(result.status).toBe("created");
    expect(result.snapshot.sourceHash).not.toBe(cached.sourceHash);
    expect(result.snapshot.elements.map((element) => element.type)).toEqual(
      nextDrafts.map((draft) => draft.type)
    );
  });
});
