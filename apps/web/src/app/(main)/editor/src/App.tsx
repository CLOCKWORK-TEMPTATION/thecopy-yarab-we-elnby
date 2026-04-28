"use client";

/**
 * @file App.tsx
 * @description المكون الجذري لتطبيق أفان تيتر — محرر السيناريو العربي.
 *   نحيف: state عبر `useEditorState`، refs/handlers عبر `useAppControllers`،
 *   side-effects عبر `useEditorEffects`، JSX في `EditorAppLayout`.
 */

import React from "react";

import { EditorAppLayout } from "./components/app-shell/EditorAppLayout";
import { SHORTCUT_FORMAT_BY_DIGIT } from "./constants";
import { toast } from "./hooks";
import { useAppControllers } from "./hooks/use-app-controllers";
import { useEditorEffects } from "./hooks/use-editor-effects";
import { useEditorState } from "./hooks/use-editor-state";
import {
  ACTION_BLOCK_SPACING,
  CLASSIFIER_OPTION_COUNT,
  LOCKED_EDITOR_FONT_LABEL,
  LOCKED_EDITOR_SIZE_LABEL,
  SUPPORTED_LEGACY_FORMAT_COUNT,
  getConstants,
} from "./lib/app/constants";
import { resolveFileImportExtractEndpoint } from "./utils/backend-endpoints";
import { logger } from "./utils/logger";

export function App(): React.JSX.Element {
  const state = useEditorState();
  const controllers = useAppControllers(state);
  const constants = getConstants();

  useEditorEffects(
    state,
    controllers.refs,
    {
      recordDiagnostic: controllers.recordDiagnostic,
      toast,
      logger,
      runDocumentThroughPasteWorkflow:
        controllers.runDocumentThroughPasteWorkflow,
    },
    SHORTCUT_FORMAT_BY_DIGIT
  );

  const fileImportBackendEndpoint = resolveFileImportExtractEndpoint();
  const currentFormatLabel = state.currentFormat
    ? constants.FORMAT_LABEL_BY_TYPE[state.currentFormat]
    : "—";

  return (
    <EditorAppLayout
      state={state}
      controllers={controllers}
      constants={constants}
      uiSettings={{
        lockedEditorFontLabel: LOCKED_EDITOR_FONT_LABEL,
        lockedEditorSizeLabel: LOCKED_EDITOR_SIZE_LABEL,
        supportedLegacyFormatCount: SUPPORTED_LEGACY_FORMAT_COUNT,
        classifierOptionCount: CLASSIFIER_OPTION_COUNT,
        actionBlockSpacing: ACTION_BLOCK_SPACING,
        hasFileImportBackend: fileImportBackendEndpoint.length > 0,
      }}
      currentFormatLabel={currentFormatLabel}
    />
  );
}
