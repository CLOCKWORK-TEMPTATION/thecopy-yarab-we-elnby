/**
 * @file use-editor-state.ts
 * @description Hook يجمع state values فقط (بدون refs) لتجنّب pessimistic
 *   flagging من قبل `react-hooks/refs` rule. الـ refs تُنشأ في App.tsx مباشرة.
 */

import { useState, type Dispatch, type SetStateAction } from "react";

import { useEditorCompactMode, useIsMobile } from "../hooks";
import { type EditorDiagnosticEvent } from "../lib/app/constants";
import {
  readActiveProjectTitle,
  readTypingSystemSettings,
} from "../lib/app/utils";

import type {
  DocumentStats,
  ProgressiveSurfaceState,
} from "../components/editor";
import type { ElementType } from "../extensions/classification-types";
import type { TypingSystemSettings } from "../types";

export interface EditorAppStateValues {
  stats: DocumentStats;
  setStats: Dispatch<SetStateAction<DocumentStats>>;
  currentFormat: ElementType | null;
  setCurrentFormat: Dispatch<SetStateAction<ElementType | null>>;
  activeMenu: string | null;
  setActiveMenu: Dispatch<SetStateAction<string | null>>;
  openSidebarItem: string | null;
  setOpenSidebarItem: Dispatch<SetStateAction<string | null>>;
  documentText: string;
  setDocumentText: Dispatch<SetStateAction<string>>;
  isMobile: boolean;
  isCompact: boolean;
  typingSystemSettings: TypingSystemSettings;
  setTypingSystemSettings: Dispatch<SetStateAction<TypingSystemSettings>>;
  showPipelineMonitor: boolean;
  setShowPipelineMonitor: Dispatch<SetStateAction<boolean>>;
  progressiveSurfaceState: ProgressiveSurfaceState | null;
  setProgressiveSurfaceState: Dispatch<
    SetStateAction<ProgressiveSurfaceState | null>
  >;
  activeProjectTitle: string | null;
  setActiveProjectTitle: Dispatch<SetStateAction<string | null>>;
  diagnosticEvents: EditorDiagnosticEvent[];
  setDiagnosticEvents: Dispatch<SetStateAction<EditorDiagnosticEvent[]>>;
}

export const useEditorState = (): EditorAppStateValues => {
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
  const isMobile = useIsMobile();
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
};
