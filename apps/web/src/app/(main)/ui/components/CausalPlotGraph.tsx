import { Network, Filter, Play, AlertCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GraphNode {
  id: string;
  label: string;
  type: "scene" | "character" | "event";
  x: number;
  y: number;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  weight: number; // 0-1 confidence
  label?: string;
  type?: "conflict" | "reveal" | "twist" | "normal";
}

interface CausalPlotGraphProps {
  layout?: "force" | "grid";
  filter?: "all" | "conflict" | "reveal" | "twist";
  nodes: GraphNode[];
  edges: GraphEdge[];
  isEmpty?: boolean;
  noLinks?: boolean;
  onRunStations?: () => void;
}

type PlotFilter = NonNullable<CausalPlotGraphProps["filter"]>;

function isPlotFilter(value: string): value is PlotFilter {
  return ["all", "conflict", "reveal", "twist"].includes(value);
}

const nodeColors = {
  scene: "var(--color-accent)",
  character: "var(--state-final)",
  event: "var(--state-alt)",
};

const edgeColors = {
  conflict: "var(--state-flagged)",
  reveal: "var(--color-accent)",
  twist: "var(--state-alt)",
  normal: "var(--color-muted)",
};

interface GraphSvgProps {
  nodes: GraphNode[];
  filteredEdges: GraphEdge[];
}

function GraphSvg({ nodes, filteredEdges }: GraphSvgProps) {
  return (
    <svg className="w-full h-full">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="var(--color-muted)"
            opacity="0.5"
          />
        </marker>
      </defs>
      <g>
        {filteredEdges.map((edge) => {
          const fromNode = nodes.find((n) => n.id === edge.from);
          const toNode = nodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;
          return (
            <g key={edge.id}>
              <line
                x1={`${fromNode.x}%`}
                y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`}
                y2={`${toNode.y}%`}
                stroke={edgeColors[edge.type ?? "normal"]}
                strokeWidth={1 + edge.weight * 2}
                strokeOpacity={0.3 + edge.weight * 0.4}
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}
      </g>
      <g>
        {nodes.map((node) => (
          <g key={node.id} style={{ opacity: 1 }}>
            <circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r="20"
              fill={nodeColors[node.type]}
              opacity="0.2"
              className="cursor-pointer hover:opacity-40 transition-opacity"
            />
            <circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r="12"
              fill={nodeColors[node.type]}
              className="cursor-pointer"
            />
            <text
              x={`${node.x}%`}
              y={`${node.y + 5}%`}
              textAnchor="middle"
              fill="var(--color-text)"
              fontSize="12"
              className="pointer-events-none select-none"
            >
              {node.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function CausalPlotGraph({
  layout = "force",
  filter = "all",
  nodes,
  edges,
  isEmpty = false,
  noLinks = false,
  onRunStations,
}: CausalPlotGraphProps) {
  const [currentLayout, setCurrentLayout] = useState(layout);
  const [currentFilter, setCurrentFilter] = useState(filter);

  if (noLinks || (edges?.length === 0 && nodes && nodes.length > 0)) {
    return (
      <Card className="p-8 bg-[var(--color-panel)] border-[var(--color-surface)]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--state-alt)]/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-[var(--state-alt)]" />
          </div>
          <h3 className="text-[var(--color-text)] mb-2">لا توجد روابط سببية</h3>
          <p className="text-[var(--color-muted)] mb-4" dir="rtl">
            تم العثور على {nodes.length} عقدة ولكن لا توجد علاقات سببية بينها
          </p>
          <Button
            variant="outline"
            onClick={onRunStations}
            className="border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
          >
            <Play className="w-4 h-4 ml-2" />
            تشغيل المحطة 6 (الروابط السببية)
          </Button>
        </div>
      </Card>
    );
  }

  if (isEmpty || nodes.length === 0) {
    return (
      <Card className="p-8 bg-[var(--color-panel)] border-[var(--color-surface)]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center mx-auto mb-4">
            <Network className="w-8 h-8 text-[var(--color-muted)]" />
          </div>
          <h3 className="text-[var(--color-text)] mb-2">لا توجد بيانات</h3>
          <p className="text-[var(--color-muted)] mb-4" dir="rtl">
            قم بتشغيل المحطات 3-6 للحصول على الرسم البياني السببي
          </p>
          <Button
            variant="outline"
            onClick={onRunStations}
            className="border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
          >
            <Play className="w-4 h-4 ml-2" />
            تشغيل المحطات الداعمة
          </Button>
        </div>
      </Card>
    );
  }

  const filteredEdges =
    currentFilter === "all"
      ? edges
      : edges.filter((e) => e.type === currentFilter);

  return (
    <Card className="bg-[var(--color-panel)] border-[var(--color-surface)]">
      <div className="p-4 border-b border-[var(--color-surface)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[var(--color-text)]" dir="rtl">
            الرسم البياني السببي
          </h3>
          <div className="flex items-center gap-2">
            <Select
              value={currentFilter}
              onValueChange={(value) => {
                if (isPlotFilter(value)) setCurrentFilter(value);
              }}
            >
              <SelectTrigger className="w-[140px] bg-[var(--color-surface)] border-[var(--color-surface)] text-[var(--color-text)]">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--color-panel)] border-[var(--color-surface)]">
                <SelectItem value="all" className="text-[var(--color-text)]">
                  الكل
                </SelectItem>
                <SelectItem
                  value="conflict"
                  className="text-[var(--color-text)]"
                >
                  صراع
                </SelectItem>
                <SelectItem value="reveal" className="text-[var(--color-text)]">
                  كشف
                </SelectItem>
                <SelectItem value="twist" className="text-[var(--color-text)]">
                  تطور مفاجئ
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 bg-[var(--color-surface)] rounded-lg p-1">
              <Button
                variant={currentLayout === "force" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentLayout("force")}
                className={
                  currentLayout === "force"
                    ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
                    : ""
                }
              >
                قوة
              </Button>
              <Button
                variant={currentLayout === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentLayout("grid")}
                className={
                  currentLayout === "grid"
                    ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
                    : ""
                }
              >
                شبكة
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[var(--color-muted)]">
          <span>{nodes.length} عقدة</span>
          <span>•</span>
          <span>{filteredEdges.length} رابط</span>
        </div>
      </div>

      <div className="relative h-[400px] overflow-hidden bg-[var(--color-bg)]">
        <GraphSvg nodes={nodes} filteredEdges={filteredEdges} />

        <div className="absolute bottom-4 left-4 bg-[var(--color-panel)]/90 backdrop-blur-sm border border-[var(--color-surface)] rounded-lg p-3 space-y-2">
          {(["scene", "character", "event"] as const).map((type) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: nodeColors[type] }}
              />
              <span className="text-[var(--color-muted)]">
                {type === "scene"
                  ? "مشهد"
                  : type === "character"
                    ? "شخصية"
                    : "حدث"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
