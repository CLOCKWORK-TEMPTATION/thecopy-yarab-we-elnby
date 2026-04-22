import { GeminiService } from "../../ai/stations/gemini-service";

export interface UncertaintyMetrics {
  confidence: number;
  type: "epistemic" | "aleatoric";
  sources: Array<{
    aspect: string;
    reason: string;
    reducible: boolean;
  }>;
}

export interface UncertaintyQuantificationEngine {
  quantify(text: string, context: any): Promise<UncertaintyMetrics>;
}

class SimpleUncertaintyEngine implements UncertaintyQuantificationEngine {
  constructor(_geminiService: GeminiService) {}

  async quantify(_text: string, _context: any): Promise<UncertaintyMetrics> {
    return {
      confidence: 0.8,
      type: "epistemic",
      sources: [],
    };
  }
}

export function getUncertaintyQuantificationEngine(
  geminiService: GeminiService
): UncertaintyQuantificationEngine {
  return new SimpleUncertaintyEngine(geminiService);
}
