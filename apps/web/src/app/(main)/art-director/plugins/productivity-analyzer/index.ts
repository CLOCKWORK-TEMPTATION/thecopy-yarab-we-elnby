import { Plugin, PluginInput, PluginOutput } from "../../types";
import { v4 as uuidv4 } from "uuid";

interface TimeEntry {
  id: string;
  taskId: string;
  taskName: string;
  department: string;
  assignee: string;
  plannedHours: number;
  actualHours: number;
  startTime: Date;
  endTime?: Date;
  status: "planned" | "in-progress" | "completed" | "delayed" | "blocked";
  notes: string;
}

interface ProductionMetrics {
  productionId: string;
  scenesPlanned: number;
  scenesCompleted: number;
  averageSceneTime: number;
  totalPlannedHours: number;
  totalActualHours: number;
  efficiency: number;
  delays: Delay[];
  blockers: Blocker[];
}

interface Delay {
  id: string;
  taskId: string;
  reason: string;
  reasonAr: string;
  hoursLost: number;
  category:
    | "weather"
    | "technical"
    | "personnel"
    | "logistics"
    | "creative"
    | "other";
}

interface Blocker {
  id: string;
  description: string;
  descriptionAr: string;
  severity: "low" | "medium" | "high" | "critical";
  department: string;
  reportedAt: Date;
  resolvedAt?: Date;
}

interface LogTimeInput {
  taskId: string;
  taskName: string;
  department: string;
  assignee: string;
  plannedHours: number;
  actualHours?: number;
  status?: string;
  notes?: string;
}

interface AnalyzePerformanceInput {
  productionId: string;
  startDate?: string;
  endDate?: string;
  department?: string;
}

export class PerformanceProductivityAnalyzer implements Plugin {
  id = "productivity-analyzer";
  name = "Performance & Productivity Analyzer";
  nameAr = "محلل الأداء والإنتاجية";
  version = "1.0.0";
  description =
    "Measures production efficiency and provides insights for improvement";
  descriptionAr = "قياس كفاءة عمليات الإنتاج وتقديم رؤى لتحسينها";
  category = "ai-analytics" as const;

  private timeEntries: Map<string, TimeEntry> = new Map();
  private delays: Map<string, Delay> = new Map();
  private blockers: Map<string, Blocker> = new Map();

  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initialized`);
  }

  async execute(input: PluginInput): Promise<PluginOutput> {
    switch (input.type) {
      case "log-time":
        return this.logTime(input.data as unknown as LogTimeInput);
      case "complete-task":
        return this.completeTask(
          input.data as { taskId: string; actualHours: number; notes?: string }
        );
      case "report-delay":
        return this.reportDelay(input.data as unknown as Partial<Delay>);
      case "report-blocker":
        return this.reportBlocker(input.data as unknown as Partial<Blocker>);
      case "resolve-blocker":
        return this.resolveBlocker(input.data as { blockerId: string });
      case "analyze":
        return this.analyzePerformance(
          input.data as unknown as AnalyzePerformanceInput
        );
      case "department-report":
        return this.getDepartmentReport(input.data as { department: string });
      case "efficiency-trends":
        return this.getEfficiencyTrends(
          input.data as { productionId: string; period: string }
        );
      case "recommendations":
        return this.getRecommendations(input.data as { productionId: string });
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private async logTime(data: LogTimeInput): Promise<PluginOutput> {
    if (!data.taskId || !data.taskName || !data.department) {
      return {
        success: false,
        error: "Task ID, name, and department are required",
      };
    }

    const entry: TimeEntry = {
      id: uuidv4(),
      taskId: data.taskId,
      taskName: data.taskName,
      department: data.department,
      assignee: data.assignee,
      plannedHours: data.plannedHours,
      actualHours: data.actualHours || 0,
      startTime: new Date(),
      status: (data.status as TimeEntry["status"]) || "planned",
      notes: data.notes || "",
    };

    this.timeEntries.set(entry.id, entry);

    return {
      success: true,
      data: {
        message: "Time entry logged",
        messageAr: "تم تسجيل الوقت",
        entry: entry as unknown as Record<string, unknown>,
      },
    };
  }

  private async completeTask(data: {
    taskId: string;
    actualHours: number;
    notes?: string;
  }): Promise<PluginOutput> {
    const entries = Array.from(this.timeEntries.values()).filter(
      (e) => e.taskId === data.taskId
    );

    if (entries.length === 0) {
      return {
        success: false,
        error: `No time entries found for task "${data.taskId}"`,
      };
    }

    const entry = entries.at(-1);
    if (!entry) {
      return {
        success: false,
        error: `No time entries found for task "${data.taskId}"`,
      };
    }
    entry.actualHours = data.actualHours;
    entry.endTime = new Date();
    entry.status =
      data.actualHours > entry.plannedHours ? "delayed" : "completed";
    if (data.notes) entry.notes = data.notes;

    const variance =
      ((data.actualHours - entry.plannedHours) / entry.plannedHours) * 100;

    return {
      success: true,
      data: {
        message: "Task completed",
        messageAr: "تم إكمال المهمة",
        entry: entry as unknown as Record<string, unknown>,
        variance: Math.round(variance),
        status:
          variance > 20
            ? "significantly over budget"
            : variance > 0
              ? "slightly over budget"
              : variance < -10
                ? "under budget"
                : "on budget",
      },
    };
  }

  private async reportDelay(data: Partial<Delay>): Promise<PluginOutput> {
    if (!data.taskId || !data.reason || !data.hoursLost) {
      return {
        success: false,
        error: "Task ID, reason, and hours lost are required",
      };
    }

    const delay: Delay = {
      id: uuidv4(),
      taskId: data.taskId,
      reason: data.reason,
      reasonAr: data.reasonAr || data.reason,
      hoursLost: data.hoursLost,
      category: data.category || "other",
    };

    this.delays.set(delay.id, delay);

    return {
      success: true,
      data: {
        message: "Delay reported",
        messageAr: "تم الإبلاغ عن التأخير",
        delay: delay as unknown as Record<string, unknown>,
      },
    };
  }

  private async reportBlocker(data: Partial<Blocker>): Promise<PluginOutput> {
    if (!data.description || !data.department) {
      return {
        success: false,
        error: "Description and department are required",
      };
    }

    const blocker: Blocker = {
      id: uuidv4(),
      description: data.description,
      descriptionAr: data.descriptionAr || data.description,
      severity: data.severity || "medium",
      department: data.department,
      reportedAt: new Date(),
    };

    this.blockers.set(blocker.id, blocker);

    return {
      success: true,
      data: {
        message: "Blocker reported",
        messageAr: "تم الإبلاغ عن العائق",
        blocker: blocker as unknown as Record<string, unknown>,
      },
    };
  }

  private async resolveBlocker(data: {
    blockerId: string;
  }): Promise<PluginOutput> {
    const blocker = this.blockers.get(data.blockerId);

    if (!blocker) {
      return {
        success: false,
        error: `Blocker with ID "${data.blockerId}" not found`,
      };
    }

    blocker.resolvedAt = new Date();
    const resolutionTime =
      (blocker.resolvedAt.getTime() - blocker.reportedAt.getTime()) /
      (1000 * 60 * 60);

    return {
      success: true,
      data: {
        message: "Blocker resolved",
        messageAr: "تم حل العائق",
        blocker: blocker as unknown as Record<string, unknown>,
        resolutionTimeHours: Math.round(resolutionTime * 10) / 10,
      },
    };
  }

  private async analyzePerformance(
    data: AnalyzePerformanceInput
  ): Promise<PluginOutput> {
    let entries = Array.from(this.timeEntries.values());

    if (data.department) {
      entries = entries.filter((e) => e.department === data.department);
    }

    if (data.startDate) {
      const start = new Date(data.startDate);
      entries = entries.filter((e) => e.startTime >= start);
    }

    if (data.endDate) {
      const end = new Date(data.endDate);
      entries = entries.filter((e) => e.startTime <= end);
    }

    const totalPlannedHours = entries.reduce(
      (sum, e) => sum + e.plannedHours,
      0
    );
    const totalActualHours = entries.reduce((sum, e) => sum + e.actualHours, 0);
    const completedTasks = entries.filter(
      (e) => e.status === "completed" || e.status === "delayed"
    );
    const delayedTasks = entries.filter((e) => e.status === "delayed");
    const blockedTasks = entries.filter((e) => e.status === "blocked");

    const efficiency =
      totalPlannedHours > 0 ? (totalPlannedHours / totalActualHours) * 100 : 0;

    const metrics: ProductionMetrics = {
      productionId: data.productionId,
      scenesPlanned: entries.length,
      scenesCompleted: completedTasks.length,
      averageSceneTime:
        completedTasks.length > 0
          ? completedTasks.reduce((sum, e) => sum + e.actualHours, 0) /
            completedTasks.length
          : 0,
      totalPlannedHours,
      totalActualHours,
      efficiency: Math.round(efficiency),
      delays: Array.from(this.delays.values()),
      blockers: Array.from(this.blockers.values()).filter((b) => !b.resolvedAt),
    };

    return {
      success: true,
      data: {
        metrics: metrics as unknown as Record<string, unknown>,
        summary: {
          totalTasks: entries.length,
          completed: completedTasks.length,
          delayed: delayedTasks.length,
          blocked: blockedTasks.length,
          inProgress: entries.filter((e) => e.status === "in-progress").length,
          planned: entries.filter((e) => e.status === "planned").length,
        },
        efficiencyRating:
          efficiency >= 90
            ? "Excellent"
            : efficiency >= 75
              ? "Good"
              : efficiency >= 60
                ? "Fair"
                : "Needs Improvement",
      },
    };
  }

  private async getDepartmentReport(data: {
    department: string;
  }): Promise<PluginOutput> {
    const entries = Array.from(this.timeEntries.values()).filter(
      (e) => e.department === data.department
    );

    const totalPlanned = entries.reduce((sum, e) => sum + e.plannedHours, 0);
    const totalActual = entries.reduce((sum, e) => sum + e.actualHours, 0);
    const completed = entries.filter(
      (e) => e.status === "completed" || e.status === "delayed"
    );

    const assigneeStats: Record<
      string,
      { planned: number; actual: number; tasks: number }
    > = {};
    for (const entry of entries) {
      const stats = assigneeStats[entry.assignee] ?? {
        planned: 0,
        actual: 0,
        tasks: 0,
      };
      stats.planned += entry.plannedHours;
      stats.actual += entry.actualHours;
      stats.tasks += 1;
      assigneeStats[entry.assignee] = stats;
    }

    return {
      success: true,
      data: {
        department: data.department,
        totalTasks: entries.length,
        completedTasks: completed.length,
        totalPlannedHours: totalPlanned,
        totalActualHours: totalActual,
        efficiency:
          totalActual > 0 ? Math.round((totalPlanned / totalActual) * 100) : 0,
        teamPerformance: Object.entries(assigneeStats).map(([name, stats]) => ({
          name,
          ...stats,
          efficiency:
            stats.actual > 0
              ? Math.round((stats.planned / stats.actual) * 100)
              : 0,
        })),
      },
    };
  }

  private async getEfficiencyTrends(data: {
    productionId: string;
    period: string;
  }): Promise<PluginOutput> {
    const entries = Array.from(this.timeEntries.values())
      .filter((e) => e.endTime)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const trends: Array<{
      date: string;
      efficiency: number;
      tasksCompleted: number;
    }> = [];

    const groupedByDay: Record<string, TimeEntry[]> = {};
    for (const entry of entries) {
      const [dateKey] = entry.startTime.toISOString().split("T");
      if (!dateKey) {
        continue;
      }
      const dayEntries = groupedByDay[dateKey] ?? [];
      dayEntries.push(entry);
      groupedByDay[dateKey] = dayEntries;
    }

    for (const [date, dayEntries] of Object.entries(groupedByDay)) {
      const planned = dayEntries.reduce((sum, e) => sum + e.plannedHours, 0);
      const actual = dayEntries.reduce((sum, e) => sum + e.actualHours, 0);
      trends.push({
        date,
        efficiency: actual > 0 ? Math.round((planned / actual) * 100) : 0,
        tasksCompleted: dayEntries.filter((e) => e.status === "completed")
          .length,
      });
    }

    return {
      success: true,
      data: {
        productionId: data.productionId,
        period: data.period,
        trends,
        averageEfficiency:
          trends.length > 0
            ? Math.round(
                trends.reduce((sum, t) => sum + t.efficiency, 0) / trends.length
              )
            : 0,
      },
    };
  }

  private async getRecommendations(data: {
    productionId: string;
  }): Promise<PluginOutput> {
    const entries = Array.from(this.timeEntries.values());
    const delays = Array.from(this.delays.values());
    const blockers = Array.from(this.blockers.values());

    const recommendations: Array<{
      priority: string;
      suggestion: string;
      suggestionAr: string;
    }> = [];

    const delayCategories: Record<string, number> = {};
    for (const delay of delays) {
      delayCategories[delay.category] =
        (delayCategories[delay.category] || 0) + delay.hoursLost;
    }

    const topDelayCategory = Object.entries(delayCategories).sort(
      ([, a], [, b]) => b - a
    )[0];

    if (topDelayCategory) {
      recommendations.push({
        priority: "high",
        suggestion: `Address ${topDelayCategory[0]} issues - causing ${topDelayCategory[1]} hours of delays`,
        suggestionAr: `معالجة مشاكل ${topDelayCategory[0]} - تسبب في ${topDelayCategory[1]} ساعات تأخير`,
      });
    }

    const unresolvedBlockers = blockers.filter((b) => !b.resolvedAt);
    if (unresolvedBlockers.length > 0) {
      recommendations.push({
        priority: "critical",
        suggestion: `Resolve ${unresolvedBlockers.length} active blockers immediately`,
        suggestionAr: `حل ${unresolvedBlockers.length} عوائق نشطة فوراً`,
      });
    }

    const departmentEfficiency: Record<
      string,
      { planned: number; actual: number }
    > = {};
    for (const entry of entries) {
      const stats = departmentEfficiency[entry.department] ?? {
        planned: 0,
        actual: 0,
      };
      stats.planned += entry.plannedHours;
      stats.actual += entry.actualHours;
      departmentEfficiency[entry.department] = stats;
    }

    for (const [dept, stats] of Object.entries(departmentEfficiency)) {
      const eff = stats.actual > 0 ? (stats.planned / stats.actual) * 100 : 100;
      if (eff < 70) {
        recommendations.push({
          priority: "medium",
          suggestion: `Review ${dept} department workflow - efficiency at ${Math.round(eff)}%`,
          suggestionAr: `مراجعة سير عمل قسم ${dept} - الكفاءة عند ${Math.round(eff)}%`,
        });
      }
    }

    return {
      success: true,
      data: {
        productionId: data.productionId,
        generatedAt: new Date().toISOString(),
        recommendations: recommendations as unknown as Record<
          string,
          unknown
        >[],
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shut down`);
  }
}

export const productivityAnalyzer = new PerformanceProductivityAnalyzer();
