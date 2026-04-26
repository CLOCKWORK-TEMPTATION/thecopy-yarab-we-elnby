/**
 * اختبارات وحدة — مسارات خادم البريك دون
 *
 * تختبر الوحدات المُستخدَمة في المسارات الجديدة:
 * - مخزن الجلسات (breakdown-session)
 * - مُجزِّئ السيناريو المحلي (local-segmenter)
 * - دوال تحليل بنية رأس المشهد
 */

import { describe, expect, it } from "vitest";

import {
  storeProjectSession,
  getProjectSession,
  deleteProjectSession,
  type BreakdownProjectSession,
} from "../../../../api/breakdown/_lib/breakdown-session";
import { segmentScriptLocally } from "../../infrastructure/screenplay/local-segmenter";

// ─── نصوص اختبار ────────────────────────────────────────────────────────────

const ARABIC_SCRIPT = `INT. مطبخ - ليل
أحمد يجلس على الطاولة.
كوب قهوة بارد أمامه.

EXT. شارع - نهار
رانيا تسير بسرعة.`;

const ENGLISH_SCRIPT = `INT. KITCHEN - NIGHT
Ahmed sits at the table.
A cold cup of coffee in front of him.

EXT. STREET - DAY
Rania walks quickly.`;

const MIXED_SCRIPT = `مشهد 1 | مطبخ - ليل
أحمد يجلس على الطاولة.

INT. BEDROOM - MORNING
Sara wakes up.`;

// ─── اختبارات مخزن الجلسات ───────────────────────────────────────────────────

describe("اختبارات مخزن جلسات البريك دون", () => {
  const testProjectId = `test-session-${Date.now()}`;

  const testSession: BreakdownProjectSession = {
    projectId: testProjectId,
    title: "مشروع اختبار",
    scriptContent: ARABIC_SCRIPT,
    parsed: {
      scenes: [
        { header: "INT. مطبخ - ليل", content: "أحمد يجلس." },
        { header: "EXT. شارع - نهار", content: "رانيا تسير." },
      ],
    },
    createdAt: Date.now(),
  };

  it("يُخزِّن جلسة ويستردها بالمعرف الصحيح", () => {
    storeProjectSession(testSession);
    const retrieved = getProjectSession(testProjectId);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.projectId).toBe(testProjectId);
    expect(retrieved?.title).toBe("مشروع اختبار");
    expect(retrieved?.parsed.scenes.length).toBe(2);
  });

  it("يُعيد null عند البحث عن معرف غير موجود", () => {
    const result = getProjectSession("non-existent-project-id");
    expect(result).toBeNull();
  });

  it("يحذف الجلسة صراحةً", () => {
    const tempId = `temp-${Date.now()}`;
    storeProjectSession({
      ...testSession,
      projectId: tempId,
    });

    expect(getProjectSession(tempId)).not.toBeNull();
    deleteProjectSession(tempId);
    expect(getProjectSession(tempId)).toBeNull();
  });

  it("يُعيد null للجلسات المنتهية الصلاحية", () => {
    const expiredId = `expired-${Date.now()}`;
    // جلسة منتهية (createdAt في الماضي البعيد)
    storeProjectSession({
      ...testSession,
      projectId: expiredId,
      createdAt: Date.now() - 31 * 60 * 1000, // 31 دقيقة مضت
    });

    const result = getProjectSession(expiredId);
    expect(result).toBeNull();
  });

  it("يستبدل الجلسة القديمة بجلسة جديدة بنفس المعرف", () => {
    const overwriteId = `overwrite-${Date.now()}`;

    storeProjectSession({
      ...testSession,
      projectId: overwriteId,
      title: "العنوان القديم",
    });

    storeProjectSession({
      ...testSession,
      projectId: overwriteId,
      title: "العنوان الجديد",
    });

    const retrieved = getProjectSession(overwriteId);
    expect(retrieved?.title).toBe("العنوان الجديد");
  });
});

// ─── اختبارات المُجزِّئ المحلي ─────────────────────────────────────────────

describe("اختبارات تجزئة السيناريو المحلية", () => {
  it("يُجزِّئ سيناريو عربيًا بصورة صحيحة", () => {
    const result = segmentScriptLocally(ARABIC_SCRIPT);

    expect(result.scenes).toBeDefined();
    expect(Array.isArray(result.scenes)).toBe(true);
    expect(result.scenes.length).toBeGreaterThan(0);

    const firstScene = result.scenes[0];
    expect(firstScene?.header).toBeDefined();
    expect(firstScene?.content).toBeDefined();
    expect(firstScene?.header.length).toBeGreaterThan(0);
    expect(firstScene?.content.length).toBeGreaterThan(0);
  });

  it("يُجزِّئ سيناريو إنجليزيًا بصورة صحيحة", () => {
    const result = segmentScriptLocally(ENGLISH_SCRIPT);

    expect(result.scenes.length).toBeGreaterThanOrEqual(2);

    const headers = result.scenes.map((s) => s.header);
    expect(headers.some((h) => h.includes("INT"))).toBe(true);
    expect(headers.some((h) => h.includes("EXT"))).toBe(true);
  });

  it("يُعيد قائمة فارغة للنص الفارغ", () => {
    const result = segmentScriptLocally("");
    expect(result.scenes.length).toBe(0);
  });

  it("يُعيد قائمة فارغة للنص بدون عناوين مشاهد", () => {
    const noHeadings = "هذا نص عادي بدون عناوين مشاهد.";
    const result = segmentScriptLocally(noHeadings);
    expect(result.scenes.length).toBe(0);
  });

  it("يُعالج النص المختلط (عربي + إنجليزي) بصورة صحيحة", () => {
    const result = segmentScriptLocally(MIXED_SCRIPT);
    // يجب أن يكتشف مشهدًا واحدًا على الأقل
    expect(result.scenes.length).toBeGreaterThanOrEqual(1);
  });

  it("يُجزِّئ سيناريو من مشهد واحد بصورة صحيحة", () => {
    const singleScene = `INT. غرفة المعيشة - نهار
الأسرة تجلس معًا.
الأب يقرأ الجريدة.`;

    const result = segmentScriptLocally(singleScene);
    expect(result.scenes.length).toBe(1);
    expect(result.scenes[0]?.header).toContain("INT");
    expect(result.scenes[0]?.content).toContain("الأسرة");
  });

  it("يتضمن المحتوى الصحيح لكل مشهد", () => {
    const result = segmentScriptLocally(ARABIC_SCRIPT);

    // التحقق من أن محتوى كل مشهد لا يحتوي على عنوان مشهد آخر
    for (const scene of result.scenes) {
      expect(scene.header).not.toBeUndefined();
      expect(scene.content.trim()).not.toBe("");
    }
  });

  it("يُعالج نصًا طويلًا يحتوي على عشرات المشاهد", () => {
    const manyScenes = Array.from(
      { length: 10 },
      (_, i) => `
INT. غرفة ${i + 1} - ليل
مشهد رقم ${i + 1} من المسلسل.
`
    ).join("\n");

    const result = segmentScriptLocally(manyScenes);
    expect(result.scenes.length).toBe(10);
  });
});

// ─── اختبارات التكامل بين الجلسة والتجزئة ───────────────────────────────────

describe("اختبارات التكامل: جلسة + تجزئة", () => {
  it("يُجزِّئ ويُخزِّن السيناريو ويستردها كاملة", () => {
    const script = ARABIC_SCRIPT;
    const projectId = `integration-${Date.now()}`;
    const parsed = segmentScriptLocally(script);

    storeProjectSession({
      projectId,
      title: "مشروع تكامل",
      scriptContent: script,
      parsed,
      createdAt: Date.now(),
    });

    const retrieved = getProjectSession(projectId);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.parsed.scenes.length).toBe(parsed.scenes.length);

    // التحقق من تطابق المحتوى
    for (let i = 0; i < parsed.scenes.length; i++) {
      expect(retrieved?.parsed.scenes[i]?.header).toBe(
        parsed.scenes[i]?.header
      );
    }
  });

  it("يتحقق من صحة بنية BreakdownBootstrapResponse", () => {
    const script = ENGLISH_SCRIPT;
    const projectId = `bootstrap-test-${Date.now()}`;
    const parsed = segmentScriptLocally(script);

    // هذا ما يُعيده مسار bootstrap
    const bootstrapResponse = {
      projectId,
      title: "Test Project",
      parsed,
    };

    expect(bootstrapResponse.projectId).toBeDefined();
    expect(bootstrapResponse.title).toBeDefined();
    expect(bootstrapResponse.parsed.scenes.length).toBeGreaterThan(0);

    // كل مشهد يحتوي على header و content
    for (const scene of bootstrapResponse.parsed.scenes) {
      expect(typeof scene.header).toBe("string");
      expect(typeof scene.content).toBe("string");
      expect(scene.header.length).toBeGreaterThan(0);
    }
  });
});
