/**
 * Integrated Agent Assessment Helpers
 * Extracted to reduce file size of IntegratedAgent.ts
 */

export function assessIntegration(text: string): number {
  let score = 0.6;

  const integrationTerms = ["تكامل", "دمج", "ربط", "توحيد", "تركيب", "تنسيق"];
  const hasIntegrationTerms = integrationTerms.some((term) => text.includes(term));
  if (hasIntegrationTerms) score += 0.2;

  if (
    (text.includes("تحليل") && text.includes("إبداع")) ||
    (text.includes("تحليلي") && text.includes("إبداعي"))
  ) {
    score += 0.15;
  }

  if (text.includes("قيمة") || text.includes("إضافة")) {
    score += 0.05;
  }

  return Math.min(1, score);
}

export function assessBalance(text: string): number {
  let score = 0.5;

  const balanceTerms = ["توازن", "توازي", "تكامل", "انسجام"];
  const hasBalanceTerms = balanceTerms.some((term) => text.includes(term));
  if (hasBalanceTerms) score += 0.2;

  const analysisCount = (text.match(/تحليل/g) ?? []).length;
  const creativeCount = (text.match(/إبداع/g) ?? []).length;

  if (analysisCount > 0 && creativeCount > 0) {
    const ratio = Math.min(analysisCount, creativeCount) / Math.max(analysisCount, creativeCount);
    score += ratio * 0.3;
  }

  return Math.min(1, score);
}

export function assessCoherence(text: string): number {
  let score = 0.6;

  const coherenceTerms = ["تماسك", "انسجام", "اتساق", "ترابط", "وضوح"];
  const hasCoherenceTerms = coherenceTerms.some((term) => text.includes(term));
  if (hasCoherenceTerms) score += 0.2;

  const flowTerms = ["أولاً", "ثانياً", "ثالثاً", "بعد ذلك", "أخيراً"];
  const hasFlowTerms = flowTerms.some((term) => text.includes(term));
  if (hasFlowTerms) score += 0.1;

  if (text.includes("شامل") || text.includes("كامل") || text.includes("موحد")) {
    score += 0.1;
  }

  return Math.min(1, score);
}

export function assessOverallQuality(text: string): number {
  let score = 0.5;

  if (text.length > 1000) score += 0.2;
  if (text.length > 2000) score += 0.2;

  const qualityTerms = ["جودة", "ممتاز", "عالية", "ممتازة", "مثالي"];
  const hasQualityTerms = qualityTerms.some((term) => text.includes(term));
  if (hasQualityTerms) score += 0.1;

  if (text.includes("توصية") || text.includes("ينصح")) {
    score += 0.1;
  }

  return Math.min(1, score);
}

export function detectSynthesisType(text: string): string {
  if (text.includes("تحليل") && !text.includes("إبداع")) {
    return "تحليل مدمج";
  }
  if (text.includes("إبداع") && !text.includes("تحليل")) {
    return "إبداع مدمج";
  }
  if (text.includes("تركيب") || (text.includes("تحليل") && text.includes("إبداع"))) {
    return "تركيب شامل";
  }
  return "تكامل عام";
}

export function cleanupSynthesis(text: string): string {
  let cleaned = text.replace(/```json[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/\{[\s\S]*?\}/g, (match) => {
    if (match.includes('"') && match.includes(":")) return "";
    return match;
  });
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return formatSynthesisSections(cleaned);
}

const SYNTHESIS_HEADERS = [
  "ملخص تنفيذي", "التركيب", "التكامل", "التوازن", "التماسك",
  "التحليل المدمج", "الإبداع المدمج", "الرؤية الشاملة", "التوصيات",
];

function isSynthesisSectionHeader(line: string): boolean {
  return SYNTHESIS_HEADERS.some((header) => line.includes(header));
}

function isLineASectionHeader(line: string, nextLine: string): boolean {
  return (
    isSynthesisSectionHeader(line) ||
    (!!(/^\d+\./.exec(line)) && !!nextLine && !(/^\d+\./.exec(nextLine)))
  );
}

 
function formatSynthesisSections(text: string): string {
  const lines = text.split("\n");
  const formatted: string[] = [];
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    const nextLine = lines[i + 1]?.trim() ?? "";

    if (isLineASectionHeader(line, nextLine)) {
      if (inSection && formatted.length > 0) formatted.push("");
      formatted.push(line);
      inSection = true;
    } else if (line) {
      formatted.push(line);
    } else if (formatted[formatted.length - 1] !== "") {
      formatted.push("");
    }
  }

  return formatted.join("\n");
}

export function translateStrategy(strategy: string): string {
  const strategies: Record<string, string> = {
    sequential: "تسلسلي",
    parallel: "متوازي",
    iterative: "تكرارية",
  };
  return strategies[strategy] ?? strategy;
}

export function translateDepth(depth: string): string {
  const depths: Record<string, string> = {
    basic: "أساسي",
    moderate: "متوسط",
    deep: "عميق",
  };
  return depths[depth] ?? depth;
}

export function translateTargetOutput(target: string): string {
  const targets: Record<string, string> = {
    analysis: "تحليل مدمج",
    creative: "إبداع مدمج",
    synthesis: "تركيب شامل",
  };
  return targets[target] ?? target;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

interface IntegrationNotesInput {
  outputConfidence: number,
  outputNotes: string[] | undefined,
  integrationScore: number,
  balanceScore: number,
  coherenceScore: number,
  qualityScore: number,
}

export function generateIntegrationNotes(input: IntegrationNotesInput): string[] {
  const notes: string[] = [];
  const {
    outputConfidence,
    outputNotes,
    integrationScore,
    balanceScore,
    coherenceScore,
    qualityScore,
  } = input;

  if (outputConfidence > 0.85) notes.push("ثقة عالية في التكامل");
  else if (outputConfidence > 0.7) notes.push("ثقة جيدة");
  else notes.push("ثقة متوسطة - يُنصح بالمراجعة");

  if (integrationScore > 0.8) notes.push("تكامل ممتاز");
  else if (integrationScore < 0.6) notes.push("يحتاج تحسين التكامل");

  if (balanceScore > 0.8) notes.push("توازن ممتاز بين التحليل والإبداع");
  else if (balanceScore < 0.6) notes.push("يحتاج تحسين التوازن");

  if (coherenceScore > 0.8) notes.push("تماسك شامل ممتاز");
  if (qualityScore > 0.8) notes.push("جودة عالية");

  if (outputNotes) {
    notes.push(...outputNotes.filter((note) => !notes.includes(note)));
  }

  return notes;
}
