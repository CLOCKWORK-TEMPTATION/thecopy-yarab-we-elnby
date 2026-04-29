import {
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Maximize2,
  FileEdit,
  BarChart3,
  Code2,
  Lightbulb,
  FolderOpen,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { DynamicMotionDiv } from "@/components/ui/dynamic-motion";

import { UniverseNode } from "./UniverseNode";

type View = "editor" | "analysis" | "development" | "brainstorm" | "assets";

interface UniverseMapNode {
  id: string;
  view: View;
  label: string;
  icon: React.ReactNode;
  x: number;
  y: number;
  weight?: "weak" | "normal" | "strong";
}

interface UniverseMapProps {
  zoom?: "far" | "mid" | "near";
  cluster?: boolean;
  grid?: boolean;
  activeView?: View | null;
  onNavigate?: (view: View) => void;
}

const nodes: UniverseMapNode[] = [
  {
    id: "editor",
    view: "editor",
    label: "المحرر",
    icon: <FileEdit className="w-6 h-6" />,
    x: 30,
    y: 30,
    weight: "strong",
  },
  {
    id: "analysis",
    view: "analysis",
    label: "التحليل",
    icon: <BarChart3 className="w-6 h-6" />,
    x: 70,
    y: 30,
    weight: "strong",
  },
  {
    id: "development",
    view: "development",
    label: "التطوير",
    icon: <Code2 className="w-6 h-6" />,
    x: 50,
    y: 60,
    weight: "normal",
  },
  {
    id: "brainstorm",
    view: "brainstorm",
    label: "العصف الذهني",
    icon: <Lightbulb className="w-6 h-6" />,
    x: 20,
    y: 70,
    weight: "normal",
  },
  {
    id: "assets",
    view: "assets",
    label: "الأصول",
    icon: <FolderOpen className="w-6 h-6" />,
    x: 80,
    y: 70,
    weight: "weak",
  },
];

const connections = [
  { from: "editor", to: "analysis", weight: "strong" },
  { from: "analysis", to: "development", weight: "strong" },
  { from: "editor", to: "brainstorm", weight: "normal" },
  { from: "brainstorm", to: "editor", weight: "weak" },
  { from: "assets", to: "editor", weight: "weak" },
  { from: "assets", to: "analysis", weight: "weak" },
];

const zoomScales = {
  far: 0.7,
  mid: 1,
  near: 1.3,
};

function getLineWidth(weight: string): number {
  switch (weight) {
    case "weak":
      return 1;
    case "strong":
      return 3;
    default:
      return 2;
  }
}

function getLineOpacity(weight: string): number {
  switch (weight) {
    case "weak":
      return 0.2;
    case "strong":
      return 0.5;
    default:
      return 0.35;
  }
}

interface ZoomControlsProps {
  currentZoom: "far" | "mid" | "near";
  showGrid: boolean;
  onZoomChange: (zoom: "far" | "mid" | "near") => void;
  onToggleGrid: () => void;
}

function ZoomControls({
  currentZoom,
  showGrid,
  onZoomChange,
  onToggleGrid,
}: ZoomControlsProps) {
  const activeClass = "bg-[var(--color-accent)] text-[var(--color-bg)]";
  const inactiveClass =
    "text-[var(--color-text)] hover:bg-[var(--color-surface)]";
  return (
    <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
      <div className="bg-[var(--color-panel)] border border-[var(--color-surface)] rounded-lg p-2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onZoomChange("far")}
          className={currentZoom === "far" ? activeClass : inactiveClass}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onZoomChange("mid")}
          className={currentZoom === "mid" ? activeClass : inactiveClass}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onZoomChange("near")}
          className={currentZoom === "near" ? activeClass : inactiveClass}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleGrid}
        className={
          showGrid
            ? activeClass
            : "bg-[var(--color-panel)] border border-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
        }
      >
        <Grid3x3 className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface MapCanvasProps {
  scale: number;
  showGrid: boolean;
  activeView: View | null;
  onNavigate?: (view: View) => void;
}

function MapCanvas({
  scale,
  showGrid,
  activeView,
  onNavigate,
}: MapCanvasProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <DynamicMotionDiv
        className="relative"
        style={{
          width: "800px",
          height: "600px",
          transform: `scale(${scale})`,
        }}
        animate={{ scale }}
        transition={{ duration: 0.35, ease: [0.4, 0.0, 0.2, 1] }}
      >
        {showGrid && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.1 }}
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="var(--color-text)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker
              id="arrowhead-map"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="2.5"
              orient="auto"
            >
              <polygon
                points="0 0, 8 2.5, 0 5"
                fill="var(--color-accent)"
                opacity="0.4"
              />
            </marker>
          </defs>
          {connections.map((conn, idx) => {
            const fromNode = nodes.find((n) => n.id === conn.from);
            const toNode = nodes.find((n) => n.id === conn.to);
            if (!fromNode || !toNode) return null;
            const x1 = (fromNode.x / 100) * 800;
            const y1 = (fromNode.y / 100) * 600;
            const x2 = (toNode.x / 100) * 800;
            const y2 = (toNode.y / 100) * 600;
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--color-accent)"
                strokeWidth={getLineWidth(conn.weight)}
                strokeOpacity={getLineOpacity(conn.weight)}
                markerEnd="url(#arrowhead-map)"
              />
            );
          })}
        </svg>

        {nodes.map((node, idx) => (
          <DynamicMotionDiv
            key={node.id}
            className="absolute"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.45,
              delay: idx * 0.1,
              ease: [0.4, 0.0, 0.2, 1],
            }}
          >
            <UniverseNode
              id={node.id}
              label={node.label}
              icon={node.icon}
              x={node.x}
              y={node.y}
              isActive={activeView === node.view}
              onClick={() => onNavigate?.(node.view)}
            />
          </DynamicMotionDiv>
        ))}
      </DynamicMotionDiv>
    </div>
  );
}

export function UniverseMap({
  zoom = "mid",
  grid = false,
  activeView = null,
  onNavigate,
}: UniverseMapProps) {
  const [currentZoom, setCurrentZoom] = useState<"far" | "mid" | "near">(zoom);
  const [showGrid, setShowGrid] = useState(grid);
  const scale = zoomScales[currentZoom];

  return (
    <div className="relative w-full h-screen bg-[var(--color-bg)] overflow-hidden">
      <ZoomControls
        currentZoom={currentZoom}
        showGrid={showGrid}
        onZoomChange={setCurrentZoom}
        onToggleGrid={() => setShowGrid(!showGrid)}
      />

      <div className="absolute top-6 right-6 z-10">
        <div className="bg-[var(--color-panel)]/90 backdrop-blur-sm border border-[var(--color-surface)] rounded-lg px-6 py-3">
          <h1 className="text-[var(--color-text)]" dir="rtl">
            خريطة الكون
          </h1>
          <p className="text-[var(--color-muted)]" dir="rtl">
            اختر وضعية العمل
          </p>
        </div>
      </div>

      <MapCanvas
        scale={scale}
        showGrid={showGrid}
        activeView={activeView}
        onNavigate={onNavigate}
      />

      <div className="absolute bottom-6 left-6 z-10 bg-[var(--color-panel)]/90 backdrop-blur-sm border border-[var(--color-surface)] rounded-lg p-4">
        <h3 className="text-[var(--color-text)] mb-3" dir="rtl">
          وزن الروابط
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 bg-[var(--color-accent)] opacity-50" />
            <span className="text-[var(--color-muted)]">قوي</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 bg-[var(--color-accent)] opacity-35" />
            <span className="text-[var(--color-muted)]">عادي</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 bg-[var(--color-accent)] opacity-20" />
            <span className="text-[var(--color-muted)]">ضعيف</span>
          </div>
        </div>
      </div>
    </div>
  );
}
