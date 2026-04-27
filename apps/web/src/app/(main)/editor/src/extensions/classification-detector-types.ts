import type { TextFeatures } from "./classification-text-features";
import type { ClassifiedLine, DetectorFinding } from "./classification-types";

export interface SuspicionDetector {
  readonly id: string;
  detect(
    line: ClassifiedLine,
    features: TextFeatures,
    context: readonly ClassifiedLine[],
    linePosition: number
  ): DetectorFinding | null;
}
