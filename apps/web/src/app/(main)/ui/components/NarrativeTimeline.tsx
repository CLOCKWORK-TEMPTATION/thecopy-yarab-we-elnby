import { motion } from "framer-motion";
import {
  GitBranch,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Copy,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { toast } from "sonner"; // Temporarily disabled

interface TimelineScene {
  id: string;
  title: string;
  branch?: "A" | "B" | "C";
  act?: number;
  beat?: string;
}

interface NarrativeTimelineProps {
  mode: "linear" | "nonlinear";
  scenes: TimelineScene[];
  activeBranch?: "A" | "B" | "C" | "hidden";
  onSceneClick?: (sceneId: string) => void;
  onBranchCreate?: (sceneId: string, branch: "A" | "B" | "C") => void;
}

const branchColors = {
  A: "var(--color-accent)",
  B: "var(--state-alt)",
  C: "var(--state-final)",
};

interface TimelineSceneItemProps {
  scene: TimelineScene;
  index: number;
  mode: "linear" | "nonlinear";
  isActiveBranch: boolean;
  branchColor: string;
  draggedSceneId: string | null;
  onSceneClick?: (id: string) => void;
  onDragStart: (scene: TimelineScene) => void;
  onDragEnd: () => void;
  onBranchCreate: (sceneId: string, branch: "A" | "B" | "C") => void;
}

function TimelineSceneItem({
  scene,
  index,
  mode,
  isActiveBranch,
  branchColor,
  draggedSceneId,
  onSceneClick,
  onDragStart,
  onDragEnd,
  onBranchCreate,
}: TimelineSceneItemProps) {
  return (
    <motion.div
      className="relative pr-10 group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div
        className="absolute right-3.5 top-2 w-3 h-3 rounded-full border-2 bg-[var(--color-panel)]"
        style={{
          borderColor: isActiveBranch ? branchColor : "var(--color-surface)",
        }}
      />
      <div
        role="button"
        tabIndex={0}
        className="p-3 rounded-lg border border-[var(--color-surface)] hover:border-[var(--color-accent-weak)] bg-[var(--color-panel)] cursor-pointer transition-all"
        onClick={() => onSceneClick?.(scene.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            onSceneClick?.(scene.id);
          }
        }}
        draggable={mode === "nonlinear"}
        onDragStart={() => onDragStart(scene)}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-start gap-2">
          {mode === "nonlinear" && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-[var(--color-muted)] cursor-grab active:cursor-grabbing mt-1" />
            </div>
          )}
          <div className="flex-1">
            <h4 className="text-[var(--color-text)]" dir="rtl">
              {scene.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              {scene.act && (
                <span className="text-[var(--color-muted)]">
                  فصل {scene.act}
                </span>
              )}
              {scene.beat && (
                <Badge
                  variant="secondary"
                  className="bg-[var(--color-surface)] text-[var(--color-muted)]"
                >
                  {scene.beat}
                </Badge>
              )}
            </div>
          </div>
          {mode === "nonlinear" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onBranchCreate(scene.id, "A");
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-accent)] hover:bg-[var(--color-surface)]"
              title="إنشاء فرع"
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
        </div>
        {draggedSceneId === scene.id && (
          <motion.div
            className="absolute inset-0 border-2 border-dashed border-[var(--color-accent)] rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}
      </div>
    </motion.div>
  );
}

export function NarrativeTimeline({
  mode,
  scenes,
  activeBranch,
  onSceneClick,
  onBranchCreate,
}: NarrativeTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showBranches, setShowBranches] = useState(mode === "nonlinear");
  const [draggedScene, setDraggedScene] = useState<TimelineScene | null>(null);

  const groupedScenes = scenes.reduce(
    (acc, scene) => {
      const branch = scene.branch ?? "main";
      acc[branch] ??= [];
      acc[branch].push(scene);
      return acc;
    },
    {} as Record<string, TimelineScene[]>
  );

  const handleBranchCreate = (
    sceneId: string,
    targetBranch: "A" | "B" | "C"
  ) => {
    onBranchCreate?.(sceneId, targetBranch);
  };

  return (
    <div className="bg-[var(--color-panel)] border border-[var(--color-surface)] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[var(--color-surface)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[var(--color-text)]" dir="rtl">
            الخط الزمني السردي
          </h3>
          <Badge
            variant="outline"
            className="border-[var(--color-muted)] text-[var(--color-muted)]"
          >
            {mode === "linear" ? "خطي" : "غير خطي"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {mode === "nonlinear" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBranches(!showBranches)}
              className="text-[var(--color-accent)] hover:bg-[var(--color-surface)]"
            >
              <GitBranch className="w-4 h-4 ml-1" />
              {showBranches ? "إخفاء الفروع" : "إظهار الفروع"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {Object.entries(groupedScenes).map(([branch, branchScenes]) => {
            const isActiveBranch = activeBranch === branch || branch === "main";
            const branchColor =
              branch !== "main"
                ? branchColors[branch as "A" | "B" | "C"]
                : "var(--color-accent)";

            if (!showBranches && branch !== "main" && branch !== activeBranch) {
              return null;
            }

            return (
              <div key={branch} className="space-y-3">
                {branch !== "main" && (
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch
                      className="w-4 h-4"
                      style={{ color: branchColor }}
                    />
                    <span className="text-[var(--color-muted)]" dir="rtl">
                      فرع {branch}
                    </span>
                  </div>
                )}
                <div className="relative">
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-surface)]"
                    style={{
                      right: "1rem",
                      backgroundColor: isActiveBranch
                        ? branchColor
                        : "var(--color-surface)",
                    }}
                  />
                  <div className="space-y-3">
                    {branchScenes.map((scene, index) => (
                      <TimelineSceneItem
                        key={scene.id}
                        scene={scene}
                        index={index}
                        mode={mode}
                        isActiveBranch={isActiveBranch}
                        branchColor={branchColor}
                        draggedSceneId={draggedScene?.id ?? null}
                        onDragStart={setDraggedScene}
                        onDragEnd={() => setDraggedScene(null)}
                        onBranchCreate={handleBranchCreate}
                        {...(onSceneClick ? { onSceneClick } : {})}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
