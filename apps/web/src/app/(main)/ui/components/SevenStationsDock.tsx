import { motion } from "framer-motion";
import { CheckCircle, Circle, Loader2, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface StationItem {
  id: number;
  title: string;
  state: "idle" | "running" | "review" | "finalized";
}

interface SevenStationsDockProps {
  current: number;
  progress: "idle" | "running" | "review" | "finalized";
  items: StationItem[];
  onNext?: () => void;
  onPrev?: () => void;
  onViewDetails?: (stationId: number) => void;
}

function getProgressLabel(
  progress: SevenStationsDockProps["progress"]
): string {
  const labels: Record<string, string> = {
    idle: "جاهز",
    running: "قيد التشغيل",
    review: "مراجعة",
    finalized: "مكتمل",
  };
  return labels[progress] ?? progress;
}

function getProgressClass(
  progress: SevenStationsDockProps["progress"]
): string {
  const classes: Record<string, string> = {
    idle: "border-[var(--color-muted)] text-[var(--color-muted)]",
    running: "border-[var(--color-accent)] text-[var(--color-accent)]",
    review: "border-[var(--state-alt)] text-[var(--state-alt)]",
    finalized: "border-[var(--state-final)] text-[var(--state-final)]",
  };
  return classes[progress] ?? "";
}

interface StationRowProps {
  station: StationItem;
  index: number;
  current: number;
  onViewDetails?: (id: number) => void;
}

function StationRow({
  station,
  index,
  current,
  onViewDetails,
}: StationRowProps) {
  const isActive = station.id === current;
  const isCompleted = station.id < current;
  const isCurrent = station.id === current;

  return (
    <motion.div
      className={`p-4 transition-all duration-300 ${isActive ? "bg-[var(--color-surface)]" : "bg-transparent hover:bg-[var(--color-surface)]/50"}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {isCompleted && (
            <CheckCircle className="w-5 h-5 text-[var(--state-final)]" />
          )}
          {isCurrent && station.state === "running" && (
            <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin" />
          )}
          {isCurrent && station.state !== "running" && (
            <Circle className="w-5 h-5 text-[var(--color-accent)]" />
          )}
          {!isCompleted && !isCurrent && (
            <Circle className="w-5 h-5 text-[var(--color-muted)]" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4
                className={
                  isActive
                    ? "text-[var(--color-text)]"
                    : "text-[var(--color-muted)]"
                }
                dir="rtl"
              >
                {station.id}. {station.title}
              </h4>
              {station.state === "review" && (
                <p className="text-[var(--color-muted)] mt-1">جاهز للمراجعة</p>
              )}
              {station.state === "finalized" && (
                <p className="text-[var(--state-final)] mt-1">مكتمل</p>
              )}
            </div>
            {(station.state === "review" || station.state === "finalized") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails?.(station.id)}
                className="text-[var(--color-accent)] hover:bg-[var(--color-surface)]"
              >
                <Eye className="w-4 h-4 ml-1" />
                عرض
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SevenStationsDock({
  current,
  progress,
  items,
  onNext,
  onPrev,
  onViewDetails,
}: SevenStationsDockProps) {
  const progressPercentage = (current / 7) * 100;

  return (
    <div className="bg-[var(--color-panel)] border border-[var(--color-surface)] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[var(--color-surface)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[var(--color-text)]" dir="rtl">
            المحطات السبع للتحليل
          </h3>
          <Badge variant="outline" className={getProgressClass(progress)}>
            {getProgressLabel(progress)}
          </Badge>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-[var(--color-muted)] mt-2" dir="rtl">
          المحطة {current} من 7
        </p>
      </div>

      <div className="divide-y divide-[var(--color-surface)]">
        {items.map((station, index) => (
          <StationRow
            key={station.id}
            station={station}
            index={index}
            current={current}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      <div className="p-4 border-t border-[var(--color-surface)] flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={current === 1}
          className="border-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          dir="rtl"
        >
          السابق
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onNext}
          disabled={current === 7 || progress === "running"}
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-bg)]"
          dir="rtl"
        >
          {current === 7 ? "إنهاء" : "التالي"}
        </Button>
      </div>
    </div>
  );
}
