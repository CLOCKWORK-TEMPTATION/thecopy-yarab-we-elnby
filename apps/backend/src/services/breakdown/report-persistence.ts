import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  breakdownJobs,
  breakdownReports,
  sceneBreakdowns,
  sceneHeaderMetadata,
  scenes,
  shootingSchedules,
} from "@/db/schema";

import {
  buildCsvRow,
  CSV_HEADERS,
  requireValue,
  uniqueStrings,
} from "./service-helpers";
import {
  buildElementsByCategory,
  buildSummaryText,
  estimateShootingDays,
  generateShootingSchedule,
} from "./utils";

import type {
  BreakdownReport,
  BreakdownReportScene,
  ShootingScheduleDay,
} from "./types";

const CHUNK_SIZE = 50;

async function insertReportRow(
  projectId: string,
  title: string,
  analyzedScenes: BreakdownReportScene[],
): Promise<BreakdownReport> {
  const totalPages = analyzedScenes.reduce(
    (sum, scene) => sum + scene.headerData.pageCount,
    0,
  );
  const schedule = generateShootingSchedule(analyzedScenes);
  const warnings = uniqueStrings(
    analyzedScenes.flatMap((scene) => scene.analysis.warnings),
  );

  const reportBase = {
    projectId,
    title,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "backend-breakdown" as const,
    summary: buildSummaryText(analyzedScenes),
    warnings,
    sceneCount: analyzedScenes.length,
    totalPages,
    totalEstimatedShootDays: estimateShootingDays(totalPages),
    elementsByCategory: buildElementsByCategory(analyzedScenes),
    schedule,
    scenes: analyzedScenes,
  };

  const [insertedReportRow] = await db
    .insert(breakdownReports)
    .values({
      projectId,
      title,
      summary: reportBase.summary,
      warnings,
      totalScenes: reportBase.sceneCount,
      totalPages: Math.max(1, Math.round(reportBase.totalPages * 8)),
      totalEstimatedShootDays: reportBase.totalEstimatedShootDays,
      reportData: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  const reportRow = requireValue(
    insertedReportRow,
    "تعذر حفظ تقرير البريك دون",
  );

  const report: BreakdownReport = { id: reportRow.id, ...reportBase };

  await db
    .update(breakdownReports)
    .set({ reportData: report, updatedAt: new Date() })
    .where(eq(breakdownReports.id, reportRow.id));

  return report;
}

function buildSceneBreakdownValues(
  reportId: string,
  projectId: string,
  chunk: BreakdownReportScene[],
) {
  return chunk.map((scene) => ({
    reportId,
    projectId,
    sceneId: scene.sceneId,
    sceneNumber: scene.headerData.sceneNumber,
    header: scene.header,
    content: scene.content,
    headerData: scene.headerData,
    analysis: scene.analysis,
    scenarios: scene.scenarios,
    source: scene.analysis.source,
    status: "completed" as const,
    warnings: scene.analysis.warnings,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function buildMetadataValues(
  reportId: string,
  chunk: BreakdownReportScene[],
  insertedBreakdowns: (typeof sceneBreakdowns.$inferSelect)[],
) {
  return chunk.map((scene) => {
    const sceneBreakdownRow = insertedBreakdowns.find(
      (breakdown) => breakdown.sceneId === scene.sceneId,
    );
    const validRow = requireValue(
      sceneBreakdownRow,
      `تعذر حفظ تفصيل المشهد ${scene.sceneId}`,
    );

    return {
      reportId,
      sceneBreakdownId: validRow.id,
      sceneId: scene.sceneId,
      rawHeader: scene.headerData.rawHeader,
      sceneType: scene.headerData.sceneType,
      location: scene.headerData.location,
      timeOfDay: scene.headerData.timeOfDay,
      pageCount: Math.max(1, Math.round(scene.headerData.pageCount * 8)),
      storyDay: String(scene.headerData.storyDay),
      createdAt: new Date(),
    };
  });
}

async function updateScenesData(chunk: BreakdownReportScene[]): Promise<void> {
  await Promise.all(
    chunk.map((scene) =>
      db
        .update(scenes)
        .set({
          title: scene.header,
          location: scene.headerData.location,
          timeOfDay: scene.headerData.timeOfDay,
          characters: scene.analysis.cast.map((member) => member.name),
          description: scene.content.slice(0, 4000),
        })
        .where(eq(scenes.id, scene.sceneId)),
    ),
  );
}

async function persistSceneBreakdowns(
  report: BreakdownReport,
  projectId: string,
  analyzedScenes: BreakdownReportScene[],
): Promise<void> {
  for (let index = 0; index < analyzedScenes.length; index += CHUNK_SIZE) {
    const chunk = analyzedScenes.slice(index, index + CHUNK_SIZE);
    const sceneBreakdownValues = buildSceneBreakdownValues(
      report.id,
      projectId,
      chunk,
    );

    const insertedBreakdowns = await db
      .insert(sceneBreakdowns)
      .values(sceneBreakdownValues)
      .returning();

    const metadataValues = buildMetadataValues(
      report.id,
      chunk,
      insertedBreakdowns,
    );

    await db.insert(sceneHeaderMetadata).values(metadataValues);
    await updateScenesData(chunk);
  }
}

async function persistScheduleDays(
  reportId: string,
  projectId: string,
  schedule: ShootingScheduleDay[],
): Promise<void> {
  for (const day of schedule) {
    await db.insert(shootingSchedules).values({
      reportId,
      projectId,
      dayNumber: day.dayNumber,
      location: day.location,
      timeOfDay: day.timeOfDay,
      sceneIds: day.scenes.map((scene) => scene.sceneId),
      estimatedHours: day.estimatedHours,
      totalPages: Math.max(1, Math.round(day.totalPages * 8)),
      payload: day,
      createdAt: new Date(),
    });
  }
}

async function linkJobToReport(jobId: string, reportId: string): Promise<void> {
  await db
    .update(breakdownJobs)
    .set({ status: "completed", reportId, finishedAt: new Date() })
    .where(eq(breakdownJobs.id, jobId));
}

export async function persistBreakdownReport(params: {
  projectId: string;
  title: string;
  analyzedScenes: BreakdownReportScene[];
  jobId?: string;
}): Promise<BreakdownReport> {
  const { projectId, title, analyzedScenes, jobId } = params;

  await db
    .delete(breakdownReports)
    .where(eq(breakdownReports.projectId, projectId));

  const report = await insertReportRow(projectId, title, analyzedScenes);
  await persistSceneBreakdowns(report, projectId, analyzedScenes);

  const schedule = generateShootingSchedule(analyzedScenes);
  await persistScheduleDays(report.id, projectId, schedule);

  if (jobId) {
    await linkJobToReport(jobId, report.id);
  }

  return report;
}

export function reportToCsv(report: BreakdownReport): string {
  const rows = report.scenes.map((scene) => buildCsvRow(scene));
  return [CSV_HEADERS.join(","), ...rows.map((row) => row.join(","))].join(
    "\n",
  );
}
