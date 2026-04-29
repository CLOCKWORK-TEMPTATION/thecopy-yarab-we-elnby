import { Node as PmNode, Schema } from "@tiptap/pm/model";

import { ensureCharacterTrailingColon } from "../character";

import { buildProgressiveNodeAttrs } from "./pm-render-utils";

import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";

// Simple node types that follow the same pattern
const SIMPLE_NODE_TYPES = [
  "scene_header_1",
  "scene_header_2",
  "basmala",
  "scene_header_3",
  "action",
  "dialogue",
  "parenthetical",
  "transition",
] as const;

// Helper to create a simple text node
const createSimpleNode = (
  schema: Schema,
  nodeType: string,
  attrs: Record<string, unknown>,
  text: string | undefined
): PmNode | null => {
  const type = schema.nodes[nodeType];
  if (!type) return null;
  return type.create(attrs, text ? schema.text(text) : undefined);
};

// Helper to create scene header top line node
const createSceneHeaderTopLineNode = (
  item: ClassifiedDraftWithId,
  schema: Schema,
  attrs: Record<string, unknown>
): PmNode | null => {
  const { header1, header2, _itemId } = item;
  const h1Type = schema.nodes["scene_header_1"];
  const h2Type = schema.nodes["scene_header_2"];
  const topType = schema.nodes["scene_header_top_line"];
  if (!h1Type || !h2Type || !topType) return null;

  const h1Node = h1Type.create(
    buildProgressiveNodeAttrs(`${_itemId}:header1`),
    header1 ? schema.text(header1) : undefined
  );
  const h2Node = h2Type.create(
    buildProgressiveNodeAttrs(`${_itemId}:header2`),
    header2 ? schema.text(header2) : undefined
  );
  return topType.create(attrs, [h1Node, h2Node]);
};

// Helper to create character node with trailing colon
const createCharacterNode = (
  item: ClassifiedDraftWithId,
  schema: Schema,
  attrs: Record<string, unknown>
): PmNode | null => {
  const { text } = item;
  const nodeType = schema.nodes["character"];
  if (!nodeType) return null;
  return nodeType.create(
    attrs,
    text ? schema.text(ensureCharacterTrailingColon(text)) : undefined
  );
};

const createNodeForType = (
  item: ClassifiedDraftWithId,
  schema: Schema
): PmNode | null => {
  const { type, text } = item;
  const itemId = item._itemId ?? "";
  const attrs = buildProgressiveNodeAttrs(itemId);

  // Handle scene header top line (special case with children)
  if (type === "scene_header_top_line") {
    return createSceneHeaderTopLineNode(item, schema, attrs);
  }

  // Handle character (special case with trailing colon)
  if (type === "character") {
    return createCharacterNode(item, schema, attrs);
  }

  // Handle simple node types
  if (SIMPLE_NODE_TYPES.includes(type)) {
    return createSimpleNode(schema, type, attrs, text);
  }

  // Default to action node
  return createSimpleNode(schema, "action", attrs, text);
};

// Helper to check if all required scene header types exist
const hasRequiredHeaderTypes = (schema: Schema): boolean => {
  const h1Type = schema.nodes["scene_header_1"];
  const h2Type = schema.nodes["scene_header_2"];
  const topType = schema.nodes["scene_header_top_line"];
  return !!(h1Type && h2Type && topType);
};

// Helper to create scene header top line node with h1 and h2 children
interface CreateSceneHeaderTopNodeContext {
  schema: Schema;
  itemId: string;
  h1Text: string | undefined;
  h2Text: string | undefined;
  h1AttrsId?: string;
  h2AttrsId?: string;
}

const createSceneHeaderTopNode = (
  context: CreateSceneHeaderTopNodeContext
): PmNode | null => {
  const { schema, itemId, h1Text, h2Text, h1AttrsId, h2AttrsId } = context;
  const h1Type = schema.nodes["scene_header_1"];
  const h2Type = schema.nodes["scene_header_2"];
  const topType = schema.nodes["scene_header_top_line"];
  if (!h1Type || !h2Type || !topType) return null;

  const h1Node = h1Type.create(
    buildProgressiveNodeAttrs(h1AttrsId ?? `${itemId}:header1`),
    h1Text ? schema.text(h1Text) : undefined
  );
  const h2Node = h2Type.create(
    buildProgressiveNodeAttrs(h2AttrsId ?? `${itemId}:header2`),
    h2Text ? schema.text(h2Text) : undefined
  );
  return topType.create(buildProgressiveNodeAttrs(itemId), [h1Node, h2Node]);
};

// Handle scene_header_1 with optional next scene_header_2
const handleSceneHeader1 = (
  item: ClassifiedDraftWithId,
  next: ClassifiedDraftWithId | undefined,
  schema: Schema
): { node: PmNode | null; consumedNext: boolean } => {
  if (!hasRequiredHeaderTypes(schema))
    return { node: null, consumedNext: false };

  const itemId = item._itemId ?? "";

  if (next?.type === "scene_header_2") {
    const nextItemId = next._itemId ?? itemId;
    const node = createSceneHeaderTopNode({
      schema,
      itemId,
      h1Text: item.text,
      h2Text: next.text,
      h1AttrsId: `${itemId}:header1`,
      h2AttrsId: `${nextItemId}:header2`,
    });
    return { node, consumedNext: true };
  }

  const node = createSceneHeaderTopNode({
    schema,
    itemId,
    h1Text: item.text,
    h2Text: undefined,
    h1AttrsId: `${itemId}:header1`,
    h2AttrsId: `${itemId}:header2`,
  });
  return { node, consumedNext: false };
};

// Handle scene_header_2 (standalone)
const handleSceneHeader2 = (
  item: ClassifiedDraftWithId,
  schema: Schema
): PmNode | null => {
  if (!hasRequiredHeaderTypes(schema)) return null;

  const itemId = item._itemId ?? "";
  return createSceneHeaderTopNode({
    schema,
    itemId,
    h1Text: undefined,
    h2Text: item.text,
    h1AttrsId: `${itemId}:header1`,
    h2AttrsId: `${itemId}:header2`,
  });
};

export const classifiedToNodes = (
  classified: readonly ClassifiedDraftWithId[],
  schema: Schema
): PmNode[] => {
  const nodes: PmNode[] = [];

  for (let i = 0; i < classified.length; i++) {
    const item = classified[i];
    if (!item) continue;

    let node: PmNode | null = null;

    if (item.type === "scene_header_1") {
      const next = classified[i + 1];
      const result = handleSceneHeader1(item, next, schema);
      node = result.node;
      if (result.consumedNext) i++;
    } else if (item.type === "scene_header_2") {
      node = handleSceneHeader2(item, schema);
    } else {
      node = createNodeForType(item, schema);
    }

    if (node) nodes.push(node);
  }

  return nodes;
};
