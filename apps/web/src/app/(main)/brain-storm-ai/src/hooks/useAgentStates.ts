/**
 * @module useAgentStates
 * @description هوك إدارة حالات الوكلاء
 */

"use client";

import { useState, useCallback, useMemo } from "react";

import type { AgentState, BrainstormAgentDefinition } from "../types";

function createInitialAgentStates(
  agents: readonly BrainstormAgentDefinition[]
): Map<string, AgentState> {
  const initialStates = new Map<string, AgentState>();
  agents.forEach((agent) => {
    initialStates.set(agent.id, { id: agent.id, status: "idle" });
  });
  return initialStates;
}

export function useAgentStates(agents: readonly BrainstormAgentDefinition[]) {
  const realAgents = useMemo(() => agents, [agents]);

  const [agentStates, setAgentStates] = useState<Map<string, AgentState>>(() =>
    createInitialAgentStates(realAgents)
  );

  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  /** تحديث حالة وكيل محدد */
  const updateAgentState = useCallback(
    (agentId: string, updates: Partial<AgentState>) => {
      setAgentStates((prev) => {
        const next = new Map(prev);
        const current = next.get(agentId);
        if (current) {
          next.set(agentId, { ...current, ...updates });
        }
        return next;
      });
    },
    []
  );

  /** إعادة جميع الوكلاء لحالة الخمول */
  const resetAllAgents = useCallback(() => {
    setAgentStates(() => {
      const next = new Map<string, AgentState>();
      realAgents.forEach((agent) => {
        next.set(agent.id, {
          id: agent.id,
          status: "idle",
        });
      });
      return next;
    });
  }, [realAgents]);

  /** تبديل حالة توسيع بطاقة الوكيل */
  const toggleAgentExpand = useCallback((agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  /** الحصول على حالة وكيل */
  const getAgentState = useCallback(
    (agentId: string): AgentState => {
      return agentStates.get(agentId) ?? { id: agentId, status: "idle" };
    },
    [agentStates]
  );

  return {
    realAgents,
    agentStates,
    expandedAgents,
    updateAgentState,
    resetAllAgents,
    toggleAgentExpand,
    getAgentState,
  };
}
