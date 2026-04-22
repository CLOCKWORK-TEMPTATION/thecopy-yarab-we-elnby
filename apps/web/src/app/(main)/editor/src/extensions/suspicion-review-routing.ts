import type { SuspicionBand } from "@editor/suspicion-engine/types";

export type ModelReviewSuspicionBand = Exclude<SuspicionBand, "pass">;

export interface SuspicionReviewDispatchSummary {
  readonly totalLocalCases: number;
  readonly passSkipped: number;
  readonly sentToModel: number;
  readonly sentLocalReview: number;
  readonly sentAgentCandidate: number;
  readonly sentAgentForced: number;
}

export interface SuspicionModelRoutingDecision {
  readonly verdict: "confirm" | "dismiss" | "escalate";
  readonly routingBand: ModelReviewSuspicionBand;
}

export const isModelReviewSuspicionBand = (
  band: SuspicionBand
): band is ModelReviewSuspicionBand => band !== "pass";

export const summarizeSuspicionReviewDispatchBands = (
  bands: readonly SuspicionBand[]
): SuspicionReviewDispatchSummary => {
  let passSkipped = 0;
  let sentLocalReview = 0;
  let sentAgentCandidate = 0;
  let sentAgentForced = 0;

  for (const band of bands) {
    switch (band) {
      case "pass":
        passSkipped += 1;
        break;
      case "local-review":
        sentLocalReview += 1;
        break;
      case "agent-candidate":
        sentAgentCandidate += 1;
        break;
      case "agent-forced":
        sentAgentForced += 1;
        break;
    }
  }

  return {
    totalLocalCases: bands.length,
    passSkipped,
    sentToModel: sentLocalReview + sentAgentCandidate + sentAgentForced,
    sentLocalReview,
    sentAgentCandidate,
    sentAgentForced,
  };
};

export const shouldKeepSuspicionModelDecisionForFinalReview = (
  decision: SuspicionModelRoutingDecision
): boolean =>
  decision.verdict !== "dismiss" && decision.routingBand !== "local-review";
