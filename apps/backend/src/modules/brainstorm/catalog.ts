import { TaskType } from "@/services/agents/core/enums";
import { agentRegistry } from "@/services/agents/registry";

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

const BRAINSTORM_AGENT_CATALOG: readonly BrainstormAgentCatalogItem[] =
  Object.freeze([
    {
      id: TaskType.ANALYSIS,
      name: "CritiqueArchitect AI",
      nameAr: "مهندس النقد",
      role: "التحليل النقدي المعماري",
      description:
        "وكيل التحليل النقدي المعماري: نظام هجين متعدد الوكلاء يدمج التفكير الجدلي مع التحليل الشعاعي العميق",
      category: "core",
      icon: "brain",
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
    {
      id: TaskType.RHYTHM_MAPPING,
      name: "TemporalDynamics AI",
      nameAr: "محلل الإيقاع",
      role: "رسم الإيقاع الزمني",
      description:
        "وكيل ديناميكيات الإيقاع الزمني: محلل متطور يستخدم تقنيات معالجة الإشارات الرقمية",
      category: "analysis",
      icon: "music",
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
    {
      id: TaskType.ADAPTIVE_REWRITING,
      name: "ContextTransformer AI",
      nameAr: "محوّل السياق",
      role: "إعادة الكتابة التكيفية",
      description:
        "وكيل التحويل السياقي التكيفي: نظام إعادة صياغة متقدم يعتمد على بنية Transformer",
      category: "creative",
      icon: "pen-tool",
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
    {
      id: TaskType.PLOT_PREDICTOR,
      name: "NarrativeOracle AI",
      nameAr: "عرّاف الحبكة",
      role: "التنبؤ بمسار الحبكة",
      description:
        "وكيل الوحي السردي: متنبئ حبكة متطور يستخدم نماذج Transformer المتخصصة",
      category: "predictive",
      icon: "compass",
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
    {
      id: TaskType.CHARACTER_DEEP_ANALYZER,
      name: "PsycheScope AI",
      nameAr: "مجهر النفسية",
      role: "التحليل النفسي العميق",
      description:
        "الوحدة 3 - مجهر النفسية العميقة: محلل شخصيات متقدم يستخدم نماذج علم النفس الحاسوبي",
      category: "advanced",
      icon: "brain",
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
      description:
        "الوحدة 6 - منقب الفلسفة العميقة: محلل موضوعات ورسائل متطور",
      category: "advanced",
      icon: "book-open",
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
      description:
        "الوحدة 7 - سياق الزمن الثقافي: محلل سياق ثقافي تاريخي متطور",
      category: "advanced",
      icon: "globe",
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
      description:
        "الوحدة 9 - بوصلة الجمهور الذكية: محلل جمهور مستهدف متطور",
      category: "advanced",
      icon: "compass",
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
      description:
        "الوحدة 10 - قاضي الجماليات الأدبية: محلل جودة أدبية متطور",
      category: "advanced",
      icon: "trophy",
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

export function getBrainstormAgents(): BrainstormAgentCatalogItem[] {
  return BRAINSTORM_AGENT_CATALOG.filter((agent) =>
    agentRegistry.hasAgent(agent.id)
  );
}

const TASK_TYPE_VALUES: readonly string[] = Object.values(TaskType);

function isTaskTypeId(agentId: string): agentId is TaskType {
  return TASK_TYPE_VALUES.includes(agentId);
}

export function getBrainstormAgentById(
  agentId: string
): BrainstormAgentCatalogItem | undefined {
  if (!isTaskTypeId(agentId)) {
    return undefined;
  }

  return getBrainstormAgents().find((agent) => agent.id === agentId);
}

export function getBrainstormPhases(): readonly BrainstormPhaseCatalogItem[] {
  return BRAINSTORM_PHASES;
}

export function getBrainstormAgentsForPhase(
  phase: BrainstormPhase
): BrainstormAgentCatalogItem[] {
  return getBrainstormAgents().filter((agent) =>
    agent.phaseRelevance.includes(phase)
  );
}

export function getBrainstormStats(): BrainstormCatalogStats {
  const agents = getBrainstormAgents();
  const byCategory: Record<BrainstormAgentCategory, number> = {
    core: 0,
    analysis: 0,
    creative: 0,
    predictive: 0,
    advanced: 0,
  };

  let withRAG = 0;
  let withSelfReflection = 0;
  let withMemory = 0;
  let complexitySum = 0;

  for (const agent of agents) {
    byCategory[agent.category] += 1;
    if (agent.capabilities.supportsRAG) withRAG += 1;
    if (agent.capabilities.usesSelfReflection) withSelfReflection += 1;
    if (agent.capabilities.hasMemory) withMemory += 1;
    complexitySum += agent.complexityScore;
  }

  return {
    total: agents.length,
    byCategory,
    withRAG,
    withSelfReflection,
    withMemory,
    averageComplexity: agents.length > 0 ? complexitySum / agents.length : 0,
  };
}
