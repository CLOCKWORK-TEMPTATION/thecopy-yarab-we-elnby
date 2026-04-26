/**
 * @fileoverview أداة ربط الأيقونات بالمهام
 *
 * تُستخدم لتبسيط تعقيد المكون الرئيسي عن طريق فصل منطق
 * اختيار الأيقونات إلى وحدة منفصلة مع بحث O(1)
 *
 * @module development/utils/task-icon-mapper
 */

import {
  Lightbulb,
  Sparkles,
  FileText,
  PenTool,
  Users,
  Search,
  Film,
  Globe,
  BarChart,
  Wand2,
  Brain,
  MessageSquare,
  TrendingUp,
  Zap,
  Music,
  Network,
  Palette,
  Target,
  // أيقونات المهام المتقدمة الجديدة
  UserCheck,
  MessagesSquare,
  Camera,
  BookOpen,
  Landmark,
  Factory,
  Award,
  ListChecks,
  Layers,
  Activity,
  Gem,
  Fingerprint,
  Swords,
  RefreshCw,
  Mic,
  Gauge,
  Heart,
  Monitor,
  PenLine,
} from "lucide-react";

import { TaskType, TaskCategory } from "@/types/enums";

import { CreativeTaskType } from "../types";

/**
 * خريطة الأيقونات لأنواع المهام العامة
 * تُستخدم للوصول السريع O(1) بدلاً من switch متعددة
 */
const TASK_TYPE_ICONS: Partial<Record<TaskType, React.ReactNode>> = {
  [TaskType.ANALYSIS]: <Lightbulb className="w-4 h-4" />,
  [TaskType.CREATIVE]: <Sparkles className="w-4 h-4" />,
  [TaskType.INTEGRATED]: <FileText className="w-4 h-4" />,
  [TaskType.COMPLETION]: <PenTool className="w-4 h-4" />,
  [TaskType.CHARACTER_DEEP_ANALYZER]: <Users className="w-4 h-4" />,
  [TaskType.DIALOGUE_ADVANCED_ANALYZER]: <Search className="w-4 h-4" />,
  [TaskType.VISUAL_CINEMATIC_ANALYZER]: <Film className="w-4 h-4" />,
  [TaskType.THEMES_MESSAGES_ANALYZER]: <Lightbulb className="w-4 h-4" />,
  [TaskType.CULTURAL_HISTORICAL_ANALYZER]: <Globe className="w-4 h-4" />,
  [TaskType.PRODUCIBILITY_ANALYZER]: <BarChart className="w-4 h-4" />,
  [TaskType.TARGET_AUDIENCE_ANALYZER]: <Users className="w-4 h-4" />,
  [TaskType.LITERARY_QUALITY_ANALYZER]: <PenTool className="w-4 h-4" />,
  [TaskType.RECOMMENDATIONS_GENERATOR]: <Sparkles className="w-4 h-4" />,
};

/**
 * خريطة الأيقونات لفئات المهام
 * تُستخدم كـ fallback عندما لا توجد أيقونة محددة للمهمة
 */
const TASK_CATEGORY_ICONS: Partial<Record<TaskCategory, React.ReactNode>> = {
  [TaskCategory.ANALYSIS]: <Lightbulb className="w-4 h-4" />,
  [TaskCategory.CREATIVE]: <Sparkles className="w-4 h-4" />,
  [TaskCategory.CORE]: <Target className="w-4 h-4" />,
  [TaskCategory.PREDICTIVE]: <TrendingUp className="w-4 h-4" />,
  [TaskCategory.ADVANCED_MODULES]: <Brain className="w-4 h-4" />,
};

/**
 * استرجاع أيقونة لنوع مهمة معين
 *
 * تبحث أولاً عن أيقونة محددة للمهمة، ثم تلجأ لأيقونة الفئة،
 * وأخيراً تعيد أيقونة افتراضية
 *
 * @param taskType - نوع المهمة المطلوبة
 * @param taskCategoryMap - خريطة تربط أنواع المهام بفئاتها
 * @returns عنصر React يمثل الأيقونة
 */
export function getTaskIcon(
  taskType: TaskType,
  taskCategoryMap: Partial<Record<TaskType, TaskCategory>>
): React.ReactNode {
  // البحث المباشر عن أيقونة المهمة
  const taskIcon = TASK_TYPE_ICONS[taskType];
  if (taskIcon) {
    return taskIcon;
  }

  // الرجوع لأيقونة الفئة
  const taskCategory = taskCategoryMap[taskType];
  if (taskCategory && TASK_CATEGORY_ICONS[taskCategory]) {
    return TASK_CATEGORY_ICONS[taskCategory];
  }

  // الأيقونة الافتراضية
  return <Sparkles className="w-4 h-4" />;
}

/**
 * خريطة الأيقونات للمهام الإبداعية
 * تحتوي على أيقونات مخصصة لكل نوع من أدوات التطوير الإبداعي
 */
const CREATIVE_TASK_ICONS: Record<CreativeTaskType, React.ReactNode> = {
  [CreativeTaskType.CREATIVE]: <Wand2 className="w-5 h-5" />,
  [CreativeTaskType.COMPLETION]: <PenTool className="w-5 h-5" />,
  [CreativeTaskType.ADAPTIVE_REWRITING]: <Brain className="w-5 h-5" />,
  [CreativeTaskType.SCENE_GENERATOR]: <Film className="w-5 h-5" />,
  [CreativeTaskType.CHARACTER_VOICE]: <MessageSquare className="w-5 h-5" />,
  [CreativeTaskType.WORLD_BUILDER]: <Globe className="w-5 h-5" />,
  [CreativeTaskType.PLOT_PREDICTOR]: <TrendingUp className="w-5 h-5" />,
  [CreativeTaskType.TENSION_OPTIMIZER]: <Zap className="w-5 h-5" />,
  [CreativeTaskType.RHYTHM_MAPPING]: <Music className="w-5 h-5" />,
  [CreativeTaskType.CHARACTER_NETWORK]: <Network className="w-5 h-5" />,
  [CreativeTaskType.DIALOGUE_FORENSICS]: <Search className="w-5 h-5" />,
  [CreativeTaskType.THEMATIC_MINING]: <Lightbulb className="w-5 h-5" />,
  [CreativeTaskType.STYLE_FINGERPRINT]: <Palette className="w-5 h-5" />,
  [CreativeTaskType.CONFLICT_DYNAMICS]: <Target className="w-5 h-5" />,
};

/**
 * استرجاع أيقونة لمهمة إبداعية
 *
 * تُستخدم في واجهة اختيار أدوات التطوير الإبداعي
 *
 * @param taskType - نوع المهمة الإبداعية
 * @returns عنصر React يمثل الأيقونة
 */
export function getCreativeTaskIcon(
  taskType: CreativeTaskType
): React.ReactNode {
  const icon = CREATIVE_TASK_ICONS[taskType];
  if (icon) {
    return icon;
  }

  // الأيقونة الافتراضية
  return <Sparkles className="w-5 h-5" />;
}

/**
 * خريطة أيقونات كتالوج المهام الكامل (27 مهمة)
 * تربط معرّف كل مهمة بالأيقونة المناسبة من lucide-react
 */
const CATALOG_TASK_ICONS: Record<string, React.ReactNode> = {
  // الفئة الأساسية
  completion: <PenLine className="w-5 h-5" />,
  creative: <Sparkles className="w-5 h-5" />,
  analysis: <Search className="w-5 h-5" />,
  integrated: <Layers className="w-5 h-5" />,

  // فئة التحليل
  "rhythm-mapping": <Activity className="w-5 h-5" />,
  "character-network": <Users className="w-5 h-5" />,
  "dialogue-forensics": <MessageSquare className="w-5 h-5" />,
  "thematic-mining": <Gem className="w-5 h-5" />,
  "style-fingerprint": <Fingerprint className="w-5 h-5" />,
  "conflict-dynamics": <Swords className="w-5 h-5" />,

  // فئة الإبداع
  "adaptive-rewriting": <RefreshCw className="w-5 h-5" />,
  "scene-generator": <Film className="w-5 h-5" />,
  "character-voice": <Mic className="w-5 h-5" />,
  "world-builder": <Globe className="w-5 h-5" />,

  // الفئة التنبؤية
  "plot-predictor": <TrendingUp className="w-5 h-5" />,
  "tension-optimizer": <Gauge className="w-5 h-5" />,
  "audience-resonance": <Heart className="w-5 h-5" />,
  "platform-adapter": <Monitor className="w-5 h-5" />,

  // الفئة المتقدمة
  "character-deep-analyzer": <UserCheck className="w-5 h-5" />,
  "dialogue-advanced-analyzer": <MessagesSquare className="w-5 h-5" />,
  "visual-cinematic-analyzer": <Camera className="w-5 h-5" />,
  "themes-messages-analyzer": <BookOpen className="w-5 h-5" />,
  "cultural-historical-analyzer": <Landmark className="w-5 h-5" />,
  "producibility-analyzer": <Factory className="w-5 h-5" />,
  "target-audience-analyzer": <Target className="w-5 h-5" />,
  "literary-quality-analyzer": <Award className="w-5 h-5" />,
  "recommendations-generator": <ListChecks className="w-5 h-5" />,
};

/**
 * استرجاع أيقونة لمهمة من كتالوج المهام الكامل
 *
 * تُستخدم في واجهة عرض جميع أدوات التطوير (27 مهمة)
 * بالمعرّف النصي للمهمة بدلاً من النوع المُعدَّد
 *
 * @param taskId - معرّف المهمة (مثل 'completion', 'character-deep-analyzer')
 * @returns عنصر React يمثل الأيقونة
 */
export function getCatalogTaskIcon(taskId: string): React.ReactNode {
  return CATALOG_TASK_ICONS[taskId] ?? <Sparkles className="w-5 h-5" />;
}
