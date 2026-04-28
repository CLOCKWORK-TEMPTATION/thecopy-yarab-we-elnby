import type {
  AppSettings,
  CreativeProject,
  CreativePrompt,
  TextAnalysis,
} from "@/app/(main)/arabic-creative-writing-studio/types";
import type { FeaturedWeeklyChallenge } from "@/app/(main)/arabic-creative-writing-studio/lib/featured-content";
import type {
  ExportFormat,
  ExportResult,
} from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";

export interface WritingEditorProps {
  project: CreativeProject | null;
  selectedPrompt: CreativePrompt | null;
  onProjectChange: (project: CreativeProject) => void;
  onSave: (project: CreativeProject) => void;
  onAnalyze: (text: string) => Promise<TextAnalysis | null>;
  onExport: (
    project: CreativeProject,
    format: ExportFormat
  ) => ExportResult | Promise<ExportResult>;
  onOpenSettings: () => void;
  analysisAvailable: boolean;
  analysisBlockedReason?: string;
  activeChallenge?: FeaturedWeeklyChallenge | null;
  settings: AppSettings;
  loading: boolean;
}

export interface CalculatedTextStats {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  sentenceCount: number;
  averageWordsPerSentence: number;
}

export interface OperationFeedEntry {
  id: string;
  tone: "info" | "success" | "error" | "blocked";
  label: string;
  message: string;
  timestamp: number;
}
