import { TaskType } from "../../enums";

import type { BrainstormAgentDefinition } from "./types";

/**
 * وكلاء الإبداع (Creative)
 */
export const CREATIVE_AGENTS: readonly BrainstormAgentDefinition[] =
  Object.freeze([
    {
      id: TaskType.ADAPTIVE_REWRITING,
      name: "ContextTransformer AI",
      nameAr: "محوّل السياق",
      role: "إعادة الكتابة التكيفية",
      description:
        "وكيل التحويل السياقي التكيفي: نظام إعادة صياغة متقدم يعتمد على بنية Transformer",
      category: "creative",
      icon: "pen-tool",
      taskType: TaskType.ADAPTIVE_REWRITING,
      capabilities: {
        canAnalyze: false,
        canGenerate: true,
        canPredict: false,
        hasMemory: true,
        usesSelfReflection: true,
        supportsRAG: true,
      },
      collaboratesWith: [
        TaskType.PLATFORM_ADAPTER,
        TaskType.TARGET_AUDIENCE_ANALYZER,
        TaskType.STYLE_FINGERPRINT,
      ],
      enhances: [TaskType.PLATFORM_ADAPTER],
      complexityScore: 0.82,
      phaseRelevance: [4, 5],
    },
    {
      id: TaskType.SCENE_GENERATOR,
      name: "SceneArchitect AI",
      nameAr: "معمار المشاهد",
      role: "توليد المشاهد الدرامية",
      description:
        "وكيل معمار المشاهد الذكي: مولد مشاهد متطور يستخدم تقنيات التخطيط الهرمي",
      category: "creative",
      icon: "file-text",
      taskType: TaskType.SCENE_GENERATOR,
      capabilities: {
        canAnalyze: false,
        canGenerate: true,
        canPredict: false,
        hasMemory: true,
        usesSelfReflection: true,
        supportsRAG: true,
      },
      collaboratesWith: [TaskType.CHARACTER_VOICE],
      enhances: [],
      complexityScore: 0.8,
      phaseRelevance: [2, 4],
    },
    {
      id: TaskType.CHARACTER_VOICE,
      name: "PersonaSynth AI",
      nameAr: "مركّب الشخصيات",
      role: "تركيب صوت الشخصية",
      description:
        "وكيل تركيب الشخصيات الصوتية: محرك متطور لمحاكاة الأصوات الشخصية",
      category: "creative",
      icon: "users",
      taskType: TaskType.CHARACTER_VOICE,
      capabilities: {
        canAnalyze: false,
        canGenerate: true,
        canPredict: false,
        hasMemory: true,
        usesSelfReflection: true,
        supportsRAG: true,
      },
      collaboratesWith: [TaskType.DIALOGUE_FORENSICS, TaskType.SCENE_GENERATOR],
      enhances: [TaskType.SCENE_GENERATOR],
      complexityScore: 0.85,
      phaseRelevance: [2, 4],
    },
    {
      id: TaskType.WORLD_BUILDER,
      name: "CosmosForge AI",
      nameAr: "حدّاد الأكوان",
      role: "بناء العوالم الدرامية",
      description:
        "وكيل حدادة الأكوان الدرامية: بانٍ عوالم متطور يستخدم تقنيات الذكاء الاصطناعي التوليدي",
      category: "creative",
      icon: "globe",
      taskType: TaskType.WORLD_BUILDER,
      capabilities: {
        canAnalyze: false,
        canGenerate: true,
        canPredict: false,
        hasMemory: true,
        usesSelfReflection: true,
        supportsRAG: true,
      },
      collaboratesWith: [TaskType.CULTURAL_HISTORICAL_ANALYZER],
      enhances: [],
      complexityScore: 0.9,
      phaseRelevance: [2],
    },
  ]);
