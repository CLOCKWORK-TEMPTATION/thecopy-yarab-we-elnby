import { randomUUID } from "node:crypto";

import {
  success,
  failure,
  asString,
  asNumber,
  slugify,
  uniqueById,
  extractNestedRecord,
} from "./handlers-shared";
import { runPlugin } from "./plugin-executor";
import { PerformanceProductivityAnalyzer } from "./plugins/productivity-analyzer";
import {
  readStore,
  updateStore,
  type ArtDirectorStore,
  type StoredTimeEntry,
  type StoredDelay,
} from "./store";

import type { ArtDirectorHandlerResponse } from "./handlers-shared";

const PIE_COLORS = {
  completed: "#4ade80",
  inProgress: "#fbbf24",
  delayed: "#ef4444",
};
const CHART_COLORS = ["#e94560", "#4ade80", "#fbbf24", "#60a5fa", "#a78bfa"];

function buildHoursByDepartment(
  entries: StoredTimeEntry[],
): Record<string, number> {
  return entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.department] = (acc[entry.department] ?? 0) + entry.actualHours;
    return acc;
  }, {});
}

function buildChartData(hoursByDepartment: Record<string, number>) {
  return Object.entries(hoursByDepartment).map(([name, hours], index) => ({
    name,
    hours,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
}

function buildPieData(store: ArtDirectorStore) {
  const completed = store.timeEntries.filter(
    (entry) => entry.status === "completed",
  ).length;
  const delayed = store.delays.length;
  const inProgress = Math.max(store.timeEntries.length - completed, 0);
  const total = completed + delayed + inProgress;

  if (total === 0) return [];

  return [
    {
      name: "مكتمل",
      value: Math.round((completed / total) * 100),
      color: PIE_COLORS.completed,
    },
    {
      name: "قيد التنفيذ",
      value: Math.round((inProgress / total) * 100),
      color: PIE_COLORS.inProgress,
    },
    {
      name: "متأخر",
      value: Math.round((delayed / total) * 100),
      color: PIE_COLORS.delayed,
    },
  ];
}

export async function handleProductivitySummary(): Promise<ArtDirectorHandlerResponse> {
  const store = await readStore();
  const hoursByDepartment = buildHoursByDepartment(store.timeEntries);

  return success({
    data: {
      chartData: buildChartData(hoursByDepartment),
      pieData: buildPieData(store),
    },
  });
}

export async function handleProductivityAnalyze(
  payload: Record<string, unknown>,
): Promise<ArtDirectorHandlerResponse> {
  const department = asString(payload["department"]);
  const period = asString(payload["period"]) || "weekly";
  const store = await readStore();
  const entries = department
    ? store.timeEntries.filter((e) => e.department === department)
    : store.timeEntries;
  const totalHours = entries.reduce((sum, e) => sum + e.actualHours, 0);
  const delayHours = store.delays.reduce((sum, d) => sum + d.hoursLost, 0);
  const completedCount = entries.filter((e) => e.status === "completed").length;

  return success({
    data: {
      period,
      department: department || "all",
      totalHours,
      taskCount: entries.length,
      delayHours,
      completionRate:
        entries.length === 0
          ? 0
          : Math.round((completedCount / entries.length) * 100),
    },
  });
}

function buildStoredTimeEntry(
  rawEntry: Record<string, unknown>,
  taskId: string,
  task: string,
  category: string,
  hours: number,
): StoredTimeEntry {
  return {
    id: asString(rawEntry["id"]) || randomUUID(),
    taskId,
    taskName: task,
    department: category,
    assignee: "Art Director",
    plannedHours: hours,
    actualHours: hours,
    status: "completed",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

export async function handleProductivityLogTime(
  payload: Record<string, unknown>,
): Promise<ArtDirectorHandlerResponse> {
  const task = asString(payload["task"]);
  const hours = asNumber(payload["hours"]);
  const category = asString(payload["category"]) || "design";

  if (!task) {
    return failure("وصف المهمة مطلوب");
  }

  if (!Number.isFinite(hours) || hours <= 0) {
    return failure("عدد الساعات يجب أن يكون أكبر من صفر");
  }

  const taskId = slugify(`${task}-${Date.now()}`);
  const logData = {
    taskId,
    taskName: task,
    department: category,
    assignee: "Art Director",
    plannedHours: hours,
    actualHours: hours,
    status: "completed",
    notes: "",
  };
  const result = await runPlugin(PerformanceProductivityAnalyzer, {
    type: "log-time",
    data: logData,
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر تسجيل الوقت");
  }

  const rawEntry = extractNestedRecord(result, "entry");
  if (!rawEntry) {
    return failure("تعذر قراءة بيانات الوقت المسجل", 500);
  }

  const storedEntry = buildStoredTimeEntry(
    rawEntry,
    taskId,
    task,
    category,
    hours,
  );

  await updateStore((store) => {
    store.timeEntries = uniqueById<StoredTimeEntry>(
      store.timeEntries,
      storedEntry,
    );
  });

  return success({
    data: { entry: storedEntry, message: "تم تسجيل الوقت بنجاح" },
  });
}

const DELAY_CATEGORY_MAP: Record<string, string> = {
  critical: "technical",
  high: "logistics",
};

function buildStoredDelay(
  rawDelay: Record<string, unknown>,
  reason: string,
  hoursLost: number,
): StoredDelay {
  return {
    id: asString(rawDelay["id"]) || randomUUID(),
    taskId: asString(rawDelay["taskId"]) || randomUUID(),
    reason,
    reasonAr: reason,
    hoursLost,
    category: asString(rawDelay["category"]) || "other",
    createdAt: new Date().toISOString(),
  };
}

export async function handleProductivityDelay(
  payload: Record<string, unknown>,
): Promise<ArtDirectorHandlerResponse> {
  const reason = asString(payload["reason"]);
  const hoursLost = asNumber(payload["hoursLost"]);
  const impact = asString(payload["impact"]) || "low";

  if (!reason) {
    return failure("سبب التأخير مطلوب");
  }

  if (!Number.isFinite(hoursLost) || hoursLost <= 0) {
    return failure("الساعات المفقودة يجب أن تكون أكبر من صفر");
  }

  const result = await runPlugin(PerformanceProductivityAnalyzer, {
    type: "report-delay",
    data: {
      taskId: slugify(`${reason}-${Date.now()}`),
      reason,
      reasonAr: reason,
      hoursLost,
      category: DELAY_CATEGORY_MAP[impact] ?? "other",
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر تسجيل التأخير");
  }

  const rawDelay = extractNestedRecord(result, "delay");
  if (!rawDelay) {
    return failure("تعذر قراءة بيانات التأخير", 500);
  }

  const storedDelay = buildStoredDelay(rawDelay, reason, hoursLost);

  await updateStore((store) => {
    store.delays = uniqueById<StoredDelay>(store.delays, storedDelay);
  });

  return success({
    data: { delay: storedDelay, message: "تم تسجيل التأخير بنجاح" },
  });
}

export async function handleProductivityRecommendations(): Promise<ArtDirectorHandlerResponse> {
  const store = await readStore();
  const recommendations: string[] = [];

  if (store.timeEntries.length === 0) {
    recommendations.push(
      "ابدأ بتسجيل الوقت الفعلي للمهام حتى تظهر توصيات مبنية على بيانات حقيقية.",
    );
  }

  const totalDelayHours = store.delays.reduce((sum, d) => sum + d.hoursLost, 0);
  if (totalDelayHours > 0) {
    recommendations.push(
      `يوجد ${totalDelayHours} ساعة مهدرة؛ راجع أسباب التأخير الأعلى تكرارًا هذا الأسبوع.`,
    );
  }

  const byDepartment = buildHoursByDepartment(store.timeEntries);
  const mostLoaded = Object.entries(byDepartment).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (mostLoaded) {
    recommendations.push(
      `القسم الأكثر ضغطًا حاليًا هو ${mostLoaded[0]}؛ فكّر في توزيع الحمل أو تفويض المهام المتكررة.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "الإيقاع الحالي جيد؛ استمر في تسجيل الوقت ومراجعة الانحرافات أسبوعيًا.",
    );
  }

  return success({ data: { recommendations } });
}
