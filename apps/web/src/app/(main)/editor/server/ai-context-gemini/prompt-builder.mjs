/**
 * @module ai-context-gemini/prompt-builder
 * @description بناء الـ Prompt للمستخدم
 */

/**
 * بناء prompt المستخدم من الأسطر المصنفة
 * @param {Array<{ text: string, assignedType: string, confidence: number }>} classifiedLines - الأسطر المصنفة
 * @returns {string} Prompt المستخدم
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
