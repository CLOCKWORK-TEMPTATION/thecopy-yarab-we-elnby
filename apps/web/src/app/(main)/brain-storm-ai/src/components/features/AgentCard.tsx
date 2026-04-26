"use client";

/**
 * الصفحة: brain-storm-ai / AgentCard
 * الهوية: بطاقة وكيل داخلية بطابع شبكي/تحليلي متسق مع القشرة الداكنة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات الصفحة المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  STATUS_COLORS,
  CATEGORY_COLORS,
  CATEGORY_NAMES,
} from "../../constants";
import { getCollaborators } from "../../lib/catalog";

import AgentIconComponent from "./AgentIconComponent";

import type { BrainstormAgentDefinition, AgentState } from "../../types";



interface AgentCardProps {
  agent: BrainstormAgentDefinition;
  allAgents: readonly BrainstormAgentDefinition[];
  state: AgentState;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function AgentCard({
  agent,
  allAgents,
  state,
  isExpanded,
  onToggleExpand,
}: AgentCardProps) {
  const statusColor = STATUS_COLORS[state.status];
  const categoryColor = CATEGORY_COLORS[agent.category];

  const collaborators = useMemo(
    () => getCollaborators(allAgents, agent),
    [allAgents, agent]
  );

  return (
    <CardSpotlight
      className={`overflow-hidden rounded-[22px] border bg-white/[0.04] p-3 backdrop-blur-xl transition-colors ${
        state.status === "working" ? "border-blue-400/40" : "border-white/8"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="text-blue-400">
          <AgentIconComponent icon={agent.icon} />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2 justify-end">
            <Badge variant="secondary" className={`text-xs ${categoryColor}`}>
              {CATEGORY_NAMES[agent.category]}
            </Badge>
            <p className="font-medium text-sm truncate text-white">
              {agent.nameAr}
            </p>
          </div>
          <p className="text-xs text-white/50 truncate mt-1">{agent.role}</p>
          {state.lastMessage ? (
            <p className="text-xs text-white/45 mt-1 truncate">
              {state.lastMessage}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-3 pt-3 border-t border-white/8 space-y-3 text-right">
          <p className="text-xs leading-6 text-white/58">{agent.description}</p>
          <div className="flex flex-wrap gap-1 justify-end">
            {agent.capabilities.canAnalyze ? (
              <Badge variant="outline" className="text-xs bg-white/5">
                تحليل
              </Badge>
            ) : null}
            {agent.capabilities.canGenerate ? (
              <Badge variant="outline" className="text-xs bg-white/5">
                توليد
              </Badge>
            ) : null}
            {agent.capabilities.canPredict ? (
              <Badge variant="outline" className="text-xs bg-white/5">
                تنبؤ
              </Badge>
            ) : null}
            {agent.capabilities.hasMemory ? (
              <Badge variant="outline" className="text-xs bg-white/5">
                ذاكرة
              </Badge>
            ) : null}
            {agent.capabilities.supportsRAG ? (
              <Badge variant="outline" className="text-xs bg-white/5">
                RAG
              </Badge>
            ) : null}
          </div>
          {collaborators.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-white/45">يتعاون مع:</p>
              <div className="flex flex-wrap gap-1 mt-1 justify-end">
                {collaborators
                  .slice(0, 3)
                  .map((c: { id: string; nameAr: string }) => (
                    <Badge
                      key={c.id}
                      variant="secondary"
                      className="text-xs bg-white/8 text-white/85"
                    >
                      {c.nameAr}
                    </Badge>
                  ))}
                {collaborators.length > 3 ? (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-white/8 text-white/85"
                  >
                    +{collaborators.length - 3}
                  </Badge>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between mt-2 text-xs text-white/42">
            <span>التعقيد: {(agent.complexityScore * 100).toFixed(0)}%</span>
            <span>الاسم: {agent.name}</span>
          </div>
        </div>
      ) : null}
    </CardSpotlight>
  );
}
