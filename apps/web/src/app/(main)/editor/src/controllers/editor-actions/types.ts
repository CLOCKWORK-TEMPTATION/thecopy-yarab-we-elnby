import type { EditorArea } from "../../components/editor";
import type { RunDocumentThroughPasteWorkflowOptions } from "../../types";
import type { MenuToastPayload } from "../insert-menu-controller";

export interface EditorActionsDeps {
  getArea: () => EditorArea | null;
  toast: (payload: MenuToastPayload) => void;
  resolveMenuCommand: (actionId: string) => boolean;
  isProgressiveSurfaceLocked: () => boolean;
  runDocumentThroughPasteWorkflow: (
    options: RunDocumentThroughPasteWorkflowOptions
  ) => Promise<void>;
  runForcedProductionSelfCheck: (
    trigger: "manual-auto-check" | "manual-reclassify"
  ) => Promise<void>;
  restoreAutosaveDraft: () => Promise<void>;
  recordDiagnostic: (title: string, message: string) => void;
}

export type EditorActionsFeedbackDeps = Pick<
  EditorActionsDeps,
  "getArea" | "toast" | "recordDiagnostic"
>;

export type EditorFileActionDeps = Pick<
  EditorActionsDeps,
  "getArea" | "toast" | "isProgressiveSurfaceLocked" | "recordDiagnostic"
>;
