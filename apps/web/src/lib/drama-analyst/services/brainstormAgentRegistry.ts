/**
 * Brainstorm Agent Registry
 * سجل وكلاء العصف الذهني
 *
 * يوفر واجهة موحدة للوصول إلى جميع الوكلاء الحقيقيين
 * لاستخدامها في صفحة brainstorm
 */

import { TaskType } from "../enums";

// ============================================
// ===== أنواع الوكيل للعرض في الواجهة =====
// ============================================

/**
 * واجهة تعريف الوكيل للعرض في صفحة brainstorm
 */
export interface BrainstormAgentDefinition {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  description: string;
  category: AgentCategory;
  icon: AgentIcon;
  taskType: TaskType;
  capabilities: BrainstormAgentCapabilities;
  collaboratesWith: TaskType[];
  enhances: TaskType[];
  complexityScore: number;
  phaseRelevance: BrainstormPhase[];
}

/**
 * قدرات الوكيل المبسطة للعرض
 */
export interface BrainstormAgentCapabilities {
  canAnalyze: boolean;
  canGenerate: boolean;
  canPredict: boolean;
  hasMemory: boolean;
  usesSelfReflection: boolean;
  supportsRAG: boolean;
}

/**
 * فئات الوكلاء
 */
export type AgentCategory =
  | "core" // الوكلاء الأساسيين
  | "analysis" // وكلاء التحليل
  | "creative" // وكلاء الإبداع
  | "predictive" // وكلاء التنبؤ
  | "advanced"; // الوحدات المتقدمة

/**
 * أيقونات الوكلاء
 */
export type AgentIcon =
  | "brain" // Brain
  | "users" // Users - شبكة الشخصيات
  | "message-square" // MessageSquare - الحوار
  | "book-open" // BookOpen - الموضوعات
  | "target" // Target - الجمهور
  | "shield" // Shield - التحقق
  | "zap" // Zap - التوتر
  | "cpu" // Cpu - التكامل
  | "layers" // Layers - البناء
  | "rocket" // Rocket - التنسيق
  | "file-text" // FileText - المشاهد
  | "sparkles" // Sparkles - الإبداع
  | "trophy" // Trophy - الجودة
  | "globe" // Globe - الثقافة
  | "film" // Film - السينما
  | "chart-bar" // ChartBar - الإنتاج
  | "lightbulb" // Lightbulb - التوصيات
  | "compass" // Compass - البوصلة
  | "fingerprint" // Fingerprint - البصمة
  | "pen-tool" // PenTool - إعادة الكتابة
  | "music" // Music - الإيقاع
  | "search"; // Search - التنقيب

/**
 * مراحل العصف الذهني
 */
export type BrainstormPhase = 1 | 2 | 3 | 4 | 5;

// ============================================
// ===== تعريفات الوكلاء الحقيقيين =====
// ============================================

/**
 * سجل الوكلاء الحقيقيين مع بياناتهم الكاملة
 */
export const REAL_AGENTS: readonly BrainstormAgentDefinition[] = Object.freeze([
  // ===== الوكلاء الأساسيون (Core) =====
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

  // ===== وكلاء التحليل (Analysis) =====
  {
    id: TaskType.RHYTHM_MAPPING,
    name: "TemporalDynamics AI",
    nameAr: "محلل الإيقاع",
    role: "رسم الإيقاع الزمني",
    description:
      "وكيل ديناميكيات الإيقاع الزمني: محلل متطور يستخدم تقنيات معالجة الإشارات الرقمية",
    category: "analysis",
    icon: "music",
    taskType: TaskType.RHYTHM_MAPPING,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: false,
      usesSelfReflection: false,
      supportsRAG: false,
    },
    collaboratesWith: [TaskType.TENSION_OPTIMIZER],
    enhances: [TaskType.ANALYSIS],
    complexityScore: 0.75,
    phaseRelevance: [3],
  },
  {
    id: TaskType.CHARACTER_NETWORK,
    name: "SocialGraph AI",
    nameAr: "محلل الشبكات",
    role: "شبكات الشخصيات الاجتماعية",
    description:
      "وكيل شبكات الشخصيات الاجتماعية: محلل متقدم يطبق نظرية الرسوم البيانية",
    category: "analysis",
    icon: "users",
    taskType: TaskType.CHARACTER_NETWORK,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: false,
      supportsRAG: false,
    },
    collaboratesWith: [TaskType.CHARACTER_DEEP_ANALYZER],
    enhances: [TaskType.CHARACTER_DEEP_ANALYZER],
    complexityScore: 0.8,
    phaseRelevance: [3],
  },
  {
    id: TaskType.DIALOGUE_FORENSICS,
    name: "Voiceprint AI",
    nameAr: "محلل البصمة الصوتية",
    role: "التحليل الجنائي للحوار",
    description:
      "وكيل البصمة الصوتية للحوار: محلل لغوي متطور يستخدم تقنيات NLP المتقدمة",
    category: "analysis",
    icon: "message-square",
    taskType: TaskType.DIALOGUE_FORENSICS,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [
      TaskType.CHARACTER_VOICE,
      TaskType.DIALOGUE_ADVANCED_ANALYZER,
    ],
    enhances: [TaskType.CHARACTER_VOICE],
    complexityScore: 0.82,
    phaseRelevance: [3],
  },
  {
    id: TaskType.THEMATIC_MINING,
    name: "ConceptMiner AI",
    nameAr: "منقّب المفاهيم",
    role: "التنقيب المفاهيمي العميق",
    description:
      "وكيل التنقيب المفاهيمي العميق: محرك ذكي يستخدم تقنيات التعلم غير المراقب",
    category: "analysis",
    icon: "search",
    taskType: TaskType.THEMATIC_MINING,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.THEMES_MESSAGES_ANALYZER],
    enhances: [TaskType.THEMES_MESSAGES_ANALYZER],
    complexityScore: 0.88,
    phaseRelevance: [3],
  },
  {
    id: TaskType.STYLE_FINGERPRINT,
    name: "AuthorDNA AI",
    nameAr: "محلل البصمة الأدبية",
    role: "البصمة الأدبية للمؤلف",
    description:
      "وكيل الحمض النووي الأدبي: نظام تحليل أسلوبي متطور يستخدم تقنيات Stylometry",
    category: "analysis",
    icon: "fingerprint",
    taskType: TaskType.STYLE_FINGERPRINT,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.CREATIVE, TaskType.CHARACTER_VOICE],
    enhances: [TaskType.CREATIVE, TaskType.CHARACTER_VOICE],
    complexityScore: 0.9,
    phaseRelevance: [1, 3],
  },
  {
    id: TaskType.CONFLICT_DYNAMICS,
    name: "TensionField AI",
    nameAr: "محلل حقول التوتر",
    role: "ديناميكيات الصراع",
    description:
      "وكيل حقول التوتر الدرامي: محلل ديناميكي متطور يطبق نظريات ميكانيكا الموائع",
    category: "analysis",
    icon: "zap",
    taskType: TaskType.CONFLICT_DYNAMICS,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: true,
      hasMemory: true,
      usesSelfReflection: false,
      supportsRAG: false,
    },
    collaboratesWith: [TaskType.TENSION_OPTIMIZER],
    enhances: [TaskType.TENSION_OPTIMIZER],
    complexityScore: 0.85,
    phaseRelevance: [3],
  },

  // ===== وكلاء الإبداع (Creative) =====
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

  // ===== وكلاء التنبؤ (Predictive) =====
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

  // ===== الوحدات المتقدمة (Advanced Modules) =====
  {
    id: TaskType.CHARACTER_DEEP_ANALYZER,
    name: "PsycheScope AI",
    nameAr: "مجهر النفسية",
    role: "التحليل النفسي العميق",
    description:
      "الوحدة 3 - مجهر النفسية العميقة: محلل شخصيات متقدم يستخدم نماذج علم النفس الحاسوبي",
    category: "advanced",
    icon: "brain",
    taskType: TaskType.CHARACTER_DEEP_ANALYZER,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.CHARACTER_NETWORK, TaskType.CHARACTER_VOICE],
    enhances: [TaskType.CHARACTER_VOICE],
    complexityScore: 0.92,
    phaseRelevance: [3],
  },
  {
    id: TaskType.DIALOGUE_ADVANCED_ANALYZER,
    name: "ConversationLens AI",
    nameAr: "عدسة المحادثة",
    role: "التحليل المتقدم للحوار",
    description:
      "الوحدة 4 - عدسة المحادثة المتقدمة: محلل حوار متطور يستخدم تقنيات اللسانيات الحاسوبية",
    category: "advanced",
    icon: "message-square",
    taskType: TaskType.DIALOGUE_ADVANCED_ANALYZER,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.DIALOGUE_FORENSICS],
    enhances: [TaskType.CHARACTER_VOICE],
    complexityScore: 0.85,
    phaseRelevance: [3],
  },
  {
    id: TaskType.VISUAL_CINEMATIC_ANALYZER,
    name: "CinemaVision AI",
    nameAr: "بصيرة السينما",
    role: "التحليل السينمائي البصري",
    description: "الوحدة 5 - بصيرة السينما الذكية: محلل بصري سينمائي متطور",
    category: "advanced",
    icon: "film",
    taskType: TaskType.VISUAL_CINEMATIC_ANALYZER,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: false,
      usesSelfReflection: false,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.PRODUCIBILITY_ANALYZER],
    enhances: [TaskType.PRODUCIBILITY_ANALYZER],
    complexityScore: 0.8,
    phaseRelevance: [3],
  },
  {
    id: TaskType.THEMES_MESSAGES_ANALYZER,
    name: "PhilosophyMiner AI",
    nameAr: "منقّب الفلسفة",
    role: "تحليل المواضيع والرسائل",
    description: "الوحدة 6 - منقب الفلسفة العميقة: محلل موضوعات ورسائل متطور",
    category: "advanced",
    icon: "book-open",
    taskType: TaskType.THEMES_MESSAGES_ANALYZER,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [
      TaskType.THEMATIC_MINING,
      TaskType.CULTURAL_HISTORICAL_ANALYZER,
    ],
    enhances: [TaskType.LITERARY_QUALITY_ANALYZER],
    complexityScore: 0.95,
    phaseRelevance: [3],
  },
  {
    id: TaskType.CULTURAL_HISTORICAL_ANALYZER,
    name: "ChronoContext AI",
    nameAr: "سياق الزمن",
    role: "التحليل الثقافي التاريخي",
    description: "الوحدة 7 - سياق الزمن الثقافي: محلل سياق ثقافي تاريخي متطور",
    category: "advanced",
    icon: "globe",
    taskType: TaskType.CULTURAL_HISTORICAL_ANALYZER,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [
      TaskType.WORLD_BUILDER,
      TaskType.TARGET_AUDIENCE_ANALYZER,
    ],
    enhances: [TaskType.WORLD_BUILDER],
    complexityScore: 0.88,
    phaseRelevance: [1, 3],
  },
  {
    id: TaskType.PRODUCIBILITY_ANALYZER,
    name: "ProductionOracle AI",
    nameAr: "وحي الإنتاج",
    role: "تحليل قابلية الإنتاج",
    description: "الوحدة 8 - وحي الإنتاج الذكي: محلل قابلية إنتاج متطور",
    category: "advanced",
    icon: "chart-bar",
    taskType: TaskType.PRODUCIBILITY_ANALYZER,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: true,
      hasMemory: true,
      usesSelfReflection: false,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.VISUAL_CINEMATIC_ANALYZER],
    enhances: [],
    complexityScore: 0.78,
    phaseRelevance: [5],
  },
  {
    id: TaskType.TARGET_AUDIENCE_ANALYZER,
    name: "AudienceCompass AI",
    nameAr: "بوصلة الجمهور",
    role: "تحليل الجمهور المستهدف",
    description: "الوحدة 9 - بوصلة الجمهور الذكية: محلل جمهور مستهدف متطور",
    category: "advanced",
    icon: "compass",
    taskType: TaskType.TARGET_AUDIENCE_ANALYZER,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: true,
      hasMemory: true,
      usesSelfReflection: false,
      supportsRAG: true,
    },
    collaboratesWith: [
      TaskType.AUDIENCE_RESONANCE,
      TaskType.CULTURAL_HISTORICAL_ANALYZER,
    ],
    enhances: [TaskType.AUDIENCE_RESONANCE],
    complexityScore: 0.82,
    phaseRelevance: [1, 5],
  },
  {
    id: TaskType.LITERARY_QUALITY_ANALYZER,
    name: "AestheticsJudge AI",
    nameAr: "قاضي الجماليات",
    role: "تحليل الجودة الأدبية",
    description: "الوحدة 10 - قاضي الجماليات الأدبية: محلل جودة أدبية متطور",
    category: "advanced",
    icon: "trophy",
    taskType: TaskType.LITERARY_QUALITY_ANALYZER,
    capabilities: {
      canAnalyze: true,
      canGenerate: false,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [
      TaskType.STYLE_FINGERPRINT,
      TaskType.THEMES_MESSAGES_ANALYZER,
    ],
    enhances: [],
    complexityScore: 0.9,
    phaseRelevance: [3, 5],
  },
  {
    id: TaskType.RECOMMENDATIONS_GENERATOR,
    name: "WisdomSynthesizer AI",
    nameAr: "مركّب الحكمة",
    role: "توليد التوصيات والتحسينات",
    description:
      "الوحدة 11 - مُركب الحكمة الإبداعية: مولد توصيات وتحسينات متطور",
    category: "advanced",
    icon: "lightbulb",
    taskType: TaskType.RECOMMENDATIONS_GENERATOR,
    capabilities: {
      canAnalyze: true,
      canGenerate: true,
      canPredict: false,
      hasMemory: true,
      usesSelfReflection: true,
      supportsRAG: true,
    },
    collaboratesWith: [TaskType.ANALYSIS, TaskType.LITERARY_QUALITY_ANALYZER],
    enhances: [],
    complexityScore: 0.88,
    phaseRelevance: [5],
  },
]);

// ============================================
// ===== دوال الوصول للوكلاء =====
// ============================================

/**
 * الحصول على جميع الوكلاء
 */
export function getAllAgents(): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS;
}

/**
 * الحصول على وكيل بواسطة المعرف
 */
export function getAgentById(
  id: string
): BrainstormAgentDefinition | undefined {
  return REAL_AGENTS.find((agent) => agent.id === id);
}

/**
 * الحصول على وكيل بواسطة TaskType
 */
export function getAgentByTaskType(
  taskType: TaskType
): BrainstormAgentDefinition | undefined {
  return REAL_AGENTS.find((agent) => agent.taskType === taskType);
}

/**
 * الحصول على الوكلاء حسب الفئة
 */
export function getAgentsByCategory(
  category: AgentCategory
): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.category === category);
}

/**
 * الحصول على الوكلاء المرتبطين بمرحلة معينة
 */
export function getAgentsByPhase(
  phase: BrainstormPhase
): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.phaseRelevance.includes(phase));
}

/**
 * الحصول على الوكلاء الذين يمكنهم التحليل
 */
export function getAnalysisAgents(): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.capabilities.canAnalyze);
}

/**
 * الحصول على الوكلاء الذين يمكنهم التوليد
 */
export function getCreativeAgents(): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.capabilities.canGenerate);
}

/**
 * الحصول على الوكلاء الذين يمكنهم التنبؤ
 */
export function getPredictiveAgents(): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.capabilities.canPredict);
}

/**
 * الحصول على المتعاونين لوكيل معين
 */
export function getCollaborators(
  agentId: string
): readonly BrainstormAgentDefinition[] {
  const agent = getAgentById(agentId);
  if (!agent) return [];

  return REAL_AGENTS.filter((a) => agent.collaboratesWith.includes(a.taskType));
}

/**
 * الحصول على الوكلاء الذين يعززون وكيلاً معيناً
 */
export function getEnhancers(
  agentId: string
): readonly BrainstormAgentDefinition[] {
  const agent = getAgentById(agentId);
  if (!agent) return [];

  return REAL_AGENTS.filter((a) => a.enhances.includes(agent.taskType));
}

// ============================================
// ===== ربط المراحل بالوكلاء =====
// ============================================

/**
 * تعريف مراحل العصف الذهني
 */
export interface BrainstormPhaseDefinition {
  id: BrainstormPhase;
  name: string;
  nameEn: string;
  description: string;
  relevantAgents: TaskType[];
  primaryAction: "analyze" | "generate" | "debate" | "decide";
}

/**
 * مراحل العصف الذهني مع الوكلاء المرتبطين
 */
export const BRAINSTORM_PHASES: readonly BrainstormPhaseDefinition[] =
  Object.freeze([
    {
      id: 1,
      name: "الملخص الإبداعي",
      nameEn: "Creative Brief",
      description: "تحديد الفكرة الأولية ووضع الأسس",
      relevantAgents: [
        TaskType.ANALYSIS,
        TaskType.STYLE_FINGERPRINT,
        TaskType.CULTURAL_HISTORICAL_ANALYZER,
        TaskType.TARGET_AUDIENCE_ANALYZER,
      ],
      primaryAction: "analyze",
    },
    {
      id: 2,
      name: "توليد الأفكار",
      nameEn: "Idea Generation",
      description: "إنشاء فكرتين متنافستين مبتكرتين",
      relevantAgents: [
        TaskType.CREATIVE,
        TaskType.COMPLETION,
        TaskType.SCENE_GENERATOR,
        TaskType.CHARACTER_VOICE,
        TaskType.WORLD_BUILDER,
        TaskType.PLOT_PREDICTOR,
      ],
      primaryAction: "generate",
    },
    {
      id: 3,
      name: "المراجعة المستقلة",
      nameEn: "Independent Review",
      description: "تقييم شامل من كل وكيل",
      relevantAgents: [
        TaskType.ANALYSIS,
        TaskType.RHYTHM_MAPPING,
        TaskType.CHARACTER_NETWORK,
        TaskType.DIALOGUE_FORENSICS,
        TaskType.THEMATIC_MINING,
        TaskType.STYLE_FINGERPRINT,
        TaskType.CONFLICT_DYNAMICS,
        TaskType.TENSION_OPTIMIZER,
        TaskType.AUDIENCE_RESONANCE,
        TaskType.CHARACTER_DEEP_ANALYZER,
        TaskType.DIALOGUE_ADVANCED_ANALYZER,
        TaskType.VISUAL_CINEMATIC_ANALYZER,
        TaskType.THEMES_MESSAGES_ANALYZER,
        TaskType.CULTURAL_HISTORICAL_ANALYZER,
        TaskType.LITERARY_QUALITY_ANALYZER,
      ],
      primaryAction: "analyze",
    },
    {
      id: 4,
      name: "المناقشة التنافسية",
      nameEn: "The Tournament",
      description: "نقاش حي بين الوكلاء",
      relevantAgents: [
        TaskType.CREATIVE,
        TaskType.INTEGRATED,
        TaskType.ADAPTIVE_REWRITING,
        TaskType.SCENE_GENERATOR,
        TaskType.CHARACTER_VOICE,
        TaskType.PLOT_PREDICTOR,
        TaskType.TENSION_OPTIMIZER,
      ],
      primaryAction: "debate",
    },
    {
      id: 5,
      name: "القرار النهائي",
      nameEn: "Final Decision",
      description: "اختيار الفكرة الفائزة وتقديم التوصيات",
      relevantAgents: [
        TaskType.INTEGRATED,
        TaskType.COMPLETION,
        TaskType.AUDIENCE_RESONANCE,
        TaskType.PLATFORM_ADAPTER,
        TaskType.PRODUCIBILITY_ANALYZER,
        TaskType.TARGET_AUDIENCE_ANALYZER,
        TaskType.LITERARY_QUALITY_ANALYZER,
        TaskType.RECOMMENDATIONS_GENERATOR,
      ],
      primaryAction: "decide",
    },
  ]);

/**
 * الحصول على تعريف مرحلة معينة
 */
export function getPhaseDefinition(
  phaseId: BrainstormPhase
): BrainstormPhaseDefinition | undefined {
  return BRAINSTORM_PHASES.find((phase) => phase.id === phaseId);
}

/**
 * الحصول على الوكلاء الكاملين لمرحلة معينة
 */
export function getAgentsForPhase(
  phaseId: BrainstormPhase
): readonly BrainstormAgentDefinition[] {
  const phase = getPhaseDefinition(phaseId);
  if (!phase) return [];

  return REAL_AGENTS.filter((agent) =>
    phase.relevantAgents.includes(agent.taskType)
  );
}

// ============================================
// ===== إحصائيات الوكلاء =====
// ============================================

/**
 * إحصائيات الوكلاء
 */
export interface AgentStats {
  total: number;
  byCategory: Record<AgentCategory, number>;
  withRAG: number;
  withSelfReflection: number;
  withMemory: number;
  averageComplexity: number;
}

/**
 * حساب إحصائيات الوكلاء
 */
export function getAgentStats(): AgentStats {
  const stats: AgentStats = {
    total: REAL_AGENTS.length,
    byCategory: {
      core: 0,
      analysis: 0,
      creative: 0,
      predictive: 0,
      advanced: 0,
    },
    withRAG: 0,
    withSelfReflection: 0,
    withMemory: 0,
    averageComplexity: 0,
  };

  let complexitySum = 0;

  for (const agent of REAL_AGENTS) {
    stats.byCategory[agent.category]++;

    if (agent.capabilities.supportsRAG) stats.withRAG++;
    if (agent.capabilities.usesSelfReflection) stats.withSelfReflection++;
    if (agent.capabilities.hasMemory) stats.withMemory++;

    complexitySum += agent.complexityScore;
  }

  stats.averageComplexity = complexitySum / REAL_AGENTS.length;

  return stats;
}
