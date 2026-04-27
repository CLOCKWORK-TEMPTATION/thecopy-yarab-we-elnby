/**
 * @module extensions/pipeline-recorder
 * @description
 * رادار شامل — يسجّل كل مراحل الـ pipeline من لحظة اللصق حتى آخر تصحيح AI.
 */

import { logger } from "@/lib/logger";

import { printLineJourney, printRunReport } from "./pipeline-recorder/console-ui";
import { isPipelineConsoleDebugEnabled } from "./pipeline-recorder/helpers";
import { PipelineRecorder } from "./pipeline-recorder/recorder";

import type { PipelineRecorderDebugWindow } from "./pipeline-recorder/types";

export type {
  LineChange,
  PipelineEvent,
  PipelineRunReport,
  PipelineSnapshot,
  RecordedAICorrection,
  RecordedApproval,
  SnapshotLine,
  StageDiff,
} from "./pipeline-recorder/types";

export const pipelineRecorder = new PipelineRecorder();

export const registerPipelineRecorderUI = (): void => {
  if (typeof window === "undefined") return;

  const win = window as PipelineRecorderDebugWindow;
  const shouldLogReady =
    !win.__pipelineRecorderUiRegistered && isPipelineConsoleDebugEnabled();

  Object.defineProperty(win, "__lastPipelineRun", {
    get: () => pipelineRecorder.lastRun,
    configurable: true,
  });

  win.__showPipelineRun = (): void => {
    const report = pipelineRecorder.lastRun;
    if (!report) {
      logger.warn("⚠️ مفيش pipeline run مسجّل — الصق نص أو افتح ملف الأول");
      return;
    }
    printRunReport(report);
  };

  win.__showLineJourney = (lineIndex: number): void => {
    const report = pipelineRecorder.lastRun;
    if (!report) {
      logger.warn("⚠️ مفيش pipeline run مسجّل — الصق نص أو افتح ملف الأول");
      return;
    }
    if (typeof lineIndex !== "number" || lineIndex < 0) {
      logger.warn("⚠️ ادخل رقم السطر: __showLineJourney(15)");
      return;
    }
    printLineJourney(report, lineIndex);
  };

  win.__pipelineRecorderUiRegistered = true;
  if (shouldLogReady) {
    logger.warn(
      "%c📡 Pipeline recorder ready! After paste/import, run: __showPipelineRun() or __showLineJourney(lineIndex)",
      "color: #00ccff; font-weight: bold; font-size: 13px"
    );
  }
};
