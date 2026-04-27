import type { StationInput } from "../base-station";
import type { Station1Output } from "../station1-text-analysis";

export interface Station2Context {
  majorCharacters: { name: string; role: string }[];
  relationshipSummary: string;
  narrativeTone: string;
  fullText: string;
  logline: string;
  conflictSummary: string;
  dialogueQuality: number;
}

export interface Station2Input extends StationInput {
  station1Output: Station1Output;
}

export interface ThreeDMapResult {
  horizontalEventsAxis: {
    event: string;
    sceneRef: string;
    timestamp: string;
    narrativeWeight: number;
  }[];
  verticalMeaningAxis: {
    eventRef: string;
    symbolicLayer: string;
    thematicConnection: string;
    depth: number;
  }[];
  temporalDevelopmentAxis: {
    pastInfluence: string;
    presentChoices: string;
    futureExpectations: string;
    heroArcConnection: string;
    causality: string;
  };
}

export type GenreMatrixResult = Record<
  string,
  {
    conflictContribution: string;
    pacingContribution: string;
    visualCompositionContribution: string;
    soundMusicContribution: string;
    charactersContribution: string;
    weight: number;
  }
>;

export type DynamicToneResult = Record<
  string,
  {
    visualAtmosphereDescribed: string;
    writtenPacing: string;
    dialogueStructure: string;
    soundIndicationsDescribed: string;
    emotionalIntensity: number;
  }
>;

export interface ArtisticReferencesResult {
  visualReferences: {
    work: string;
    artist?: string;
    reason: string;
    sceneApplication: string;
  }[];
  musicalMood: string;
  cinematicInfluences: {
    film: string;
    director?: string;
    aspect: string;
  }[];
  literaryParallels: {
    work: string;
    author?: string;
    connection: string;
  }[];
}

export interface ThemeAnalysis {
  primaryThemes: {
    theme: string;
    evidence: string[];
    strength: number;
    development: string;
  }[];
  secondaryThemes: {
    theme: string;
    occurrences: number;
  }[];
  thematicConsistency: number;
}

export interface Station2Output {
  storyStatement: string;
  alternativeStatements: string[];
  threeDMap: ThreeDMapResult;
  elevatorPitch: string;
  hybridGenre: string;
  genreAlternatives: string[];
  genreContributionMatrix: GenreMatrixResult;
  dynamicTone: DynamicToneResult;
  artisticReferences: ArtisticReferencesResult;
  themeAnalysis: ThemeAnalysis;
  targetAudience: {
    primaryAudience: string;
    demographics: string[];
    psychographics: string[];
  };
  marketAnalysis: {
    producibility: number;
    commercialPotential: number;
    uniqueness: number;
  };
  metadata: {
    analysisTimestamp: Date;
    status: "Success" | "Partial" | "Failed";
    processingTime: number;
    confidenceScore: number;
  };
}
