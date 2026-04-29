/**
 * @description منطق تنفيذ مهمة من كتالوج التطوير الإبداعي.
 * دالة خالصة (لا hooks) — تقبل معاملات بسيطة وتُعيد النتيجة.
 *
 * المسارات بالأولوية:
 *   1. POST /api/development/execute  — مسار مباشر عبر Gemini
 *   2. POST /api/brainstorm           — مسار بديل للأوضاع brainstorm
 *   3. POST /api/workflow/execute-custom — مسار بديل للأوضاع workflow
 */

import { logger } from "@/lib/ai/utils/logger";

import {
  type AdvancedAISettings,
  type DevelopmentTaskDefinition,
  type TaskResults,
  type WorkflowTaskTarget,
  type CreativeTaskType,
} from "../types";
import { normalizeResult } from "../utils/result-normalizer";
import { getTaskById } from "../utils/task-catalog";

import {
  TASK_TO_BACKEND_AGENT_ID,
  type ActionType,
} from "./creative-development-types";

type ToastFn = (options: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

export interface ExecuteTaskParams {
  taskId: string;
  textInput: string;
  completionScope: string;
  specialRequirements: string;
  additionalInfo: string;
  analysisReport: string;
  analysisId: string | null;
  selectedCompletionEnhancements: CreativeTaskType[];
  advancedSettings: AdvancedAISettings;
  taskResults: TaskResults;
}

// — بناء هدف سير عمل من خطوة واحدة (دالة خالصة)
export function buildSingleStepWorkflow(
  task: DevelopmentTaskDefinition
): WorkflowTaskTarget {
  return {
    type: "custom-workflow",
    name: task.nameAr,
    description: task.description,
    steps: [{ id: task.finalStepId, agentId: task.id, taskType: task.id }],
  };
}

// --- المسار الأول: Gemini مباشر ---
async function tryDirectGeminiPath(
  task: DevelopmentTaskDefinition,
  params: ExecuteTaskParams,
  mergedSpecialRequirements: string
): Promise<Record<string, unknown> | null> {
  try {
    const directResponse = await fetch("/api/development/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        taskId: task.id,
        taskName: task.nameAr,
        originalText: params.textInput,
        analysisReport: params.analysisReport || undefined,
        specialRequirements: mergedSpecialRequirements || undefined,
        additionalInfo: params.additionalInfo || undefined,
      }),
    });
    if (directResponse.ok) {
      const directData = (await directResponse
        .json()
        .catch(() => null)) as Record<string, unknown> | null;
      if (directData?.["success"] && directData["result"]) {
        return directData["result"] as Record<string, unknown>;
      }
    }
  } catch {
    // المسار المباشر فشل — ننتقل للمسار البديل
  }
  return null;
}

// --- المسار البديل: brainstorm ---
async function tryBrainstormPath(
  task: DevelopmentTaskDefinition,
  params: ExecuteTaskParams,
  mergedSpecialRequirements: string
): Promise<Record<string, unknown> | null> {
  const enhancementAgentIds =
    task.id === "completion"
      ? params.selectedCompletionEnhancements
          .map((enhancement) => TASK_TO_BACKEND_AGENT_ID[enhancement])
          .filter((agentId): agentId is string => Boolean(agentId))
      : [];
  const targetAgentIds = Array.from(new Set([task.id, ...enhancementAgentIds]));

  const parts = [
    `نوع المهمة: ${task.nameAr}`,
    `التوجيه الخاص: ${mergedSpecialRequirements || "بدون توجيه خاص"}`,
    params.additionalInfo ? `معلومات إضافية: ${params.additionalInfo}` : "",
    "النص الأصلي:",
    params.textInput,
  ].filter(Boolean);

  const response = await fetch("/api/brainstorm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      task: parts.join("\n\n"),
      context: {
        brief: [
          params.analysisReport
            ? `تقرير التحليل:\n${params.analysisReport}`
            : "",
          params.additionalInfo
            ? `معلومات داعمة:\n${params.additionalInfo}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        phase: 3,
        sessionId: params.analysisId ?? `development-${Date.now()}`,
      },
      agentIds: targetAgentIds,
    }),
  });
  const backendData = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return response.ok && backendData ? backendData : null;
}

// --- المسار البديل: workflow ---
async function tryWorkflowPath(
  task: DevelopmentTaskDefinition,
  params: ExecuteTaskParams,
  mergedSpecialRequirements: string,
  effectiveCompletionScope: string
): Promise<Record<string, unknown> | null> {
  const workflowConfig: WorkflowTaskTarget =
    task.executionMode === "workflow-single"
      ? buildSingleStepWorkflow(task)
      : (task.backendTarget as WorkflowTaskTarget);

  const response = await fetch("/api/workflow/execute-custom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      config: workflowConfig,
      input: {
        input: params.textInput,
        text: params.textInput,
        context: {
          originalText: params.textInput,
          analysisReport: params.analysisReport,
          analysisId: params.analysisId,
          specialRequirements: mergedSpecialRequirements,
          additionalInfo: params.additionalInfo,
        },
        options: {
          advancedSettings: params.advancedSettings,
          completionScope: effectiveCompletionScope || undefined,
          selectedCompletionEnhancements: params.selectedCompletionEnhancements,
        },
        originalText: params.textInput,
        analysisReport: params.analysisReport,
        analysisId: params.analysisId,
        specialRequirements: mergedSpecialRequirements,
        additionalInfo: params.additionalInfo,
        advancedSettings: params.advancedSettings,
      },
    }),
  });
  const backendData = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return response.ok && backendData ? backendData : null;
}

/**
 * تنفيذ مهمة من كتالوج المهام الكامل.
 * بعد نجاح التنفيذ: يُطبِّع النتيجة ويُعيد dispatch لتحديث الحالة مباشرةً.
 * عند الفشل: يُرسل إجراء خطأ دون مسح المدخلات.
 */
export async function executeTaskImpl(
  params: ExecuteTaskParams,
  dispatch: React.Dispatch<ActionType>,
  toast: ToastFn
): Promise<unknown> {
  const task = getTaskById(params.taskId);
  if (!task) {
    dispatch({
      type: "SET_ERROR",
      payload: `المهمة "${params.taskId}" غير موجودة في الكتالوج`,
    });
    return null;
  }

  if (!params.textInput.trim() || params.textInput.trim().length < 20) {
    dispatch({
      type: "SET_ERROR",
      payload: "يرجى إدخال نص درامي (20 حرف على الأقل) قبل تنفيذ المهمة",
    });
    return null;
  }

  const effectiveCompletionScope =
    task.id === "completion"
      ? params.completionScope.trim() ??=
        "إكمال المقطع الحالي بشكل متسق مع النص المتاح"
      : "";

  const mergedSpecialRequirements = [
    params.specialRequirements.trim(),
    task.id === "completion"
      ? `نطاق الإكمال المطلوب: ${effectiveCompletionScope}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  dispatch({ type: "SET_ERROR", payload: null });
  dispatch({ type: "SET_LOADING", payload: true });
  logger.info("[development][execute-start]", {
    taskId: task.id,
    mode: task.executionMode,
  });

  try {
    let rawPayload: Record<string, unknown> | null = await tryDirectGeminiPath(
      task,
      params,
      mergedSpecialRequirements
    );

    if (!rawPayload) {
      rawPayload =
        task.executionMode === "brainstorm"
          ? await tryBrainstormPath(task, params, mergedSpecialRequirements)
          : await tryWorkflowPath(
              task,
              params,
              mergedSpecialRequirements,
              effectiveCompletionScope
            );
    }

    if (!rawPayload) {
      dispatch({
        type: "SET_ERROR",
        payload: `فشل تنفيذ "${task.nameAr}". تحقق من إعدادات GEMINI_API_KEY أو اتصال الخادم.`,
      });
      logger.error("[development][execute-no-payload]", {
        taskId: task.id,
        mode: task.executionMode,
      });
      return null;
    }

    const normalized = normalizeResult(rawPayload, task);
    const finalText = normalized.finalText || normalized.aiResponse.text || "";

    if (!finalText.trim()) {
      dispatch({
        type: "SET_ERROR",
        payload: `نُفِّذت المهمة "${task.nameAr}" لكن لم تُرجع أي محتوى.`,
      });
      logger.warn("[development][execute-empty-output]", {
        taskId: task.id,
        mode: task.executionMode,
      });
      return null;
    }

    const newTaskResult: TaskResults = {
      [task.id]: {
        agentName: task.nameAr,
        agentId: task.id,
        text: finalText,
        confidence: normalized.aiResponse.confidence ?? 0.85,
        timestamp: new Date().toISOString(),
      },
    };

    dispatch({
      type: "SET_CATALOG_RESULT",
      payload: {
        aiResponse: {
          ...normalized.aiResponse,
          text: finalText,
          raw: normalized.aiResponse.raw,
        },
        taskResults: {
          ...params.taskResults,
          ...newTaskResult,
          ...normalized.taskResults,
        },
      },
    });

    toast({
      title: `✅ ${task.nameAr}`,
      description: "تم التنفيذ بنجاح — النتيجة متاحة أدناه",
    });
    logger.info("[development][execute-success]", {
      taskId: task.id,
      mode: task.executionMode,
    });
    return normalized;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.";
    dispatch({ type: "SET_ERROR", payload: message });
    logger.error("[development][execute-runtime-error]", {
      taskId: task.id,
      mode: task.executionMode,
      message,
    });
    return null;
  } finally {
    dispatch({ type: "SET_LOADING", payload: false });
  }
}
