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
import type { EditorView } from "@tiptap/pm/view";

import { ensureCharacterTrailingColon } from "../character";
import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";

import { buildProgressiveNodeAttrs } from "./utils/draft-builders";
import { computeDocumentSignature } from "./utils/text-normalization";

import type { RenderClassifiedDraftsResult } from "./types";

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

  const getNode = (name: string) => schema.nodes[name];

  switch (type) {
    case "scene_header_top_line": {
      const h1Type = getNode("scene_header_1");
      const h2Type = getNode("scene_header_2");
      const topType = getNode("scene_header_top_line");
      if (!h1Type || !h2Type || !topType) return null;
      const h1Node = h1Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header1`),
        header1 ? schema.text(header1) : undefined
      );
      const h2Node = h2Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header2`),
        header2 ? schema.text(header2) : undefined
      );
      return topType.create(attrs, [h1Node, h2Node]);
    }

    case "scene_header_1": {
      const nodeType = getNode("scene_header_1");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "scene_header_2": {
      const nodeType = getNode("scene_header_2");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "basmala": {
      const nodeType = getNode("basmala");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "scene_header_3": {
      const nodeType = getNode("scene_header_3");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "action": {
      const nodeType = getNode("action");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "character": {
      const nodeType = getNode("character");
      if (!nodeType) return null;
      return nodeType.create(
        attrs,
        text ? schema.text(ensureCharacterTrailingColon(text)) : undefined
      );
    }

    case "dialogue": {
      const nodeType = getNode("dialogue");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "parenthetical": {
      const nodeType = getNode("parenthetical");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "transition": {
      const nodeType = getNode("transition");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    default: {
      const nodeType = getNode("action");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }
  }
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
  const getNode = (name: string) => schema.nodes[name];

  for (let i = 0; i < classified.length; i++) {
    const item = classified[i];
    if (!item) continue;
    const next = classified[i + 1];
    const itemId = item._itemId ?? "";

    // look-ahead: scene_header_1 + scene_header_2 → scene_header_top_line display node
    if (item.type === "scene_header_1" && next?.type === "scene_header_2") {
      const h1Type = getNode("scene_header_1");
      const h2Type = getNode("scene_header_2");
      const topType = getNode("scene_header_top_line");
      if (!h1Type || !h2Type || !topType) continue;
      const nextId = next._itemId ?? "";
      const h1Node = h1Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header1`),
        item.text ? schema.text(item.text) : undefined
      );
      const h2Node = h2Type.create(
        buildProgressiveNodeAttrs(`${nextId}:header2`),
        next.text ? schema.text(next.text) : undefined
      );
      nodes.push(
        topType.create(buildProgressiveNodeAttrs(itemId), [h1Node, h2Node])
      );
      i++; // skip next (header_2 consumed)
      continue;
    }

    // scene_header_1 alone → wrap in top_line with empty header_2
    if (item.type === "scene_header_1") {
      const h1Type = getNode("scene_header_1");
      const h2Type = getNode("scene_header_2");
      const topType = getNode("scene_header_top_line");
      if (!h1Type || !h2Type || !topType) continue;
      const h1Node = h1Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header1`),
        item.text ? schema.text(item.text) : undefined
      );
      const h2Node = h2Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header2`)
      );
      nodes.push(
        topType.create(buildProgressiveNodeAttrs(itemId), [h1Node, h2Node])
      );
      continue;
    }

    // scene_header_2 alone (orphan) → wrap in top_line with empty header_1
    if (item.type === "scene_header_2") {
      const h1Type = getNode("scene_header_1");
      const h2Type = getNode("scene_header_2");
      const topType = getNode("scene_header_top_line");
      if (!h1Type || !h2Type || !topType) continue;
      const h1Node = h1Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header1`)
      );
      const h2Node = h2Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header2`),
        item.text ? schema.text(item.text) : undefined
      );
      nodes.push(
        topType.create(buildProgressiveNodeAttrs(itemId), [h1Node, h2Node])
      );
      continue;
    }

    const node = createNodeForType(item, schema);
    if (node) nodes.push(node);
  }

  return nodes;
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
    let firstMatch: number | null = null;
    let lastMatchEnd: number | null = null;

    view.state.doc.forEach((node, offset) => {
      const elementId =
        typeof node.attrs?.["elementId"] === "string" &&
        node.attrs["elementId"].trim().length > 0
          ? node.attrs["elementId"]
          : null;
      if (!elementId || !expectedTopLevelElementIds.has(elementId)) return;

      if (firstMatch === null) {
        firstMatch = offset;
      }
      lastMatchEnd = offset + node.nodeSize;
    });

    if (firstMatch !== null && lastMatchEnd !== null) {
      resolvedFrom = firstMatch;
      resolvedTo = Math.min(lastMatchEnd, view.state.doc.content.size);
    }
  }

  return {
    from: resolvedFrom,
    to: resolvedTo,
    documentSignature: computeDocumentSignature(view),
    nodesRendered: nodes.length,
  };
};
