/**
 * @fileoverview ناقل أحداث تشخيص خفيف لصفحة الاستوديو السينماتوغرافي.
 *
 * - وحيد المعاملة (singleton).
 * - يُفعَّل فقط عندما يكون `NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS === "1"`. في غيرها
 *   كل من `publish` و `subscribe` لا يفعل شيئًا — صفر تكلفة في الإنتاج.
 * - لا يحمل بيانات حساسة. الحقول المنشورة تُكتب صراحة في كل خطاف.
 */

export type DiagnosticsSlice = "camera" | "assistant" | "renderCount";

export interface CameraDiagnostics {
  permission: string;
  previewType: string | null;
  lastFrameAt: number | null;
}

export interface AssistantDiagnostics {
  isLoading: boolean;
  lastQuestion: string | null;
  answerLength: number;
  error: string | null;
}

export interface RenderCountDiagnostics {
  studio?: number;
  production?: number;
}

export type DiagnosticsPayload =
  | { slice: "camera"; data: CameraDiagnostics }
  | { slice: "assistant"; data: AssistantDiagnostics }
  | { slice: "renderCount"; data: RenderCountDiagnostics };

type Subscriber = (payload: DiagnosticsPayload) => void;

interface DiagnosticsState {
  camera: CameraDiagnostics;
  assistant: AssistantDiagnostics;
  renderCount: RenderCountDiagnostics;
}

const initialState: DiagnosticsState = {
  camera: { permission: "idle", previewType: null, lastFrameAt: null },
  assistant: {
    isLoading: false,
    lastQuestion: null,
    answerLength: 0,
    error: null,
  },
  renderCount: { studio: 0, production: 0 },
};

const subscribers = new Set<Subscriber>();
const state: DiagnosticsState = { ...initialState };

/**
 * يتحقق من تفعيل التشخيص عبر علم بيئي. القيمة تُحسب وقت الاستدعاء لا وقت
 * استيراد الوحدة، حتى تتمكن الاختبارات من التحكم بها عبر `process.env`.
 */
export function isDiagnosticsEnabled(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env["NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS"] === "1"
  );
}

/**
 * ينشر تحديث تشخيص. يعود فورًا إن كان العلم معطلًا.
 */
export function publishDiagnostics(payload: DiagnosticsPayload): void {
  if (!isDiagnosticsEnabled()) {
    return;
  }
  if (payload.slice === "camera") {
    state.camera = payload.data;
  } else if (payload.slice === "assistant") {
    state.assistant = payload.data;
  } else if (payload.slice === "renderCount") {
    state.renderCount = { ...state.renderCount, ...payload.data };
  }
  for (const subscriber of subscribers) {
    try {
      subscriber(payload);
    } catch {
      // عدم السماح لأي مشترك بإسقاط الباقي.
    }
  }
}

/**
 * يشترك في تحديثات التشخيص. يعيد دالة إلغاء الاشتراك. يعمل فقط عند تفعيل العلم.
 */
export function subscribeDiagnostics(subscriber: Subscriber): () => void {
  if (!isDiagnosticsEnabled()) {
    return () => undefined;
  }
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

/**
 * يعيد لقطة فورية من الحالة الحالية. للاختبارات وللعرض الأولي قبل أول حدث.
 */
export function snapshotDiagnostics(): DiagnosticsState {
  return {
    camera: { ...state.camera },
    assistant: { ...state.assistant },
    renderCount: { ...state.renderCount },
  };
}

/**
 * يعيد ضبط الحالة الداخلية. للاختبارات فقط.
 */
export function resetDiagnostics(): void {
  state.camera = { ...initialState.camera };
  state.assistant = { ...initialState.assistant };
  state.renderCount = { ...initialState.renderCount };
  subscribers.clear();
}
