import type { ElementType } from "../classification-types";

export interface SequenceFeatures {
  readonly wordCount: number;
  readonly charCount: number;
  readonly endsWithColon: boolean;
  readonly startsWithDash: boolean;
  readonly startsWithBullet: boolean;
  readonly isParenthetical: boolean;
  readonly hasActionIndicators: boolean;
  readonly hasSentencePunctuation: boolean;
  readonly relativeLength: number;
  readonly nameRepetitionCount: number;
  readonly isPreSeeded: boolean;
  readonly positionRatio: number;
  readonly normalized: string;
}

export interface ViterbiResult {
  readonly type: ElementType;
  readonly score: number;
}

export interface SequenceDisagreement {
  readonly lineIndex: number;
  readonly forwardType: ElementType;
  readonly forwardConfidence: number;
  readonly viterbiType: ElementType;
  readonly viterbiScore: number;
  readonly disagreementStrength: number;
}

export interface SequenceOptimizationResult {
  readonly viterbiSequence: readonly ViterbiResult[];
  readonly disagreements: readonly SequenceDisagreement[];
  readonly totalDisagreements: number;
  readonly disagreementRate: number;
}
