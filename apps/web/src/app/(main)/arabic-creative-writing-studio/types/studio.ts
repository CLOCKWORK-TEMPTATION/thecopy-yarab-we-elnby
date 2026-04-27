import type { CreativeProject, CreativePrompt, AppSettings } from "../types";

export type StudioView = "home" | "library" | "editor" | "analysis" | "settings";

export interface PersistedCreativeProject extends Omit<
  CreativeProject,
  "createdAt" | "updatedAt"
> {
  createdAt: string;
  updatedAt: string;
}

export interface CreativeWritingStudioSnapshot {
  currentView: StudioView;
  currentProject: PersistedCreativeProject | null;
  selectedPrompt: CreativePrompt | null;
  projects: PersistedCreativeProject[];
  settings: AppSettings;
}

export interface TextStats {
  words: string[];
  paragraphs: string[];
  sentences: string[];
  averageWordsPerSentence: number;
  averageSentencesPerParagraph: number;
  readabilityScore: number;
  vocabularyDiversity: number;
  sentenceVariety: number;
}

export interface NotificationState {
  type: "success" | "error" | "warning" | "info";
  message: string;
}
