import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  breakdownExports,
  breakdownJobs,
  breakdownReports,
  projects,
  sceneBreakdowns,
  shootingSchedules,
  scenes,
} from "@/db/schema";
import { logger } from "@/lib/logger";
import { geminiService } from "@/services/gemini.service";

import {
  getOwnedProject,
  getOwnedReport,
  getOwnedScene,
} from "./ownership-queries";
import { parseScreenplay } from "./parser";
import { persistBreakdownReport, reportToCsv } from "./report-persistence";
import { findParsedScene } from "./scene-reanalysis";
import {
  aiBreakdownSchema,
  buildAiPrompt,
  buildFallbackAnalysis,
  extractJsonObject,
  normalizeAiAnalysis,
  requireValue,
} from "./service-helpers";
import {
  asBreakdownReport,
  asBreakdownSceneAnalysis,
  asScenarioAnalysis,
  asSceneHeader,
  asShootingScheduleDay,
} from "./service-casts";
import { getScenesByProject, syncProjectScenes } from "./scene-sync";
import { generateId } from "./utils";

import type {
  BreakdownChatResponse,
  BreakdownReport,
  BreakdownReportScene,
  ParsedScene,
  ParsedScreenplay,
  ShootingScheduleDay,
} from "./types";

export class BreakdownService {
  async createProjectAndParse(
    scriptContent: string,
    title: string | undefined,
    userId: string,
  ): Promise<{
    projectId: string;
    title: string;
    parsed: ParsedScreenplay;
  }> {
    if (!userId) {
      throw new Error("معرف المستخدم مطلوب");
    }

    const projectTitle = title?.trim() ?? "مشروع بريك دون";

    const [insertedProject] = await db
      .insert(projects)
      .values({
        title: projectTitle,
        scriptContent,
        userId,
      })
      .returning();
    const project = requireValue(
      insertedProject,
      "تعذر إنشاء مشروع البريك دون",
    );

    const parsed = await this.parseProject(
      project.id,
      userId,
      scriptContent,
      projectTitle,
    );

    return {
      projectId: project.id,
      title: project.title,
      parsed,
    };
  }

  async parseProject(
    projectId: string,
    userId: string,
    scriptContent?: string,
    projectTitle?: string,
  ): Promise<ParsedScreenplay> {
    const project = await getOwnedProject(projectId, userId);

    if (!project) {
      throw new Error("المشروع غير موجود");
    }

    const nextScript = scriptContent ?? project.scriptContent ?? "";
    if (!nextScript.trim()) {
      throw new Error("لا يوجد نص سيناريو للتحليل");
    }

    if (scriptContent && scriptContent !== project.scriptContent) {
      await db
        .update(projects)
        .set({
          scriptContent,
          updatedAt: new Date(),
          ...(projectTitle ? { title: projectTitle } : {}),
        })
        .where(eq(projects.id, projectId));
    }

    const parsed = parseScreenplay(nextScript, projectTitle ?? project.title);
    await this.syncScenes(projectId, parsed.scenes);
    return parsed;
  }

  async analyzeProject(
    projectId: string,
    userId: string,
  ): Promise<BreakdownReport> {
    const project = await getOwnedProject(projectId, userId);

    if (!project) {
      throw new Error("المشروع غير موجود");
    }

    if (!project.scriptContent?.trim()) {
      throw new Error("لا يوجد نص سيناريو للتحليل");
    }

    const jobId = await this.createJob(projectId, null, "project-analysis");

    try {
      const parsed = await this.parseProject(
        projectId,
        userId,
        project.scriptContent,
        project.title,
      );
      const syncedScenes = await getScenesByProject(projectId);
      const analyzedScenes = await this.analyzeParsedScenes(
        parsed.scenes,
        syncedScenes,
      );
      const report = await persistBreakdownReport({
        projectId,
        title: project.title,
        analyzedScenes,
        jobId,
      });
      await this.completeJob(jobId, "completed");
      return report;
    } catch (error) {
      await this.completeJob(
        jobId,
        "failed",
        error instanceof Error ? error.message : "unknown error",
      );
      throw error;
    }
  }

  async reanalyzeScene(
    sceneId: string,
    userId: string,
  ): Promise<BreakdownReportScene> {
    const ownedScene = await getOwnedScene(sceneId, userId);
    const sceneRecord = requireValue(ownedScene?.scene, "المشهد غير موجود");
    const project = requireValue(
      ownedScene?.project,
      "المشروع المرتبط بالمشهد غير موجود",
    );

    const jobId = await this.createJob(project.id, sceneId, "scene-reanalysis");

    try {
      const result = await this.executeSceneReanalysis(
        sceneId,
        sceneRecord,
        project,
        userId,
        jobId,
      );
      await this.completeJob(jobId, "completed");
      return result;
    } catch (error) {
      await this.completeJob(
        jobId,
        "failed",
        error instanceof Error ? error.message : "unknown error",
      );
      throw error;
    }
  }

  private async executeSceneReanalysis(
    sceneId: string,
    sceneRecord: typeof scenes.$inferSelect,
    project: typeof projects.$inferSelect,
    userId: string,
    jobId: string,
  ): Promise<BreakdownReportScene> {
    const currentReport = await this.getProjectReport(project.id, userId);
    const parsedScene = findParsedScene({
      sceneId,
      sceneRecord,
      project,
      currentReport,
    });
    const analyzed = await this.analyzeSceneRecord(parsedScene, sceneRecord.id);

    if (!currentReport) {
      const report = await this.analyzeProject(project.id, userId);
      return requireValue(
        report.scenes.find((scene) => scene.sceneId === sceneId) ??
          report.scenes[0],
        "تعذر العثور على مشهد ضمن تقرير البريك دون",
      );
    }

    const nextScenes = currentReport.scenes.map((scene) =>
      scene.sceneId === sceneId ? analyzed : scene,
    );
    const nextReport = await persistBreakdownReport({
      projectId: project.id,
      title: project.title,
      analyzedScenes: nextScenes,
      jobId,
    });
    return requireValue(
      nextReport.scenes.find((scene) => scene.sceneId === sceneId) ??
        nextReport.scenes[0],
      "تعذر العثور على المشهد المحدّث ضمن التقرير",
    );
  }

  async getProjectReport(
    projectId: string,
    userId: string,
  ): Promise<BreakdownReport | null> {
    const project = await getOwnedProject(projectId, userId);

    if (!project) {
      throw new Error("المشروع غير موجود");
    }

    const [report] = await db
      .select()
      .from(breakdownReports)
      .where(eq(breakdownReports.projectId, projectId))
      .orderBy(desc(breakdownReports.updatedAt))
      .limit(1);

    if (!report?.reportData) {
      return null;
    }

    return asBreakdownReport(report.reportData);
  }

  async getProjectSchedule(
    projectId: string,
    userId: string,
  ): Promise<ShootingScheduleDay[]> {
    const report = await this.getProjectReport(projectId, userId);
    if (report) {
      return report.schedule;
    }

    const rows = await db
      .select()
      .from(shootingSchedules)
      .where(eq(shootingSchedules.projectId, projectId))
      .orderBy(shootingSchedules.dayNumber);

    return rows.map((row) => asShootingScheduleDay(row.payload));
  }

  async getSceneBreakdown(
    sceneId: string,
    userId: string,
  ): Promise<BreakdownReportScene | null> {
    const ownedScene = await getOwnedScene(sceneId, userId);

    if (!ownedScene) {
      throw new Error("المشهد غير موجود");
    }

    const [row] = await db
      .select()
      .from(sceneBreakdowns)
      .where(eq(sceneBreakdowns.sceneId, sceneId))
      .orderBy(desc(sceneBreakdowns.updatedAt))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      reportSceneId: row.id,
      sceneId: row.sceneId ?? sceneId,
      header: row.header ?? "",
      content: row.content ?? "",
      headerData: asSceneHeader(row.headerData),
      analysis: asBreakdownSceneAnalysis(row.analysis),
      scenarios: asScenarioAnalysis(row.scenarios),
    };
  }

  async exportReport(
    reportId: string,
    userId: string,
    format: "json" | "csv" = "json",
  ): Promise<{
    fileName: string;
    format: "json" | "csv";
    content: string;
  }> {
    const row = await getOwnedReport(reportId, userId);

    if (!row?.reportData) {
      throw new Error("تقرير البريك دون غير موجود");
    }

    const report = asBreakdownReport(row.reportData);
    const reportTitle = report.title ?? "breakdown_report";
    const reportIdentifier = report.id ?? reportId;
    const fileName = `${reportTitle.replace(/[^\w\u0600-\u06FF]+/g, "_")}_${reportIdentifier}.${format}`;
    const content =
      format === "json" ? JSON.stringify(report, null, 2) : reportToCsv(report);

    await db.insert(breakdownExports).values({
      reportId,
      format,
      payload: content,
      createdAt: new Date(),
    });

    return {
      fileName,
      format,
      content,
    };
  }

  async chat(
    message: string,
    context?: Record<string, unknown>,
  ): Promise<BreakdownChatResponse> {
    const answer = await geminiService.chatWithAI(message, {
      feature: "breakdown",
      ...(context ?? {}),
    });

    return { answer };
  }

  private async analyzeParsedScenes(
    parsedScenes: ParsedScene[],
    sceneRows: (typeof scenes.$inferSelect)[],
  ): Promise<BreakdownReportScene[]> {
    const sceneMap = new Map(
      sceneRows.map((scene) => [scene.sceneNumber, scene]),
    );

    const results: BreakdownReportScene[] = [];
    for (const parsedScene of parsedScenes) {
      const sceneRow = sceneMap.get(parsedScene.headerData.sceneNumber);
      if (!sceneRow) {
        continue;
      }

      results.push(await this.analyzeSceneRecord(parsedScene, sceneRow.id));
    }

    return results;
  }

  private async analyzeSceneRecord(
    parsedScene: ParsedScene,
    sceneId: string,
  ): Promise<BreakdownReportScene> {
    try {
      const prompt = buildAiPrompt(parsedScene);
      const raw = await geminiService.generateText(prompt);
      const parsedJson = extractJsonObject(raw);
      const aiData = aiBreakdownSchema.parse(parsedJson);
      const normalized = normalizeAiAnalysis(parsedScene, aiData);

      return {
        reportSceneId: generateId("report_scene"),
        sceneId,
        header: parsedScene.header,
        content: parsedScene.content,
        headerData: parsedScene.headerData,
        analysis: normalized.analysis,
        scenarios: normalized.scenarios,
      };
    } catch (error) {
      logger.warn("Breakdown AI fallback used", {
        sceneNumber: parsedScene.headerData.sceneNumber,
        error: error instanceof Error ? error.message : String(error),
      });

      const fallback = buildFallbackAnalysis(parsedScene);
      return {
        reportSceneId: generateId("report_scene"),
        sceneId,
        header: parsedScene.header,
        content: parsedScene.content,
        headerData: parsedScene.headerData,
        analysis: fallback.analysis,
        scenarios: fallback.scenarios,
      };
    }
  }

  private async syncScenes(
    projectId: string,
    parsedScenes: ParsedScene[],
  ): Promise<void> {
    await syncProjectScenes(projectId, parsedScenes);
  }

  private async createJob(
    projectId: string,
    sceneId: string | null,
    jobType: string,
  ): Promise<string> {
    const [insertedJob] = await db
      .insert(breakdownJobs)
      .values({
        projectId,
        sceneId,
        jobType,
        status: "running",
        startedAt: new Date(),
      })
      .returning();
    const job = requireValue(insertedJob, "تعذر إنشاء مهمة البريك دون");

    return job.id;
  }

  private async completeJob(
    jobId: string,
    status: "completed" | "failed",
    errorMessage?: string,
  ): Promise<void> {
    await db
      .update(breakdownJobs)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        finishedAt: new Date(),
      })
      .where(eq(breakdownJobs.id, jobId));
  }
}

export const breakdownService = new BreakdownService();
