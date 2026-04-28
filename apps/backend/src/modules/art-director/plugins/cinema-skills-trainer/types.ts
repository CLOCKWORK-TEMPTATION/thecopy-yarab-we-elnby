 
// CineArchitect AI - Cinema Skills Trainer Types
// أنواع المدرب الافتراضي للمهارات السينمائية

export type TrainingCategory =
  | "camera-operation"
  | "lighting-setup"
  | "sound-recording"
  | "directing"
  | "set-design"
  | "color-grading"
  | "visual-effects"
  | "production-management";

export const TRAINING_CATEGORIES: readonly TrainingCategory[] = [
  "camera-operation",
  "lighting-setup",
  "sound-recording",
  "directing",
  "set-design",
  "color-grading",
  "visual-effects",
  "production-management",
] as const;

export interface TrainingScenario {
  id: string;
  name: string;
  nameAr: string;
  category: TrainingCategory;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  duration: number;
  objectives: string[];
  equipment: string[];
  vrRequired: boolean;
  aiAssisted: boolean;
}

export interface VREquipment {
  id: string;
  name: string;
  nameAr: string;
  type: string;
  model3D: string;
  interactions: string[];
  tutorials: TutorialStep[];
}

export interface TutorialStep {
  step: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  action: string;
  validationCriteria: string;
}

export interface TraineeProgress {
  traineeId: string;
  name: string;
  completedScenarios: CompletedScenario[];
  skillLevels: Record<TrainingCategory, number>;
  totalTrainingHours: number;
  achievements: Achievement[];
  currentStreak: number;
}

export interface CompletedScenario {
  scenarioId: string;
  completedAt: Date;
  score: number;
  timeSpent: number;
  feedback: string[];
}

export interface Achievement {
  id: string;
  name: string;
  nameAr: string;
  earnedAt: Date;
  category: string;
}

export interface PerformanceEvaluation {
  overallScore: number;
  categoryScores: Record<string, number>;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  nextScenarios: string[];
}
