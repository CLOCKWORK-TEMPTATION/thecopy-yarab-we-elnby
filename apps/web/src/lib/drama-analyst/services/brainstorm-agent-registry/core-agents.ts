import { TaskType } from "../../enums";

import type { BrainstormAgentDefinition } from "./types";

/**
 * الوكلاء الأساسيون (Core)
 */
export const CORE_AGENTS: readonly BrainstormAgentDefinition[] = Object.freeze([
  {
    id: TaskType.ANALYSIS,
    name: "CritiqueArchitect AI",
    nameAr: "مهندس النقد",
    role: "التحليل النقدي المعماري",
    description:
      "وكيل التحليل النقدي المعماري: نظام هجين متعدد الوكلاء يدمج التفكير الجدلي مع التحليل الشعاعي العميق",
    category: "core",
    icon: "brain",
    taskType: TaskType.ANALYSIS,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.INTEGRATED, TaskType.CHARACTER_DEEP_ANALYZER],
    enhances: [TaskType.RECOMMENDATIONS_GENERATOR],
    complexityScore: 0.95,
    phaseRelevance: [1, 3],
  },
  {
    id: TaskType.CREATIVE,
    name: "MimesisGen AI",
    nameAr: "مولّد المحاكاة",
    role: "المحاكاة التوليدية الإبداعية",
    description:
      "وكيل المحاكاة التوليدية الإبداعية: نظام ذكي متقدم يستخدم تقنيات نقل الأسلوب العصبي",
    category: "core",
    icon: "sparkles",
    taskType: TaskType.CREATIVE,
    capabilities: {
      canAnalyze: false,
      canGenerate: true,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.INTEGRATED, TaskType.STYLE_FINGERPRINT],
    enhances: [TaskType.CHARACTER_VOICE, TaskType.SCENE_GENERATOR],
    complexityScore: 0.88,
    phaseRelevance: [2, 4],
  },
  {
    id: TaskType.INTEGRATED,
    name: "SynthesisOrchestrator AI",
    nameAr: "المنسق التركيبي",
    role: "التنسيق والتكامل",
    description:
      "المنسق التركيبي الذكي: وكيل أوركسترالي متقدم يستخدم تقنيات الذكاء الجمعي",
    category: "core",
    icon: "rocket",
    taskType: TaskType.INTEGRATED,
    capabilities: {
      canAnalyze: true,
      canGenerate: true,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.ANALYSIS, TaskType.CREATIVE],
    enhances: [],
    complexityScore: 0.92,
    phaseRelevance: [4, 5],
  },
  {
    id: TaskType.COMPLETION,
    name: "NarrativeContinuum AI",
    nameAr: "مواصل السرد",
    role: "استكمال السرد",
    description:
      "وكيل استمرارية السرد الذكي: نظام تنبؤي متطور يستخدم نماذج الانتباه متعددة الرؤوس",
    category: "core",
    icon: "layers",
    taskType: TaskType.COMPLETION,
    capabilities: {
      canAnalyze: false,
      canGenerate: true,
      canPredict: true,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.STYLE_FINGERPRINT, TaskType.CHARACTER_VOICE],
    enhances: [],
    complexityScore: 0.85,
    phaseRelevance: [2, 5],
  },
]);
