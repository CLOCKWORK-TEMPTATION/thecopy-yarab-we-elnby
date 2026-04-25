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

const VALID_PHASES: ReadonlyArray<Phase> = ["pre", "production", "post"];
const VALID_VIEWS: ReadonlyArray<ViewMode> = ["dashboard", "phases"];
const VALID_MOODS: ReadonlyArray<VisualMood> = [
  "noir",
  "realistic",
  "surreal",
  "vintage",
];

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeAnalysis(value: unknown): ShotAnalysis | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const score = asNumber(candidate.score);
  const exposure = asNumber(candidate.exposure);
  if (score === undefined || exposure === undefined) {
    return null;
  }

  const issuesRaw = candidate.issues;
  const issues = Array.isArray(issuesRaw)
    ? issuesRaw.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    score,
    exposure,
    dynamicRange: asString(candidate.dynamicRange) ?? "غير متاح",
    grainLevel: asString(candidate.grainLevel) ?? "غير متاح",
    issues,
  };
}

function sanitizeSession(value: unknown): PersistedStudioSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const result: PersistedStudioSession = {};

  const phase = asString(candidate.phase);
  if (phase && (VALID_PHASES as ReadonlyArray<string>).includes(phase)) {
    result.phase = phase as Phase;
  }

  const view = asString(candidate.view);
  if (view && (VALID_VIEWS as ReadonlyArray<string>).includes(view)) {
    result.view = view as ViewMode;
  }

  const mood = asString(candidate.mood);
  if (mood && (VALID_MOODS as ReadonlyArray<string>).includes(mood)) {
    result.mood = mood as VisualMood;
  }

  if (candidate.activeTool === null) {
    result.activeTool = null;
  } else {
    const tool = asString(candidate.activeTool);
    if (tool) {
      result.activeTool = tool;
    }
  }

  if (candidate.technicalSettings && typeof candidate.technicalSettings === "object") {
    const techRaw = candidate.technicalSettings as Record<string, unknown>;
    const focusPeaking = asBoolean(techRaw.focusPeaking);
    const falseColor = asBoolean(techRaw.falseColor);
    const colorTemp = asNumber(techRaw.colorTemp);
    if (
      focusPeaking !== undefined &&
      falseColor !== undefined &&
      colorTemp !== undefined &&
      colorTemp >= 2000 &&
      colorTemp <= 10000
    ) {
      result.technicalSettings = { focusPeaking, falseColor, colorTemp };
    }
  }

  result.lastAnalysis = sanitizeAnalysis(candidate.lastAnalysis);

  if (candidate.lastAssistant && typeof candidate.lastAssistant === "object") {
    const assistantRaw = candidate.lastAssistant as Record<string, unknown>;
    const question = asString(assistantRaw.question);
    const answer = asString(assistantRaw.answer);
    if (question || answer) {
      result.lastAssistant = {
        question: question ?? null,
        answer: answer ?? null,
      };
    } else {
      result.lastAssistant = null;
    }
  }

  const savedAt = asString(candidate.savedAt);
  if (savedAt) {
    result.savedAt = savedAt;
  }

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
    const parsed = JSON.parse(raw);
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
