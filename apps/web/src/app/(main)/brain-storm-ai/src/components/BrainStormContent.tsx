/**
 * @module BrainStormContent
 * @description المكون المنسّق الرئيسي — يجمع ويربط جميع الأجزاء
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { useAgentStates } from "../hooks/useAgentStates";
import { useBrainstormCatalog } from "../hooks/useBrainstormCatalog";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useSession } from "../hooks/useSession";
import { useSessionPersistence } from "../hooks/useSessionPersistence";
import { exportToJSON, exportToMarkdown } from "../lib/export";

import ControlPanel from "./features/ControlPanel";
import DebatePanel from "./features/DebatePanel";
import { ExportControls } from "./features/ExportControls";
import FeaturesGrid from "./features/FeaturesGrid";
import { FinalResult } from "./features/FinalResult";
import { KeyboardShortcutsHelp } from "./features/KeyboardShortcutsHelp";
import { SessionHistory } from "./features/SessionHistory";
import AgentsSidebar from "./layout/AgentsSidebar";
import BrainStormHeader from "./layout/BrainStormHeader";

import type { BrainstormCatalog } from "../types";
import type { SessionMessage } from "../types";
import type { Session } from "../types";

function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" dir="rtl">
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-white/55">
            جاري تحميل كتالوج الوكلاء من الباك إند...
          </p>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  error: string | null;
}

function EmptyState({ error }: EmptyStateProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" dir="rtl">
      <BrainStormHeader
        agentStats={{
          total: 0,
          withRAG: 0,
          averageComplexity: 0,
          withSelfReflection: 0,
          byCategory: {
            core: 0,
            analysis: 0,
            creative: 0,
            predictive: 0,
            advanced: 0,
          },
          withMemory: 0,
        }}
        error={error ?? "فشل تحميل بيانات Brain Storm AI من الباك إند"}
        currentSession={null}
      />
    </div>
  );
}

interface MainWorkspaceProps {
  catalog: BrainstormCatalog;
  currentSession: Session | null;
  debateMessages: SessionMessage[];
  brief: string;
  setBrief: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  progressPercent: number;
  activePhase: string;
  setActivePhase: (p: string) => void;
  phases: string[];
  realAgents: unknown[];
  displayedAgents: unknown[];
  showAllAgents: boolean;
  setShowAllAgents: (v: boolean) => void;
  phaseAgents: unknown[];
  agentStats: unknown;
  expandedAgents: Set<string>;
  toggleAgentExpand: (id: string) => void;
  getAgentState: (id: string) => unknown;
  savedSessions: unknown[];
  error: string | null;
  showShortcutsHelp: boolean;
  onStartSession: () => Promise<void>;
  onStopAndArchive: () => void;
  onAdvancePhase: () => Promise<void>;
  onFileContent: (content: string) => void;
  onLoadSavedSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onClearAllSessions: () => void;
  onCloseShortcutsHelp: () => void;
}

function MainWorkspace({
  currentSession,
  debateMessages,
  brief,
  setBrief,
  isLoading,
  progressPercent,
  activePhase,
  setActivePhase,
  phases,
  realAgents,
  displayedAgents,
  showAllAgents,
  setShowAllAgents,
  phaseAgents,
  agentStats,
  expandedAgents,
  toggleAgentExpand,
  getAgentState,
  savedSessions,
  error,
  showShortcutsHelp,
  onStartSession,
  onStopAndArchive,
  onAdvancePhase,
  onFileContent,
  onLoadSavedSession,
  onDeleteSession,
  onClearAllSessions,
  onCloseShortcutsHelp,
}: MainWorkspaceProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" dir="rtl">
      <BrainStormHeader
        agentStats={agentStats as never}
        error={error}
        currentSession={currentSession}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ControlPanel
            phases={phases}
            activePhase={activePhase}
            setActivePhase={(p) => setActivePhase(p)}
            currentSession={currentSession}
            brief={brief}
            setBrief={setBrief}
            isLoading={isLoading}
            progressPercent={progressPercent}
            onStartSession={onStartSession}
            onStopSession={onStopAndArchive}
            onAdvancePhase={onAdvancePhase}
            onFileContent={onFileContent}
          />

          {currentSession && <DebatePanel messages={debateMessages} />}

          {currentSession?.status === "completed" && (
            <FinalResult
              session={currentSession}
              messages={debateMessages}
              progressPercent={progressPercent}
            />
          )}

          {currentSession && (
            <ExportControls
              session={currentSession}
              messages={debateMessages}
            />
          )}
        </div>

        <div className="space-y-6">
          <AgentsSidebar
            displayedAgents={displayedAgents as never}
            allAgents={realAgents as never}
            showAllAgents={showAllAgents}
            setShowAllAgents={setShowAllAgents}
            totalAgentCount={realAgents.length}
            phaseAgentCount={(phaseAgents as unknown[]).length}
            activePhase={activePhase}
            getAgentState={getAgentState as never}
            expandedAgents={expandedAgents}
            toggleAgentExpand={toggleAgentExpand}
          />

          <SessionHistory
            sessions={savedSessions as never}
            onLoad={onLoadSavedSession}
            onDelete={onDeleteSession}
            onClearAll={onClearAllSessions}
          />
        </div>
      </div>

      <FeaturesGrid agentStats={agentStats as never} />

      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={onCloseShortcutsHelp}
      />
    </div>
  );
}

export default function BrainStormContent() {
  const {
    catalog,
    isLoading: isCatalogLoading,
    error: catalogError,
  } = useBrainstormCatalog();

  const agents = catalog?.agents ?? [];
  const phaseDefinitions = catalog?.phases ?? [];

  const {
    realAgents,
    expandedAgents,
    updateAgentState,
    resetAllAgents,
    toggleAgentExpand,
    getAgentState,
  } = useAgentStates(agents);

  const {
    currentSession,
    isLoading,
    error: sessionError,
    activePhase,
    setActivePhase,
    brief,
    setBrief,
    debateMessages,
    showAllAgents,
    setShowAllAgents,
    agentStats,
    phaseAgents,
    displayedAgents,
    phases,
    progressPercent,
    handleStartSession,
    handleStopSession,
    handleAdvancePhase,
    restoreSession,
  } = useSession({
    updateAgentState,
    resetAllAgents,
    realAgents,
    phaseDefinitions,
  });

  const {
    savedSessions,
    isLoaded,
    saveSession,
    deleteSession,
    loadSession,
    clearAllSessions,
    setCurrentSessionId,
  } = useSessionPersistence();

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const handleFileContent = useCallback(
    (content: string) => {
      setBrief((prev: string) => (prev ? `${prev}\n\n${content}` : content));
    },
    [setBrief]
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (currentSession) {
      saveSession(currentSession, debateMessages);
      setCurrentSessionId(currentSession.id);
      return;
    }
    setCurrentSessionId(null);
  }, [
    currentSession,
    debateMessages,
    isLoaded,
    saveSession,
    setCurrentSessionId,
  ]);

  const handleLoadSavedSession = useCallback(
    (sessionId: string) => {
      const saved = loadSession(sessionId);
      if (!saved) return;
      restoreSession(saved.session, saved.messages);
      setCurrentSessionId(saved.session.id);
    },
    [loadSession, restoreSession, setCurrentSessionId]
  );

  const handleStopAndArchive = useCallback(() => {
    if (currentSession) {
      saveSession({ ...currentSession, status: "paused" }, debateMessages);
    }
    setCurrentSessionId(null);
    handleStopSession();
  }, [
    currentSession,
    debateMessages,
    handleStopSession,
    saveSession,
    setCurrentSessionId,
  ]);

  useKeyboardShortcuts({
    onStartSession: () => {
      void handleStartSession();
    },
    onStopSession: handleStopAndArchive,
    onAdvancePhase: () => {
      void handleAdvancePhase();
    },
    onSaveSession: () => {
      if (currentSession) saveSession(currentSession, debateMessages);
    },
    onExportJSON: () => {
      if (currentSession) exportToJSON(currentSession, debateMessages);
    },
    onExportMarkdown: () => {
      if (currentSession) exportToMarkdown(currentSession, debateMessages);
    },
    onToggleHelp: () => setShowShortcutsHelp((prev) => !prev),
  });

  const error = catalogError ?? sessionError;

  if (isCatalogLoading) return <LoadingState />;
  if (!catalog || agents.length === 0) return <EmptyState error={error} />;

  return (
    <MainWorkspace
      catalog={catalog}
      currentSession={currentSession}
      debateMessages={debateMessages}
      brief={brief}
      setBrief={setBrief as React.Dispatch<React.SetStateAction<string>>}
      isLoading={isLoading}
      progressPercent={progressPercent}
      activePhase={activePhase}
      setActivePhase={setActivePhase as (p: string) => void}
      phases={phases as string[]}
      realAgents={realAgents}
      displayedAgents={displayedAgents}
      showAllAgents={showAllAgents}
      setShowAllAgents={setShowAllAgents}
      phaseAgents={phaseAgents}
      agentStats={agentStats}
      expandedAgents={expandedAgents}
      toggleAgentExpand={toggleAgentExpand}
      getAgentState={getAgentState}
      savedSessions={savedSessions}
      error={error}
      showShortcutsHelp={showShortcutsHelp}
      onStartSession={handleStartSession}
      onStopAndArchive={handleStopAndArchive}
      onAdvancePhase={handleAdvancePhase}
      onFileContent={handleFileContent}
      onLoadSavedSession={handleLoadSavedSession}
      onDeleteSession={deleteSession}
      onClearAllSessions={clearAllSessions}
      onCloseShortcutsHelp={() => setShowShortcutsHelp(false)}
    />
  );
}
