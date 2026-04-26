import type { StandardAgentOutput } from "./standardAgentPattern";

export function formatAgentOutput(
  output: StandardAgentOutput,
  agentName: string
): string {
  const sections = [
    `=== ${agentName} - التقرير ===`,
    "",
    `الثقة: ${(output.confidence * 100).toFixed(0)}%`,
    "",
    "--- التحليل ---",
    output.text,
    "",
  ];

  if (output.notes.length > 0) {
    sections.push("--- ملاحظات ---");
    output.notes.forEach((note) => sections.push(`• ${note}`));
    sections.push("");
  }

  if (output.metadata) {
    sections.push("--- معلومات إضافية ---");
    if (output.metadata.ragUsed) sections.push("✓ استخدم RAG");
    if ((output.metadata.critiqueIterations ?? 0) > 0) {
      sections.push(`✓ نقد ذاتي: ${output.metadata.critiqueIterations} دورات`);
    }
    if ((output.metadata.constitutionalViolations ?? 0) > 0) {
      sections.push(
        `⚠ انتهاكات دستورية: ${output.metadata.constitutionalViolations}`
      );
    }
    if (output.metadata.hallucinationDetected) {
      sections.push("⚠ تم اكتشاف وتصحيح هلوسات");
    }
  }

  sections.push("");
  sections.push("=".repeat(50));

  return sections.join("\n");
}
