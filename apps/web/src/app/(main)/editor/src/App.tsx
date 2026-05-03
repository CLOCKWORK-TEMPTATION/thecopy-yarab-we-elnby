"use client";

/**
 * @file App.tsx
 * @description المكون الجذري لتطبيق أفان تيتر — محرر السيناريو العربي.
 *   نحيف: state عبر `useEditorState`، refs/handlers عبر `useAppControllers`،
 *   side-effects عبر `useEditorEffects`، JSX في `EditorAppLayout`.
 *
 *   إصلاح P0-1: عند أول mount نُشغّل bootstrapClientStorageGuard
 *   لمسح أي توكنات حساسة تكون قد تركها كود قديم في localStorage/sessionStorage.
 *   لا نعتمد على هذا وحده — العقد الأمني يفرض أيضاً عدم كتابة التوكنات
 *   في المقام الأول (انظر use-local-storage.ts).
 */

import React from "react";

import { bootstrapClientStorageGuard } from "@the-copy/security-middleware";

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
  // طبقة دفاع مبكّرة: نمسح أي توكنات قديمة قبل أن يقرأها كود لاحق.
  // useRef يضمن التشغيل مرة واحدة فقط لكل instance من المكوّن.
  const storageGuardRef = React.useRef(false);
  if (!storageGuardRef.current && typeof window !== "undefined") {
    storageGuardRef.current = true;
    bootstrapClientStorageGuard();
  }

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
