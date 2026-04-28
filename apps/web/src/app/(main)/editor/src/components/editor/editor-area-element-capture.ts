import type { ProgressiveElement } from "../../types/unified-reception";
import type { Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";


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
