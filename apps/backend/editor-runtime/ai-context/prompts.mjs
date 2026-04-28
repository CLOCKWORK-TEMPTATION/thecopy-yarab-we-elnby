/**
 * @module ai-context/prompts
 * @description بناء prompts المستخدم لـ AI Context Gemini
 */

/**
 * يبني prompt المستخدم للسياق
 * @param {Array<{text: string, assignedType: string, confidence: number}>} classifiedLines - الأسطر المصنفة
 * @returns {string} prompt المستخدم
 */
export const buildUserPrompt = (classifiedLines) => {
  const formatted = classifiedLines
    .map(
      (line, index) =>
        `[${index}] (${line.assignedType}, ثقة=${line.confidence}%) ${line.text}`
    )
    .join("\n");

  return `## النص المُصنّف:\n${formatted}\n\n## حلل السياق وأرجع التصحيحات:`;
};
