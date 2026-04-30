import {
  isElementType,
  type ElementType,
} from "../../extensions/classification-types";

import type { ProgressiveElement } from "../../types/unified-reception";
import type {
  TaggedScenarioElement,
  TaggedScenarioElementChild,
} from "@/lib/tagged-scenario-snapshot";
import type { Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";

const normalizeNodeText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const toElementType = (nodeTypeName: string): ElementType =>
  isElementType(nodeTypeName) ? nodeTypeName : "action";

const getStringAttr = (node: PmNode, key: string): string | null => {
  const value: unknown = node.attrs[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const captureTaggedChildren = (
  node: PmNode
): readonly TaggedScenarioElementChild[] | undefined => {
  if (node.type.name !== "scene_header_top_line" || node.childCount === 0) {
    return undefined;
  }

  const children: TaggedScenarioElementChild[] = [];
  node.forEach((child) => {
    const childType = toElementType(child.type.name);
    const text = child.textContent ?? "";
    children.push({
      type: childType,
      text,
      normalizedText: normalizeNodeText(text),
    });
  });

  return children.length > 0 ? children : undefined;
};

/**
 * @description يسجّل جميع العناصر الظاهرة في المحرر لحظة الاستدعاء،
 * ويربط كلّاً منها بمعرّف التشغيل ومعرّف النسخة الظاهرة.
 */
export function captureVisibleElements(
  editor: Editor,
  runId: string,
  visibleVersionId: string
): ProgressiveElement[] {
  const elements: ProgressiveElement[] = [];
  let orderIndex = 0;

  editor.state.doc.forEach((node) => {
    const nodeText = node.textContent ?? "";
    const elementId =
      typeof node.attrs["elementId"] === "string" &&
      node.attrs["elementId"].trim().length > 0
        ? node.attrs["elementId"]
        : `${runId}:element:${orderIndex}`;
    const approvalState =
      node.attrs["approvalState"] === "approved" ? "approved" : "unapproved";
    const approvedVersionId =
      typeof node.attrs["approvedVersionId"] === "string" &&
      node.attrs["approvedVersionId"].trim().length > 0
        ? node.attrs["approvedVersionId"]
        : null;

    elements.push({
      elementId,
      runId,
      visibleVersionId,
      orderIndex,
      text: nodeText,
      normalizedText: nodeText.replace(/\s+/g, " ").trim(),
      elementType: node.type.name,
      expectedCurrentText: nodeText,
      reviewEligibility: "reviewable",
      nonReviewableReason: null,
      approvalState,
      approvedVersionId,
    });
    orderIndex += 1;
  });

  return elements;
}

/**
 * @description يعيد قائمة بالعقد (nodes) على المستوى الأعلى مع إزاحتها (pos)
 * من مستند ProseMirror الحالي.
 */
export function captureTopLevelNodes(
  editor: Editor
): { pos: number; node: PmNode }[] {
  const nodes: { pos: number; node: PmNode }[] = [];

  editor.state.doc.forEach((_node, offset) => {
    const resolvedNode = editor.state.doc.nodeAt(offset);
    if (!resolvedNode) return;
    nodes.push({ pos: offset, node: resolvedNode });
  });

  return nodes;
}

export function captureTaggedScenarioElements(
  editor: Editor,
  runId: string,
  approvedVersionId: string
): TaggedScenarioElement[] {
  const elements: TaggedScenarioElement[] = [];
  let orderIndex = 0;

  editor.state.doc.forEach((node) => {
    const elementId =
      getStringAttr(node, "elementId") ??
      `${runId}:tagged-element:${String(orderIndex)}`;
    const text = node.textContent ?? "";
    const type = toElementType(node.type.name);
    const originalNodeType = node.type.name;
    const children = captureTaggedChildren(node);

    elements.push({
      elementId,
      orderIndex,
      type,
      text,
      normalizedText: normalizeNodeText(text),
      confidence: 1,
      classificationMethod: "external-engine",
      source: "editor-visible",
      approvalState: "approved",
      approvedVersionId,
      ...(children ? { children } : {}),
      ...(originalNodeType !== type
        ? { metadata: { originalNodeType } }
        : {}),
    });
    orderIndex += 1;
  });

  return elements;
}
