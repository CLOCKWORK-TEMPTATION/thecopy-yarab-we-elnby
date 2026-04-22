export type ProgressiveApprovalState = "unapproved" | "approved";

export interface ProgressiveNodeAttrs {
  elementId?: string | null;
  approvalState?: ProgressiveApprovalState;
  approvedVersionId?: string | null;
  approvedAt?: string | null;
}

export const buildProgressiveNodeAttributes = () => ({
  elementId: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute("data-element-id"),
    renderHTML: (attributes: ProgressiveNodeAttrs) =>
      attributes.elementId ? { "data-element-id": attributes.elementId } : {},
  },
  approvalState: {
    default: "unapproved",
    parseHTML: (element: HTMLElement) =>
      (element.getAttribute(
        "data-approval-state"
      ) as ProgressiveApprovalState | null) ?? "unapproved",
    renderHTML: (attributes: ProgressiveNodeAttrs) =>
      attributes.approvalState === "approved"
        ? { "data-approval-state": "approved" }
        : {},
  },
  approvedVersionId: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute("data-approved-version-id"),
    renderHTML: (attributes: ProgressiveNodeAttrs) =>
      attributes.approvedVersionId
        ? { "data-approved-version-id": attributes.approvedVersionId }
        : {},
  },
  approvedAt: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute("data-approved-at"),
    renderHTML: (attributes: ProgressiveNodeAttrs) =>
      attributes.approvedAt
        ? { "data-approved-at": attributes.approvedAt }
        : {},
  },
});
