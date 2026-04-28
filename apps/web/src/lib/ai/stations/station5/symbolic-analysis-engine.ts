import { GeminiService, GeminiModel } from "../../gemini-service";

import { SymbolicAnalysis, Symbol, Motif } from "./types";
import { safeSub, asJsonRecord, asArray, asStringArray, asNumber } from "./utils";

export class SymbolicAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeSymbols(fullText: string): Promise<SymbolicAnalysis> {
    const prompt = `
    Based on the provided narrative text, analyze and identify the following:

    1.  **key_symbols**: A list of 3-5 recurring or symbolically significant objects, places, or items. For each, provide:
        - "symbol": The name of the symbol.
        - "interpretation": A brief interpretation of its potential meaning.
        - "frequency": An estimated number of appearances.
        - "contextual_meanings": A list of different meanings in various contexts.

    2.  **recurring_motifs**: A list of 2-3 recurring ideas, patterns, or situations (motifs). For each:
        - "motif": A description of the motif.
        - "occurrences": The number of times it appears.
        - "narrative_function": Its narrative purpose.

    3.  **central_themes_hinted_by_symbols**: A brief conclusion about the main themes suggested by these symbols and motifs (a list of strings).

    4.  **symbolic_networks**: A list of dictionaries, each containing:
        - "primary_symbol": The main symbol.
        - "related_symbols": A list of associated symbols.
        - "thematic_connection": The thematic link.

    5.  **depth_score**: A score (0-10) for the depth of symbolic usage.

    6.  **consistency_score**: A score (0-10) for the consistency of symbolic usage.

    Respond **exclusively** in valid JSON format with the keys mentioned above.
    `;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        context: safeSub(fullText, 0, 30000),
        model: GeminiModel.FLASH,
        temperature: 0.7,
      });

      const analysis = asJsonRecord(JSON.parse(result.content || "{}"));

      return {
        keySymbols: asArray<Symbol>(analysis.keySymbols),
        recurringMotifs: asArray<Motif>(analysis.recurring_motifs),
        centralThemesHintedBySymbols: asStringArray(
          analysis.central_themes_hinted_by_symbols
        ),
        symbolicNetworks: asArray<SymbolicAnalysis["symbolicNetworks"][number]>(
          analysis.symbolic_networks
        ),
        depthScore: asNumber(analysis.depth_score, 5),
        consistencyScore: asNumber(analysis.consistency_score, 5),
      };
    } catch (error) {
      console.error("Error in symbolic analysis:", error);
      return this.getDefaultSymbolicResults();
    }
  }

  private getDefaultSymbolicResults(): SymbolicAnalysis {
    return {
      keySymbols: [],
      recurringMotifs: [],
      centralThemesHintedBySymbols: [],
      symbolicNetworks: [],
      depthScore: 0,
      consistencyScore: 0,
    };
  }
}