import type { ElementType } from "./classification-types";

export interface DialogueBlock {
  character: string;
  startLine: number;
  endLine: number;
  lineCount: number;
}

export interface LineRelation {
  previousLine: string;
  currentLine: string;
  relationType: "follows" | "precedes" | "interrupts";
}

export interface ClassificationRecord {
  line: string;
  classification: ElementType;
}

export interface ContextMemory {
  sessionId: string;
  lastModified?: number;
  data: {
    commonCharacters: string[];
    commonLocations: string[];
    lastClassifications: ElementType[];
    characterDialogueMap: Record<string, number>;
  };
}

export interface Correction {
  line: string;
  originalClassification: string;
  newClassification: string;
  timestamp: number;
}

export interface EnhancedContextMemory extends ContextMemory {
  data: ContextMemory["data"] & {
    dialogueBlocks: DialogueBlock[];
    lineRelationships: LineRelation[];
    userCorrections: Correction[];
    confidenceMap: Record<string, number>;
  };
}

export interface ContextMemorySnapshot {
  readonly recentTypes: readonly ElementType[];
  readonly characterFrequency: ReadonlyMap<string, number>;
  readonly confirmedCharacters: ReadonlySet<string>;
  readonly characterEvidence: ReadonlyMap<string, CharacterEvidence>;
  readonly isInDialogueFlow: boolean;
  readonly lastCharacterName: string | null;
  readonly dialogueDepth: number;
}

export interface CharacterEvidence {
  inlinePairCount: number;
  standaloneHeaderCount: number;
  dialogueFollowerCount: number;
  repeatCount: number;
  actionContaminationCount: number;
}

export interface BlockAnalysis {
  totalLines: number;
  linesEndingWithColon: number;
  actionWithoutStrongSignal: number;
  typeDistribution: Record<string, number>;
  hasConsecutiveSameType: boolean;
  dominantType: ElementType | null;
}
