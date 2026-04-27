import type { TaskType } from "@/services/agents/core/enums";

export type BrainstormPhase = 1 | 2 | 3 | 4 | 5;

export type BrainstormAgentCategory =
  | "core"
  | "analysis"
  | "creative"
  | "predictive"
  | "advanced";

export type BrainstormAgentIcon =
  | "brain"
  | "users"
  | "message-square"
  | "book-open"
  | "target"
  | "shield"
  | "zap"
  | "cpu"
  | "layers"
  | "rocket"
  | "file-text"
  | "sparkles"
  | "trophy"
  | "globe"
  | "film"
  | "chart-bar"
  | "lightbulb"
  | "compass"
  | "fingerprint"
  | "pen-tool"
  | "music"
  | "search";

export interface BrainstormAgentCapabilities {
  canAnalyze: boolean;
  canGenerate: boolean;
  canPredict: boolean;
  hasMemory: boolean;
  usesSelfReflection: boolean;
  supportsRAG: boolean;
}

export interface BrainstormAgentCatalogItem {
  id: TaskType;
  name: string;
  nameAr: string;
  role: string;
  description: string;
  category: BrainstormAgentCategory;
  icon: BrainstormAgentIcon;
  capabilities: BrainstormAgentCapabilities;
  collaboratesWith: TaskType[];
  enhances: TaskType[];
  complexityScore: number;
  phaseRelevance: BrainstormPhase[];
}

export interface BrainstormPhaseCatalogItem {
  id: BrainstormPhase;
  name: string;
  nameEn: string;
  description: string;
  primaryAction: "analyze" | "generate" | "debate" | "decide";
}

export interface BrainstormCatalogStats {
  total: number;
  byCategory: Record<BrainstormAgentCategory, number>;
  withRAG: number;
  withSelfReflection: number;
  withMemory: number;
  averageComplexity: number;
}

export const BRAINSTORM_PHASES: readonly BrainstormPhaseCatalogItem[] =
  Object.freeze([
    {
      id: 1,
      name: "الملخص الإبداعي",
      nameEn: "Creative Brief",
      description: "تحديد الفكرة الأولية ووضع الأسس",
      primaryAction: "analyze",
    },
    {
      id: 2,
      name: "توليد الأفكار",
      nameEn: "Idea Generation",
      description: "إنشاء فكرتين متنافستين مبتكرتين",
      primaryAction: "generate",
    },
    {
      id: 3,
      name: "المراجعة المستقلة",
      nameEn: "Independent Review",
      description: "تقييم شامل من كل وكيل",
      primaryAction: "analyze",
    },
    {
      id: 4,
      name: "المناقشة التنافسية",
      nameEn: "The Tournament",
      description: "نقاش حي بين الوكلاء",
      primaryAction: "debate",
    },
    {
      id: 5,
      name: "القرار النهائي",
      nameEn: "Final Decision",
      description: "اختيار الفكرة الفائزة وتقديم التوصيات",
      primaryAction: "decide",
    },
  ]);
