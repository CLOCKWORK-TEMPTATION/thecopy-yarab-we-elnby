/**
 * @module useSession
 * @description هوك إدارة جلسة العصف الذهني والنقاش
 */

"use client";

import { useState, useCallback, useMemo, useRef } from "react";

import {
  PHASE_TASK_PREFIXES,
  EMPTY_BRIEF_ERROR,
  TOTAL_PHASES,
} from "../constants";
import { conductDebate } from "../lib/api";
import { buildAgentStats, getAgentsForPhase } from "../lib/catalog";
import {
  createSessionDiagnostics,
  createAgentDiagnosticEntry,
  finalizeAgentDiagnostic,
} from "../lib/diagnostics";
import { getPhaseIcon, getPhaseColor } from "../lib/utils";

import type {
  SessionDiagnostics,
  AgentDiagnosticEntry,
} from "../lib/diagnostics";
import type {
  Session,
  DebateMessage,
  BrainstormPhase,
  BrainstormAgentDefinition,
  AgentState,
  PhaseDisplayInfo,
  BrainstormPhaseDefinition,
} from "../types";

/** الحد الأقصى لمحاولات إعادة تنفيذ النقاش */
const MAX_RETRIES = 1;

interface UseSessionOptions {
  updateAgentState: (agentId: string, updates: Partial<AgentState>) => void;
  resetAllAgents: () => void;
  realAgents: readonly BrainstormAgentDefinition[];
  phaseDefinitions: readonly BrainstormPhaseDefinition[];
}

/** تصنيف الخطأ لتحديد إمكانية إعادة المحاولة */
function classifyError(err: unknown): {
  message: string;
  retryable: boolean;
} {
  if (!(err instanceof Error)) {
    return { message: "خطأ غير معروف أثناء النقاش", retryable: false };
  }
  const msg = err.message;
  if (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("Failed to fetch") ||
    msg.includes("503") ||
    msg.includes("504")
  ) {
    return { message: `خطأ شبكة: ${msg}`, retryable: true };
  }
  if (msg.includes("429")) {
    return { message: msg, retryable: false };
  }
  if (msg.includes("401")) {
    return { message: msg, retryable: false };
  }
  return { message: msg, retryable: true };
}

export function useSession({
  updateAgentState,
  resetAllAgents,
  realAgents,
  phaseDefinitions,
}: UseSessionOptions) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<BrainstormPhase>(1);
  const [brief, setBrief] = useState("");
  const [debateMessages, setDebateMessages] = useState<DebateMessage[]>([]);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [diagnostics, setDiagnostics] = useState<SessionDiagnostics | null>(
    null
  );
  const [phaseProgress, setPhaseProgress] = useState(0); // تقدم داخل المرحلة الحالية (0-1)

  const retryCountRef = useRef(0);

  const agentStats = useMemo(() => buildAgentStats(realAgents), [realAgents]);
  const phaseAgents = useMemo(
    () => getAgentsForPhase(realAgents, activePhase),
    [activePhase, realAgents]
  );
  const displayedAgents = showAllAgents ? realAgents : phaseAgents;

  const phases: PhaseDisplayInfo[] = useMemo(
    () =>
      phaseDefinitions.map((phase) => ({
        id: phase.id,
        name: phase.name,
        nameEn: phase.nameEn,
        description: phase.description,
        icon: getPhaseIcon(phase.id),
        color: getPhaseColor(phase.id),
        agentCount: getAgentsForPhase(realAgents, phase.id).length,
      })),
    [phaseDefinitions, realAgents]
  );

  // حساب التقدم المركب: المراحل المكتملة + التقدم داخل المرحلة الحالية
  const progressPercent = (
    ((activePhase - 1 + phaseProgress) / TOTAL_PHASES) *
    100
  ).toFixed(1);

  /** تنفيذ نقاش بين الوكلاء مع إعادة محاولة وتشخيصات */
  const executeAgentDebate = useCallback(
    async (
      agents: readonly BrainstormAgentDefinition[],
      session: Session,
      task?: string
    ) => {
      const agentIds = agents.map((a) => a.id);
      const debateTask = task ?? `تحليل الفكرة: ${session.brief}`;

      const agentDiags: AgentDiagnosticEntry[] = agents.map((a) =>
        createAgentDiagnosticEntry(a.id)
      );

      setPhaseProgress(0); // إعادة تعيين التقدم داخل المرحلة

      agents.forEach((agent) => {
        updateAgentState(agent.id, {
          status: "working",
          lastMessage: "جاري المشاركة في النقاش...",
        });
      });

      try {
        const { result: debateResult } = await conductDebate({
          task: debateTask,
          context: {
            brief: session.brief,
            phase: session.phase,
            sessionId: session.id,
          },
          agentIds,
        });

        agentDiags.forEach((diag) => {
          finalizeAgentDiagnostic(diag, "completed");
        });

        retryCountRef.current = 0;

        let completedAgents = 0;
        for (const proposal of debateResult.proposals) {
          const agent = agents.find((a) => a.id === proposal.agentId);
          if (agent) {
            updateAgentState(proposal.agentId, {
              status: "completed",
              lastMessage: `ثقة: ${(proposal.confidence * 100).toFixed(0)}%`,
              progress: proposal.confidence * 100,
            });

            setDebateMessages((prev) => [
              ...prev,
              {
                agentId: proposal.agentId,
                agentName: agent.nameAr,
                message: proposal.proposal,
                timestamp: new Date(),
                type: "proposal",
              },
            ]);

            completedAgents++;
            // تحديث التقدم داخل المرحلة
            setPhaseProgress(completedAgents / agents.length);
          }
        }

        // وكلاء لم يرد لهم اقتراح
        const respondedIds = new Set(
          debateResult.proposals.map((p) => p.agentId)
        );
        agents.forEach((agent) => {
          if (!respondedIds.has(agent.id)) {
            updateAgentState(agent.id, {
              status: "completed",
              lastMessage: "لم يُسهم في هذه الجولة",
              progress: 0,
            });
            completedAgents++;
            setPhaseProgress(completedAgents / agents.length);
          }
        });

        if (debateResult.consensus || debateResult.finalDecision) {
          setDebateMessages((prev) => [
            ...prev,
            {
              agentId: "judge",
              agentName: "الحكم",
              message: `${debateResult.finalDecision}\n\n📋 السبب: ${debateResult.judgeReasoning}`,
              timestamp: new Date(),
              type: "decision",
            },
          ]);
        }

        setCurrentSession((prev) =>
          prev
            ? {
                ...prev,
                results: {
                  ...prev.results,
                  [`phase${session.phase}Debate`]: debateResult,
                },
              }
            : null
        );

        setDiagnostics((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            agentEntries: [...prev.agentEntries, ...agentDiags],
            phaseTimings: {
              ...prev.phaseTimings,
              [session.phase]: {
                startedAt: agentDiags[0]?.startedAt ?? new Date().toISOString(),
                completedAt: new Date().toISOString(),
                agentCount: agents.length,
                respondedCount: respondedIds.size,
              },
            },
          };
        });

        // إكمال المرحلة
        setPhaseProgress(1);

        if (session.phase < TOTAL_PHASES) {
          setTimeout(() => {
            const nextPhase = (session.phase + 1) as BrainstormPhase;
            setActivePhase(nextPhase);
            setPhaseProgress(0); // إعادة تعيين للمرحلة الجديدة
            setCurrentSession((prev) =>
              prev ? { ...prev, phase: nextPhase } : null
            );
          }, 2000);
        } else {
          setCurrentSession((prev) =>
            prev ? { ...prev, status: "completed" } : null
          );
        }
      } catch (err) {
        const classified = classifyError(err);

        agentDiags.forEach((diag) => {
          finalizeAgentDiagnostic(diag, "error", classified.message);
        });

        // إعادة المحاولة إذا كان الخطأ قابلاً لذلك
        if (classified.retryable && retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          const attempt = retryCountRef.current;

          agents.forEach((agent) => {
            updateAgentState(agent.id, {
              status: "working",
              lastMessage: `إعادة المحاولة (${attempt}/${MAX_RETRIES})...`,
            });
          });

          setError(`جاري إعادة المحاولة... (${attempt}/${MAX_RETRIES})`);

          await new Promise((resolve) => setTimeout(resolve, 1500));

          try {
            await executeAgentDebate(agents, session, task);
            return;
          } catch {
            // فشل إعادة المحاولة — نتابع أدناه
          }
        }

        retryCountRef.current = 0;
        setError(classified.message);

        // عرض سبب الخطأ لكل وكيل بدلاً من "فشل" المبهمة
        agents.forEach((agent) => {
          updateAgentState(agent.id, {
            status: "error",
            lastMessage: classified.retryable
              ? `فشل بعد إعادة المحاولة: ${classified.message.substring(0, 80)}`
              : classified.message.substring(0, 100),
          });
        });

        setDiagnostics((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            agentEntries: [...prev.agentEntries, ...agentDiags],
            errors: [
              ...prev.errors,
              {
                phase: session.phase,
                error: classified.message,
                retryable: classified.retryable,
                timestamp: new Date().toISOString(),
              },
            ],
          };
        });
      }
    },
    [updateAgentState]
  );

  const handleStartSession = useCallback(async () => {
    if (!brief.trim()) {
      setError(EMPTY_BRIEF_ERROR);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDebateMessages([]);
    retryCountRef.current = 0;

    try {
      const sessionId = `session-${Date.now()}`;
      const newSession: Session = {
        id: sessionId,
        brief,
        phase: 1,
        status: "active",
        startTime: new Date(),
        activeAgents: phaseAgents.map((a) => a.id),
      };

      setDiagnostics(createSessionDiagnostics(sessionId));
      setCurrentSession(newSession);
      setActivePhase(1);
      setBrief("");

      const phase1Agents = getAgentsForPhase(realAgents, 1);
      phase1Agents.forEach((agent) => {
        updateAgentState(agent.id, { status: "working" });
      });

      await executeAgentDebate(phase1Agents, newSession);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "فشل في إنشاء الجلسة";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [brief, phaseAgents, realAgents, updateAgentState, executeAgentDebate]);

  const handleStopSession = useCallback(() => {
    setCurrentSession(null);
    setActivePhase(1);
    setPhaseProgress(0);
    setDebateMessages([]);
    setDiagnostics(null);
    retryCountRef.current = 0;
    resetAllAgents();
  }, [resetAllAgents]);

  const restoreSession = useCallback(
    (session: Session, messages: DebateMessage[]) => {
      setCurrentSession(session);
      setActivePhase(session.phase);
      setBrief(session.brief);
      setDebateMessages(messages);
      setError(null);
      setDiagnostics(createSessionDiagnostics(session.id));

      // إذا كانت الجلسة مكتملة، اجعل التقدم 100%
      if (session.status === "completed") {
        setPhaseProgress(1);
      } else {
        // حساب التقدم بناءً على المرحلة الحالية
        setPhaseProgress(0.5); // افتراضي - يمكن تحسينه لاحقاً
      }

      resetAllAgents();
      session.activeAgents.forEach((agentId) => {
        updateAgentState(agentId, {
          status: "completed",
          lastMessage: "تمت استعادة الجلسة من السجل المحفوظ.",
        });
      });
    },
    [resetAllAgents, updateAgentState]
  );

  const handleAdvancePhase = useCallback(async () => {
    if (!currentSession) return;
    const nextPhase = Math.min(
      activePhase + 1,
      TOTAL_PHASES
    ) as BrainstormPhase;
    setActivePhase(nextPhase);
    const updatedSession = { ...currentSession, phase: nextPhase };
    setCurrentSession(updatedSession);
    const nextPhaseAgents = getAgentsForPhase(realAgents, nextPhase);
    const task = `${PHASE_TASK_PREFIXES[nextPhase]} ${currentSession.brief}`;

    try {
      await executeAgentDebate(nextPhaseAgents, updatedSession, task);
    } catch {
      setError(`فشل في إتمام المرحلة ${nextPhase}`);
    }
  }, [currentSession, activePhase, executeAgentDebate, realAgents]);

  return {
    currentSession,
    isLoading,
    error,
    setError,
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
    diagnostics,
    handleStartSession,
    handleStopSession,
    handleAdvancePhase,
    restoreSession,
  };
}
