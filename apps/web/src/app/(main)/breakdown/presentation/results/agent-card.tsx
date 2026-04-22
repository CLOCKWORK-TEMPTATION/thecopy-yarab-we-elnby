import React from "react";
import type { AgentDef } from "../../domain/models";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Loader2 } from "lucide-react";

interface AgentCardProps {
  agent: AgentDef;
  items: string[];
  isProcessing: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  items,
  isProcessing,
}) => {
  const hasItems = items && items.length > 0;

  return (
    <CardSpotlight>
      <div
        className={`
      relative overflow-hidden rounded-xl border transition-all duration-300
      ${hasItems ? "bg-white/[0.04] border-white/8" : "bg-black/14 border-white/8 opacity-60"}
      hover:opacity-100 hover:border-white/12
    `}
      >
        {/* Header */}
        <div
          className={`flex items-center gap-3 p-4 border-b border-white/8 ${agent.color} bg-opacity-10`}
        >
          <div className={`p-2 rounded-lg ${agent.color} text-white shadow-lg`}>
            {agent.icon}
          </div>
          <div>
            <h3 className="font-bold text-sm md:text-base text-white">
              {agent.label}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 min-h-[120px]">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center h-full text-white/55 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">جاري التحليل...</span>
            </div>
          ) : (
            <>
              {hasItems ? (
                <ul className="space-y-2">
                  {items.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-white/68"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/45 gap-1">
                  <span className="text-sm">لا توجد عناصر</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </CardSpotlight>
  );
};

export default AgentCard;
