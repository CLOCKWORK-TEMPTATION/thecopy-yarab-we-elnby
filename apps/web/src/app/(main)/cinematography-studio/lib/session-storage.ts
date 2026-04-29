/**
 * @fileoverview طبقة حفظ آمنة لجلسة استوديو التصوير السينمائي.
 *
 * - تحفظ في localStorage تحت مفتاح ثابت ومختوم بنسخة (v1).
 * - لا تحفظ ملفات وسائط ثقيلة. الفيديو لا يُسلسل أبدًا. الصور المُلتقطة
 *   لا تُحفظ في النسخة الأولى — يكتفى ببقاء آخر تحليل نصي فقط.
 * - تتسامح مع البيانات الفاسدة وتعيد null بدلًا من رمي استثناء.
 *
 * مفتاح التخزين الرسمي:
 *
 *     cinematography-studio.session.v1
 */

import type { Phase, ShotAnalysis, ViewMode, VisualMood } from "../types";

export const SESSION_STORAGE_KEY = "cinematography-studio.session.v1";

/** حقول الجلسة المحفوظة. كلها اختيارية لأن المتصفح قد لا يجد بعضها. */
export interface PersistedStudioSession {
  phase?: Phase;
  view?: ViewMode;
  mood?: VisualMood;
  activeTool?: string | null;
  technicalSettings?: {
    focusPeaking: boolean;
    falseColor: boolean;
    colorTemp: number;
  };
  lastAnalysis?: ShotAnalysis | null;
  lastAssistant?: {
    question: string | null;
    answer: string | null;
  } | null;
  savedAt?: string;
}

const VALID_PHASES: readonly Phase[] = ["pre", "production", "post"];
const VALID_VIEWS: readonly ViewMode[] = ["dashboard", "phases"];
const VALID_MOODS: readonly VisualMood[] = [
  "noir",
  "realistic",
  "surreal",
  "vintage",
];

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function sanitizeAnalysis(value: unknown): ShotAnalysis | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const score = asNumber(candidate["score"]);
  const exposure = asNumber(candidate["exposure"]);
  if (score === undefined || exposure === undefined) {
    return null;
  }

  const issuesRaw = candidate["issues"];
  const issues = Array.isArray(issuesRaw)
    ? issuesRaw.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    score,
    exposure,
    dynamicRange: asString(candidate["dynamicRange"]) ?? "غير متاح",
    grainLevel: asString(candidate["grainLevel"]) ?? "غير متاح",
    issues,
  };
}

function assignPhase(
  result: PersistedStudioSession,
  candidate: Record<string, unknown>
): void {
  const phase = asString(candidate["phase"]);
  if (phase && (VALID_PHASES as readonly string[]).includes(phase)) {
    result.phase = phase as Phase;
  }
}

function assignView(
  result: PersistedStudioSession,
  candidate: Record<string, unknown>
): void {
  const view = asString(candidate["view"]);
  if (view && (VALID_VIEWS as readonly string[]).includes(view)) {
    result.view = view as ViewMode;
  }
}

function assignMood(
  result: PersistedStudioSession,
  candidate: Record<string, unknown>
): void {
  const mood = asString(candidate["mood"]);
  if (mood && (VALID_MOODS as readonly string[]).includes(mood)) {
    result.mood = mood as VisualMood;
  }
}

function assignActiveTool(
  result: PersistedStudioSession,
  candidate: Record<string, unknown>
): void {
  if (candidate["activeTool"] === null) {
    result.activeTool = null;
    return;
  }

  const tool = asString(candidate["activeTool"]);
  if (tool) {
    result.activeTool = tool;
  }
}

function sanitizeTechnicalSettings(
  value: unknown
): PersistedStudioSession["technicalSettings"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const techRaw = value as Record<string, unknown>;
  const focusPeaking = asBoolean(techRaw["focusPeaking"]);
  const falseColor = asBoolean(techRaw["falseColor"]);
  const colorTemp = asNumber(techRaw["colorTemp"]);

  if (
    focusPeaking === undefined ||
    falseColor === undefined ||
    colorTemp === undefined ||
    colorTemp < 2000 ||
    colorTemp > 10000
  ) {
    return undefined;
  }

  return { focusPeaking, falseColor, colorTemp };
}

function sanitizeAssistant(
  value: unknown
): PersistedStudioSession["lastAssistant"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const assistantRaw = value as Record<string, unknown>;
  const question = asString(assistantRaw["question"]);
  const answer = asString(assistantRaw["answer"]);

  return question || answer
    ? {
        question: question ?? null,
        answer: answer ?? null,
      }
    : null;
}

function assignSavedAt(
  result: PersistedStudioSession,
  candidate: Record<string, unknown>
): void {
  const savedAt = asString(candidate["savedAt"]);
  if (savedAt) {
    result.savedAt = savedAt;
  }
}

function sanitizeSession(value: unknown): PersistedStudioSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const result: PersistedStudioSession = {};

  assignPhase(result, candidate);
  assignView(result, candidate);
  assignMood(result, candidate);
  assignActiveTool(result, candidate);
  const technicalSettings = sanitizeTechnicalSettings(
    candidate["technicalSettings"]
  );
  if (technicalSettings) {
    result.technicalSettings = technicalSettings;
  }
  result.lastAnalysis = sanitizeAnalysis(candidate["lastAnalysis"]);
  const assistant = sanitizeAssistant(candidate["lastAssistant"]);
  if (assistant !== undefined) {
    result.lastAssistant = assistant;
  }
  assignSavedAt(result, candidate);

  return result;
}

/**
 * يقرأ الجلسة المحفوظة. يعيد null عند غياب المتصفح أو عند فساد البيانات.
 * لا يرمي أبدًا.
 */
export function readSession(): PersistedStudioSession | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return sanitizeSession(parsed);
  } catch {
    return null;
  }
}

/**
 * يدمج تحديثًا جزئيًا مع الجلسة الحالية ويحفظ النتيجة.
 * يتحمّل أخطاء الكوتا أو وضع الخصوصية بصمت.
 */
export function patchSession(patch: PersistedStudioSession): void {
  if (!isBrowser()) {
    return;
  }
  try {
    const current = readSession() ?? {};
    const merged: PersistedStudioSession = {
      ...current,
      ...patch,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // تجاهل الأخطاء — عدم إعاقة المستخدم بسبب فشل تخزين محلي.
  }
}

/**
 * يمسح جلسة الاستوديو المحفوظة بالكامل.
 */
export function clearSession(): void {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // تجاهل
  }
}
