/**
 * @module BrainStormContent
 * @description المكون المنسّق الرئيسي — يجمع ويربط جميع الأجزاء
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAgentStates } from "../hooks/useAgentStates";
import { useBrainstormCatalog } from "../hooks/useBrainstormCatalog";
import { useSession } from "../hooks/useSession";
import { useSessionPersistence } from "../hooks/useSessionPersistence";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { exportToJSON, exportToMarkdown } from "../lib/export";
import BrainStormHeader from "./layout/BrainStormHeader";
import ControlPanel from "./features/ControlPanel";
import DebatePanel from "./features/DebatePanel";
import { ExportControls } from "./features/ExportControls";
import { SessionHistory } from "./features/SessionHistory";
import { FinalResult } from "./features/FinalResult";
import AgentsSidebar from "./layout/AgentsSidebar";
import FeaturesGrid from "./features/FeaturesGrid";
import { KeyboardShortcutsHelp } from "./features/KeyboardShortcutsHelp";
import type { BrainstormPhase } from "../types";

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
    if (!isLoaded) {
      return;
    }

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
      if (!saved) {
        return;
      }

      restoreSession(saved.session, saved.messages);
      setCurrentSessionId(saved.session.id);
    },
    [loadSession, restoreSession, setCurrentSessionId]
  );

  const handleStopAndArchive = useCallback(() => {
    if (currentSession) {
      saveSession(
        {
          ...currentSession,
          status: "paused",
        },
        debateMessages
      );
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

  // اختصارات لوحة المفاتيح — بعد تعريف جميع handlers
  useKeyboardShortcuts({
    onStartSession: handleStartSession,
    onStopSession: handleStopAndArchive,
    onAdvancePhase: handleAdvancePhase,
    onSaveSession: () => {
      if (currentSession) {
        saveSession(currentSession, debateMessages);
      }
    },
    onExportJSON: () => {
      if (currentSession) {
        exportToJSON(currentSession, debateMessages);
      }
    },
    onExportMarkdown: () => {
      if (currentSession) {
        exportToMarkdown(currentSession, debateMessages);
      }
    },
    onToggleHelp: () => setShowShortcutsHelp((prev) => !prev),
  });

  const error = catalogError ?? sessionError;

  if (isCatalogLoading) {
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

  if (!catalog || agents.length === 0) {
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
          error={error || "فشل تحميل بيانات Brain Storm AI من الباك إند"}
          currentSession={null}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" dir="rtl">
      <BrainStormHeader
        agentStats={agentStats}
        error={error}
        currentSession={currentSession}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* العمود الأيسر — لوحة التحكم والنقاش */}
        <div className="lg:col-span-2 space-y-6">
          <ControlPanel
            phases={phases}
            activePhase={activePhase}
            setActivePhase={(p) => setActivePhase(p as BrainstormPhase)}
            currentSession={currentSession}
            brief={brief}
            setBrief={setBrief}
            isLoading={isLoading}
            progressPercent={progressPercent}
            onStartSession={handleStartSession}
            onStopSession={handleStopAndArchive}
            onAdvancePhase={handleAdvancePhase}
            onFileContent={handleFileContent}
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

        {/* العمود الأيمن — الوكلاء */}
        <div className="space-y-6">
          <AgentsSidebar
            displayedAgents={displayedAgents}
            allAgents={realAgents}
            showAllAgents={showAllAgents}
            setShowAllAgents={setShowAllAgents}
            totalAgentCount={realAgents.length}
            phaseAgentCount={phaseAgents.length}
            activePhase={activePhase}
            getAgentState={getAgentState}
            expandedAgents={expandedAgents}
            toggleAgentExpand={toggleAgentExpand}
          />

          <SessionHistory
            sessions={savedSessions}
            onLoad={handleLoadSavedSession}
            onDelete={deleteSession}
            onClearAll={clearAllSessions}
          />
        </div>
      </div>

      <FeaturesGrid agentStats={agentStats} />

      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}
