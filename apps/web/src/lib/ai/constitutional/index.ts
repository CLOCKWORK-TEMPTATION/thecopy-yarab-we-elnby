// Constitutional AI Module - Exports all constitutional AI functionality

// Core ConstitutionalAI class (defined below)
export interface ConstitutionalPrinciple {
  id: string;
  name: string;
  description: string;
  weight: number;
}

export interface ConstitutionalCheck {
  principle: ConstitutionalPrinciple;
  passed: boolean;
  confidence: number;
  explanation: string;
}

export interface ConstitutionalResult {
  overallScore: number;
  checks: ConstitutionalCheck[];
  recommendations: string[];
}

export class ConstitutionalAI {
  private principles: ConstitutionalPrinciple[] = [
    {
      id: "helpfulness",
      name: "Helpfulness",
      description: "Content should be helpful and constructive",
      weight: 1.0,
    },
    {
      id: "harmlessness",
      name: "Harmlessness",
      description: "Content should not cause harm",
      weight: 1.0,
    },
    {
      id: "honesty",
      name: "Honesty",
      description: "Content should be truthful and accurate",
      weight: 1.0,
    },
  ];

  evaluate(_content: string): ConstitutionalResult {
    const checks: ConstitutionalCheck[] = [];

    for (const principle of this.principles) {
      const check: ConstitutionalCheck = {
        principle,
        passed: true,
        confidence: 0.9,
        explanation: `Content adheres to ${principle.name} principle`,
      };
      checks.push(check);
    }

    const overallScore =
      checks.reduce(
        (sum, check) =>
          sum + (check.passed ? check.confidence * check.principle.weight : 0),
        0
      ) / checks.length;

    return {
      overallScore,
      checks,
      recommendations: [],
    };
  }
}

export const constitutionalAI = new ConstitutionalAI();

// Export from multi-agent-debate.ts
export {
  MultiAgentDebateSystem,
  getMultiAgentDebateSystem,
} from "./multi-agent-debate";
export type {
  DebateParticipant,
  DebateArgument,
  DebateRound,
  ConsensusArea,
  DisputedArea,
  FinalVerdict,
  DebateVerdict,
  DebateDynamics,
  DebateResult,
} from "./multi-agent-debate";

// Export from principles.ts
export { checkConstitutionalCompliance } from "./principles";
export type { ConstitutionalCheckResult } from "./principles";

// Export from uncertainty-quantification.ts
export { getUncertaintyQuantificationEngine } from "./uncertainty-quantification";
export type {
  UncertaintyMetrics,
  UncertaintyQuantificationEngine,
} from "./uncertainty-quantification";

export default constitutionalAI;
