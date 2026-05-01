import type { VectorIndexTarget } from "./types";

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
  primaryTarget: Extract<VectorIndexTarget, "qdrant-shadow">;
}

export interface ShadowRollbackResult {
  rolledBack: true;
  primaryTarget: Extract<VectorIndexTarget, "weaviate-primary">;
  shadowDataRetained: true;
}

export class ShadowIndexController {
  private primaryTarget: VectorIndexTarget = "weaviate-primary";

  getPrimaryTarget(): VectorIndexTarget {
    return this.primaryTarget;
  }

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

    this.primaryTarget = "qdrant-shadow";

    return {
      promoted: true,
      primaryTarget: "qdrant-shadow",
    };
  }

  rollbackToPrimary(): ShadowRollbackResult {
    this.primaryTarget = "weaviate-primary";

    return {
      rolledBack: true,
      primaryTarget: "weaviate-primary",
      shadowDataRetained: true,
    };
  }
}

export function createShadowIndexController(): ShadowIndexController {
  return new ShadowIndexController();
}

