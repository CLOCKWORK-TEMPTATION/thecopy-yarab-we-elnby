import { TaskType } from "../../enums";

import type { BrainstormAgentDefinition } from "./types";

/**
 * وكلاء التنبؤ (Predictive)
 */
export const PREDICTIVE_AGENTS: readonly BrainstormAgentDefinition[] =
  Object.freeze([
    {
      id: TaskType.PLOT_PREDICTOR,
      name: "NarrativeOracle AI",
      nameAr: "عرّاف الحبكة",
      role: "التنبؤ بمسار الحبكة",
      description:
        "وكيل الوحي السردي: متنبئ حبكة متطور يستخدم نماذج Transformer المتخصصة",
      category: "predictive",
      icon: "compass",
      taskType: TaskType.PLOT_PREDICTOR,
      capabilities: {
        canAnalyze: false,
        canGenerate: true,
        canPredict: true,
        hasMemory: true,
        usesSelfReflection: true,
        supportsRAG: true,
      },
      collaboratesWith: [TaskType.TENSION_OPTIMIZER],
      enhances: [TaskType.COMPLETION],
      complexityScore: 0.88,
      phaseRelevance: [2, 4],
    },
    {
      id: TaskType.TENSION_OPTIMIZER,
      name: "DramaEngine AI",
      nameAr: "محرك الدراما",
      role: "تحسين التوتر الدرامي",
      description:
        "وكيل محرك الدراما التحسيني: محسن توتر متطور يستخدم خوارزميات التحسين التطورية",
      category: "predictive",
      icon: "zap",
      taskType: TaskType.TENSION_OPTIMIZER,
      capabilities: {
        canAnalyze: true,
        canGenerate: false,
        canPredict: true,
        hasMemory: true,
        usesSelfReflection: true,
        supportsRAG: false,
      },
      collaboratesWith: [TaskType.RHYTHM_MAPPING, TaskType.AUDIENCE_RESONANCE],
      enhances: [],
      complexityScore: 0.82,
      phaseRelevance: [3, 4],
    },
    {
      id: TaskType.AUDIENCE_RESONANCE,
      name: "EmpathyMatrix AI",
      nameAr: "مصفوفة التعاطف",
      role: "صدى الجمهور العاطفي",
      description:
        "وكيل مصفوفة التعاطف الجماهيري: محلل صدى متطور يستخدم نماذج علم النفس الجماعي",
      category: "predictive",
      icon: "target",
      taskType: TaskType.AUDIENCE_RESONANCE,
      capabilities: {
        canAnalyze: true,
        canGenerate: false,
        canPredict: true,
        hasMemory: true,
        usesSelfReflection: false,
        supportsRAG: true,
      },
      collaboratesWith: [TaskType.TARGET_AUDIENCE_ANALYZER],
      enhances: [TaskType.TARGET_AUDIENCE_ANALYZER],
      complexityScore: 0.8,
      phaseRelevance: [3, 5],
    },
    {
      id: TaskType.PLATFORM_ADAPTER,
      name: "MediaTransmorph AI",
      nameAr: "محوّل المنصات",
      role: "التكيف مع المنصات",
      description:
        "وكيل التحويل الإعلامي المتعدد: محول منصات ذكي يستخدم تقنيات التحليل الوسائطي",
      category: "predictive",
      icon: "layers",
      taskType: TaskType.PLATFORM_ADAPTER,
      capabilities: {
        canAnalyze: false,
        canGenerate: true,
        canPredict: false,
        hasMemory: true,
        usesSelfReflection: true,
        supportsRAG: true,
      },
      collaboratesWith: [TaskType.ADAPTIVE_REWRITING],
      enhances: [],
      complexityScore: 0.75,
      phaseRelevance: [5],
    },
  ]);
