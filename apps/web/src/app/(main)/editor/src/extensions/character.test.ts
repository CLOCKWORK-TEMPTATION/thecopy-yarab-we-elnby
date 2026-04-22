import { describe, expect, it } from "vitest";

import {
  isCandidateCharacterName,
  parseImplicitCharacterDialogueWithoutColon,
} from "./character";

describe("character — parseImplicitCharacterDialogueWithoutColon (Layer 1 guard)", () => {
  it("لا يُقسّم سطر حوار يبدأ ببداية وظيفية مركّبة «وما» حتى داخل كتلة حوار", () => {
    const result = parseImplicitCharacterDialogueWithoutColon(
      "وما بلغتش ليه ؟",
      { isInDialogueBlock: true },
      new Set<string>()
    );

    expect(result).toBeNull();
  });

  it("لا يُقسّم السطر حتى لو كان الاسم المقترح مؤكدًا في الـ registry — الحارس المركّب «وما» يمنع التقسيم", () => {
    // حتى لو خدعنا الحارس الأول بتأكيد «وما بلغتش»،
    // COMPOUND_FUNCTIONAL_START_RE داخل isCandidateCharacterName يرفض بداية «وما».
    const result = parseImplicitCharacterDialogueWithoutColon(
      "وما بلغتش ليه ؟",
      { isInDialogueBlock: true },
      new Set<string>(["وما بلغتش"])
    );

    expect(result).toBeNull();
  });

  it("لا يُقسّم «ابلغ ليه .. الراجل ابوه مقتول» إلى شخصية + حوار", () => {
    const result = parseImplicitCharacterDialogueWithoutColon(
      "ابلغ ليه .. الراجل ابوه مقتول",
      { isInDialogueBlock: true },
      new Set<string>()
    );

    expect(result).toBeNull();
  });

  it("لا يُقسّم «وانا هقول لامجد ليه انك اساسا من امبابة» إلى شخصية + حوار", () => {
    const result = parseImplicitCharacterDialogueWithoutColon(
      "وانا هقول لامجد ليه انك اساسا من امبابة",
      { isInDialogueBlock: true },
      new Set<string>()
    );

    expect(result).toBeNull();
  });

  it("يرفض أي سطر عندما يكون سجل الشخصيات المؤكدة فارغًا — حتى لو كانت البداية اسم هيكلي سليم", () => {
    // «أحمد مش هنا ؟» قد يبدو شخصية ضمنية هيكليًا،
    // لكن الحارس الجديد يشترط التأكيد في registry.
    const result = parseImplicitCharacterDialogueWithoutColon(
      "أحمد مش هنا ؟",
      { isInDialogueBlock: true },
      new Set<string>()
    );

    expect(result).toBeNull();
  });

  it("يسمح بالتقسيم عندما يكون الاسم المقترح مؤكدًا في الـ registry وخاليًا من الكلمات الوظيفية", () => {
    const result = parseImplicitCharacterDialogueWithoutColon(
      "أحمد مش هنا ؟",
      { isInDialogueBlock: true },
      new Set<string>(["أحمد"])
    );

    expect(result).not.toBeNull();
    expect(result?.characterName).toBe("أحمد");
    expect(result?.dialogueText).toBe("مش هنا ؟");
  });

  it("يرفض التقسيم خارج كتلة حوار بغض النظر عن أي سياق", () => {
    const result = parseImplicitCharacterDialogueWithoutColon(
      "أحمد مش هنا ؟",
      { isInDialogueBlock: false },
      new Set<string>(["أحمد"])
    );

    expect(result).toBeNull();
  });
});

describe("character — isCandidateCharacterName (compound functional guard)", () => {
  it("يرفض «وما بلغتش» كاسم شخصية مرشّح", () => {
    expect(isCandidateCharacterName("وما بلغتش")).toBe(false);
  });

  it("يرفض «فلا يكفي» كاسم شخصية مرشّح", () => {
    expect(isCandidateCharacterName("فلا يكفي")).toBe(false);
  });

  it("يرفض «ولم يأتِ» كاسم شخصية مرشّح", () => {
    expect(isCandidateCharacterName("ولم يأتِ")).toBe(false);
  });

  it("يقبل «أحمد» كاسم شخصية مرشّح هيكلي", () => {
    expect(isCandidateCharacterName("أحمد")).toBe(true);
  });
});
