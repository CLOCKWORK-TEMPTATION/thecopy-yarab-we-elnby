/**
 * @fileoverview RelationshipInferenceEngine and ConflictInferenceEngine for Station 3.
 * Extracted from station3-network-builder.ts to keep each file ≤ 500 lines.
 */

import { toText, safeSub } from "../utils/text-utils";
import { GeminiService, GeminiModel } from "./gemini-service";
import type { Station2Output } from "./station2-conceptual-analysis";
import {
  RelationshipType,
  RelationshipNature,
  RelationshipDirection,
  ConflictSubject,
  ConflictScope,
  ConflictPhase,
} from "./station3-types";
import type {
  Character,
  Conflict,
  Relationship,
  Station3Context,
} from "./station3-types";

// ---------------------------------------------------------------------------
// Generic keyword-mapping helpers
// ---------------------------------------------------------------------------

interface KeywordMapping<T> {
  keywords: string[];
  value: T;
}

export function inferFromKeywords<T>(
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

// ---------------------------------------------------------------------------
// Declarative keyword mappings
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// RelationshipInferenceEngine
// ---------------------------------------------------------------------------

export class RelationshipInferenceEngine {
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
          relationships.push({
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
          });
        }
      }
    }

    return relationships;
  }

  private createDefaultRelationships(characters: Character[]): Relationship[] {
    const relationships: Relationship[] = [];

    for (let i = 0; i < Math.min(characters.length, 3); i++) {
      for (let j = i + 1; j < Math.min(characters.length, 3); j++) {
        relationships.push({
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
        });
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
    const triggerPatterns = [
      /عندما\s+(.+?)(?=\n|،|و)/gi,
      /إذا\s+(.+?)(?=\n|،|و)/gi,
      /بسبب\s+(.+?)(?=\n|،|و)/gi,
    ];

    for (const pattern of triggerPatterns) {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        if (match[1]) triggers.push(match[1].trim());
      }
    }

    return triggers;
  }
}

// ---------------------------------------------------------------------------
// ConflictInferenceEngine
// ---------------------------------------------------------------------------

export class ConflictInferenceEngine {
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

    const conflictPatterns = [
      /صراع\s+(.+?)\s+بين\s+(.+?)\s+و\s+(.+?)(?=\n|$)/gi,
      /(.+?)\s+يواجه\s+(.+?)(?=\n|$)/gi,
      /الصراع\s+الرئيسي\s+هو\s+(.+?)(?=\n|$)/gi,
    ];

    for (const pattern of conflictPatterns) {
      let match;
      while (true) {
        match = pattern.exec(text);
        if (match === null) break;

        let conflictName: string;
        let involvedChars: string[];
        let conflictDesc: string;

        if (match.length === 4) {
          conflictName = match[1]?.trim() ?? "صراع غير مسمى";
          involvedChars = [match[2]?.trim() ?? "", match[3]?.trim() ?? ""];
          conflictDesc = `صراع ${conflictName} بين ${involvedChars.join(" و ")}`;
        } else if (match.length === 3) {
          conflictName = `صراع ${match[1]?.trim()}`;
          involvedChars = [match[1]?.trim() ?? ""];
          conflictDesc = match[2]?.trim() ?? "";
        } else {
          conflictName = "الصراع الرئيسي";
          conflictDesc = match[1]?.trim() ?? "";
          involvedChars = this.extractCharactersFromDescription(
            conflictDesc,
            characters
          );
        }

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

    if (characters.length >= 2) {
      conflicts.push({
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
      });
    }

    for (let i = 2; i < Math.min(characters.length, 4); i++) {
      conflicts.push({
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
      });
    }

    return conflicts;
  }

  private extractCharactersFromDescription(
    description: string,
    characters: Character[]
  ): string[] {
    const mentionedChars = characters
      .filter((c) => description.includes(c.name))
      .map((c) => c.name);

    return mentionedChars.length > 0
      ? mentionedChars
      : [characters[0]?.name].filter((name): name is string => !!name);
  }
}
