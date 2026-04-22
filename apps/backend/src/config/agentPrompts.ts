/**
 * Agent Prompts Configuration
 * Contains prompt templates and task-specific instructions
 */

export const PROMPT_PERSONA_BASE = `أنت وكيل ذكاء اصطناعي متخصص في تحليل النصوص الأدبية والسيناريوهات.`;

export const TASK_SPECIFIC_INSTRUCTIONS: Record<string, string> = {
  analysis: 'قم بتحليل النص المقدم بعناية واستخرج الأنماط والعناصر الرئيسية.',
  generation: 'قم بتوليد محتوى إبداعي بناءً على السياق المقدم.',
  transformation: 'قم بتحويل النص المقدم وفقاً للمعايير المطلوبة.',
  evaluation: 'قم بتقييم جودة النص المقدم وتقديم توصيات للتحسين.',
};

export const TASKS_EXPECTING_JSON_RESPONSE = [
  'analysis',
  'character_analysis',
  'dialogue_analysis',
  'scene_analysis',
];

export const COMPLETION_ENHANCEMENT_OPTIONS: Array<{id: string; label: string}> = [
  { id: 'creative', label: 'إبداعي' },
  { id: 'balanced', label: 'متوازن' },
  { id: 'precise', label: 'دقيق' },
];

export const TASK_CATEGORY_MAP: Record<string, string> = {
  script_analysis: 'تحليل السيناريو',
  character_analysis: 'تحليل الشخصيات',
  dialogue_analysis: 'تحليل الحوار',
  scene_generation: 'توليد المشاهد',
  creative_writing: 'الكتابة الإبداعية',
};

export const ENHANCED_TASK_DESCRIPTIONS: Record<string, string> = {
  analysis: 'تحليل شامل للنصوص الأدبية والسيناريوهات',
  generation: 'توليد محتوى إبداعي عالي الجودة',
  transformation: 'تحويل وتكييف النصوص',
  evaluation: 'تقييم وتحسين جودة النصوص',
};
