/**
 * @description منطق إرسال الطلب للذكاء الاصطناعي (المسار الكلاسيكي — 14 مهمة).
 * دالة خالصة (لا hooks) — تُحدِّث الحالة عبر dispatch.
 */

import {
  CreativeTaskType,
  CREATIVE_TASK_LABELS,
  type AdvancedAISettings,
  type AIResponseData,
  type ProcessedInputFile,
  type AIRequestData,
  submitInputSchema,
} from "../types";

import {
  TASK_TO_BACKEND_AGENT_ID,
  TASKS_REQUIRING_COMPLETION_SCOPE,
  MIN_TEXT_LENGTH,
  type ActionType,
  type BrainstormDebateResponse,
} from "./creative-development-types";

type ToastFn = (options: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

export interface SubmitParams {
  textInput: string;
  selectedTask: CreativeTaskType | null;
  completionScope: string;
  selectedCompletionEnhancements: CreativeTaskType[];
  specialRequirements: string;
  additionalInfo: string;
  analysisReport: string;
  analysisId: string | null;
  advancedSettings: AdvancedAISettings;
}

function validateSubmitParams(
  params: SubmitParams,
  dispatch: React.Dispatch<ActionType>
): boolean {
  const validationResult = submitInputSchema.safeParse({
    textInput: params.textInput,
    selectedTask: params.selectedTask,
    completionScope: params.completionScope,
  });
  if (!validationResult.success) {
    const errorMessage =
      validationResult.error.errors[0]?.message ?? "يرجى التحقق من المدخلات";
    dispatch({ type: "SET_ERROR", payload: errorMessage });
    return false;
  }
  if (!params.selectedTask || params.textInput.length < MIN_TEXT_LENGTH) {
    dispatch({
      type: "SET_ERROR",
      payload: "يرجى اختيار مهمة وإدخال نص لا يقل عن 100 حرف",
    });
    return false;
  }
  if (
    TASKS_REQUIRING_COMPLETION_SCOPE.includes(params.selectedTask) &&
    !params.completionScope.trim()
  ) {
    dispatch({
      type: "SET_ERROR",
      payload: `لهذه المهمة (${CREATIVE_TASK_LABELS[params.selectedTask]}), يرجى تحديد "نطاق الإكمال المطلوب"`,
    });
    return false;
  }
  return true;
}

function buildSubmitRequest(params: SubmitParams): AIRequestData {
  const processedFile: ProcessedInputFile = {
    fileName: "input.txt",
    textContent: params.textInput,
    size: params.textInput.length,
    sizeBytes: params.textInput.length,
  };
  const requestOptions: AIRequestData["options"] = {
    additionalInfo: params.additionalInfo,
    analysisReport: params.analysisReport,
    analysisId: params.analysisId,
  };
  if (
    params.selectedTask &&
    TASKS_REQUIRING_COMPLETION_SCOPE.includes(params.selectedTask)
  ) {
    requestOptions.completionScope = params.completionScope;
  }
  if (params.selectedTask === CreativeTaskType.COMPLETION) {
    requestOptions.selectedCompletionEnhancements =
      params.selectedCompletionEnhancements;
  }
  return {
    agent: params.selectedTask!,
    prompt: params.specialRequirements,
    context: { files: [processedFile] },
    options: requestOptions,
  };
}

function buildAgentIds(params: SubmitParams): string[] {
  const primaryAgentId = TASK_TO_BACKEND_AGENT_ID[params.selectedTask!];
  if (!primaryAgentId)
    throw new Error("المهمة المختارة غير مدعومة حالياً في الباك إند");
  const completionAgentIds =
    params.selectedTask === CreativeTaskType.COMPLETION
      ? params.selectedCompletionEnhancements
          .map((task) => TASK_TO_BACKEND_AGENT_ID[task])
          .filter((id): id is string => Boolean(id))
      : [];
  return Array.from(new Set([primaryAgentId, ...completionAgentIds]));
}

function extractFinalText(payload: BrainstormDebateResponse): string {
  return (
    payload.result?.finalDecision?.trim() ??
    payload.result?.judgeReasoning?.trim() ??
    payload.result?.proposals
      ?.map((p) => p.proposal)
      .filter(Boolean)
      .join("\n\n") ??
    "لم يتم إرجاع محتوى من الباك إند"
  );
}

/**
 * تحقق من صحة المدخلات وإرسال طلب الذكاء الاصطناعي عبر /api/brainstorm.
 * يُحدِّث الحالة عبر dispatch عند النجاح أو الفشل.
 */
export async function handleSubmitImpl(
  params: SubmitParams,
  dispatch: React.Dispatch<ActionType>,
  toast: ToastFn
): Promise<void> {
  if (!validateSubmitParams(params, dispatch)) return;

  dispatch({ type: "SET_ERROR", payload: null });
  dispatch({ type: "SET_AI_RESPONSE", payload: null });
  dispatch({ type: "SET_LOADING", payload: true });

  const request = buildSubmitRequest(params);

  try {
    const agentIds = buildAgentIds(params);

    const taskPromptParts = [
      `نوع المهمة: ${CREATIVE_TASK_LABELS[params.selectedTask!]}`,
      `التوجيه الخاص: ${request.prompt || "بدون توجيه خاص"}`,
      params.completionScope
        ? `نطاق الإكمال المطلوب: ${params.completionScope}`
        : "",
      params.additionalInfo ? `معلومات إضافية: ${params.additionalInfo}` : "",
      "النص الأصلي:",
      request.context.files[0]?.textContent ?? "",
    ].filter(Boolean);

    const response = await fetch("/api/brainstorm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        task: taskPromptParts.join("\n\n"),
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
        agentIds,
      }),
    });

    const payload = (await response
      .json()
      .catch(() => null)) as BrainstormDebateResponse | null;

    if (!response.ok || !payload?.success) {
      const errorMsg =
        payload?.error ??
        `فشل تنفيذ المهمة عبر الباك إند (رمز الحالة: ${response.status})`;
      throw new Error(errorMsg);
    }

    const finalText = extractFinalText(payload);
    const result: AIResponseData = {
      text: finalText,
      raw: finalText,
      confidence: payload.result?.consensus ? 0.9 : 0.7,
      metadata: {
        consensus: payload.result?.consensus,
        proposalsCount: payload.result?.proposals?.length ?? 0,
        selectedAgents: agentIds,
      },
    };

    dispatch({ type: "SET_AI_RESPONSE", payload: result });
    toast({
      title: "تم التحليل بنجاح",
      description: "تم إكمال المهمة عبر الباك إند بنجاح",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير متوقع أثناء الإرسال";
    dispatch({ type: "SET_ERROR", payload: errorMessage });
    toast({
      variant: "destructive",
      title: "خطأ في التحليل",
      description: errorMessage,
    });
  } finally {
    dispatch({ type: "SET_LOADING", payload: false });
  }
}
