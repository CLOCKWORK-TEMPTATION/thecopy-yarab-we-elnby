/**
 * @file apps/web/src/hooks/use-editor-state.ts
 * @description State management hook for the App component.
 */

import { useRef, useState } from "react";

import {
  readActiveProjectTitle,
  readTypingSystemSettings,
} from "../lib/app/utils";

import { useEditorCompactMode } from "./use-editor-compact-mode";
import { getIsMobile } from "./use-is-mobile";

import type {
  DocumentStats,
  ProgressiveSurfaceState,
} from "../components/editor";
import type { EditorArea } from "../components/editor/EditorArea";
import type { TypingSystemSettings } from "../types";
import type { EditorDiagnosticEvent, ElementType } from "../types/app";

export function useEditorState() {
  const editorMountRef = useRef<HTMLDivElement | null>(null);
  const editorAreaRef = useRef<EditorArea | null>(null);
  const handleMenuActionRef = useRef<
    ((actionId: string) => Promise<void>) | null
  >(null);
  const liveTypingWorkflowTimeoutRef = useRef<number | null>(null);
  const applyingTypingWorkflowRef = useRef(false);
  const lastLiveWorkflowTextRef = useRef("");

  const [stats, setStats] = useState<DocumentStats>({
    pages: 1,
    words: 0,
    characters: 0,
    scenes: 0,
  });
  const [currentFormat, setCurrentFormat] = useState<ElementType | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [openSidebarItem, setOpenSidebarItem] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState("");
  const [isMobile, setIsMobile] = useState<boolean>(() => getIsMobile());
  const isCompact = useEditorCompactMode();
  const [typingSystemSettings, setTypingSystemSettings] =
    useState<TypingSystemSettings>(() => readTypingSystemSettings());
  const [showPipelineMonitor, setShowPipelineMonitor] = useState(false);
  const [progressiveSurfaceState, setProgressiveSurfaceState] =
    useState<ProgressiveSurfaceState | null>(null);
  const [activeProjectTitle, setActiveProjectTitle] = useState<string | null>(
    () => readActiveProjectTitle()
  );
  const [diagnosticEvents, setDiagnosticEvents] = useState<
    EditorDiagnosticEvent[]
  >([]);

  return {
    editorMountRef,
    editorAreaRef,
    handleMenuActionRef,
    liveTypingWorkflowTimeoutRef,
    applyingTypingWorkflowRef,
    lastLiveWorkflowTextRef,
    stats,
    setStats,
    currentFormat,
    setCurrentFormat,
    activeMenu,
    setActiveMenu,
    openSidebarItem,
    setOpenSidebarItem,
    documentText,
    setDocumentText,
    isMobile,
    setIsMobile,
    isCompact,
    typingSystemSettings,
    setTypingSystemSettings,
    showPipelineMonitor,
    setShowPipelineMonitor,
    progressiveSurfaceState,
    setProgressiveSurfaceState,
    activeProjectTitle,
    setActiveProjectTitle,
    diagnosticEvents,
    setDiagnosticEvents,
  };
}
