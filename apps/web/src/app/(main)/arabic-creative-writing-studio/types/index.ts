// types/index.ts
// Type definitions for Arabic Creative Writing Studio

export type Language = "ar" | "en";
export type Theme = "dark" | "light" | "auto";
export type TextDirection = "rtl" | "ltr";

// Creative prompt genres
export type CreativeGenre =
  | "fantasy"
  | "science_fiction"
  | "mystery"
  | "romance"
  | "historical_fiction"
  | "literary_fiction"
  | "poetry"
  | "cross_genre";

// Writing techniques
export type WritingTechnique =
  | "character_driven"
  | "world_building"
  | "plot_driven"
  | "dialogue_driven"
  | "sensory_driven"
  | "atmospheric"
  | "experimental";

// Difficulty levels
export type DifficultyLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "academic";

// Creative prompt interface
export interface CreativePrompt {
  id: string;
  title: string;
  description: string;
  genre: CreativeGenre;
  technique: WritingTechnique;
  difficulty: DifficultyLevel;
  wordCount?: number;
  timeEstimate?: string;
  tags: string[];
  arabic: string;
  english?: string;
  examples?: string[];
  tips?: string[];
  relatedPrompts?: string[];
}

// Creative project interface
export interface CreativeProject {
  id: string;
  title: string;
  content: string;
  promptId?: string;
  genre: CreativeGenre;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isCompleted: boolean;
  qualityScore?: number;
}

// Text analysis interface
export interface TextAnalysis {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  sentenceCount: number;
  averageWordsPerSentence: number;
  averageSentencesPerParagraph: number;
  readabilityScore: number;
  vocabularyDiversity: number;
  sentenceVariety: number;
  emotionalTone: "positive" | "neutral" | "negative";
  qualityMetrics: {
    clarity: number;
    creativity: number;
    coherence: number;
    impact: number;
  };
  suggestions: string[];
}

// App settings interface
export interface AppSettings {
  language: Language;
  theme: Theme;
  textDirection: TextDirection;
  fontSize: "small" | "medium" | "large";
  autoSave: boolean;
  autoSaveInterval: number;
  geminiApiKey?: string;
  geminiModel: string;
  geminiTemperature: number;
  geminiMaxTokens: number;
}

// Gemini API settings
export interface GeminiSettings {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
}

// API response interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Enhanced prompt data
export interface EnhancedPromptData {
  originalPrompt: string;
  enhancedPrompt: string;
  improvements: string[];
  estimatedTokens: number;
  estimatedCost: number;
}

// Weekly challenge
export interface WeeklyChallenge {
  id: string;
  week: number;
  title: string;
  description: string;
  requirements: string[];
  deadline: Date;
  reward: string;
  participants?: number;
}

// Daily prompt
export interface DailyPrompt {
  id: string;
  date: string;
  prompt: CreativePrompt;
  specialEvent?: string;
}

// User statistics
export interface UserStatistics {
  totalProjects: number;
  totalWords: number;
  averageQuality: number;
  favoriteGenre: CreativeGenre;
  writingStreak: number;
  completedChallenges: number;
  timeSpentWriting: number;
  improvementScore: number;
}

// Export settings
export interface ExportSettings {
  format: "txt" | "json" | "html" | "rtf" | "pdf";
  includeMetadata: boolean;
  includeAnalysis: boolean;
  fontSize?: number;
  fontFamily?: string;
}

// App events
export type AppEvent =
  | "prompt_generated"
  | "text_analyzed"
  | "project_saved"
  | "project_exported"
  | "settings_updated"
  | "api_connected"
  | "challenge_completed";

// App event data
export interface AppEventData {
  type: AppEvent;
  timestamp: Date;
  data: any;
  userId?: string;
}
