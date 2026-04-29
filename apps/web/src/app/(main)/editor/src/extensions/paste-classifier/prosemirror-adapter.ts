/**
 * @module extensions/paste-classifier/prosemirror-adapter
 *
 * طبقة المحوّل بين نتائج التصنيف الخالصة وبنية ProseMirror/Tiptap:
 * - createNodeForType: إنشاء عقدة واحدة لنوع عنصر مصنف.
 * - classifiedToNodes: تحويل قائمة عناصر مصنفة إلى مصفوفة عقد ProseMirror
 *   مع دمج scene_header_1+scene_header_2 داخل scene_header_top_line.
 * - renderClassifiedDraftsToView: استبدال نطاق داخل المحرر بمصفوفة العقد
 *   الناتجة وإرجاع نطاقها بعد العرض + بصمة المستند.
 */

import { Fragment, Node as PmNode, Schema, Slice } from "@tiptap/pm/model";

import { ensureCharacterTrailingColon } from "../character";

import { buildProgressiveNodeAttrs } from "./utils/draft-builders";
import { computeDocumentSignature } from "./utils/text-normalization";

import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";
import type { RenderClassifiedDraftsResult } from "./types";
import type { EditorView } from "@tiptap/pm/view";

// ─── helpers لإنشاء عقد scene_header ──────────────────────────────────

interface BuildSceneHeaderTopLineContext {
  schema: Schema;
  topId: string;
  h1Id: string;
  h2Id: string;
  h1Text: string | undefined;
  h2Text: string | undefined;
}

const buildSceneHeaderTopLine = (
  context: BuildSceneHeaderTopLineContext
): PmNode | null => {
  const { schema, topId, h1Id, h2Id, h1Text, h2Text } = context;
  const h1Type = schema.nodes["scene_header_1"];
  const h2Type = schema.nodes["scene_header_2"];
  const topType = schema.nodes["scene_header_top_line"];
  if (!h1Type || !h2Type || !topType) return null;
  const h1Node = h1Type.create(
    buildProgressiveNodeAttrs(`${h1Id}:header1`),
    h1Text ? schema.text(h1Text) : undefined
  );
  const h2Node = h2Type.create(
    buildProgressiveNodeAttrs(`${h2Id}:header2`),
    h2Text ? schema.text(h2Text) : undefined
  );
  return topType.create(buildProgressiveNodeAttrs(topId), [h1Node, h2Node]);
};

// ─── createNodeForType ────────────────────────────────────────────────

/**
 * إنشاء عقدة ProseMirror من عنصر مصنّف.
 */
const createNodeForType = (
  item: ClassifiedDraftWithId,
  schema: Schema
): PmNode | null => {
  const { type, text, header1, header2 } = item;
  const itemId = item._itemId ?? "";
  const attrs = buildProgressiveNodeAttrs(itemId);

  if (type === "scene_header_top_line") {
    return buildSceneHeaderTopLine({
      schema,
      topId: itemId,
      h1Id: itemId,
      h2Id: itemId,
      h1Text: header1,
      h2Text: header2,
    });
  }

  const simpleNodeTypes: readonly string[] = [
    "scene_header_1",
    "scene_header_2",
    "basmala",
    "scene_header_3",
    "action",
    "dialogue",
    "parenthetical",
    "transition",
  ];

  if (simpleNodeTypes.includes(type)) {
    const nodeType = schema.nodes[type];
    if (!nodeType) return null;
    return nodeType.create(attrs, text ? schema.text(text) : undefined);
  }

  if (type === "character") {
    const nodeType = schema.nodes["character"];
    if (!nodeType) return null;
    return nodeType.create(
      attrs,
      text ? schema.text(ensureCharacterTrailingColon(text)) : undefined
    );
  }

  // default fallback
  const nodeType = schema.nodes["action"];
  if (!nodeType) return null;
  return nodeType.create(attrs, text ? schema.text(text) : undefined);
};

// ─── classifiedToNodes ────────────────────────────────────────────────

/** دمج scene_header_1 + scene_header_2 المتتاليين في top_line واحد */
const tryMergeSceneHeaders = (
  classified: readonly ClassifiedDraftWithId[],
  i: number,
  schema: Schema,
  nodes: PmNode[]
): boolean => {
  const item = classified[i];
  if (!item) return false;
  const next = classified[i + 1];
  const itemId = item._itemId ?? "";

  if (item.type === "scene_header_1" && next?.type === "scene_header_2") {
    const nextId = next._itemId ?? "";
    const node = buildSceneHeaderTopLine({
      schema,
      topId: itemId,
      h1Id: itemId,
      h2Id: nextId,
      h1Text: item.text,
      h2Text: next.text,
    });
    if (node) nodes.push(node);
    return true; // consumed 2 items
  }

  if (item.type === "scene_header_1") {
    const node = buildSceneHeaderTopLine({
      schema,
      topId: itemId,
      h1Id: itemId,
      h2Id: itemId,
      h1Text: item.text,
      h2Text: undefined,
    });
    if (node) nodes.push(node);
    return false; // consumed 1 item normally
  }

  if (item.type === "scene_header_2") {
    const node = buildSceneHeaderTopLine({
      schema,
      topId: itemId,
      h1Id: itemId,
      h2Id: itemId,
      h1Text: undefined,
      h2Text: item.text,
    });
    if (node) nodes.push(node);
    return false; // consumed 1 item normally
  }

  return false;
};

/**
 * تحويل عناصر مصنّفة إلى عقد ProseMirror.
 * مع look-ahead لدمج scene_header_1 + scene_header_2 في scene_header_top_line،
 * وتغليف العناوين المنفردة بعنصر top_line يحتوي رأساً فارغاً مكافئاً.
 */
export const classifiedToNodes = (
  classified: readonly ClassifiedDraftWithId[],
  schema: Schema
): PmNode[] => {
  const nodes: PmNode[] = [];

  for (let i = 0; i < classified.length; i++) {
    const item = classified[i];
    if (!item) continue;

    if (item.type === "scene_header_1" || item.type === "scene_header_2") {
      const consumedTwo = tryMergeSceneHeaders(classified, i, schema, nodes);
      if (consumedTwo) i++; // skip next (header_2 consumed)
      continue;
    }

    const node = createNodeForType(item, schema);
    if (node) nodes.push(node);
  }

  return nodes;
};

// ─── renderClassifiedDraftsToView ─────────────────────────────────────

/** تتبع نطاق عقد top-level معروفة بـ elementId */
const resolveNodeRange = (
  view: EditorView,
  expectedIds: Set<string>,
  safeFrom: number
): { resolvedFrom: number; resolvedTo: number } => {
  let firstMatch: number | null = null;
  let lastMatchEnd: number | null = null;

  view.state.doc.forEach((node, offset) => {
    const elementId =
      typeof node.attrs?.["elementId"] === "string" &&
      node.attrs["elementId"].trim().length > 0
        ? node.attrs["elementId"]
        : null;
    if (!elementId || !expectedIds.has(elementId)) return;

    firstMatch ??= offset;
    lastMatchEnd = offset + node.nodeSize;
  });

  if (firstMatch !== null && lastMatchEnd !== null) {
    return {
      resolvedFrom: firstMatch,
      resolvedTo: Math.min(lastMatchEnd, view.state.doc.content.size),
    };
  }

  return { resolvedFrom: safeFrom, resolvedTo: safeFrom };
};

/**
 * استبدال نطاق داخل المحرر بمصفوفة عقد ProseMirror الناتجة عن التصنيف،
 * مع تتبع نطاق العقد في المستند الجديد عبر elementId attributes
 * وإرجاع بصمة المستند بعد التطبيق.
 */
export const renderClassifiedDraftsToView = (
  view: EditorView,
  classified: readonly ClassifiedDraftWithId[],
  range: { from: number; to: number },
  metaStage: string
): RenderClassifiedDraftsResult | null => {
  const nodes = classifiedToNodes(classified, view.state.schema);
  if (nodes.length === 0) return null;

  const currentDocSize = view.state.doc.content.size;
  const safeFrom = Math.max(0, Math.min(range.from, currentDocSize));
  const safeTo = Math.max(safeFrom, Math.min(range.to, currentDocSize));
  const fragment = Fragment.from(nodes);
  const slice = new Slice(fragment, 0, 0);

  const expectedTopLevelElementIds = new Set(
    nodes
      .map((node) =>
        typeof node.attrs?.["elementId"] === "string" &&
        node.attrs["elementId"].trim().length > 0
          ? node.attrs["elementId"]
          : null
      )
      .filter((value): value is string => Boolean(value))
  );

  const tr = view.state.tr.replaceRange(safeFrom, safeTo, slice);
  tr.setMeta("silent-pipeline-stage", { stage: metaStage });
  view.dispatch(tr);

  let resolvedFrom = safeFrom;
  let resolvedTo = safeFrom + fragment.size;

  if (expectedTopLevelElementIds.size > 0) {
    const resolved = resolveNodeRange(
      view,
      expectedTopLevelElementIds,
      safeFrom
    );
    if (
      resolved.resolvedFrom !== safeFrom ||
      resolved.resolvedTo !== safeFrom
    ) {
      resolvedFrom = resolved.resolvedFrom;
      resolvedTo = resolved.resolvedTo;
    }
  }

  return {
    from: resolvedFrom,
    to: resolvedTo,
    documentSignature: computeDocumentSignature(view),
    nodesRendered: nodes.length,
  };
};
