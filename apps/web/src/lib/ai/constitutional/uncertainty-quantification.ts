import { GeminiService } from "../../ai/stations/gemini-service";

export interface UncertaintyMetrics {
  confidence: number;
  type: "epistemic" | "aleatoric";
  sources: {
    aspect: string;
    reason: string;
    reducible: boolean;
  }[];
}

/**
 * Context payload passed alongside the text for uncertainty quantification.
 * Implementations may inspect arbitrary upstream station data, so the shape
 * is intentionally open. Use `unknown` (not `any`) so callers must narrow
 * before reading fields.
 */
export type UncertaintyContext = Readonly<Record<string, unknown>>;

export interface UncertaintyQuantificationEngine {
  quantify(
    text: string,
    context: UncertaintyContext
  ): Promise<UncertaintyMetrics>;
}

class SimpleUncertaintyEngine implements UncertaintyQuantificationEngine {
  constructor(_geminiService: GeminiService) {}

  quantify(
    _text: string,
    _context: UncertaintyContext
  ): Promise<UncertaintyMetrics> {
    return Promise.resolve({
      confidence: 0.8,
      type: "epistemic",
      sources: [],
    });
  }
}

export function getUncertaintyQuantificationEngine(
  geminiService: GeminiService
): UncertaintyQuantificationEngine {
  return new SimpleUncertaintyEngine(geminiService);
}
