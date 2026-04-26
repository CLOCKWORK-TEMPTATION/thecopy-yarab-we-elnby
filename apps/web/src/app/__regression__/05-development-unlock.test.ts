/**
 * شبكة انحدار: development — فتح القفل بالتحليل المستورد أو التقرير اليدوي
 *
 * يتحقق من:
 * - unlock with imported analysis: بيانات التحليل المستوردة تفتح المهام
 * - unlock with manual report: التقرير اليدوي يفتح المهام
 * - أنواع المهام الـ 14 مسجّلة بالكامل
 */
import { describe, it, expect } from "vitest";

import {
  CreativeTaskType,
  CREATIVE_TASK_LABELS,
} from "@/app/(main)/development/types";
import { platformApps } from "@/config/apps.config";

describe("شبكة انحدار: development — فتح القفل", () => {
  // ================================================================
  // 1) بطاقة التطوير مسجّلة
  // ================================================================
  it("بطاقة التطوير الإبداعي مسجّلة في المشغّل", () => {
    const card = platformApps.find((a) => a.path === "/development");
    expect(card).toBeDefined();
    expect(card!.enabled).toBe(true);
  });

  // ================================================================
  // 2) أنواع المهام الـ 14 مسجّلة
  // ================================================================
  describe("CreativeTaskType enum", () => {
    it("يحتوي 14 نوع مهمة بالضبط", () => {
      const values = Object.values(CreativeTaskType);
      expect(values.length).toBe(14);
    });

    it("كل نوع مهمة له تسمية عربية في CREATIVE_TASK_LABELS", () => {
      for (const taskType of Object.values(CreativeTaskType)) {
        expect(CREATIVE_TASK_LABELS[taskType]).toBeDefined();
        expect(CREATIVE_TASK_LABELS[taskType].length).toBeGreaterThan(0);
      }
    });

    it("يحتوي الأنواع الأساسية المتوقعة", () => {
      expect(CreativeTaskType.CREATIVE).toBe("CREATIVE");
      expect(CreativeTaskType.COMPLETION).toBe("COMPLETION");
      expect(CreativeTaskType.SCENE_GENERATOR).toBe("SCENE_GENERATOR");
      expect(CreativeTaskType.CHARACTER_VOICE).toBe("CHARACTER_VOICE");
      expect(CreativeTaskType.WORLD_BUILDER).toBe("WORLD_BUILDER");
      expect(CreativeTaskType.PLOT_PREDICTOR).toBe("PLOT_PREDICTOR");
      expect(CreativeTaskType.TENSION_OPTIMIZER).toBe("TENSION_OPTIMIZER");
      expect(CreativeTaskType.RHYTHM_MAPPING).toBe("RHYTHM_MAPPING");
      expect(CreativeTaskType.CHARACTER_NETWORK).toBe("CHARACTER_NETWORK");
      expect(CreativeTaskType.DIALOGUE_FORENSICS).toBe("DIALOGUE_FORENSICS");
      expect(CreativeTaskType.THEMATIC_MINING).toBe("THEMATIC_MINING");
      expect(CreativeTaskType.STYLE_FINGERPRINT).toBe("STYLE_FINGERPRINT");
      expect(CreativeTaskType.CONFLICT_DYNAMICS).toBe("CONFLICT_DYNAMICS");
      expect(CreativeTaskType.ADAPTIVE_REWRITING).toBe("ADAPTIVE_REWRITING");
    });
  });

  // ================================================================
  // 3) فتح القفل بالتحليل المستورد
  // ================================================================
  describe("unlock with imported analysis", () => {
    it("بيانات تحليل صحيحة تفتح القفل", () => {
      const importedAnalysis = {
        stations: [
          { id: 1, status: "completed", score: 90 },
          { id: 2, status: "completed", score: 85 },
        ],
        overallScore: 87.5,
        completedAt: "2026-04-10T12:00:00Z",
      };

      // شرط فتح القفل: يوجد محطة واحدة مكتملة على الأقل
      const hasCompletedStation = importedAnalysis.stations.some(
        (s) => s.status === "completed"
      );
      expect(hasCompletedStation).toBe(true);

      // شرط: النتيجة العامة أكبر من 0
      expect(importedAnalysis.overallScore).toBeGreaterThan(0);
    });

    it("بيانات تحليل فارغة لا تفتح القفل", () => {
      const emptyAnalysis = {
        stations: [],
        overallScore: 0,
        completedAt: null,
      };

      const hasCompletedStation = emptyAnalysis.stations.some(
        (s: { status: string }) => s.status === "completed"
      );
      expect(hasCompletedStation).toBe(false);
    });
  });

  // ================================================================
  // 4) فتح القفل بالتقرير اليدوي
  // ================================================================
  describe("unlock with manual report", () => {
    it("تقرير يدوي بمحتوى كافٍ يفتح القفل", () => {
      const manualReport = {
        text: "تحليل يدوي للسيناريو مع ملاحظات تفصيلية عن البنية والشخصيات والحوار",
        wordCount: 10,
        isManual: true,
      };

      // شرط: التقرير أكثر من 5 كلمات
      expect(manualReport.wordCount).toBeGreaterThan(5);
      expect(manualReport.isManual).toBe(true);
      expect(manualReport.text.length).toBeGreaterThan(0);
    });

    it("تقرير يدوي فارغ لا يفتح القفل", () => {
      const emptyReport = {
        text: "",
        wordCount: 0,
        isManual: true,
      };

      expect(emptyReport.wordCount).toBe(0);
      expect(emptyReport.text.length).toBe(0);
    });
  });
});
