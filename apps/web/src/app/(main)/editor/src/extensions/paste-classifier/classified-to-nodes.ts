import { Node as PmNode, Schema } from "@tiptap/pm/model";

import { ensureCharacterTrailingColon } from "../character";

import { buildProgressiveNodeAttrs } from "./pm-render-utils";

import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";

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
      i++;
      continue;
    }

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
