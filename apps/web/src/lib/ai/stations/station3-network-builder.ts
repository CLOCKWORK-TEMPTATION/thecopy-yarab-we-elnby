/**
 * @fileoverview Station 3: Network Builder — main façade.
 *
 * Heavy implementation split into:
 *   - station3-types.ts           (types, enums, interfaces)
 *   - station3-network-impl.ts    (ConflictNetworkImpl, NetworkDiagnostics)
 *   - station3-inference-engines.ts (RelationshipInferenceEngine, ConflictInferenceEngine)
 *   - station3-network-analyzer.ts  (NetworkAnalyzer)
 */

import { safeSub } from "../utils/text-utils";

import { BaseStation, StationInput, StationOptions } from "./base-station";
import { GeminiService } from "./gemini-service";
import {
  RelationshipInferenceEngine,
  ConflictInferenceEngine,
} from "./station3-inference-engines";
import { NetworkAnalyzer } from "./station3-network-analyzer";
import {
  ConflictNetworkImpl,
  NetworkDiagnostics,
} from "./station3-network-impl";

import type { Station1Output } from "./station1-text-analysis";
import type {
  Character,
  Conflict,
  ConflictSubject,
  ConflictScope,
  ConflictPhase,
  CharacterArc,
  DiagnosticReport,
  Station3Context,
  Station3Input,
  Station3Output,
} from "./station3-types";

// Re-export everything that was public in the original file
export * from "./station3-types";
export {
  ConflictNetworkImpl,
  NetworkDiagnostics,
} from "./station3-network-impl";
export { inferFromKeywords } from "./station3-inference-engines";
export { NetworkAnalyzer } from "./station3-network-analyzer";

// ---------------------------------------------------------------------------
// Station3NetworkBuilder
// ---------------------------------------------------------------------------

export class Station3NetworkBuilder extends BaseStation {
  private relationshipEngine: RelationshipInferenceEngine;
  private conflictEngine: ConflictInferenceEngine;
  private networkAnalyzer: NetworkAnalyzer;
  private networkDiagnostics: NetworkDiagnostics;

  constructor(geminiService: GeminiService) {
    super(geminiService, "Station 3: Network Builder", 3);
    this.relationshipEngine = new RelationshipInferenceEngine(geminiService);
    this.conflictEngine = new ConflictInferenceEngine(geminiService);
    this.networkAnalyzer = new NetworkAnalyzer(geminiService);
    this.networkDiagnostics = new NetworkDiagnostics(
      new ConflictNetworkImpl("temp", "temp")
    );
  }

  protected async execute(
    input: StationInput,
    _options: StationOptions
  ): Promise<Station3Output> {
    if (
      !(
        "station1Output" in input &&
        "station2Output" in input &&
        "text" in input
      )
    ) {
      throw new Error("Invalid input for Station3NetworkBuilder");
    }
    const station3Input = input as Station3Input;
    const startTime = Date.now();
    const context = this.buildContext(station3Input);

    const network = new ConflictNetworkImpl(
      `network_${Date.now()}`,
      `${safeSub(station3Input.station2Output.storyStatement, 0, 50)}...`
    );

    const characters = this.createCharactersFromStation1(
      station3Input.station1Output
    );
    characters.forEach((char) => network.addCharacter(char));

    const relationships = await this.relationshipEngine.inferRelationships(
      characters,
      context,
      station3Input.station2Output
    );
    relationships.forEach((rel) => network.addRelationship(rel));

    const conflicts = await this.conflictEngine.inferConflicts(
      characters,
      relationships,
      context,
      station3Input.station2Output
    );
    conflicts.forEach((conflict) => network.addConflict(conflict));

    network.createSnapshot("Initial network state after AI inference");

    const networkAnalysis = this.networkAnalyzer.analyzeNetwork(
      network,
      context
    );
    const conflictAnalysis = this.networkAnalyzer.analyzeConflicts(
      network,
      context
    );
    const characterArcs = this.networkAnalyzer.generateCharacterArcs(
      network,
      context
    );
    const pivotPoints = this.networkAnalyzer.identifyPivotPoints(
      network,
      context
    );

    this.networkDiagnostics = new NetworkDiagnostics(network);
    const diagnosticsReport = this.networkDiagnostics.runAllDiagnostics();

    const uncertaintyReport = this.calculateUncertainty(
      network,
      characters,
      relationships,
      conflicts
    );
    const buildTime = Date.now() - startTime;

    return {
      conflictNetwork: network,
      networkAnalysis,
      conflictAnalysis,
      characterArcs,
      pivotPoints,
      diagnosticsReport,
      uncertaintyReport,
      metadata: {
        analysisTimestamp: new Date(),
        status: "Success",
        buildTime,
        agentsUsed: this.getAgentsUsed(),
      },
    };
  }

  private calculateUncertainty(
    _network: import("./station3-types").ConflictNetwork,
    characters: Character[],
    relationships: import("./station3-types").Relationship[],
    conflicts: Conflict[]
  ): Station3Output["uncertaintyReport"] {
    const uncertainties: Station3Output["uncertaintyReport"]["uncertainties"] =
      [];
    let confidence = 0.8;

    if (characters.length < 3) {
      confidence -= 0.2;
      uncertainties.push({
        type: "epistemic",
        aspect: "شخصيات",
        note: "عدد الشخصيات محدود قد يؤثر على دقة التحليل",
      });
    }

    if (relationships.length < characters.length) {
      confidence -= 0.15;
      uncertainties.push({
        type: "epistemic",
        aspect: "علاقات",
        note: "عدد العلاقات محدود قد يؤثر على تحليل الشبكة",
      });
    }

    if (conflicts.length < 2) {
      confidence -= 0.15;
      uncertainties.push({
        type: "epistemic",
        aspect: "صراعات",
        note: "عدد الصراعات محدود قد يؤثر على تحليل القصة",
      });
    }

    const vagueRelationships = relationships.filter((rel) => rel.strength < 4);
    if (vagueRelationships.length > 0) {
      uncertainties.push({
        type: "aleatoric",
        aspect: "علاقات غامضة",
        note: `توجد ${vagueRelationships.length} علاقات غير واضحة`,
      });
    }

    const weakConflicts = conflicts.filter((c) => c.strength < 4);
    if (weakConflicts.length > 0) {
      uncertainties.push({
        type: "aleatoric",
        aspect: "صراعات ضعيفة",
        note: `توجد ${weakConflicts.length} صراعات ضعيفة`,
      });
    }

    confidence = Math.max(0.1, Math.min(0.95, confidence));
    return { confidence: Math.round(confidence * 100) / 100, uncertainties };
  }

  private buildContext(input: Station3Input): Station3Context {
    return {
      majorCharacters: input.station1Output.majorCharacters.map((c) => c.name),
      characterProfiles: input.station1Output.characterAnalysis,
      relationshipData: [],
      fullText: input.text,
    };
  }

  private createCharactersFromStation1(s1Output: Station1Output): Character[] {
    return s1Output.majorCharacters.map((character, index) => {
      const analysis = s1Output.characterAnalysis.get(character.name);
      return {
        id: `char_${index + 1}`,
        name: character.name,
        description: analysis?.role ?? "شخصية رئيسية",
        profile: {
          personalityTraits: (analysis?.personalityTraits ?? []).join(", "),
          motivationsGoals: [
            ...(analysis?.motivations ?? []),
            ...(analysis?.goals ?? []),
          ].join(", "),
          potentialArc: analysis?.arc?.description ?? "",
        },
        metadata: {
          source: "Station1_Analysis",
          analysisTimestamp: s1Output.metadata.analysisTimestamp.toISOString(),
        },
      };
    });
  }

  protected extractRequiredData(input: Station3Input): Record<string, unknown> {
    return {
      station1Characters: input.station1Output.majorCharacters.slice(0, 5),
      station2StoryStatement: input.station2Output.storyStatement,
      fullTextLength: input.text.length,
    };
  }

  protected getErrorFallback(): Station3Output {
    const emptyNetwork = new ConflictNetworkImpl(
      "error_network",
      "Error Network"
    );
    // Import these directly rather than using the enums to avoid circular reference issues
    const ConflictSubjectOther = "other" as ConflictSubject;
    const ConflictScopePersonal = "personal" as ConflictScope;
    const ConflictPhaseEmerging = "emerging" as ConflictPhase;

    const emptyDiagnosticsReport: DiagnosticReport = {
      overallHealthScore: 0,
      criticalityLevel: "critical",
      structuralIssues: [],
      isolatedCharacters: { totalIsolated: 0, characters: [] },
      abandonedConflicts: { totalAbandoned: 0, conflicts: [] },
      overloadedCharacters: { totalOverloaded: 0, characters: [] },
      weakConnections: { totalWeak: 0, connections: [] },
      redundancies: { totalRedundant: 0, items: [] },
    };

    return {
      conflictNetwork: emptyNetwork,
      networkAnalysis: {
        density: 0,
        complexity: 0,
        balance: 0,
        dynamicRange: 0,
      },
      conflictAnalysis: {
        mainConflict: {
          id: "error_conflict",
          name: "خطأ في تحليل الصراع",
          description: "لم يمكن تحليل الصراعات",
          involvedCharacters: [],
          subject: ConflictSubjectOther,
          scope: ConflictScopePersonal,
          phase: ConflictPhaseEmerging,
          strength: 0,
          relatedRelationships: [],
          pivotPoints: [],
          timestamps: [new Date()],
          metadata: {
            source: "Error_Fallback",
            inferenceTimestamp: new Date().toISOString(),
          },
        },
        subConflicts: [],
        conflictTypes: new Map<string, number>(),
        intensityProgression: [],
      },
      characterArcs: new Map<string, CharacterArc>(),
      pivotPoints: [],
      diagnosticsReport: emptyDiagnosticsReport,
      uncertaintyReport: {
        confidence: 0.1,
        uncertainties: [
          { type: "epistemic", aspect: "شامل", note: "فشل كامل في التحليل" },
        ],
      },
      metadata: {
        analysisTimestamp: new Date(),
        status: "Failed",
        buildTime: 0,
        agentsUsed: [],
      },
    };
  }

  protected getAgentsUsed(): string[] {
    return [
      "RelationshipInferenceEngine",
      "ConflictInferenceEngine",
      "NetworkAnalyzer",
      "NetworkDiagnostics",
    ];
  }
}
