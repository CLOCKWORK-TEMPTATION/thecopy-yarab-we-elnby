import { Fragment, Slice } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";
import type { RenderClassifiedDraftsResult } from "./types";
import { classifiedToNodes } from "./classified-to-nodes";
import { computeDocumentSignature } from "./helpers";

export const buildProgressiveNodeAttrs = (
  itemId: string
): {
  elementId: string;
  approvalState: "unapproved";
  approvedVersionId: null;
  approvedAt: null;
} => ({
  elementId: itemId,
  approvalState: "unapproved",
  approvedVersionId: null,
  approvedAt: null,
});

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
