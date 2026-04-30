import type { Project } from "@/lib/api-types";
import type { Character, Scene } from "@/types/api";

export const DIRECTORS_STUDIO_DEMO_PROJECT_ID = "guest-directors-studio-sample";

export const DIRECTORS_STUDIO_DEMO_USER_ID = "guest-directors-studio";

export const DIRECTORS_STUDIO_DEMO_SCRIPT = `داخلي - غرفة مونتاج - ليل

تضيء الشاشات وجه المخرجة ليلى وهي تراجع لقطات مشهد مطاردة على الجسر.

ليلى
نحتاج إلى لقطة أوسع قبل القطع السريع.

يدخل سامر حاملًا لوحة القصة وملف الصوت.

سامر
الصوت واضح، لكن الانتقال يحتاج نفسًا أطول.

تلتفت ليلى إلى الشاشة وتضع علامة على بداية اللقطة التالية.`;

const EDITOR_AUTOSAVE_DRAFT_STORAGE_KEY = "filmlane.autosave.document-text.v1";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toEditorHtml(script: string): string {
  return script
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<div data-type="action" class="screenplay-action">${escapeHtml(line)}</div>`
    )
    .join("");
}

export function isDirectorsStudioDemoProjectId(projectId: string): boolean {
  return projectId === DIRECTORS_STUDIO_DEMO_PROJECT_ID;
}

export function isDirectorsStudioDemoProject(
  project: Pick<Project, "id" | "userId"> | null | undefined
): project is Project {
  return (
    project?.id === DIRECTORS_STUDIO_DEMO_PROJECT_ID &&
    project?.userId === DIRECTORS_STUDIO_DEMO_USER_ID
  );
}

export function createDirectorsStudioDemoProject(
  title = "مشروع تجريبي للإخراج"
): Project {
  const timestamp = new Date().toISOString();
  return {
    id: DIRECTORS_STUDIO_DEMO_PROJECT_ID,
    title: title.trim() || "مشروع تجريبي للإخراج",
    scriptContent: DIRECTORS_STUDIO_DEMO_SCRIPT,
    userId: DIRECTORS_STUDIO_DEMO_USER_ID,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function seedDirectorsStudioDemoEditorDraft(
  project: Project,
  overwrite = true
): void {
  if (typeof window === "undefined") return;
  if (!isDirectorsStudioDemoProject(project)) return;
  if (
    !overwrite &&
    window.localStorage.getItem(EDITOR_AUTOSAVE_DRAFT_STORAGE_KEY)
  ) {
    return;
  }

  window.localStorage.setItem(
    EDITOR_AUTOSAVE_DRAFT_STORAGE_KEY,
    JSON.stringify({
      text: project.scriptContent ?? DIRECTORS_STUDIO_DEMO_SCRIPT,
      html: toEditorHtml(project.scriptContent ?? DIRECTORS_STUDIO_DEMO_SCRIPT),
      updatedAt: project.updatedAt,
      version: 2,
    })
  );
}

export function createDirectorsStudioDemoScenes(
  projectId = DIRECTORS_STUDIO_DEMO_PROJECT_ID
): Scene[] {
  return [
    {
      id: `${projectId}-scene-1`,
      projectId,
      sceneNumber: 1,
      title: "غرفة المونتاج",
      location: "استوديو داخلي",
      timeOfDay: "ليل",
      characters: ["ليلى", "سامر"],
      description:
        "مراجعة إخراجية للقطات المطاردة مع تحديد نقطة القطع والانتقال الصوتي.",
      shotCount: 6,
      status: "in-progress",
    },
    {
      id: `${projectId}-scene-2`,
      projectId,
      sceneNumber: 2,
      title: "الجسر",
      location: "خارجي - جسر المدينة",
      timeOfDay: "فجر",
      characters: ["ليلى", "الكومبارس"],
      description:
        "مشهد مطاردة قصير يختبر الإيقاع، اللقطات الواسعة، وتتابع الحركة.",
      shotCount: 9,
      status: "planned",
    },
  ];
}

export function createDirectorsStudioDemoCharacters(
  projectId = DIRECTORS_STUDIO_DEMO_PROJECT_ID
): Character[] {
  return [
    {
      id: `${projectId}-character-1`,
      projectId,
      name: "ليلى",
      appearances: 2,
      consistencyStatus: "good",
      lastSeen: "المشهد 2",
      notes: "مخرجة دقيقة تراجع الإيقاع البصري قبل التسليم.",
    },
    {
      id: `${projectId}-character-2`,
      projectId,
      name: "سامر",
      appearances: 1,
      consistencyStatus: "good",
      lastSeen: "المشهد 1",
      notes: "مساعد إخراج يتابع لوحة القصة ومسار الصوت.",
    },
  ];
}
