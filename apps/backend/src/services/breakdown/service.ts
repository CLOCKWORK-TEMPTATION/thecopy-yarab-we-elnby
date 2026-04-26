/* eslint-disable max-lines -- breakdown service module */
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  breakdownExports,
  breakdownJobs,
  breakdownReports,
  projects,
  sceneBreakdowns,
  sceneHeaderMetadata,
  scenes,
  shootingSchedules,
} from '@/db/schema';
import { geminiService } from '@/services/gemini.service';
import { logger } from '@/lib/logger';
import { parseScreenplay } from './parser';
import {
  aiBreakdownSchema,
  buildAiPrompt,
  buildCsvRow,
  buildFallbackAnalysis,
  CSV_HEADERS,
  extractJsonObject,
  normalizeAiAnalysis,
  requireValue,
  uniqueStrings,
} from './service-helpers';
import type {
  BreakdownChatResponse,
  BreakdownReport,
  BreakdownReportScene,
  BreakdownSceneAnalysis,
  ParsedScene,
  ParsedScreenplay,
  ScenarioAnalysis,
  SceneHeader,
  ShootingScheduleDay,
} from './types';
import {
  buildElementsByCategory,
  buildSummaryText,
  estimateShootingDays,
  generateId,
  generateShootingSchedule,
} from './utils';

function asBreakdownReport(value: unknown): BreakdownReport {
  return value as BreakdownReport;
}

function asShootingScheduleDay(value: unknown): ShootingScheduleDay {
  return value as ShootingScheduleDay;
}

function asSceneHeader(value: unknown): SceneHeader {
  return value as SceneHeader;
}

function asBreakdownSceneAnalysis(value: unknown): BreakdownSceneAnalysis {
  return value as BreakdownSceneAnalysis;
}

function asScenarioAnalysis(value: unknown): ScenarioAnalysis {
  if (Array.isArray(value)) {
    return { scenarios: value as ScenarioAnalysis['scenarios'] };
  }

  if (value && typeof value === 'object' && 'scenarios' in value) {
    return value as ScenarioAnalysis;
  }

  return { scenarios: [] };
}

export class BreakdownService {
  async createProjectAndParse(
    scriptContent: string,
    title: string | undefined,
    userId: string
  ): Promise<{
    projectId: string;
    title: string;
    parsed: ParsedScreenplay;
  }> {
    if (!userId) {
      throw new Error('معرف المستخدم مطلوب');
    }

    const projectTitle = title?.trim() || 'مشروع بريك دون';

    const [insertedProject] = await db
      .insert(projects)
      .values({
        title: projectTitle,
        scriptContent,
        userId,
      })
      .returning();
    const project = requireValue(insertedProject, 'تعذر إنشاء مشروع البريك دون');

    const parsed = await this.parseProject(
      project.id,
      userId,
      scriptContent,
      projectTitle
    );

    return {
      projectId: project.id,
      title: project["title"],
      parsed,
    };
  }

  async parseProject(
    projectId: string,
    userId: string,
    scriptContent?: string,
    projectTitle?: string
  ): Promise<ParsedScreenplay> {
    const project = await this.getOwnedProject(projectId, userId);

    if (!project) {
      throw new Error('المشروع غير موجود');
    }

    const nextScript = scriptContent ?? project.scriptContent ?? '';
    if (!nextScript.trim()) {
      throw new Error('لا يوجد نص سيناريو للتحليل');
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

    const parsed = parseScreenplay(nextScript, projectTitle ?? project["title"]);
    await this.syncScenes(projectId, parsed.scenes);
    return parsed;
  }

  async analyzeProject(projectId: string, userId: string): Promise<BreakdownReport> {
    const project = await this.getOwnedProject(projectId, userId);

    if (!project) {
      throw new Error('المشروع غير موجود');
    }

    if (!project.scriptContent?.trim()) {
      throw new Error('لا يوجد نص سيناريو للتحليل');
    }

    const jobId = await this.createJob(projectId, null, 'project-analysis');

    try {
      const parsed = await this.parseProject(
        projectId,
        userId,
        project.scriptContent,
        project["title"]
      );
      const syncedScenes = await this.getScenesByProject(projectId);
      const analyzedScenes = await this.analyzeParsedScenes(parsed.scenes, syncedScenes);
      const report = await this.persistReport(projectId, project["title"], analyzedScenes, jobId);
      await this.completeJob(jobId, 'completed');
      return report;
    } catch (error) {
      await this.completeJob(
        jobId,
        'failed',
        error instanceof Error ? error.message : 'unknown error'
      );
      throw error;
    }
  }

  async reanalyzeScene(sceneId: string, userId: string): Promise<BreakdownReportScene> {
    const ownedScene = await this.getOwnedScene(sceneId, userId);
    const sceneRecord = requireValue(ownedScene?.scene, 'المشهد غير موجود');
    const project = requireValue(ownedScene?.project, 'المشروع المرتبط بالمشهد غير موجود');

    const jobId = await this.createJob(project.id, sceneId, 'scene-reanalysis');

    try {
      const result = await this.executeSceneReanalysis(
        sceneId, sceneRecord, project, userId, jobId
      );
      await this.completeJob(jobId, 'completed');
      return result;
    } catch (error) {
      await this.completeJob(
        jobId, 'failed',
        error instanceof Error ? error.message : 'unknown error'
      );
      throw error;
    }
  }

  private async executeSceneReanalysis(
    sceneId: string,
    sceneRecord: typeof scenes.$inferSelect,
    project: typeof projects.$inferSelect,
    userId: string,
    jobId: string
  ): Promise<BreakdownReportScene> {
    const currentReport = await this.getProjectReport(project.id, userId);
    const parsedScene = this.findParsedScene(sceneId, sceneRecord, project, currentReport);
    const analyzed = await this.analyzeSceneRecord(parsedScene, sceneRecord.id);

    if (!currentReport) {
      const report = await this.analyzeProject(project.id, userId);
      return requireValue(
        report.scenes.find((s) => s.sceneId === sceneId) ?? report.scenes[0],
        'تعذر العثور على مشهد ضمن تقرير البريك دون'
      );
    }

    const nextScenes = currentReport.scenes.map((s) =>
      s.sceneId === sceneId ? analyzed : s
    );
    const nextReport = await this.persistReport(project.id, project["title"], nextScenes, jobId);
    return requireValue(
      nextReport.scenes.find((s) => s.sceneId === sceneId) ?? nextReport.scenes[0],
      'تعذر العثور على المشهد المحدّث ضمن التقرير'
    );
  }

  private findParsedScene(
    sceneId: string,
    sceneRecord: typeof scenes.$inferSelect,
    project: typeof projects.$inferSelect,
    currentReport: BreakdownReport | null
  ): ParsedScene {
    const parsed = parseScreenplay(project.scriptContent || '', project["title"]);
    const matched = parsed.scenes.find(
      (s) => s.headerData.sceneNumber === sceneRecord.sceneNumber
    ) ?? null;

    if (matched) {
      return matched;
    }

    if (currentReport) {
      const reportScene = currentReport.scenes.find((s) => s.sceneId === sceneId);
      if (reportScene) {
        return {
          header: reportScene.header,
          content: reportScene.content,
          headerData: reportScene.headerData,
          warnings: [],
        };
      }
    }

    throw new Error('تعذر إعادة بناء محتوى المشهد من المشروع');
  }

  async getProjectReport(projectId: string, userId: string): Promise<BreakdownReport | null> {
    const project = await this.getOwnedProject(projectId, userId);

    if (!project) {
      throw new Error('المشروع غير موجود');
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

  async getProjectSchedule(projectId: string, userId: string): Promise<ShootingScheduleDay[]> {
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

  async getSceneBreakdown(sceneId: string, userId: string): Promise<BreakdownReportScene | null> {
    const ownedScene = await this.getOwnedScene(sceneId, userId);

    if (!ownedScene) {
      throw new Error('المشهد غير موجود');
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
      header: row.header ?? '',
      content: row.content ?? '',
      headerData: asSceneHeader(row.headerData),
      analysis: asBreakdownSceneAnalysis(row.analysis),
      scenarios: asScenarioAnalysis(row.scenarios),
    };
  }

  async exportReport(
    reportId: string,
    userId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<{
    fileName: string;
    format: 'json' | 'csv';
    content: string;
  }> {
    const row = await this.getOwnedReport(reportId, userId);

    if (!row?.reportData) {
      throw new Error('تقرير البريك دون غير موجود');
    }

    const report = asBreakdownReport(row.reportData);
    const reportTitle = report["title"] ?? 'breakdown_report';
    const reportIdentifier = report.id ?? reportId;
    const fileName = `${reportTitle.replace(/[^\w\u0600-\u06FF]+/g, '_')}_${reportIdentifier}.${format}`;
    const content =
      format === 'json'
        ? JSON.stringify(report, null, 2)
        : this.reportToCsv(report);

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
    context?: Record<string, unknown>
  ): Promise<BreakdownChatResponse> {
    const answer = await geminiService.chatWithAI(message, {
      feature: 'breakdown',
      ...(context ?? {}),
    });

    return { answer };
  }

  private async getOwnedProject(
    projectId: string,
    userId: string
  ): Promise<(typeof projects.$inferSelect) | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    return project ?? null;
  }

  private async getOwnedScene(
    sceneId: string,
    userId: string
  ): Promise<{
    scene: typeof scenes.$inferSelect;
    project: typeof projects.$inferSelect;
  } | null> {
    const [result] = await db
      .select({
        scene: scenes,
        project: projects,
      })
      .from(scenes)
      .innerJoin(projects, eq(projects.id, scenes.projectId))
      .where(and(eq(scenes.id, sceneId), eq(projects.userId, userId)))
      .limit(1);

    if (!result) {
      return null;
    }

    return result;
  }

  private async getOwnedReport(
    reportId: string,
    userId: string
  ): Promise<(typeof breakdownReports.$inferSelect) | null> {
    const [result] = await db
      .select({
        report: breakdownReports,
      })
      .from(breakdownReports)
      .innerJoin(projects, eq(projects.id, breakdownReports.projectId))
      .where(and(eq(breakdownReports.id, reportId), eq(projects.userId, userId)))
      .limit(1);

    return result?.report ?? null;
  }

  private async analyzeParsedScenes(
    parsedScenes: ParsedScene[],
    sceneRows: typeof scenes.$inferSelect[]
  ): Promise<BreakdownReportScene[]> {
    const sceneMap = new Map(
      sceneRows.map((scene) => [scene.sceneNumber, scene])
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
    sceneId: string
  ): Promise<BreakdownReportScene> {
    try {
      const prompt = buildAiPrompt(parsedScene);
      const raw = await geminiService.generateText(prompt);
      const parsedJson = extractJsonObject(raw);
      const aiData = aiBreakdownSchema.parse(parsedJson);
      const normalized = normalizeAiAnalysis(parsedScene, aiData);

      return {
        reportSceneId: generateId('report_scene'),
        sceneId,
        header: parsedScene.header,
        content: parsedScene.content,
        headerData: parsedScene.headerData,
        analysis: normalized.analysis,
        scenarios: normalized.scenarios,
      };
    } catch (error) {
      logger.warn('Breakdown AI fallback used', {
        sceneNumber: parsedScene.headerData.sceneNumber,
        error: error instanceof Error ? error.message : String(error),
      });

      const fallback = buildFallbackAnalysis(parsedScene);
      return {
        reportSceneId: generateId('report_scene'),
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
    parsedScenes: ParsedScene[]
  ): Promise<void> {
    const existingScenes = await this.getScenesByProject(projectId);
    const existingByNumber = new Map(
      existingScenes.map((scene) => [scene.sceneNumber, scene])
    );

    const inserts: (typeof scenes.$inferInsert)[] = [];
    const updates: { id: string; values: Partial<typeof scenes.$inferInsert> }[] = [];

    for (const parsedScene of parsedScenes) {
      const sceneNumber = parsedScene.headerData.sceneNumber;
      const existing = existingByNumber.get(sceneNumber);
      const values = {
        projectId,
        sceneNumber,
        title: parsedScene.header,
        location: parsedScene.headerData.location,
        timeOfDay: parsedScene.headerData.timeOfDay,
        characters: existing?.characters ?? [],
        description: parsedScene.content.slice(0, 4000),
        shotCount: existing?.shotCount ?? 0,
        status: existing?.["status"] ?? 'planned',
      };

      if (existing) {
        updates.push({ id: existing.id, values });
      } else {
        inserts.push(values);
      }
    }

    const CHUNK_SIZE = 50;

    await this.processSceneInserts(inserts, CHUNK_SIZE);
    await this.processSceneUpdates(updates, CHUNK_SIZE);
  }

  private async processSceneInserts(inserts: (typeof scenes.$inferInsert)[], chunkSize: number): Promise<void> {
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const chunk = inserts.slice(i, i + chunkSize);
      if (chunk.length > 0) {
        await db.insert(scenes).values(chunk);
      }
    }
  }

  private async processSceneUpdates(updates: { id: string; values: Partial<typeof scenes.$inferInsert> }[], chunkSize: number): Promise<void> {
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((update) =>
          db.update(scenes).set(update.values).where(eq(scenes.id, update.id))
        )
      );
    }
  }

  private async getScenesByProject(
    projectId: string
  ): Promise<(typeof scenes.$inferSelect)[]> {
    return db.select().from(scenes).where(eq(scenes.projectId, projectId));
  }

  private async persistReport(
    projectId: string,
    title: string,
    analyzedScenes: BreakdownReportScene[],
    jobId?: string
  ): Promise<BreakdownReport> {
    await db.delete(breakdownReports).where(eq(breakdownReports.projectId, projectId));

    const report = await this.insertReportRow(projectId, title, analyzedScenes);
    await this.persistSceneBreakdowns(report, projectId, analyzedScenes);

    const schedule = generateShootingSchedule(analyzedScenes);
    await this.persistScheduleDays(report.id, projectId, schedule);

    if (jobId) {
      await this.linkJobToReport(jobId, report.id);
    }

    return report;
  }

  private async insertReportRow(
    projectId: string,
    title: string,
    analyzedScenes: BreakdownReportScene[]
  ): Promise<BreakdownReport> {
    const totalPages = analyzedScenes.reduce(
      (sum, scene) => sum + scene.headerData.pageCount, 0
    );
    const schedule = generateShootingSchedule(analyzedScenes);
    const warnings = uniqueStrings(
      analyzedScenes.flatMap((scene) => scene.analysis.warnings)
    );

    const reportBase = {
      projectId, title,
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'backend-breakdown' as const,
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
        projectId, title,
        summary: reportBase.summary, warnings,
        totalScenes: reportBase.sceneCount,
        totalPages: Math.max(1, Math.round(reportBase.totalPages * 8)),
        totalEstimatedShootDays: reportBase.totalEstimatedShootDays,
        reportData: {} as BreakdownReport,
        createdAt: new Date(), updatedAt: new Date(),
      })
      .returning();
    const reportRow = requireValue(insertedReportRow, 'تعذر حفظ تقرير البريك دون');

    const report: BreakdownReport = { id: reportRow.id, ...reportBase };

    await db.update(breakdownReports)
      .set({ reportData: report, updatedAt: new Date() })
      .where(eq(breakdownReports.id, reportRow.id));

    return report;
  }

  private buildSceneBreakdownValues(
    reportId: string,
    projectId: string,
    chunk: BreakdownReportScene[]
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
      status: 'completed' as const,
      warnings: scene.analysis.warnings,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  private buildMetadataValues(
    reportId: string,
    chunk: BreakdownReportScene[],
    insertedBreakdowns: (typeof sceneBreakdowns.$inferSelect)[]
  ) {
    return chunk.map((scene) => {
      const sceneBreakdownRow = insertedBreakdowns.find(
        (b) => b.sceneId === scene.sceneId
      );
      const validRow = requireValue(sceneBreakdownRow, `تعذر حفظ تفصيل المشهد ${scene.sceneId}`);

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

  private async updateScenesData(chunk: BreakdownReportScene[]) {
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
          .where(eq(scenes.id, scene.sceneId))
      )
    );
  }

  private async persistSceneBreakdowns(
    report: BreakdownReport,
    projectId: string,
    analyzedScenes: BreakdownReportScene[]
  ): Promise<void> {
    const chunkSize = 50;
    for (let i = 0; i < analyzedScenes.length; i += chunkSize) {
      const chunk = analyzedScenes.slice(i, i + chunkSize);

      const sceneBreakdownValues = this.buildSceneBreakdownValues(
        report.id,
        projectId,
        chunk
      );

      const insertedBreakdowns = await db
        .insert(sceneBreakdowns)
        .values(sceneBreakdownValues)
        .returning();

      const metadataValues = this.buildMetadataValues(
        report.id,
        chunk,
        insertedBreakdowns
      );

      await db.insert(sceneHeaderMetadata).values(metadataValues);

      await this.updateScenesData(chunk);
    }
  }

  private async persistScheduleDays(
    reportId: string,
    projectId: string,
    schedule: ShootingScheduleDay[]
  ): Promise<void> {
    for (const day of schedule) {
      await db.insert(shootingSchedules).values({
        reportId, projectId,
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

  private async linkJobToReport(jobId: string, reportId: string): Promise<void> {
    await db.update(breakdownJobs)
      .set({ status: 'completed', reportId, finishedAt: new Date() })
      .where(eq(breakdownJobs.id, jobId));
  }

  private reportToCsv(report: BreakdownReport): string {
    const rows = report.scenes.map((scene) => buildCsvRow(scene));
    return [CSV_HEADERS.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  private async createJob(
    projectId: string,
    sceneId: string | null,
    jobType: string
  ): Promise<string> {
    const [insertedJob] = await db
      .insert(breakdownJobs)
      .values({
        projectId,
        sceneId,
        jobType,
        status: 'running',
        startedAt: new Date(),
      })
      .returning();
    const job = requireValue(insertedJob, 'تعذر إنشاء مهمة البريك دون');

    return job.id;
  }

  private async completeJob(
    jobId: string,
    status: 'completed' | 'failed',
    errorMessage?: string
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
