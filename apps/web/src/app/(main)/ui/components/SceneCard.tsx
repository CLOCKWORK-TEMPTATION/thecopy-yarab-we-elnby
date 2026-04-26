import { motion } from "framer-motion";
import { Clock, ArrowRight, ArrowLeft, Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * Scene status type
 */
export type SceneStatus = "draft" | "final" | "alt" | "flagged";

/**
 * Core scene data
 */
export interface SceneData {
  id: string;
  title: string;
  beats?: string[];
  duration?: string;
  status: SceneStatus;
}

/**
 * Scene connection info
 */
export interface SceneConnections {
  linksIn?: number;
  linksOut?: number;
}

/**
 * Display configuration
 */
export interface SceneDisplayConfig {
  density?: "compact" | "comfortable";
  isFocused?: boolean;
}

/**
 * Scene card props - grouped to reduce parameter count from 10 to 5
 */
interface SceneCardProps {
  scene: SceneData;
  connections?: SceneConnections;
  display?: SceneDisplayConfig;
  onClick?: () => void;
}

const statusColors = {
  draft: "var(--state-draft)",
  final: "var(--state-final)",
  alt: "var(--state-alt)",
  flagged: "var(--state-flagged)",
};

const statusLabels = {
  draft: "مسودة",
  final: "نهائي",
  alt: "بديل",
  flagged: "مُعلّم",
};

export function SceneCard({
  scene,
  connections = {},
  display = {},
  onClick,
}: SceneCardProps) {
  const { id, title, beats = [], duration, status } = scene;
  const { linksIn = 0, linksOut = 0 } = connections;
  const { density = "comfortable", isFocused = false } = display;
  const isCompact = density === "compact";

  return (
    <motion.div
      className={`
        relative bg-[var(--color-panel)] border-2 rounded-xl overflow-hidden cursor-pointer
        transition-all duration-300 group
        ${isFocused ? "border-[var(--color-accent)] shadow-2xl" : "border-[var(--color-surface)] hover:border-[var(--color-accent-weak)]"}
        ${isCompact ? "min-w-[280px] min-h-[160px]" : "min-w-[320px] min-h-[200px]"}
      `}
      onClick={onClick}
      whileHover={{ scale: isFocused ? 1 : 1.02 }}
      layoutId={`scene-${id}`}
      style={{
        boxShadow: isFocused
          ? "0 20px 60px rgba(138, 155, 255, 0.3)"
          : "0 8px 24px rgba(0, 0, 0, 0.12)",
      }}
    >
      {/* Status indicator */}
      <div
        className="absolute top-0 right-0 w-1 h-full"
        style={{ backgroundColor: statusColors[status] }}
      />

      <div
        className={`p-${isCompact ? "4" : "6"} flex flex-col gap-${isCompact ? "2" : "3"}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3
            className="flex-1 text-[var(--color-text)] line-clamp-2"
            dir="rtl"
          >
            {title}
          </h3>
          {status === "flagged" && (
            <Flag
              className="w-4 h-4 flex-shrink-0"
              style={{ color: statusColors.flagged }}
            />
          )}
        </div>

        {/* Beats */}
        {beats.length > 0 && (
          <div className="flex flex-wrap gap-2" dir="rtl">
            {beats.slice(0, isCompact ? 2 : 4).map((beat, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
              >
                {beat}
              </Badge>
            ))}
            {beats.length > (isCompact ? 2 : 4) && (
              <Badge
                variant="secondary"
                className="bg-[var(--color-surface)] text-[var(--color-muted)]"
              >
                +{beats.length - (isCompact ? 2 : 4)}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--color-surface)]">
          <div className="flex items-center gap-4">
            {duration && (
              <div className="flex items-center gap-1 text-[var(--color-muted)]">
                <Clock className="w-4 h-4" />
                <span>{duration}</span>
              </div>
            )}
            <Badge
              variant="outline"
              className="border-current"
              style={{
                color: statusColors[status],
                borderColor: statusColors[status],
              }}
            >
              {statusLabels[status]}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-[var(--color-muted)]">
            {linksIn > 0 && (
              <div className="flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                <span>{linksIn}</span>
              </div>
            )}
            {linksOut > 0 && (
              <div className="flex items-center gap-1">
                <ArrowRight className="w-4 h-4" />
                <span>{linksOut}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
