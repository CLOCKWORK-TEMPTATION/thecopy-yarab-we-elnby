import { logger } from "@/lib/logger";

import type {
  LineChange,
  PipelineSnapshot,
  SnapshotLine,
  StageDiff,
} from "./types";

export const isPipelineConsoleDebugEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("filmlane.pipeline.debug") === "true";
  } catch {
    return false;
  }
};

export const logRecorderTable = (label: string, data: unknown): void => {
  logger.warn(label, data);
};

export const toSnapshotLine = (item: {
  type: string;
  text: string;
  confidence: number;
  classificationMethod?: string;
}): SnapshotLine => ({
  type: item.type,
  confidence: item.confidence,
  method: item.classificationMethod ?? "unknown",
  text: item.text.slice(0, 50),
});

export const computeDiff = (
  from: PipelineSnapshot,
  to: PipelineSnapshot
): StageDiff => {
  const changes: LineChange[] = [];
  const length = Math.max(from.lines.length, to.lines.length);

  for (let index = 0; index < length; index++) {
    const fromLine = from.lines[index];
    const toLine = to.lines[index];
    if (!fromLine || !toLine) {
      changes.push({
        lineIndex: index,
        text: (fromLine?.text ?? toLine?.text ?? "").slice(0, 50),
        fromType: fromLine?.type ?? "—",
        toType: toLine?.type ?? "—",
        confidenceDelta:
          (toLine?.confidence ?? 0) - (fromLine?.confidence ?? 0),
      });
      continue;
    }
    if (fromLine.type !== toLine.type) {
      changes.push({
        lineIndex: index,
        text: fromLine.text,
        fromType: fromLine.type,
        toType: toLine.type,
        confidenceDelta: toLine.confidence - fromLine.confidence,
      });
    }
  }

  return {
    fromStage: from.stage,
    toStage: to.stage,
    latencyMs: Math.round(to.timestamp - from.timestamp),
    changes,
  };
};

export const computeTypeDist = (
  lines: readonly SnapshotLine[]
): Record<string, number> => {
  const distribution: Record<string, number> = {};
  for (const line of lines) {
    distribution[line.type] = (distribution[line.type] ?? 0) + 1;
  }
  return distribution;
};
