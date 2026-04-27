import { PromptCategory } from "@the-copy/prompt-engineering";

export const CATEGORY_LABELS: Record<PromptCategory, string> = {
  creative_writing: "كتابة إبداعية",
  analysis: "تحليل",
  translation: "ترجمة",
  summarization: "تلخيص",
  question_answering: "أسئلة وأجوبة",
  code_generation: "توليد كود",
  data_extraction: "استخراج بيانات",
  conversation: "محادثة",
  other: "أخرى",
};

export const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
};

export const getScoreBgColor = (score: number) => {
  if (score >= 80) return "bg-green-500/20";
  if (score >= 60) return "bg-blue-500/20";
  if (score >= 40) return "bg-amber-500/20";
  return "bg-red-500/20";
};
