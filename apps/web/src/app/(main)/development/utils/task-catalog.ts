/**
 * @fileoverview كتالوج مهام التطوير الإبداعي الكامل (27 مهمة)
 *
 * يحتوي على تعريفات جميع مهام التطوير الإبداعي مع أوضاع تنفيذها
 * وأهدافها في الباك إند، موزعة على 5 فئات: أساسية، تحليل، إبداع،
 * تنبؤية، ومتقدمة
 *
 * @module development/utils/task-catalog
 */

import type { DevelopmentTaskDefinition, WorkflowTaskTarget } from "../types";

// ============================================
// تعريفات سير العمل المخصصة (workflow-custom)
// ============================================

/**
 * سير عمل الوكيل المتكامل
 * يجمع بين التحليل والإبداع في خطوات متسلسلة مع تبعيات
 */
const integratedWorkflow: WorkflowTaskTarget = {
  type: "custom-workflow",
  name: "Integrated Analysis & Creative",
  description:
    "Composite workflow combining analysis and creative contributions",
  steps: [
    { id: "analysis", agentId: "analysis", taskType: "analysis" },
    { id: "creative", agentId: "creative", taskType: "creative" },
    {
      id: "integrated",
      agentId: "integrated",
      taskType: "integrated",
      dependencies: [
        { agentId: "analysis", taskType: "analysis", required: true },
        { agentId: "creative", taskType: "creative", required: true },
      ],
    },
  ],
};

/**
 * سير عمل مولد التوصيات
 * يجمع بين ثلاثة محللات لتوليد توصيات شاملة
 */
const recommendationsWorkflow: WorkflowTaskTarget = {
  type: "custom-workflow",
  name: "Recommendations Generator",
  description:
    "Composite workflow for generating comprehensive recommendations",
  steps: [
    {
      id: "target-audience",
      agentId: "target-audience-analyzer",
      taskType: "target-audience-analyzer",
    },
    {
      id: "literary-quality",
      agentId: "literary-quality-analyzer",
      taskType: "literary-quality-analyzer",
      parallel: true,
    },
    {
      id: "producibility",
      agentId: "producibility-analyzer",
      taskType: "producibility-analyzer",
      parallel: true,
    },
    {
      id: "recommendations",
      agentId: "recommendations-generator",
      taskType: "recommendations-generator",
      dependencies: [
        {
          agentId: "target-audience-analyzer",
          taskType: "target-audience-analyzer",
          required: true,
        },
        {
          agentId: "literary-quality-analyzer",
          taskType: "literary-quality-analyzer",
          required: true,
        },
        {
          agentId: "producibility-analyzer",
          taskType: "producibility-analyzer",
          required: true,
        },
      ],
    },
  ],
};

// ============================================
// كتالوج المهام الكامل (27 مهمة)
// ============================================

/**
 * قائمة جميع مهام التطوير الإبداعي
 * موزعة على 5 فئات: core, analysis, creative, predictive, advanced
 */
export const DEVELOPMENT_TASKS: DevelopmentTaskDefinition[] = [
  // ----------------------------------------
  // الفئة الأساسية — Core (4 مهام)
  // ----------------------------------------
  {
    id: "completion",
    nameAr: "إكمال النص",
    category: "core",
    icon: "PenLine",
    description: "إكمال نص ناقص بأسلوب متسق",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "completion",
  },
  {
    id: "creative",
    nameAr: "إبداع محاكي",
    category: "core",
    icon: "Sparkles",
    description: "توليد محتوى إبداعي جديد",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "creative",
  },
  {
    id: "analysis",
    nameAr: "محلل السيناريو",
    category: "core",
    icon: "Search",
    description: "تحليل شامل للسيناريو",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "analysis",
  },
  {
    id: "integrated",
    nameAr: "الوكيل المتكامل",
    category: "core",
    icon: "Layers",
    description: "تحليل وإبداع متكاملان",
    executionMode: "workflow-custom",
    backendTarget: integratedWorkflow,
    finalStepId: "integrated",
  },

  // ----------------------------------------
  // فئة التحليل — Analysis (6 مهام)
  // ----------------------------------------
  {
    id: "rhythm-mapping",
    nameAr: "خريطة الإيقاع",
    category: "analysis",
    icon: "Activity",
    description: "تحليل إيقاع القصة",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "rhythm-mapping",
  },
  {
    id: "character-network",
    nameAr: "شبكة الشخصيات",
    category: "analysis",
    icon: "Users",
    description: "تحليل علاقات الشخصيات",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "character-network",
  },
  {
    id: "dialogue-forensics",
    nameAr: "تشريح الحوار",
    category: "analysis",
    icon: "MessageSquare",
    description: "تحليل عميق للحوارات",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "dialogue-forensics",
  },
  {
    id: "thematic-mining",
    nameAr: "استخراج الثيمات",
    category: "analysis",
    icon: "Gem",
    description: "اكتشاف الموضوعات الرئيسية",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "thematic-mining",
  },
  {
    id: "style-fingerprint",
    nameAr: "بصمة الأسلوب",
    category: "analysis",
    icon: "Fingerprint",
    description: "تحليل الأسلوب الكتابي",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "style-fingerprint",
  },
  {
    id: "conflict-dynamics",
    nameAr: "ديناميكيات الصراع",
    category: "analysis",
    icon: "Swords",
    description: "تحليل الصراعات الدرامية",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "conflict-dynamics",
  },

  // ----------------------------------------
  // فئة الإبداع — Creative (4 مهام)
  // ----------------------------------------
  {
    id: "adaptive-rewriting",
    nameAr: "إعادة الكتابة التكيفية",
    category: "creative",
    icon: "RefreshCw",
    description: "تعديل النص حسب السياق",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "adaptive-rewriting",
  },
  {
    id: "scene-generator",
    nameAr: "مولد المشاهد",
    category: "creative",
    icon: "Film",
    description: "توليد مشاهد جديدة",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "scene-generator",
  },
  {
    id: "character-voice",
    nameAr: "صوت الشخصية",
    category: "creative",
    icon: "Mic",
    description: "محاكاة صوت شخصية معينة",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "character-voice",
  },
  {
    id: "world-builder",
    nameAr: "بناء العالم",
    category: "creative",
    icon: "Globe",
    description: "توسيع عالم القصة",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "world-builder",
  },

  // ----------------------------------------
  // الفئة التنبؤية — Predictive (4 مهام)
  // ----------------------------------------
  {
    id: "plot-predictor",
    nameAr: "متنبئ الحبكة",
    category: "predictive",
    icon: "TrendingUp",
    description: "التنبؤ بأحداث القصة",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "plot-predictor",
  },
  {
    id: "tension-optimizer",
    nameAr: "محسّن التوتر",
    category: "predictive",
    icon: "Gauge",
    description: "تحسين التوتر الدرامي",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "tension-optimizer",
  },
  {
    id: "audience-resonance",
    nameAr: "صدى الجمهور",
    category: "predictive",
    icon: "Heart",
    description: "قياس تأثير النص على الجمهور",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "audience-resonance",
  },
  {
    id: "platform-adapter",
    nameAr: "محول المنصات",
    category: "predictive",
    icon: "Monitor",
    description: "تكييف النص لمنصات مختلفة",
    executionMode: "brainstorm",
    backendTarget: "/api/brainstorm",
    finalStepId: "platform-adapter",
  },

  // ----------------------------------------
  // الفئة المتقدمة — Advanced (9 مهام)
  // ----------------------------------------
  {
    id: "character-deep-analyzer",
    nameAr: "محلل الشخصيات المعمق",
    category: "advanced",
    icon: "UserCheck",
    description: "تحليل معمق للشخصيات",
    executionMode: "workflow-single",
    backendTarget: "/api/workflow/execute-custom",
    finalStepId: "character-deep-analyzer",
  },
  {
    id: "dialogue-advanced-analyzer",
    nameAr: "محلل الحوار المتقدم",
    category: "advanced",
    icon: "MessagesSquare",
    description: "تحليل متقدم للحوارات",
    executionMode: "workflow-single",
    backendTarget: "/api/workflow/execute-custom",
    finalStepId: "dialogue-advanced-analyzer",
  },
  {
    id: "visual-cinematic-analyzer",
    nameAr: "محلل الصورة السينمائية",
    category: "advanced",
    icon: "Camera",
    description: "تحليل العناصر البصرية والسينمائية",
    executionMode: "workflow-single",
    backendTarget: "/api/workflow/execute-custom",
    finalStepId: "visual-cinematic-analyzer",
  },
  {
    id: "themes-messages-analyzer",
    nameAr: "محلل الثيمات والرسائل",
    category: "advanced",
    icon: "BookOpen",
    description: "تحليل الثيمات والرسائل العميقة",
    executionMode: "workflow-single",
    backendTarget: "/api/workflow/execute-custom",
    finalStepId: "themes-messages-analyzer",
  },
  {
    id: "cultural-historical-analyzer",
    nameAr: "المحلل الثقافي التاريخي",
    category: "advanced",
    icon: "Landmark",
    description: "تحليل السياق الثقافي والتاريخي",
    executionMode: "workflow-single",
    backendTarget: "/api/workflow/execute-custom",
    finalStepId: "cultural-historical-analyzer",
  },
  {
    id: "producibility-analyzer",
    nameAr: "محلل القابلية للإنتاج",
    category: "advanced",
    icon: "Factory",
    description: "تقييم القابلية للإنتاج الفعلي",
    executionMode: "workflow-single",
    backendTarget: "/api/workflow/execute-custom",
    finalStepId: "producibility-analyzer",
  },
  {
    id: "target-audience-analyzer",
    nameAr: "محلل الجمهور المستهدف",
    category: "advanced",
    icon: "Target",
    description: "تحليل الجمهور المستهدف",
    executionMode: "workflow-single",
    backendTarget: "/api/workflow/execute-custom",
    finalStepId: "target-audience-analyzer",
  },
  {
    id: "literary-quality-analyzer",
    nameAr: "محلل الجودة الأدبية",
    category: "advanced",
    icon: "Award",
    description: "تقييم الجودة الأدبية الشاملة",
    executionMode: "workflow-single",
    backendTarget: "/api/workflow/execute-custom",
    finalStepId: "literary-quality-analyzer",
  },
  {
    id: "recommendations-generator",
    nameAr: "مولد التوصيات",
    category: "advanced",
    icon: "ListChecks",
    description: "توليد توصيات شاملة للتحسين",
    executionMode: "workflow-custom",
    backendTarget: recommendationsWorkflow,
    finalStepId: "recommendations-generator",
  },
];

// ============================================
// دوال الوصول
// ============================================

/**
 * استرجاع مهمة بمعرفها
 *
 * @param id - معرف المهمة
 * @returns تعريف المهمة أو undefined إن لم توجد
 */
export function getTaskById(id: string): DevelopmentTaskDefinition | undefined {
  return DEVELOPMENT_TASKS.find((t) => t.id === id);
}

/**
 * استرجاع مهام فئة معينة
 *
 * @param category - فئة المهام المطلوبة
 * @returns قائمة المهام في الفئة المحددة
 */
export function getTasksByCategory(
  category: DevelopmentTaskDefinition["category"]
): DevelopmentTaskDefinition[] {
  return DEVELOPMENT_TASKS.filter((t) => t.category === category);
}
