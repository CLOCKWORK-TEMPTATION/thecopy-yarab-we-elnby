import { toText, safeSub } from "../utils/text-utils";

import { BaseStation, StationInput, StationOptions } from "./base-station";
import { GeminiService, GeminiModel } from "./gemini-service";
import {
  Station1Output,
  type CharacterProfile,
} from "./station1-text-analysis";
import { Station2Output } from "./station2-conceptual-analysis";

/**
 * Pivotal point in a conflict's progression.
 */
export interface ConflictPivotPoint {
  timestamp: string | Date;
  description: string;
  impact: number;
  affectedElements?: string[];
}

/**
 * Hint about a relationship inferred from previous stations.
 */
export interface RelationshipHint {
  source?: string;
  target?: string;
  description?: string;
  strength?: number;
}

// Define types locally for now
export enum RelationshipType {
  FAMILY = "family",
  FRIENDSHIP = "friendship",
  ROMANTIC = "romantic",
  PROFESSIONAL = "professional",
  ANTAGONISTIC = "antagonistic",
  MENTORSHIP = "mentorship",
  OTHER = "other",
}

export enum RelationshipNature {
  POSITIVE = "positive",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
  VOLATILE = "volatile",
}

export enum RelationshipDirection {
  UNIDIRECTIONAL = "unidirectional",
  BIDIRECTIONAL = "bidirectional",
}

export enum ConflictSubject {
  RELATIONSHIP = "relationship",
  POWER = "power",
  IDEOLOGY = "ideology",
  RESOURCES = "resources",
  INFORMATION = "information",
  TERRITORY = "territory",
  HONOR = "honor",
  OTHER = "other",
}

export enum ConflictScope {
  PERSONAL = "personal",
  GROUP = "group",
  SOCIETAL = "societal",
}

export enum ConflictPhase {
  EMERGING = "emerging",
  ESCALATING = "escalating",
  PEAK = "peak",
  RESOLVING = "resolving",
  RESOLVED = "resolved",
}

export interface Character {
  id: string;
  name: string;
  description: string;
  profile?: {
    personalityTraits: string;
    motivationsGoals: string;
    potentialArc: string;
  };
  metadata: {
    source: string;
    analysisTimestamp: string;
  };
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  nature: RelationshipNature;
  direction: RelationshipDirection;
  strength: number;
  description: string;
  triggers: string[];
  metadata: {
    source: string;
    inferenceTimestamp: string;
  };
}

export interface Conflict {
  id: string;
  name: string;
  description: string;
  involvedCharacters: string[];
  subject: ConflictSubject;
  scope: ConflictScope;
  phase: ConflictPhase;
  strength: number;
  relatedRelationships: string[];
  pivotPoints: ConflictPivotPoint[];
  timestamps: Date[];
  metadata: {
    source: string;
    inferenceTimestamp: string;
  };
}

export interface CharacterArc {
  characterId: string;
  characterName: string;
  arcType: "positive" | "negative" | "flat" | "transformational" | "fall";
  arcDescription: string;
  keyMoments: { timestamp: Date; description: string; impact: number }[];
  transformation: string;
  confidence: number;
}

export interface ConflictNetwork {
  id: string;
  name: string;
  characters: Map<string, Character>;
  relationships: Map<string, Relationship>;
  conflicts: Map<string, Conflict>;
  addCharacter(character: Character): void;
  addRelationship(relationship: Relationship): void;
  addConflict(conflict: Conflict): void;
  createSnapshot(description: string): void;
}

export class ConflictNetworkImpl implements ConflictNetwork {
  public characters = new Map<string, Character>();
  public relationships = new Map<string, Relationship>();
  public conflicts = new Map<string, Conflict>();

  constructor(
    public id: string,
    public name: string
  ) {}

  addCharacter(character: Character): void {
    this.characters.set(character.id, character);
  }

  addRelationship(relationship: Relationship): void {
    this.relationships.set(relationship.id, relationship);
  }

  addConflict(conflict: Conflict): void {
    this.conflicts.set(conflict.id, conflict);
  }

  createSnapshot(_description: string): void {
    // Implementation for creating snapshots
  }
}

export interface DiagnosticReport {
  overallHealthScore: number;
  criticalityLevel: "low" | "medium" | "high" | "critical";
  structuralIssues: string[];
  isolatedCharacters: {
    totalIsolated: number;
    characters: string[];
  };
  abandonedConflicts: {
    totalAbandoned: number;
    conflicts: string[];
  };
  overloadedCharacters: {
    totalOverloaded: number;
    characters: string[];
  };
  weakConnections: {
    totalWeak: number;
    connections: string[];
  };
  redundancies: {
    totalRedundant: number;
    items: string[];
  };
}

export class NetworkDiagnostics {
  constructor(network: ConflictNetwork) {
    void network;
  }

  runAllDiagnostics(): DiagnosticReport {
    return {
      overallHealthScore: 0.8,
      criticalityLevel: "medium",
      structuralIssues: [],
      isolatedCharacters: { totalIsolated: 0, characters: [] },
      abandonedConflicts: { totalAbandoned: 0, conflicts: [] },
      overloadedCharacters: { totalOverloaded: 0, characters: [] },
      weakConnections: { totalWeak: 0, connections: [] },
      redundancies: { totalRedundant: 0, items: [] },
    };
  }
}

export interface Station3Context {
  majorCharacters: string[];
  characterProfiles?: Map<string, CharacterProfile>;
  relationshipData?: RelationshipHint[];
  fullText: string;
}

export interface Station3Input extends StationInput {
  station1Output: Station1Output;
  station2Output: Station2Output;
}

export interface Station3Output {
  conflictNetwork: ConflictNetwork;
  networkAnalysis: {
    density: number;
    complexity: number;
    balance: number;
    dynamicRange: number;
  };
  conflictAnalysis: {
    mainConflict: Conflict;
    subConflicts: Conflict[];
    conflictTypes: Map<string, number>;
    intensityProgression: number[];
  };
  characterArcs: Map<string, CharacterArc>;
  pivotPoints: {
    timestamp: string;
    description: string;
    impact: number;
    affectedElements: string[];
  }[];
  diagnosticsReport: DiagnosticReport;
  uncertaintyReport: {
    confidence: number;
    uncertainties: {
      type: "epistemic" | "aleatoric";
      aspect: string;
      note: string;
    }[];
  };
  metadata: {
    analysisTimestamp: Date;
    status: "Success" | "Partial" | "Failed";
    buildTime: number;
    agentsUsed: string[];
  };
}

/**
 * Configuration for keyword-based inference.
 * Maps a set of keywords to a result value.
 */
interface KeywordMapping<T> {
  keywords: string[];
  value: T;
}

/**
 * Finds the first matching value from keyword mappings, or returns the default.
 * This replaces repetitive if/else chains with a declarative approach.
 */
function inferFromKeywords<T>(
  description: string,
  mappings: KeywordMapping<T>[],
  defaultValue: T
): T {
  const desc = description.toLowerCase();
  for (const mapping of mappings) {
    if (mapping.keywords.some((keyword) => desc.includes(keyword))) {
      return mapping.value;
    }
  }
  return defaultValue;
}

// Declarative keyword mappings for relationship inference
const RELATIONSHIP_TYPE_MAPPINGS: KeywordMapping<RelationshipType>[] = [
  {
    keywords: ["أسرة", "أب", "أم", "أخ", "أخت"],
    value: RelationshipType.FAMILY,
  },
  { keywords: ["صديق", "رفاق"], value: RelationshipType.FRIENDSHIP },
  {
    keywords: ["حب", "علاقة عاطفية", "زواج"],
    value: RelationshipType.ROMANTIC,
  },
  { keywords: ["عمل", "زميل", "مدير"], value: RelationshipType.PROFESSIONAL },
  { keywords: ["عدو", "خصم", "منافس"], value: RelationshipType.ANTAGONISTIC },
  { keywords: ["معلم", "تلميذ", "مرشد"], value: RelationshipType.MENTORSHIP },
];

const RELATIONSHIP_NATURE_MAPPINGS: KeywordMapping<RelationshipNature>[] = [
  { keywords: ["إيجابي", "داعم", "جيد"], value: RelationshipNature.POSITIVE },
  { keywords: ["سلبي", "معادي", "سيء"], value: RelationshipNature.NEGATIVE },
  {
    keywords: ["متغير", "متبدل", "غير مستقر"],
    value: RelationshipNature.VOLATILE,
  },
];

const RELATIONSHIP_DIRECTION_MAPPINGS: KeywordMapping<RelationshipDirection>[] =
  [
    {
      keywords: ["أثر", "يسيطر", "يؤثر على"],
      value: RelationshipDirection.UNIDIRECTIONAL,
    },
  ];

interface StrengthMapping {
  keywords: string[];
  value: number;
}

const RELATIONSHIP_STRENGTH_MAPPINGS: StrengthMapping[] = [
  { keywords: ["قوي جداً", "عميق", "وثيق"], value: 9 },
  { keywords: ["قوي", "مهم"], value: 7 },
  { keywords: ["ضعيف", "سطحي"], value: 3 },
];

class RelationshipInferenceEngine {
  constructor(private geminiService: GeminiService) {}

  async inferRelationships(
    characters: Character[],
    context: Station3Context,
    _station2Summary: Station2Output
  ): Promise<Relationship[]> {
    const charactersList = characters
      .map((c) => `'${c.name}' (ID: ${c.id})`)
      .join(", ");

    const prompt = `
استنادًا إلى السياق المقدم، قم باستنتاج العلاقات الرئيسية بين الشخصيات.

الشخصيات المتاحة: ${charactersList}

اكتب تحليلاً مفصلاً للعلاقات الرئيسية بين الشخصيات.
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      context: safeSub(context.fullText, 0, 25000),
      model: GeminiModel.FLASH,
      temperature: 0.7,
    });

    // تحليل النص المستخرج لاستنتاج العلاقات
    const analysisText = toText(result.content) || "";
    const inferredRelationships = this.parseRelationshipsFromText(
      analysisText,
      characters
    );

    return inferredRelationships.length > 0
      ? inferredRelationships
      : this.createDefaultRelationships(characters);
  }

  private parseRelationshipsFromText(
    text: string,
    characters: Character[]
  ): Relationship[] {
    const relationships: Relationship[] = [];
    const charNameToId = new Map(characters.map((c) => [c.name, c.id]));

    // استخراج العلاقات من النص المحلل
    const relationshipPatterns = [
      /(\w+)\s+و\s+(\w+)\s+:\s+(.+?)(?=\n|$)/gi,
      /بين\s+(\w+)\s+و\s+(\w+)\s+توجد\s+(.+?)(?=\n|$)/gi,
      /(\w+)\s+ترتبط\s+بـ\s+(\w+)\s+بـ(.+?)(?=\n|$)/gi,
    ];

    for (const pattern of relationshipPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const char1Name = match[1]?.trim();
        const char2Name = match[2]?.trim();
        const relationshipDesc = match[3]?.trim();

        if (!char1Name || !char2Name || !relationshipDesc) continue;

        const char1Id = charNameToId.get(char1Name);
        const char2Id = charNameToId.get(char2Name);

        if (char1Id && char2Id && char1Id !== char2Id) {
          const relationship: Relationship = {
            id: `rel_${char1Id}_${char2Id}_${Date.now()}`,
            source: char1Id,
            target: char2Id,
            type: this.inferRelationshipType(relationshipDesc),
            nature: this.inferRelationshipNature(relationshipDesc),
            direction: this.inferRelationshipDirection(relationshipDesc),
            strength: this.inferRelationshipStrength(relationshipDesc),
            description: relationshipDesc,
            triggers: this.extractTriggers(relationshipDesc),
            metadata: {
              source: "AI_Text_Analysis",
              inferenceTimestamp: new Date().toISOString(),
            },
          };

          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  private createDefaultRelationships(characters: Character[]): Relationship[] {
    const relationships: Relationship[] = [];

    // إنشاء علاقات افتراضية بين الشخصيات الرئيسية
    for (let i = 0; i < Math.min(characters.length, 3); i++) {
      for (let j = i + 1; j < Math.min(characters.length, 3); j++) {
        const relationship: Relationship = {
          id: `rel_default_${characters[i]?.id}_${characters[j]?.id}_${Date.now()}`,
          source: characters[i]?.id ?? "",
          target: characters[j]?.id ?? "",
          type: RelationshipType.OTHER,
          nature: RelationshipNature.NEUTRAL,
          direction: RelationshipDirection.BIDIRECTIONAL,
          strength: 5,
          description: "علاقة محتملة تحتاج تطوير",
          triggers: [],
          metadata: {
            source: "Default_Inference",
            inferenceTimestamp: new Date().toISOString(),
          },
        };

        relationships.push(relationship);
      }
    }

    return relationships;
  }

  private inferRelationshipType(description: string): RelationshipType {
    return inferFromKeywords(
      description,
      RELATIONSHIP_TYPE_MAPPINGS,
      RelationshipType.OTHER
    );
  }

  private inferRelationshipNature(description: string): RelationshipNature {
    return inferFromKeywords(
      description,
      RELATIONSHIP_NATURE_MAPPINGS,
      RelationshipNature.NEUTRAL
    );
  }

  private inferRelationshipDirection(
    description: string
  ): RelationshipDirection {
    return inferFromKeywords(
      description,
      RELATIONSHIP_DIRECTION_MAPPINGS,
      RelationshipDirection.BIDIRECTIONAL
    );
  }

  private inferRelationshipStrength(description: string): number {
    return inferFromKeywords(description, RELATIONSHIP_STRENGTH_MAPPINGS, 5);
  }

  private extractTriggers(description: string): string[] {
    const triggers: string[] = [];

    // استخراج المحفزات المحتملة من الوصف
    const triggerPatterns = [
      /عندما\s+(.+?)(?=\n|،|و)/gi,
      /إذا\s+(.+?)(?=\n|،|و)/gi,
      /بسبب\s+(.+?)(?=\n|،|و)/gi,
    ];

    for (const pattern of triggerPatterns) {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        if (match[1]) {
          triggers.push(match[1].trim());
        }
      }
    }

    return triggers;
  }
}

// Declarative keyword mappings for conflict inference

class ConflictInferenceEngine {
  constructor(private geminiService: GeminiService) {}

  async inferConflicts(
    characters: Character[],
    _relationships: Relationship[],
    context: Station3Context,
    _station2Summary: Station2Output
  ): Promise<Conflict[]> {
    const prompt = `
استنادًا إلى السياق، قم باستنتاج الصراعات الرئيسية (3-5 صراعات).

اكتب تحليلاً مفصلاً للصراعات الرئيسية في النص.
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      context: safeSub(context.fullText, 0, 25000),
      model: GeminiModel.FLASH,
      temperature: 0.7,
    });

    // تحليل النص المستخرج لاستنتاج الصراعات
    const analysisText = toText(result.content) || "";
    const inferredConflicts = this.parseConflictsFromText(
      analysisText,
      characters
    );

    return inferredConflicts.length > 0
      ? inferredConflicts
      : this.createDefaultConflicts(characters);
  }

  private parseConflictsFromText(
    text: string,
    characters: Character[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const charNameToId = new Map(characters.map((c) => [c.name, c.id]));

    // استخراج الصراعات من النص المحلل
    const conflictPatterns = [
      /صراع\s+(.+?)\s+بين\s+(.+?)\s+و\s+(.+?)(?=\n|$)/gi,
      /(.+?)\s+يواجه\s+(.+?)(?=\n|$)/gi,
      /الصراع\s+الرئيسي\s+هو\s+(.+?)(?=\n|$)/gi,
    ];

    for (const pattern of conflictPatterns) {
      let match;
      while (true) {
        match = pattern.exec(text);
        if (match === null) {
          break;
        }
        let conflictName, involvedChars, conflictDesc;

        if (match.length === 4) {
          // النمط الأول: صراع [اسم] بين [شخصية1] و [شخصية2]
          conflictName = match[1]?.trim() ?? "صراع غير مسمى";
          involvedChars = [match[2]?.trim() ?? "", match[3]?.trim() ?? ""];
          conflictDesc = `صراع ${conflictName} بين ${involvedChars.join(" و ")}`;
        } else if (match.length === 3) {
          // النمط الثاني: [شخصية] يواجه [مشكلة]
          conflictName = `صراع ${match[1]?.trim()}`;
          involvedChars = [match[1]?.trim() ?? ""];
          conflictDesc = match[2]?.trim() ?? "";
        } else {
          // النمط الثالث: الصراع الرئيسي هو [وصف]
          conflictName = "الصراع الرئيسي";
          conflictDesc = match[1]?.trim() ?? "";
          involvedChars = this.extractCharactersFromDescription(
            conflictDesc,
            characters
          );
        }

        // إنشاء صراع من البيانات المستخرجة
        const charIds = involvedChars
          .map((name) => charNameToId.get(name))
          .filter((id): id is string => id !== undefined);

        if (charIds.length > 0) {
          conflicts.push({
            id: `conflict_${Date.now()}_${Math.random()}`,
            name: conflictName,
            description: conflictDesc,
            involvedCharacters: charIds,
            subject: ConflictSubject.OTHER,
            scope: ConflictScope.PERSONAL,
            phase: ConflictPhase.EMERGING,
            strength: 7,
            relatedRelationships: [],
            pivotPoints: [],
            timestamps: [new Date()],
            metadata: {
              source: "AI_Text_Analysis",
              inferenceTimestamp: new Date().toISOString(),
            },
          });
        }
      }
    }

    return conflicts;
  }

  private createDefaultConflicts(characters: Character[]): Conflict[] {
    const conflicts: Conflict[] = [];

    // إنشاء صراع افتراضي بين الشخصيات الرئيسية
    if (characters.length >= 2) {
      const mainConflict: Conflict = {
        id: `conflict_main_${Date.now()}`,
        name: "الصراع الرئيسي",
        description: "صراع مركزي يحرك القصة",
        involvedCharacters: [characters[0]?.id ?? "", characters[1]?.id ?? ""],
        subject: ConflictSubject.OTHER,
        scope: ConflictScope.PERSONAL,
        phase: ConflictPhase.EMERGING,
        strength: 7,
        relatedRelationships: [],
        pivotPoints: [],
        timestamps: [new Date()],
        metadata: {
          source: "Default_Inference",
          inferenceTimestamp: new Date().toISOString(),
        },
      };

      conflicts.push(mainConflict);
    }

    // إنشاء صراعات ثانوية
    for (let i = 2; i < Math.min(characters.length, 4); i++) {
      const subConflict: Conflict = {
        id: `conflict_sub_${characters[i]?.id}_${Date.now()}`,
        name: `صراع ${characters[i]?.name}`,
        description: `صراع فرعي يتعلق بشخصية ${characters[i]?.name}`,
        involvedCharacters: [characters[i]?.id ?? ""],
        subject: ConflictSubject.OTHER,
        scope: ConflictScope.PERSONAL,
        phase: ConflictPhase.EMERGING,
        strength: 5,
        relatedRelationships: [],
        pivotPoints: [],
        timestamps: [new Date()],
        metadata: {
          source: "Default_Inference",
          inferenceTimestamp: new Date().toISOString(),
        },
      };

      conflicts.push(subConflict);
    }

    return conflicts;
  }

  private extractCharactersFromDescription(
    description: string,
    characters: Character[]
  ): string[] {
    const mentionedChars: string[] = [];

    for (const character of characters) {
      if (description.includes(character.name)) {
        mentionedChars.push(character.name);
      }
    }

    return mentionedChars.length > 0
      ? mentionedChars
      : [characters[0]?.name].filter((name): name is string => !!name);
  }
}

class NetworkAnalyzer {
  constructor(geminiService: GeminiService) {
    void geminiService;
  }

  analyzeNetwork(
    network: ConflictNetwork,
    _context: Station3Context
  ): {
    density: number;
    complexity: number;
    balance: number;
    dynamicRange: number;
  } {
    // حساب كثافة الشبكة
    const maxPossibleConnections =
      (network.characters.size * (network.characters.size - 1)) / 2;
    const actualConnections = network.relationships.size;
    const density =
      maxPossibleConnections > 0
        ? actualConnections / maxPossibleConnections
        : 0;

    // حساب تعقيد الشبكة
    const avgConnectionsPerCharacter =
      network.characters.size > 0
        ? Array.from(network.relationships.values()).reduce((sum, rel) => {
            return (
              sum +
              (network.relationships.has(rel.source) ? 1 : 0) +
              (network.relationships.has(rel.target) ? 1 : 0)
            );
          }, 0) / network.characters.size
        : 0;

    const complexity = Math.min(avgConnectionsPerCharacter / 5, 1); // تطبيع إلى 0-1

    // حساب توازن الشبكة
    const conflictDistribution = this.calculateConflictDistribution(network);
    const balance = 1 - this.calculateImbalance(conflictDistribution);

    // حساب النطاق الديناميكي
    const strengthValues = Array.from(network.relationships.values()).map(
      (rel) => rel.strength
    );
    const minStrength = Math.min(...strengthValues, 0);
    const maxStrength = Math.max(...strengthValues, 10);
    const dynamicRange = (maxStrength - minStrength) / 10;

    return {
      density: Math.round(density * 100) / 100,
      complexity: Math.round(complexity * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      dynamicRange: Math.round(dynamicRange * 100) / 100,
    };
  }

  private calculateConflictDistribution(
    network: ConflictNetwork
  ): Map<string, number> {
    const distribution = new Map<string, number>();

    // حساب عدد الصراعات لكل شخصية
    for (const character of network.characters.values()) {
      const conflictCount = Array.from(network.conflicts.values()).filter(
        (conflict) => conflict.involvedCharacters.includes(character.id)
      ).length;

      distribution.set(character.id, conflictCount);
    }

    return distribution;
  }

  private calculateImbalance(distribution: Map<string, number>): number {
    const values = Array.from(distribution.values());
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // تطبيع الانحراف المعياري إلى 0-1
    return Math.min(stdDev / mean, 1) || 0;
  }

  analyzeConflicts(
    network: ConflictNetwork,
    _context: Station3Context
  ): {
    mainConflict: Conflict;
    subConflicts: Conflict[];
    conflictTypes: Map<string, number>;
    intensityProgression: number[];
  } {
    const conflicts = Array.from(network.conflicts.values());

    // تحديد الصراع الرئيسي (الأقوى)
    const mainConflict = conflicts.reduce(
      (strongest, current) =>
        current.strength > strongest.strength ? current : strongest,
      conflicts[0] ?? this.createDefaultConflict()
    );

    // تحديد الصراعات الثانوية
    const subConflicts = conflicts.filter(
      (conflict) => conflict.id !== mainConflict.id
    );

    // تحليل أنواع الصراعات
    const conflictTypes = new Map<string, number>();
    for (const conflict of conflicts) {
      const typeName = conflict.subject.toString();
      conflictTypes.set(typeName, (conflictTypes.get(typeName) ?? 0) + 1);
    }

    // حساب تقدم شدة الصراع
    const intensityProgression = this.calculateIntensityProgression(conflicts);

    return {
      mainConflict,
      subConflicts,
      conflictTypes,
      intensityProgression,
    };
  }

  private calculateIntensityProgression(conflicts: Conflict[]): number[] {
    // في تطبيق حقيقي، سيتم تحليل الصراعات عبر الزمن
    // هنا نعيد قيمًا افتراضية بناءً على قوة الصراعات الحالية
    return conflicts.map((conflict) => conflict.strength / 10);
  }

  private createDefaultConflict(): Conflict {
    return {
      id: `conflict_default_${Date.now()}`,
      name: "صراع افتراضي",
      description: "صراع افتراضي للتحليل",
      involvedCharacters: [],
      subject: ConflictSubject.OTHER,
      scope: ConflictScope.PERSONAL,
      phase: ConflictPhase.EMERGING,
      strength: 5,
      relatedRelationships: [],
      pivotPoints: [],
      timestamps: [new Date()],
      metadata: {
        source: "Default_Analysis",
        inferenceTimestamp: new Date().toISOString(),
      },
    };
  }

  generateCharacterArcs(
    network: ConflictNetwork,
    _context: Station3Context
  ): Map<string, CharacterArc> {
    const characterArcs = new Map<string, CharacterArc>();

    for (const character of network.characters.values()) {
      const conflicts = Array.from(network.conflicts.values()).filter(
        (conflict) => conflict.involvedCharacters.includes(character.id)
      );

      const relationships = Array.from(network.relationships.values()).filter(
        (rel) => rel.source === character.id || rel.target === character.id
      );

      const arc: CharacterArc = {
        characterId: character.id,
        characterName: character.name,
        arcType: this.inferArcType(character, conflicts, relationships),
        arcDescription: this.generateArcDescription(
          character,
          conflicts,
          relationships
        ),
        keyMoments: this.extractKeyMoments(character, conflicts, relationships),
        transformation: this.describeTransformation(
          character,
          conflicts,
          relationships
        ),
        confidence: this.calculateArcConfidence(
          character,
          conflicts,
          relationships
        ),
      };

      characterArcs.set(character.id, arc);
    }

    return characterArcs;
  }

  private inferArcType(
    _character: Character,
    conflicts: Conflict[],
    relationships: Relationship[]
  ): "positive" | "negative" | "flat" | "transformational" | "fall" {
    // تحليل بسيط لنوع القوس بناءً على الصراعات والعلاقات
    const conflictStrength = conflicts.reduce(
      (sum, conflict) => sum + conflict.strength,
      0
    );
    const relationshipBalance = relationships.reduce((sum, rel) => {
      return sum + (rel.nature === RelationshipNature.POSITIVE ? 1 : -1);
    }, 0);

    if (conflictStrength > 10 && relationshipBalance < 0) {
      return "fall";
    } else if (conflictStrength > 10 && relationshipBalance > 0) {
      return "transformational";
    } else if (conflictStrength > 5) {
      return relationshipBalance > 0 ? "positive" : "negative";
    }

    return "flat";
  }

  private generateArcDescription(
    character: Character,
    conflicts: Conflict[],
    relationships: Relationship[]
  ): string {
    // إنشاء وصف للقوس بناءً على الصراعات والعلاقات
    const conflictNames = conflicts.map((conflict) => conflict.name).join("، ");
    const relationshipTypes = relationships
      .map((rel) => rel.type.toString())
      .join("، ");

    return `قوس ${character.name} يتضمن الصراعات: ${conflictNames} والعلاقات: ${relationshipTypes}`;
  }

  private extractKeyMoments(
    _character: Character,
    conflicts: Conflict[],
    relationships: Relationship[]
  ): { timestamp: Date; description: string; impact: number }[] {
    // استخراج اللحظات الرئيسية من الصراعات والعلاقات
    const keyMoments: {
      timestamp: Date;
      description: string;
      impact: number;
    }[] = [];

    // إضافة لحظات من الصراعات
    for (const conflict of conflicts) {
      if (conflict.timestamps && conflict.timestamps.length > 0) {
        keyMoments.push({
          timestamp: conflict.timestamps?.[0] ?? new Date(),
          description: `بدء الصراع: ${conflict.name}`,
          impact: conflict.strength / 10,
        });
      }
    }

    // إضافة لحظات من العلاقات
    for (const relationship of relationships) {
      keyMoments.push({
        timestamp: new Date(relationship.metadata.inferenceTimestamp),
        description: `تكوين علاقة: ${relationship.type.toString()}`,
        impact: relationship.strength / 10,
      });
    }

    // ترتيب اللحظات حسب التأثير
    return keyMoments.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }

  private describeTransformation(
    character: Character,
    _conflicts: Conflict[],
    relationships: Relationship[]
  ): string {
    // وصف التحول الذي يحدث للشخصية
    const positiveRelationships = relationships.filter(
      (rel) => rel.nature === RelationshipNature.POSITIVE
    ).length;
    const negativeRelationships = relationships.filter(
      (rel) => rel.nature === RelationshipNature.NEGATIVE
    ).length;

    if (positiveRelationships > negativeRelationships) {
      return `${character.name} يتحول نحو الأفضل من خلال العلاقات الإيجابية`;
    } else if (negativeRelationships > positiveRelationships) {
      return `${character.name} يواجه تحديات تؤثر على مساره سلباً`;
    }

    return `${character.name} يمر بتحولات معقدة بسبب الصراعات والعلاقات المتنوعة`;
  }

  private calculateArcConfidence(
    _character: Character,
    conflicts: Conflict[],
    relationships: Relationship[]
  ): number {
    // حساب الثقة في تحليل القوس
    const totalConnections = conflicts.length + relationships.length;

    if (totalConnections === 0) return 0.2; // منخفض جداً
    if (totalConnections < 3) return 0.5; // متوسط
    if (totalConnections < 6) return 0.7; // جيد

    return 0.9; // عالي
  }

  identifyPivotPoints(
    network: ConflictNetwork,
    _context: Station3Context
  ): {
    timestamp: string;
    description: string;
    impact: number;
    affectedElements: string[];
  }[] {
    const pivotPoints: {
      timestamp: string;
      description: string;
      impact: number;
      affectedElements: string[];
    }[] = [];

    // تحليل الصراعات للعثور على نقاط التحول
    for (const conflict of network.conflicts.values()) {
      if (conflict.strength > 7) {
        // الصراعات القوية كنقاط تحول محتملة
        const affectedCharacters = conflict.involvedCharacters.map((charId) => {
          const character = network.characters.get(charId);
          return character ? character.name : charId;
        });

        pivotPoints.push({
          timestamp:
            conflict.timestamps?.[0]?.toISOString() ?? new Date().toISOString(),
          description: `نقطة تحول: ${conflict.name}`,
          impact: conflict.strength / 10,
          affectedElements: affectedCharacters,
        });
      }
    }

    // تحليل العلاقات للعثور على نقاط التحول
    for (const relationship of network.relationships.values()) {
      if (relationship.strength > 7) {
        // العلاقات القوية كنقاط تحول محتملة
        const sourceChar = network.characters.get(relationship.source);
        const targetChar = network.characters.get(relationship.target);

        pivotPoints.push({
          timestamp: relationship.metadata.inferenceTimestamp,
          description: `نقطة تحول: علاقة ${relationship.type.toString()}`,
          impact: relationship.strength / 10,
          affectedElements: [
            sourceChar ? sourceChar.name : relationship.source,
            targetChar ? targetChar.name : relationship.target,
          ].filter(Boolean),
        });
      }
    }

    // ترتيب نقاط التحول حسب التأثير
    return pivotPoints.sort((a, b) => b.impact - a.impact);
  }
}

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

    // إنشاء الشبكة
    const network = new ConflictNetworkImpl(
      `network_${Date.now()}`,
      `${safeSub(station3Input.station2Output.storyStatement, 0, 50)}...`
    );

    // إنشاء الشخصيات من المحطة الأولى
    const characters = this.createCharactersFromStation1(
      station3Input.station1Output
    );
    characters.forEach((char) => network.addCharacter(char));

    // استنتاج العلاقات
    const relationships = await this.relationshipEngine.inferRelationships(
      characters,
      context,
      station3Input.station2Output
    );
    relationships.forEach((rel) => network.addRelationship(rel));

    // استنتاج الصراعات
    const conflicts = await this.conflictEngine.inferConflicts(
      characters,
      relationships,
      context,
      station3Input.station2Output
    );
    conflicts.forEach((conflict) => network.addConflict(conflict));

    // إنشاء لقطة أولية
    network.createSnapshot("Initial network state after AI inference");

    // تحليل الشبكة
    const networkAnalysis = this.networkAnalyzer.analyzeNetwork(
      network,
      context
    );

    // تحليل الصراعات
    const conflictAnalysis = this.networkAnalyzer.analyzeConflicts(
      network,
      context
    );

    // توليد أقواس الشخصيات
    const characterArcs = this.networkAnalyzer.generateCharacterArcs(
      network,
      context
    );

    // تحديد نقاط التحول
    const pivotPoints = this.networkAnalyzer.identifyPivotPoints(
      network,
      context
    );

    // تشخيص الشبكة
    this.networkDiagnostics = new NetworkDiagnostics(network);
    const diagnosticsReport = this.networkDiagnostics.runAllDiagnostics();

    // حساب الثقة وعدم اليقين
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
        agentsUsed: [
          "RelationshipInferenceEngine",
          "ConflictInferenceEngine",
          "NetworkAnalyzer",
          "NetworkDiagnostics",
        ],
      },
    };
  }

  private calculateUncertainty(
    _network: ConflictNetwork,
    characters: Character[],
    relationships: Relationship[],
    conflicts: Conflict[]
  ): {
    confidence: number;
    uncertainties: {
      type: "epistemic" | "aleatoric";
      aspect: string;
      note: string;
    }[];
  } {
    const uncertainties: {
      type: "epistemic" | "aleatoric";
      aspect: string;
      note: string;
    }[] = [];

    // حساب الثقة بناءً على جودة البيانات
    let confidence = 0.8; // قيمة ابتدائية

    // تقليل الثقة إذا كانت الشخصيات قليلة
    if (characters.length < 3) {
      confidence -= 0.2;
      uncertainties.push({
        type: "epistemic",
        aspect: "شخصيات",
        note: "عدد الشخصيات محدود قد يؤثر على دقة التحليل",
      });
    }

    // تقليل الثقة إذا كانت العلاقات قليلة
    if (relationships.length < characters.length) {
      confidence -= 0.15;
      uncertainties.push({
        type: "epistemic",
        aspect: "علاقات",
        note: "عدد العلاقات محدود قد يؤثر على تحليل الشبكة",
      });
    }

    // تقليل الثقة إذا كانت الصراعات قليلة
    if (conflicts.length < 2) {
      confidence -= 0.15;
      uncertainties.push({
        type: "epistemic",
        aspect: "صراعات",
        note: "عدد الصراعات محدود قد يؤثر على تحليل القصة",
      });
    }

    // إضافة عدم يقين متأصل (aleatoric) للعناصر الغامضة
    const vagueRelationships = relationships.filter((rel) => rel.strength < 4);
    if (vagueRelationships.length > 0) {
      uncertainties.push({
        type: "aleatoric",
        aspect: "علاقات غامضة",
        note: `توجد ${vagueRelationships.length} علاقات غير واضحة`,
      });
    }

    const weakConflicts = conflicts.filter((conflict) => conflict.strength < 4);
    if (weakConflicts.length > 0) {
      uncertainties.push({
        type: "aleatoric",
        aspect: "صراعات ضعيفة",
        note: `توجد ${weakConflicts.length} صراعات ضعيفة`,
      });
    }

    // ضمان قيمة الثقة في النطاق المسموح به
    confidence = Math.max(0.1, Math.min(0.95, confidence));

    return {
      confidence: Math.round(confidence * 100) / 100,
      uncertainties,
    };
  }

  private buildContext(input: Station3Input): Station3Context {
    const relationshipHints: RelationshipHint[] = [];

    return {
      majorCharacters: input.station1Output.majorCharacters.map((c) => c.name),
      characterProfiles: input.station1Output.characterAnalysis,
      relationshipData: relationshipHints,
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
          subject: ConflictSubject.OTHER,
          scope: ConflictScope.PERSONAL,
          phase: ConflictPhase.EMERGING,
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
      diagnosticsReport: {
        overallHealthScore: 0,
        criticalityLevel: "critical",
        structuralIssues: [],
        isolatedCharacters: {
          totalIsolated: 0,
          characters: [],
        },
        abandonedConflicts: {
          totalAbandoned: 0,
          conflicts: [],
        },
        overloadedCharacters: {
          totalOverloaded: 0,
          characters: [],
        },
        weakConnections: {
          totalWeak: 0,
          connections: [],
        },
        redundancies: {
          totalRedundant: 0,
          items: [],
        },
      },
      uncertaintyReport: {
        confidence: 0.1,
        uncertainties: [
          {
            type: "epistemic",
            aspect: "شامل",
            note: "فشل كامل في التحليل",
          },
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
