import { logger } from "@/lib/logger";

import { logRecorderTable } from "./helpers";

import type { PipelineRunReport } from "./types";

export const printRunReport = (report: PipelineRunReport): void => {
  logger.warn(
    "%c╔══════════════════════════════════════════════════════╗",
    "color: #00ccff; font-weight: bold"
  );
  logger.warn(
    "%c║      📡 Pipeline Run Report                          ║",
    "color: #00ccff; font-weight: bold"
  );
  logger.warn(
    "%c╚══════════════════════════════════════════════════════╝",
    "color: #00ccff; font-weight: bold"
  );

  const frontendMs =
    report.snapshots.length >= 2
      ? Math.round(
          (report.snapshots.find((snapshot) => snapshot.stage === "render-first")
            ?.timestamp ??
            report.snapshots[report.snapshots.length - 1]?.timestamp ??
            0) - (report.snapshots[0]?.timestamp ?? 0)
        )
      : 0;
  const aiMs = report.totalDurationMs - frontendMs;

  logger.warn(
    `\n📋 Source: ${report.source} | ${report.input.lineCount} lines | ${report.input.textLength} chars`
  );
  logger.warn(
    `⏱️ Total: ${(report.totalDurationMs / 1000).toFixed(1)}s (frontend: ${frontendMs}ms, AI: ${(aiMs / 1000).toFixed(1)}s)`
  );
  logger.warn(`🆔 Run ID: ${report.runId}`);

  logger.warn(
    "\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "color: #888"
  );
  logger.warn(
    "%c📊 Stage-by-Stage Progression:",
    "color: #ffcc00; font-weight: bold"
  );

  const stageTable = report.snapshots.map((snapshot, index) => {
    const diff = index > 0 ? report.diffs[index - 1] : null;
    const prevSnapshot = index > 0 ? report.snapshots[index - 1] : null;
    const latency = prevSnapshot
      ? Math.round(snapshot.timestamp - prevSnapshot.timestamp)
      : 0;

    return {
      "#": index + 1,
      Stage: snapshot.stage,
      Lines: snapshot.lines.length,
      Changes: diff ? diff.changes.length : "—",
      Duration: index === 0 ? "—" : `${latency}ms`,
      Notes: snapshot.metadata
        ? Object.entries(snapshot.metadata)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ")
            .slice(0, 60)
        : "",
    };
  });

  logRecorderTable("Stage-by-stage progression", stageTable);

  logger.warn(
    "\n%c📦 Final Type Distribution:",
    "color: #00ff88; font-weight: bold"
  );
  logRecorderTable("Final type distribution", report.finalTypeDist);

  for (const diff of report.diffs) {
    if (diff.changes.length === 0) {
      continue;
    }

    logger.warn(
      `\n%c🔄 ${diff.fromStage} → ${diff.toStage}: ${diff.changes.length} changes (${diff.latencyMs}ms)`,
      "color: #ff6b6b; font-weight: bold"
    );

    const sample = diff.changes.slice(0, 15);
    logRecorderTable(
      "Stage diff sample",
      sample.map((change) => ({
        "Line#": change.lineIndex,
        Text: change.text.slice(0, 40),
        Before: change.fromType,
        "→ After": change.toType,
        "Δ Conf":
          change.confidenceDelta > 0
            ? `+${change.confidenceDelta}`
            : `${change.confidenceDelta}`,
      }))
    );
    if (diff.changes.length > 15) {
      logger.warn(`   ... و ${diff.changes.length - 15} تغيير تاني`);
    }
  }

  const applied = report.aiCorrections.filter((correction) => correction.applied);
  const skipped = report.aiCorrections.filter((correction) => !correction.applied);

  if (report.aiCorrections.length > 0) {
    logger.warn(
      "\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "color: #888"
    );
    logger.warn(
      `%c🤖 AI Corrections: ${applied.length} applied, ${skipped.length} skipped`,
      "color: #ff00ff; font-weight: bold"
    );

    const bySource = new Map<string, { applied: number; skipped: number }>();
    for (const correction of report.aiCorrections) {
      const sourceStats = bySource.get(correction.source) ?? { applied: 0, skipped: 0 };
      if (correction.applied) sourceStats.applied++;
      else sourceStats.skipped++;
      bySource.set(correction.source, sourceStats);
    }

    logRecorderTable(
      "AI corrections by source",
      Object.fromEntries(
        Array.from(bySource.entries()).map(([source, stats]) => [source, stats])
      )
    );

    if (applied.length > 0) {
      logger.warn(
        "\n%c✅ Applied AI Corrections:",
        "color: #00ff88; font-weight: bold"
      );
      logRecorderTable(
        "Applied AI corrections",
        applied.slice(0, 20).map((correction) => ({
          "Line#": correction.lineIndex,
          Text: correction.text.slice(0, 35),
          From: correction.previousType,
          "→ To": correction.correctedType,
          Conf: correction.confidence.toFixed(2),
          Source: correction.source,
        }))
      );
    }
  }

  logger.warn("\n%c─── Full report object: ───", "color: #888");
  logger.warn({ report }, "pipeline run report");
};

export const printLineJourney = (
  report: PipelineRunReport,
  lineIndex: number
): void => {
  logger.warn(
    `%c📍 Line Journey: #${lineIndex}`,
    "color: #00ccff; font-weight: bold; font-size: 14px"
  );

  const firstSnapshot = report.snapshots[0];
  const lineText = firstSnapshot?.lines[lineIndex]?.text ?? "???";
  logger.warn(`   "${lineText}"\n`);

  const journey: {
    Stage: string;
    Type: string;
    Confidence: number;
    Method: string;
    Changed: string;
  }[] = [];

  let prevType: string | null = null;
  for (const snapshot of report.snapshots) {
    const line = snapshot.lines[lineIndex];
    if (!line) {
      continue;
    }

    const changed =
      prevType !== null && line.type !== prevType
        ? `⚠️ ${prevType} → ${line.type}`
        : prevType === null
          ? "—"
          : "✅ unchanged";

    journey.push({
      Stage: snapshot.stage,
      Type: line.type,
      Confidence: line.confidence,
      Method: line.method,
      Changed: changed,
    });

    prevType = line.type;
  }

  logRecorderTable("Line journey", journey);

  const aiForLine = report.aiCorrections.filter(
    (correction) => correction.lineIndex === lineIndex
  );
  if (aiForLine.length > 0) {
    logger.warn(
      `\n%c🤖 AI corrections for this line:`,
      "color: #ff00ff; font-weight: bold"
    );
    logRecorderTable(
      "AI corrections for line",
      aiForLine.map((correction) => ({
        Source: correction.source,
        From: correction.previousType,
        "→ To": correction.correctedType,
        Conf: correction.confidence.toFixed(2),
        Applied: correction.applied ? "✅" : "❌",
      }))
    );
  }

  const lastSnapshot = report.snapshots[report.snapshots.length - 1];
  const finalLine = lastSnapshot?.lines[lineIndex];
  const lastAppliedAi = aiForLine.filter((correction) => correction.applied).pop();
  const finalType = lastAppliedAi?.correctedType ?? finalLine?.type ?? "???";
  logger.warn(
    `\n   Final type: %c${finalType}`,
    "color: #00ff88; font-weight: bold; font-size: 14px"
  );
};
