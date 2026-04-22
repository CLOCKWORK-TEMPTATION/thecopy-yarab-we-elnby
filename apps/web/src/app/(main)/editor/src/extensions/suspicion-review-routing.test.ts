import { describe, expect, it } from "vitest";

import {
  isModelReviewSuspicionBand,
  shouldKeepSuspicionModelDecisionForFinalReview,
  summarizeSuspicionReviewDispatchBands,
} from "./suspicion-review-routing";
import type { SuspicionBand } from "@editor/suspicion-engine/types";

describe("suspicion-review-routing", () => {
  it("يرسل كل حالات الشك غير العابرة إلى نموذج الشك", () => {
    const bands: SuspicionBand[] = [
      ...Array<SuspicionBand>(14).fill("local-review"),
      ...Array<SuspicionBand>(20).fill("agent-candidate"),
      "agent-forced",
    ];

    const summary = summarizeSuspicionReviewDispatchBands(bands);

    expect(summary.totalLocalCases).toBe(35);
    expect(summary.sentToModel).toBe(35);
    expect(summary.sentLocalReview).toBe(14);
    expect(summary.sentAgentCandidate).toBe(20);
    expect(summary.sentAgentForced).toBe(1);
    expect(summary.passSkipped).toBe(0);
  });

  it("لا يعتبر pass حالة شك مرسلة للنموذج", () => {
    const bands: SuspicionBand[] = [
      "pass",
      "local-review",
      "agent-candidate",
      "agent-forced",
    ];

    const summary = summarizeSuspicionReviewDispatchBands(bands);

    expect(summary.totalLocalCases).toBe(4);
    expect(summary.sentToModel).toBe(3);
    expect(summary.passSkipped).toBe(1);
    expect(bands.filter(isModelReviewSuspicionBand)).toEqual([
      "local-review",
      "agent-candidate",
      "agent-forced",
    ]);
  });

  it("يسمح لنموذج الشك بإسقاط الحالات الضعيفة قبل المراجعة النهائية", () => {
    expect(
      shouldKeepSuspicionModelDecisionForFinalReview({
        verdict: "dismiss",
        routingBand: "agent-candidate",
      })
    ).toBe(false);

    expect(
      shouldKeepSuspicionModelDecisionForFinalReview({
        verdict: "confirm",
        routingBand: "local-review",
      })
    ).toBe(false);

    expect(
      shouldKeepSuspicionModelDecisionForFinalReview({
        verdict: "escalate",
        routingBand: "agent-forced",
      })
    ).toBe(true);
  });
});
