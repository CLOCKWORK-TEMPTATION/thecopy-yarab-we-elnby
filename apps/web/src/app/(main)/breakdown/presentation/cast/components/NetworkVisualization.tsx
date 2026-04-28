/**
 * @fileoverview مكوّن شبكة علاقات الشخصيات
 */

import { Network } from "lucide-react";
import React, { useMemo } from "react";

import type { CastCardData } from "../types";

interface NetworkVisualizationProps {
  cast: CastCardData[];
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  cast,
}) => {
  const svgSize = 300;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const radius = Math.min(centerX, centerY) - 40;

  const nodes = useMemo(() => {
    return cast.map((member, i) => {
      const angle = (2 * Math.PI * i) / cast.length - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const isLead = member.roleCategory === "Lead";
      return {
        ...member,
        x,
        y,
        isLead,
        color: isLead
          ? "#fbbf24"
          : member.gender === "Male"
            ? "#22d3ee"
            : "#f472b6",
      };
    });
  }, [cast, centerX, centerY, radius]);

  const edges = useMemo(() => {
    const connections: { from: number; to: number; type: string }[] = [];
    nodes.forEach((node, i) => {
      node.relationships?.forEach((rel) => {
        const targetIndex = nodes.findIndex((n) => n.name === rel.character);
        if (targetIndex !== -1 && targetIndex > i) {
          connections.push({ from: i, to: targetIndex, type: rel.type });
        }
      });
    });
    return connections;
  }, [nodes]);

  return (
    <div className="bg-white/6/30 border border-white/8 rounded-[22px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Network className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold uppercase text-white/55">
          Character Network
        </span>
      </div>
      <svg width={svgSize} height={svgSize} className="mx-auto">
        {edges.map((edge, i) =>
          (() => {
            const fromNode = nodes[edge.from];
            const toNode = nodes[edge.to];
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={i}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
            );
          })()
        )}
        {nodes.map((node, i) => (
          <g key={i}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.isLead ? 20 : 14}
              fill={node.color}
              fillOpacity="0.3"
              stroke={node.color}
              strokeWidth="2"
              className="cursor-pointer hover:fill-opacity-50 transition-all"
            />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              className="text-[8px] fill-slate-300 pointer-events-none"
            >
              {node.name.slice(0, 6)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default NetworkVisualization;
