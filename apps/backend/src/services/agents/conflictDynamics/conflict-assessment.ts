/**
 * Conflict Dynamics Assessment Helpers
 * Extracted to reduce file size of ConflictDynamicsAgent.ts
 */
import { safeCountMultipleTerms, sumCounts } from "../shared/safe-regexp";

export async function assessConflictIdentification(text: string): Promise<number> {
  let score = 0.5;

  const conflictTerms = [
    "صراع", "نزاع", "خلاف", "مواجهة",
    "تضارب", "تعارض", "صدام", "احتكاك",
  ];
  const termCount = safeCountMultipleTerms(text, conflictTerms);
  score += Math.min(0.25, sumCounts(termCount) * 0.02);

  const typeTerms = ["داخلي", "خارجي", "بين شخصي", "مجتمعي", "فردي"];
  const typeCount = safeCountMultipleTerms(text, typeTerms);
  score += Math.min(0.15, sumCounts(typeCount) * 0.05);

  if (text.includes("الأطراف") || text.includes("المتصارع")) score += 0.1;

  return Math.min(1, score);
}

export async function assessAnalysisDepth(text: string): Promise<number> {
  let score = 0.5;

  const depthIndicators = [
    "جذور", "أسباب", "يؤدي إلى", "ينتج عن",
    "يتطور", "يتصاعد", "ذروة", "حل",
  ];
  const depthCount = safeCountMultipleTerms(text, depthIndicators);
  score += Math.min(0.25, sumCounts(depthCount) * 0.025);

  const hasCausality =
    text.includes("لأن") || text.includes("بسبب") || text.includes("نتيجة");
  if (hasCausality) score += 0.15;

  if (text.length > 1500) score += 0.1;

  return Math.min(1, score);
}

export async function assessEvidenceQuality(text: string): Promise<number> {
  let score = 0.6;

  const evidenceMarkers = [
    "مثل", "كما في", "نرى", "يظهر",
    "في المشهد", "عندما", "حيث",
  ];
  const evidenceCount = safeCountMultipleTerms(text, evidenceMarkers);
  score += Math.min(0.25, sumCounts(evidenceCount) * 0.025);

  const hasQuotes = (text.match(/["«]/g) || []).length;
  score += Math.min(0.15, hasQuotes * 0.015);

  return Math.min(1, score);
}

export async function assessInsightfulness(text: string): Promise<number> {
  let score = 0.5;

  const insightWords = [
    "يكشف", "يوضح", "يعكس", "الأهمية",
    "التأثير", "الدلالة", "يشير", "نستنتج",
  ];
  const insightCount = safeCountMultipleTerms(text, insightWords);
  score += Math.min(0.3, sumCounts(insightCount) * 0.03);

  const hasFunctionAnalysis =
    text.includes("وظيفة") || text.includes("دور") || text.includes("يخدم");
  if (hasFunctionAnalysis) score += 0.2;

  return Math.min(1, score);
}

export function countConflicts(text: string): number {
  const conflictMarkers = text.match(
    /الصراع الأول|الصراع الثاني|الصراع الرئيسي|صراع|نزاع رئيسي/gi
  );
  return conflictMarkers ? Math.min(conflictMarkers.length, 8) : 0;
}

export function identifyConflictTypes(text: string): string[] {
  const typeMap: [string[], string][] = [
    [["داخلي", "النفس"], "داخلي"],
    [["بين شخصي", "شخصية"], "بين شخصي"],
    [["مجتمعي", "اجتماعي"], "مجتمعي"],
    [["الطبيعة", "البيئة"], "ضد الطبيعة"],
    [["القدر", "المصير"], "ضد القدر"],
  ];
  return typeMap
    .filter(([keywords]) => keywords.some((kw) => text.includes(kw)))
    .map(([, label]) => label);
}

export function assessIntensityLevel(text: string): string {
  const highIntensity = ["حاد", "شديد", "عنيف", "حرج", "ذروة", "انفجار"];
  const mediumIntensity = ["متوسط", "متصاعد", "متزايد"];
  const lowIntensity = ["هادئ", "خفيف", "كامن", "مكبوت"];

  const countTerms = (terms: string[]): number =>
    terms.reduce((count, term) => {
      return count + text.toLowerCase().split(term.toLowerCase()).length - 1;
    }, 0);

  const highCount = countTerms(highIntensity);
  const mediumCount = countTerms(mediumIntensity);
  const lowCount = countTerms(lowIntensity);

  if (highCount > mediumCount && highCount > lowCount) return "عالي";
  if (lowCount > mediumCount && lowCount > highCount) return "منخفض";
  return "متوسط";
}

export function cleanupConflictText(text: string): string {
  let cleaned = text.replace(/```json[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/\{[\s\S]*?\}/g, (match) => {
    if (match.includes('"') && match.includes(":")) return "";
    return match;
  });
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

export function translateConflictType(type: string): string {
  const types: Record<string, string> = {
    internal: "داخلي (الإنسان ضد نفسه)",
    interpersonal: "بين شخصي (شخص ضد شخص)",
    societal: "مجتمعي (فرد ضد مجتمع)",
    "man-vs-nature": "ضد الطبيعة",
    "man-vs-fate": "ضد القدر",
    "man-vs-technology": "ضد التكنولوجيا",
    "man-vs-supernatural": "ضد الخارق",
  };
  return types[type] || type;
}

interface ThresholdCheck {
  value: number;
  high: number;
  highMsg: string;
  low?: number;
  lowMsg?: string;
}

export function addThresholdNotes(notes: string[], checks: ThresholdCheck[]): void {
  for (const check of checks) {
    if (check.value > check.high) notes.push(check.highMsg);
    else if (check.low !== undefined && check.lowMsg && check.value < check.low) notes.push(check.lowMsg);
  }
}
