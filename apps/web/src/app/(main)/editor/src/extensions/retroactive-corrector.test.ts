import { describe, expect, it } from "vitest";

import { retroactiveCorrectionPass } from "./retroactive-corrector";
import type { ClassifiedDraft } from "./classification-types";

const draft = (
  overrides: Partial<ClassifiedDraft> & Pick<ClassifiedDraft, "type" | "text">
): ClassifiedDraft => ({
  confidence: overrides.confidence ?? 70,
  classificationMethod: overrides.classificationMethod ?? "context",
  ...overrides,
});

describe("retroactive-corrector — النقطتان المصطنعة عند التحويل من character إلى dialogue", () => {
  it("ينزع النقطتين من نص الشخصية الزائفة عند إعادة تصنيفها إلى حوار (Pattern 2)", () => {
    const classified: ClassifiedDraft[] = [
      draft({ type: "character", text: "اميرة:" }),
      draft({ type: "character", text: "وما بلغتش:" }),
      draft({ type: "dialogue", text: "ليه ؟" }),
    ];

    const corrections = retroactiveCorrectionPass(classified);

    expect(corrections).toBeGreaterThan(0);
    expect(classified[0]?.type).toBe("character");
    expect(classified[0]?.text).toBe("اميرة:");

    expect(classified[1]?.type).toBe("dialogue");
    // النقطتان المضافتان تلقائيًا لا تتسرّبان إلى نص الحوار النهائي
    expect(classified[1]?.text).toBe("وما بلغتش");
    expect(classified[1]?.text).not.toMatch(/[:：]\s*$/);

    expect(classified[2]?.type).toBe("dialogue");
    expect(classified[2]?.text).toBe("ليه ؟");
  });

  it("ينزع أيضًا النقطتين العربية الكاملة العرض «：» عند التحويل", () => {
    const classified: ClassifiedDraft[] = [
      draft({ type: "character", text: "اميرة:" }),
      draft({ type: "character", text: "وما بلغتش：" }),
      draft({ type: "dialogue", text: "ليه ؟" }),
    ];

    retroactiveCorrectionPass(classified);

    expect(classified[1]?.type).toBe("dialogue");
    expect(classified[1]?.text).toBe("وما بلغتش");
    expect(classified[1]?.text).not.toMatch(/[:：]\s*$/);
  });

  it("لا يغيّر نص سطر dialogue أصلًا حتى لو انتهى صدفة بنقطتين", () => {
    // هذا السطر مصنف dialogue من البداية — لا يمر بـ correctedDraft أصلًا،
    // لكن يُبرهن أن النزع محصور حصرًا بتحويلات character → dialogue.
    const classified: ClassifiedDraft[] = [
      draft({ type: "character", text: "أحمد:" }),
      draft({ type: "dialogue", text: "قال لي:" }),
    ];

    retroactiveCorrectionPass(classified);

    expect(classified[1]?.type).toBe("dialogue");
    expect(classified[1]?.text).toBe("قال لي:");
  });

  it("يحافظ على الناتج المطلوب للسيناريو المرجعي: «اميرة:» ثم «وما بلغتش ليه ؟»", () => {
    // هذا اختبار التكامل الحاكم: المدخل يحاكي ناتج الممر الأمامي الخاطئ
    // بعد أن قسّم المصنّف المحلي سطر الحوار الصحيح إلى ثلاثة مقاطع،
    // والمطلوب أن يُنتج الممر الرجعي بنية قابلة للعودة إلى السطرين الأصليين
    // دون أي نقطتين مصطنعة تتسرّب إلى نص الحوار.
    const classified: ClassifiedDraft[] = [
      draft({ type: "character", text: "اميرة:" }),
      draft({ type: "character", text: "وما بلغتش:" }),
      draft({ type: "dialogue", text: "ليه ؟" }),
    ];

    retroactiveCorrectionPass(classified);

    // لا يجوز أن يظهر أي سطر dialogue ينتهي بنقطتين مصطنعة
    const dialogueLines = classified.filter((d) => d.type === "dialogue");
    for (const line of dialogueLines) {
      expect(line.text).not.toMatch(/[:：]\s*$/);
    }

    // البنية النهائية يجب أن تكون: character → dialogue → dialogue
    expect(classified.map((d) => d.type)).toEqual([
      "character",
      "dialogue",
      "dialogue",
    ]);

    // عند دمج سطري الحوار المتتاليين نحصل على نص الحوار الأصلي كما أخرجه كرنك
    const mergedDialogue = dialogueLines.map((d) => d.text).join(" ");
    expect(mergedDialogue).toBe("وما بلغتش ليه ؟");
  });
});
