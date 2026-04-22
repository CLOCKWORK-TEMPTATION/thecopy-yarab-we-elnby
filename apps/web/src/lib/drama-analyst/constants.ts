/**
 * Constants for drama analysis system
 */

import { TaskType, TaskCategory } from "./enums";

export const MIN_FILES_REQUIRED = 1;

export const TASKS_REQUIRING_COMPLETION_SCOPE = [
  TaskType.CHARACTER_DEVELOPMENT,
  TaskType.PLOT_DEVELOPMENT,
  TaskType.DIALOGUE_ENHANCEMENT,
  TaskType.SCENE_EXPANSION,
];

export const COMPLETION_ENHANCEMENT_OPTIONS = [
  { value: "minimal", label: "تحسينات بسيطة" },
  { value: "moderate", label: "تحسينات متوسطة" },
  { value: "extensive", label: "تحسينات شاملة" },
  { value: "complete-rewrite", label: "إعادة كتابة كاملة" },
];

export const TASK_LABELS: Partial<Record<TaskType, string>> = {
  [TaskType.CHARACTER_ANALYSIS]: "تحليل الشخصيات",
  [TaskType.PLOT_ANALYSIS]: "تحليل الحبكة",
  [TaskType.THEME_ANALYSIS]: "تحليل الموضوعات",
  [TaskType.DIALOGUE_ANALYSIS]: "تحليل الحوار",
  [TaskType.STRUCTURE_ANALYSIS]: "تحليل البنية",
  [TaskType.CHARACTER_DEVELOPMENT]: "تطوير الشخصيات",
  [TaskType.PLOT_DEVELOPMENT]: "تطوير الحبكة",
  [TaskType.DIALOGUE_ENHANCEMENT]: "تحسين الحوار",
  [TaskType.SCENE_EXPANSION]: "توسيع المشاهد",
  [TaskType.CONFLICT_ENHANCEMENT]: "تعزيز الصراع",
  [TaskType.GENERAL]: "عام",
  [TaskType.CUSTOM]: "مخصص",
};

export const TASK_CATEGORY_MAP: Partial<Record<TaskType, TaskCategory>> = {
  [TaskType.CHARACTER_ANALYSIS]: TaskCategory.ANALYSIS,
  [TaskType.PLOT_ANALYSIS]: TaskCategory.ANALYSIS,
  [TaskType.THEME_ANALYSIS]: TaskCategory.ANALYSIS,
  [TaskType.DIALOGUE_ANALYSIS]: TaskCategory.ANALYSIS,
  [TaskType.STRUCTURE_ANALYSIS]: TaskCategory.ANALYSIS,
  [TaskType.CHARACTER_DEVELOPMENT]: TaskCategory.CREATIVE,
  [TaskType.PLOT_DEVELOPMENT]: TaskCategory.CREATIVE,
  [TaskType.DIALOGUE_ENHANCEMENT]: TaskCategory.CREATIVE,
  [TaskType.SCENE_EXPANSION]: TaskCategory.CREATIVE,
  [TaskType.CONFLICT_ENHANCEMENT]: TaskCategory.CREATIVE,
  [TaskType.GENERAL]: TaskCategory.RESEARCH,
  [TaskType.CUSTOM]: TaskCategory.RESEARCH,
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const SUPPORTED_FILE_TYPES = [".txt", ".pdf", ".docx"];
export const MAX_CONTEXT_LENGTH = 100000; // characters
