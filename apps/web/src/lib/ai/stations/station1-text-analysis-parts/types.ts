import type { StationInput } from "../base-station";

export interface Station1Input extends StationInput {
  proseFilePath?: string;
  station1Options?: {
    enableDialogueAnalysis?: boolean;
    enableVoiceDistinction?: boolean;
    minCharacters?: number;
    maxCharacters?: number;
  };
}

export interface CharacterProfile {
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "minor";
  personalityTraits: string[];
  motivations: string[];
  goals: string[];
  obstacles: string[];
  arc: {
    type: "positive" | "negative" | "flat" | "complex";
    description: string;
    keyMoments: string[];
  };
  confidence: number;
}

export interface DialogueMetrics {
  efficiency: number;
  distinctiveness: number;
  naturalness: number;
  subtext: number;
  issues: {
    type:
      | "redundancy"
      | "inconsistency"
      | "exposition_dump"
      | "on_the_nose"
      | "pacing";
    location: string;
    severity: "low" | "medium" | "high";
    suggestion: string;
  }[];
}

export interface VoiceProfile {
  character: string;
  distinctiveness: number;
  characteristics: string[];
  sampleLines: string[];
}

export interface VoiceAnalysis {
  profiles: Map<string, VoiceProfile>;
  overlapIssues: {
    character1: string;
    character2: string;
    similarity: number;
    examples: string[];
    recommendation: string;
  }[];
  overallDistinctiveness: number;
}

export interface NarrativeStyleAnalysis {
  overallTone: string;
  toneElements: string[];
  pacingAnalysis: {
    overall: "very_slow" | "slow" | "moderate" | "fast" | "very_fast";
    variation: number;
    strengths: string[];
    weaknesses: string[];
  };
  languageStyle: {
    complexity: "simple" | "moderate" | "complex" | "highly_complex";
    vocabulary: "limited" | "standard" | "rich" | "extensive";
    sentenceStructure: string;
    literaryDevices: string[];
  };
  pointOfView: string;
  timeStructure: string;
}

export interface Station1Output {
  logline: string;
  majorCharacters: CharacterProfile[];
  characterAnalysis: Map<string, CharacterProfile>;
  dialogueAnalysis: DialogueMetrics;
  voiceAnalysis: VoiceAnalysis;
  narrativeStyleAnalysis: NarrativeStyleAnalysis;
  textStatistics: {
    totalWords: number;
    totalCharacters: number;
    avgSentenceLength: number;
    dialoguePercentage: number;
    narrativePercentage: number;
  };
  uncertaintyReport: {
    confidence: number;
    uncertainties: {
      type: "epistemic" | "aleatoric";
      aspect: string;
      note: string;
      reducible: boolean;
    }[];
  };
  metadata: {
    analysisTimestamp: Date;
    status: "Success" | "Partial" | "Failed";
    agentsUsed: string[];
    executionTime: number;
    textLength: number;
    chunksProcessed: number;
  };
}

// أنواع استجابة Gemini الخام (داخلية للمحلّلات)
export interface CharactersResponse {
  characters: {
    name: string;
    role: string;
    prominence: number;
  }[];
}

export interface CharacterAnalysisResponse {
  personality_traits: string[];
  motivations: string[];
  goals: string[];
  obstacles: string[];
  arc_type: string;
  arc_description: string;
  key_moments: string[];
  confidence: number;
}

export interface DialogueAnalysisResponse {
  efficiency: number;
  distinctiveness: number;
  naturalness: number;
  subtext: number;
  issues: {
    type: string;
    location: string;
    severity: string;
    suggestion: string;
  }[];
}

export interface VoiceAnalysisResponse {
  profiles: {
    character: string;
    distinctiveness: number;
    characteristics: string[];
    sample_lines: string[];
  }[];
  overlaps: {
    character1: string;
    character2: string;
    similarity: number;
    examples: string[];
    recommendation: string;
  }[];
  overall_distinctiveness: number;
}

export interface NarrativeStyleResponse {
  overall_tone: string;
  tone_elements: string[];
  pacing: {
    overall: string;
    variation: number;
    strengths: string[];
    weaknesses: string[];
  };
  language_style: {
    complexity: string;
    vocabulary: string;
    sentence_structure: string;
    literary_devices: string[];
  };
  point_of_view: string;
  time_structure: string;
}

export interface CharacterRef {
  name: string;
  role: string;
  prominence: number;
}
