import { describe, expect, it } from "vitest";


import { detectContractBasmalaUniqueness } from "./contract-basmala-uniqueness.detector";
import { detectContractCharacterShape } from "./contract-character-shape.detector";
import { detectContractParentheticalPosition } from "./contract-parenthetical-position.detector";
import { detectContractSceneHeaderSequence } from "./contract-scene-header-sequence.detector";
import { detectContractTransitionIsolation } from "./contract-transition-isolation.detector";

import type { ClassifiedDraft } from "@editor/extensions/classification-types";
import type { DetectorContext } from "@editor/suspicion-engine/detectors/detector-interface";
import type {
  ClassificationTrace,
  SuspicionFeature,
} from "@editor/suspicion-engine/types";

// ── Helpers لبناء fixtures خفيفة ──

function makeTrace(lineIndex: number, text: string): ClassificationTrace {
  return {
    lineIndex,
    rawText: text,
    normalizedText: text,
    sourceHints: {
      importSource: "paste",
      lineQuality: {
        score: 0.9,
        arabicRatio: 0.95,
        weirdCharRatio: 0.01,
        hasStructuralMarkers: false,
      },
      pageNumber: null,
    },
    repairs: [],
    passVotes: [],
    finalDecision: {
      assignedType: "action",
      confidence: 0.8,
      method: "weighted",
      winningStage: null,
    },
  };
}

function makeDraft(
  type: ClassifiedDraft["type"],
  text: string
): ClassifiedDraft {
  return {
    type,
    text,
    confidence: 80,
    classificationMethod: "context",
  };
}

function makeFeatures(overrides: {
  endsWithColon?: boolean;
  lineLength?: number;
  matchesCharacterPattern?: boolean;
}): SuspicionFeature {
  return {
    lineIndex: 0,
    gate: {
      hasColon: overrides.endsWithColon ?? false,
      lineLength: overrides.lineLength ?? 10,
      startsWithUpperArabic: true,
      endsWithColon: overrides.endsWithColon ?? false,
      matchesCharacterPattern: overrides.matchesCharacterPattern ?? false,
      matchesTransitionPattern: false,
      matchesSceneHeaderPattern: false,
    },
    context: {
      previousType: null,
      nextType: null,
      dialogueBlockDepth: 0,
      distanceFromLastCharacter: 99,
      distanceFromLastSceneHeader: 99,
    },
    rawQuality: {
      arabicRatio: 0.95,
      weirdCharRatio: 0.01,
      qualityScore: 0.9,
      lineLength: overrides.lineLength ?? 10,
      hasEncodingIssues: false,
    },
    crossPass: {
      totalVotes: 0,
      distinctTypes: 0,
      agreementRatio: 1,
      highestConflictSeverity: "none",
      dominantType: null,
      minorityType: null,
    },
    competition: {
      strongestAlternativeType: null,
      pullStrength: 0,
      confidenceDelta: 0,
      contributingStageCount: 0,
    },
    stability: {
      decisionFragility: 0,
      repairCount: 0,
      wasOverridden: false,
      finalConfidence: 0.8,
    },
  };
}

function makeContext(
  neighbors: readonly ClassifiedDraft[],
  neighborTraces: readonly ClassificationTrace[],
  features: SuspicionFeature
): DetectorContext {
  return {
    lineIndex: 0,
    totalLines: neighbors.length + 1,
    neighbors,
    neighborTraces,
    features,
  };
}

// ─────────────────────────────────────────────────────────────────────
// contract-character-shape.detector
// ─────────────────────────────────────────────────────────────────────

describe("contract-character-shape — البدايات الوظيفية المركّبة", () => {
  it("يطلق إشارة CONTRACT_CHARACTER_COMPOUND_FUNCTIONAL_START لـ «وما بلغتش:»", () => {
    const trace = makeTrace(1, "وما بلغتش:");
    const line = makeDraft("character", "وما بلغتش:");
    const context = makeContext([], [], makeFeatures({ endsWithColon: true }));

    const signals = detectContractCharacterShape(trace, line, context);

    expect(signals.length).toBeGreaterThan(0);
    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_CHARACTER_COMPOUND_FUNCTIONAL_START"
      )
    ).toBe(true);
    const signal = signals.find(
      (s) => s.reasonCode === "CONTRACT_CHARACTER_COMPOUND_FUNCTIONAL_START"
    );
    expect(signal?.suggestedType).toBe("action");
    expect(signal?.score).toBeGreaterThanOrEqual(0.85);
  });

  it("يطلق إشارة لبداية «فلا يكفي:»", () => {
    const trace = makeTrace(1, "فلا يكفي:");
    const line = makeDraft("character", "فلا يكفي:");
    const context = makeContext([], [], makeFeatures({ endsWithColon: true }));

    const signals = detectContractCharacterShape(trace, line, context);

    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_CHARACTER_COMPOUND_FUNCTIONAL_START"
      )
    ).toBe(true);
  });

  it("لا يطلق إشارة لاسم شخصية حقيقي قصير «أحمد:»", () => {
    const trace = makeTrace(1, "أحمد:");
    const line = makeDraft("character", "أحمد:");
    const context = makeContext([], [], makeFeatures({ endsWithColon: true }));

    const signals = detectContractCharacterShape(trace, line, context);

    expect(signals.length).toBe(0);
  });
});

describe("contract-character-shape — بدايات الأفعال الحدثية", () => {
  it("يطلق إشارة CONTRACT_CHARACTER_ACTION_VERB_START لـ «تخرج نهال سماحة:»", () => {
    const trace = makeTrace(1, "تخرج نهال سماحة:");
    const line = makeDraft("character", "تخرج نهال سماحة:");
    const context = makeContext([], [], makeFeatures({ endsWithColon: true }));

    const signals = detectContractCharacterShape(trace, line, context);

    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_CHARACTER_ACTION_VERB_START"
      )
    ).toBe(true);
    const signal = signals.find(
      (s) => s.reasonCode === "CONTRACT_CHARACTER_ACTION_VERB_START"
    );
    expect(signal?.suggestedType).toBe("action");
  });

  it("يطلق إشارة لبداية «يدخل محمد الغرفة:»", () => {
    const trace = makeTrace(1, "يدخل محمد الغرفة:");
    const line = makeDraft("character", "يدخل محمد الغرفة:");
    const context = makeContext([], [], makeFeatures({ endsWithColon: true }));

    const signals = detectContractCharacterShape(trace, line, context);

    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_CHARACTER_ACTION_VERB_START"
      )
    ).toBe(true);
  });
});

describe("contract-character-shape — الطول المفرط", () => {
  it("يطلق إشارة CONTRACT_CHARACTER_BODY_TOO_LONG لسطر شخصية أطول من 40 محرفًا", () => {
    const text = "أحمد الذي كان يقف عند باب الشقة ينتظر زوجته:";
    const trace = makeTrace(1, text);
    const line = makeDraft("character", text);
    const context = makeContext([], [], makeFeatures({ endsWithColon: true }));

    const signals = detectContractCharacterShape(trace, line, context);

    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_CHARACTER_BODY_TOO_LONG")
    ).toBe(true);
  });

  it("يطلق إشارة CONTRACT_CHARACTER_BODY_TOO_LONG لعدد توكنات > 4", () => {
    const text = "أحمد و محمد و علي و خالد و سامي:";
    const trace = makeTrace(1, text);
    const line = makeDraft("character", text);
    const context = makeContext([], [], makeFeatures({ endsWithColon: true }));

    const signals = detectContractCharacterShape(trace, line, context);

    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_CHARACTER_BODY_TOO_LONG")
    ).toBe(true);
  });
});

describe("contract-character-shape — علامات الترقيم الداخلية", () => {
  it("يطلق إشارة CONTRACT_CHARACTER_MID_SENTENCE_PUNCT لسطر يحوي علامة استفهام", () => {
    const text = "فين الولد ؟:";
    const trace = makeTrace(1, text);
    const line = makeDraft("character", text);
    const context = makeContext([], [], makeFeatures({ endsWithColon: true }));

    const signals = detectContractCharacterShape(trace, line, context);

    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_CHARACTER_MID_SENTENCE_PUNCT"
      )
    ).toBe(true);
  });
});

describe("contract-character-shape — لا يؤثر على غير أسطر الشخصية", () => {
  it("لا ينتج أي إشارات لسطر action حتى لو بدأ ببادئة وظيفية مركّبة", () => {
    const trace = makeTrace(1, "وما كان يقف أحد قرب الباب");
    const line = makeDraft("action", "وما كان يقف أحد قرب الباب");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractCharacterShape(trace, line, context);
    expect(signals.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// contract-parenthetical-position.detector
// ─────────────────────────────────────────────────────────────────────

describe("contract-parenthetical-position", () => {
  it("لا يطلق إشارة إذا سبقه character مباشرة", () => {
    const trace = makeTrace(1, "(بهمس)");
    const line = makeDraft("parenthetical", "(بهمس)");
    const previousTrace = makeTrace(0, "أحمد:");
    const previousLine = makeDraft("character", "أحمد:");
    const context = {
      ...makeContext([previousLine], [previousTrace], makeFeatures({})),
      lineIndex: 1,
    };

    const signals = detectContractParentheticalPosition(trace, line, context);
    expect(signals.length).toBe(0);
  });

  it("يطلق إشارة CONTRACT_PARENTHETICAL_WRONG_PRECEDING_TYPE إذا سبقه action", () => {
    const trace = makeTrace(1, "(بهمس)");
    const line = makeDraft("parenthetical", "(بهمس)");
    const previousTrace = makeTrace(0, "يجلس أحمد على الكنبة");
    const previousLine = makeDraft("action", "يجلس أحمد على الكنبة");
    const context = {
      ...makeContext([previousLine], [previousTrace], makeFeatures({})),
      lineIndex: 1,
    };

    const signals = detectContractParentheticalPosition(trace, line, context);
    expect(signals.length).toBe(1);
    expect(signals[0]?.reasonCode).toBe(
      "CONTRACT_PARENTHETICAL_WRONG_PRECEDING_TYPE"
    );
  });

  it("يطلق إشارة إذا سبقه scene_header_1", () => {
    const trace = makeTrace(1, "(بصوت منخفض)");
    const line = makeDraft("parenthetical", "(بصوت منخفض)");
    const previousTrace = makeTrace(0, "مشهد 1");
    const previousLine = makeDraft("scene_header_1", "مشهد 1");
    const context = {
      ...makeContext([previousLine], [previousTrace], makeFeatures({})),
      lineIndex: 1,
    };

    const signals = detectContractParentheticalPosition(trace, line, context);
    expect(signals.length).toBe(1);
  });

  it("يسمح بـ parenthetical يسبقه dialogue (إرشاد مقحم وسط حوار)", () => {
    const trace = makeTrace(2, "(بغضب)");
    const line = makeDraft("parenthetical", "(بغضب)");
    const previousTrace = makeTrace(1, "أنا مش فاهم");
    const previousLine = makeDraft("dialogue", "أنا مش فاهم");
    const context = {
      ...makeContext([previousLine], [previousTrace], makeFeatures({})),
      lineIndex: 2,
    };

    const signals = detectContractParentheticalPosition(trace, line, context);
    expect(signals.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// contract-basmala-uniqueness.detector
// ─────────────────────────────────────────────────────────────────────

describe("contract-basmala-uniqueness", () => {
  it("لا يطلق إشارة للبسملة في lineIndex=0 بدون تكرار", () => {
    const trace = makeTrace(0, "بسم الله الرحمن الرحيم");
    const line = makeDraft("basmala", "بسم الله الرحمن الرحيم");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractBasmalaUniqueness(trace, line, context);
    expect(signals.length).toBe(0);
  });

  it("يطلق إشارة CONTRACT_BASMALA_NOT_AT_START لبسملة في lineIndex > 0", () => {
    const trace = makeTrace(5, "بسم الله الرحمن الرحيم");
    const line = makeDraft("basmala", "بسم الله الرحمن الرحيم");
    const previousTrace = makeTrace(4, "مشهد 1");
    const previousLine = makeDraft("scene_header_1", "مشهد 1");
    const context = {
      ...makeContext([previousLine], [previousTrace], makeFeatures({})),
      lineIndex: 5,
    };

    const signals = detectContractBasmalaUniqueness(trace, line, context);
    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_BASMALA_NOT_AT_START")
    ).toBe(true);
  });

  it("يطلق إشارة CONTRACT_BASMALA_DUPLICATE عند وجود بسملة سابقة في الجيران", () => {
    const trace = makeTrace(3, "بسم الله الرحمن الرحيم");
    const line = makeDraft("basmala", "بسم الله الرحمن الرحيم");
    const previousTrace = makeTrace(0, "بسم الله الرحمن الرحيم");
    const previousLine = makeDraft("basmala", "بسم الله الرحمن الرحيم");
    const context = {
      ...makeContext([previousLine], [previousTrace], makeFeatures({})),
      lineIndex: 3,
    };

    const signals = detectContractBasmalaUniqueness(trace, line, context);
    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_BASMALA_DUPLICATE")
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// contract-scene-header-sequence.detector
// ─────────────────────────────────────────────────────────────────────

describe("contract-scene-header-sequence", () => {
  it("يسمح بـ scene_header_2 مباشرة بعد scene_header_1", () => {
    const trace = makeTrace(1, "ليل - داخلي");
    const line = makeDraft("scene_header_2", "ليل - داخلي");
    const previousTrace = makeTrace(0, "مشهد 1");
    const previousLine = makeDraft("scene_header_1", "مشهد 1");
    const context = {
      ...makeContext([previousLine], [previousTrace], makeFeatures({})),
      lineIndex: 1,
    };

    const signals = detectContractSceneHeaderSequence(trace, line, context);
    expect(signals.length).toBe(0);
  });

  it("يطلق إشارة CONTRACT_SCENE_HEADER_OUT_OF_ORDER عند scene_header_2 بعد scene_header_2", () => {
    const trace = makeTrace(1, "نهار - خارجي");
    const line = makeDraft("scene_header_2", "نهار - خارجي");
    const previousTrace = makeTrace(0, "ليل - داخلي");
    const previousLine = makeDraft("scene_header_2", "ليل - داخلي");
    const context = {
      ...makeContext([previousLine], [previousTrace], makeFeatures({})),
      lineIndex: 1,
    };

    const signals = detectContractSceneHeaderSequence(trace, line, context);
    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_SCENE_HEADER_OUT_OF_ORDER")
    ).toBe(true);
  });

  it("يطلق إشارة CONTRACT_SCENE_HEADER_1_AFTER_HIGHER_RANK لـ scene_header_1 بعد scene_header_3", () => {
    const trace = makeTrace(1, "مشهد 2");
    const line = makeDraft("scene_header_1", "مشهد 2");
    const previousTrace = makeTrace(0, "شقة سيد - الصالة");
    const previousLine = makeDraft("scene_header_3", "شقة سيد - الصالة");
    const context = {
      ...makeContext([previousLine], [previousTrace], makeFeatures({})),
      lineIndex: 1,
    };

    const signals = detectContractSceneHeaderSequence(trace, line, context);
    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_SCENE_HEADER_1_AFTER_HIGHER_RANK"
      )
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// contract-transition-isolation.detector
// ─────────────────────────────────────────────────────────────────────

describe("contract-transition-isolation", () => {
  it("لا يطلق إشارة لـ «قطع» كسطر انتقال معزول", () => {
    const trace = makeTrace(5, "قطع");
    const line = makeDraft("transition", "قطع");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(signals.length).toBe(0);
  });

  it("يطلق إشارة CONTRACT_TRANSITION_HAS_EXTRA_BODY لـ «قطع إلى الشقة»", () => {
    const trace = makeTrace(5, "قطع إلى الشقة");
    const line = makeDraft("transition", "قطع إلى الشقة");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_TRANSITION_HAS_EXTRA_BODY")
    ).toBe(true);
  });

  it("يطلق إشارة CONTRACT_TRANSITION_MISSING_KEYWORD لسطر انتقال بلا كلمة مفتاحية", () => {
    const trace = makeTrace(5, "وينتقل المشهد إلى الغرفة الثانية");
    const line = makeDraft("transition", "وينتقل المشهد إلى الغرفة الثانية");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_TRANSITION_MISSING_KEYWORD"
      )
    ).toBe(true);
  });

  it("يطلق إشارة CONTRACT_TRANSITION_TOO_LONG لسطر انتقال أطول من 20 محرفًا", () => {
    const trace = makeTrace(5, "قطع إلى غرفة سيد في آخر الممر");
    const line = makeDraft("transition", "قطع إلى غرفة سيد في آخر الممر");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_TRANSITION_TOO_LONG")
    ).toBe(true);
  });

  // ── regression: مزامنة التوسعة مع Python TRANSITION_WORDS (§9) ──
  // يجب أن يقبل الكاشف كل الصيغ الموسَّعة دون إطلاق MISSING_KEYWORD زائف.

  it("يقبل «تلاشي» كسطر انتقال معزول بعد توسعة العقد", () => {
    const trace = makeTrace(5, "تلاشي");
    const line = makeDraft("transition", "تلاشي");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(signals.length).toBe(0);
  });

  it("يقبل «تلاشي إلى السواد» كمتغيّر لوني معتمد", () => {
    const trace = makeTrace(5, "تلاشي إلى السواد");
    const line = makeDraft("transition", "تلاشي إلى السواد");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(signals.length).toBe(0);
  });

  it("يقبل «فيد إن» كصيغة عربية للـ Fade in", () => {
    const trace = makeTrace(5, "فيد إن");
    const line = makeDraft("transition", "فيد إن");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(signals.length).toBe(0);
  });

  it("يقبل «Dissolve to» كصيغة إنجليزية موسَّعة", () => {
    const trace = makeTrace(5, "Dissolve to");
    const line = makeDraft("transition", "Dissolve to");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(signals.length).toBe(0);
  });

  it("يقبل «اختفاء» وحدها (دون «تدريجي»)", () => {
    const trace = makeTrace(5, "اختفاء");
    const line = makeDraft("transition", "اختفاء");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(signals.length).toBe(0);
  });

  it("يطلق CONTRACT_TRANSITION_HAS_EXTRA_BODY لـ «تلاشي إلى الغرفة» (لون غير معتمد)", () => {
    const trace = makeTrace(5, "تلاشي إلى الغرفة");
    const line = makeDraft("transition", "تلاشي إلى الغرفة");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    // يجب ألّا يُطلق MISSING_KEYWORD زائفًا لأن «تلاشي» معروفة الآن.
    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_TRANSITION_MISSING_KEYWORD"
      )
    ).toBe(false);
    // لكن يجب رصد الذيل الوصفي «الغرفة» بعد الكلمة المعروفة.
    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_TRANSITION_HAS_EXTRA_BODY")
    ).toBe(true);
  });

  it("يطلق EXTRA_BODY + TOO_LONG لـ «فيد إن المشهد الأول في الصباح» (ذيل طويل)", () => {
    const text = "فيد إن المشهد الأول في الصباح";
    const trace = makeTrace(5, text);
    const line = makeDraft("transition", text);
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_TRANSITION_MISSING_KEYWORD"
      )
    ).toBe(false);
    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_TRANSITION_HAS_EXTRA_BODY")
    ).toBe(true);
    expect(
      signals.some((s) => s.reasonCode === "CONTRACT_TRANSITION_TOO_LONG")
    ).toBe(true);
  });

  // ── جولة 087: اختبارات regression تكميلية تغطي كل variants Python §9 ──
  // هذه المفردات موجودة في TRANSITION_WORDS في constants.py ويجب ألا يطلق
  // الكاشف عليها CONTRACT_TRANSITION_MISSING_KEYWORD بأي حال.

  it("يقبل «قطع إلى:» (بـ «:» نهائي) كمعزولة", () => {
    const trace = makeTrace(5, "قطع إلى:");
    const line = makeDraft("transition", "قطع إلى:");
    const context = makeContext([], [], makeFeatures({}));

    const signals = detectContractTransitionIsolation(trace, line, context);
    expect(
      signals.some(
        (s) => s.reasonCode === "CONTRACT_TRANSITION_MISSING_KEYWORD"
      )
    ).toBe(false);
  });

  it("يقبل كل variants ألوان التلاشي (الأسود/البياض/الأبيض/النور)", () => {
    const variants = [
      "تلاشي إلى الأسود",
      "تلاشي إلى البياض",
      "تلاشي إلى الأبيض",
      "تلاشي إلى النور",
    ];
    for (const text of variants) {
      const trace = makeTrace(5, text);
      const line = makeDraft("transition", text);
      const context = makeContext([], [], makeFeatures({}));

      const signals = detectContractTransitionIsolation(trace, line, context);
      expect(
        signals.some(
          (s) => s.reasonCode === "CONTRACT_TRANSITION_MISSING_KEYWORD"
        ),
        `فشل على variant: "${text}"`
      ).toBe(false);
    }
  });

  it("يقبل «تلاشي للسواد» و«تلاشي من السواد» و«تلاشي من السواد إلى»", () => {
    const variants = ["تلاشي للسواد", "تلاشي من السواد", "تلاشي من السواد إلى"];
    for (const text of variants) {
      const trace = makeTrace(5, text);
      const line = makeDraft("transition", text);
      const context = makeContext([], [], makeFeatures({}));

      const signals = detectContractTransitionIsolation(trace, line, context);
      expect(
        signals.some(
          (s) => s.reasonCode === "CONTRACT_TRANSITION_MISSING_KEYWORD"
        ),
        `فشل على variant: "${text}"`
      ).toBe(false);
    }
  });

  it("يقبل «CUT TO:» و«Cut to:» و«Dissolve to:» (variants إنجليزية بـ «:»)", () => {
    const variants = ["CUT TO:", "Cut to:", "Dissolve to:"];
    for (const text of variants) {
      const trace = makeTrace(5, text);
      const line = makeDraft("transition", text);
      const context = makeContext([], [], makeFeatures({}));

      const signals = detectContractTransitionIsolation(trace, line, context);
      expect(
        signals.some(
          (s) => s.reasonCode === "CONTRACT_TRANSITION_MISSING_KEYWORD"
        ),
        `فشل على variant: "${text}"`
      ).toBe(false);
    }
  });

  it("يقبل «مزج» و«فيد» و«فيد أوت» (نواة Python غير المختبرة سابقًا)", () => {
    const variants = ["مزج", "فيد", "فيد أوت"];
    for (const text of variants) {
      const trace = makeTrace(5, text);
      const line = makeDraft("transition", text);
      const context = makeContext([], [], makeFeatures({}));

      const signals = detectContractTransitionIsolation(trace, line, context);
      expect(
        signals.some(
          (s) => s.reasonCode === "CONTRACT_TRANSITION_MISSING_KEYWORD"
        ),
        `فشل على variant: "${text}"`
      ).toBe(false);
    }
  });

  it("يقبل «FADE IN» و«FADE OUT» (uppercase) و«Fade in» (mixed case)", () => {
    const variants = ["FADE IN", "FADE OUT", "Fade in", "Fade out", "Fade"];
    for (const text of variants) {
      const trace = makeTrace(5, text);
      const line = makeDraft("transition", text);
      const context = makeContext([], [], makeFeatures({}));

      const signals = detectContractTransitionIsolation(trace, line, context);
      expect(
        signals.some(
          (s) => s.reasonCode === "CONTRACT_TRANSITION_MISSING_KEYWORD"
        ),
        `فشل على variant: "${text}"`
      ).toBe(false);
    }
  });
});
