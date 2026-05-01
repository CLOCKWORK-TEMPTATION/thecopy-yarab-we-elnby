export interface ParityReport {
  decisionRecallAt5: number;
  factRecallAt5: number;
  stateRecallAt5: number;
  preventionConstraintRecallAt5: number;
  secretLeakage: number;
  highTrustInjectionViolation: number;
  rollbackReady: boolean;
}

export interface ShadowPromotionResult {
  promoted: true;
  primaryTarget: "qdrant-shadow";
}

export class ShadowIndexController {
  promote(report: ParityReport): ShadowPromotionResult {
    if (report.decisionRecallAt5 < 0.9) {
      throw new Error("Shadow index parity failed: decision recall.");
    }
    if (report.factRecallAt5 < 0.85) {
      throw new Error("Shadow index parity failed: fact recall.");
    }
    if (report.stateRecallAt5 < 0.8) {
      throw new Error("Shadow index parity failed: state recall.");
    }
    if (report.preventionConstraintRecallAt5 < 0.95) {
      throw new Error("Shadow index parity failed: prevention recall.");
    }
    if (report.secretLeakage !== 0) {
      throw new Error("Shadow index parity failed: secret leakage.");
    }
    if (report.highTrustInjectionViolation !== 0) {
      throw new Error("Shadow index parity failed: injection violation.");
    }
    if (!report.rollbackReady) {
      throw new Error("Shadow index promotion requires rollback readiness.");
    }

    return {
      promoted: true,
      primaryTarget: "qdrant-shadow",
    };
  }
}

export function createShadowIndexController(): ShadowIndexController {
  return new ShadowIndexController();
}

