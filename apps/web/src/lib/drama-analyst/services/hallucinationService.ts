/**
 * خدمة كشف الهلوسات
 * Hallucination Detection Service
 *
 * يكتشف ويصحح المحتوى المُختَلَق غير المستند لمصادر
 */

import { HallucinationDetection, FactCheck } from "../core/types";

import { log } from "./loggerService";
import { platformGenAIService } from "./platformGenAIService";

interface FactCheckResponse {
  isSupported?: boolean;
  sources?: unknown;
  confidence?: number;
}

interface ConsistencyResponse {
  isConsistent?: boolean;
  contradictions?: unknown;
}

export class HallucinationService {
  /**
   * كشف الهلوسات في المخرج
   * Detect hallucinations in output
   */
  async detectHallucinations(
    output: string,
    sourceText: string,
    analysisReport: unknown
  ): Promise<HallucinationDetection> {
    log.info("Starting hallucination detection", null, "HallucinationService");

    // Extract claims from output
    const claims = await this.extractClaims(output);
    log.debug(
      "Claims extracted for verification",
      { claims: claims.length },
      "HallucinationService"
    );

    // Fact-check each claim
    const factCheckResults: FactCheck[] = [];
    const hallucinatedParts: string[] = [];

    for (const claim of claims) {
      const factCheck = await this.factCheckClaim(
        claim,
        sourceText,
        analysisReport
      );

      factCheckResults.push(factCheck);

      if (!factCheck.isSupported) {
        hallucinatedParts.push(claim);
      }
    }

    log.info(
      "Hallucination detection complete",
      { unsupportedClaims: hallucinatedParts.length },
      "HallucinationService"
    );

    // Correct hallucinations if found
    let correctedOutput = output;
    if (hallucinatedParts.length > 0) {
      correctedOutput = await this.correctHallucinations(
        output,
        hallucinatedParts,
        sourceText
      );
    }

    return {
      isHallucinated: hallucinatedParts.length > 0,
      hallucinatedParts,
      factCheckResults,
      correctedOutput,
    };
  }

  /**
   * استخراج الادعاءات من المخرج
   * Extract claims from output
   */
  private async extractClaims(output: string): Promise<string[]> {
    const extractionPrompt = `
قم باستخراج جميع الادعاءات والحقائق الرئيسية من النص التالي:

النص:
"""
${output.substring(0, 3000)}
"""

أجب بصيغة JSON كمصفوفة من السلاسل النصية (حد أقصى 10 ادعاءات):
["ادعاء 1", "ادعاء 2", ...]
`;

    try {
      const claims =
        await platformGenAIService.generateJson<unknown>(extractionPrompt);
      return Array.isArray(claims)
        ? claims
            .filter((claim): claim is string => typeof claim === "string")
            .slice(0, 10)
        : [];
    } catch (error) {
      log.error("Error extracting claims", error, "HallucinationService");
      return [];
    }
  }

  /**
   * التحقق من صحة ادعاء
   * Fact-check a claim against sources
   */
  private async factCheckClaim(
    claim: string,
    sourceText: string,
    analysisReport: unknown
  ): Promise<FactCheck> {
    const factCheckPrompt = `
قم بالتحقق من صحة الادعاء التالي بناءً على المصادر المتاحة:

الادعاء:
"""
${claim}
"""

النص الأصلي:
"""
${sourceText.substring(0, 2000)}...
"""

تقرير التحليل:
"""
${JSON.stringify(analysisReport, null, 2).substring(0, 1000)}
"""

هل الادعاء مدعوم بالمصادر؟ أجب بصيغة JSON:
{
  "isSupported": true/false,
  "sources": ["مصدر 1", "مصدر 2"],
  "confidence": 0.9
}
`;

    try {
      const parsed =
        await platformGenAIService.generateJson<FactCheckResponse>(
          factCheckPrompt
        );

      return {
        claim,
        isSupported: parsed.isSupported ?? false,
        sources: Array.isArray(parsed.sources)
          ? (parsed.sources as string[])
          : [],
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      };
    } catch (error) {
      log.error("Error fact-checking claim", error, "HallucinationService");
      return {
        claim,
        isSupported: true, // Default to supported on error to avoid false positives
        sources: [],
        confidence: 0.5,
      };
    }
  }

  /**
   * تصحيح الهلوسات
   * Correct hallucinations in output
   */
  private async correctHallucinations(
    output: string,
    hallucinatedParts: string[],
    sourceText: string
  ): Promise<string> {
    if (hallucinatedParts.length === 0) return output;

    const correctionPrompt = `
النص التالي يحتوي على معلومات غير مدعومة بالمصدر الأصلي:

النص:
"""
${output}
"""

الأجزاء المختلقة (غير مدعومة):
${hallucinatedParts.map((p, i) => `${i + 1}. ${p}`).join("\n")}

النص الأصلي للمرجع:
"""
${sourceText.substring(0, 2000)}...
"""

قم بتصحيح النص بإزالة أو تعديل الأجزاء المختلقة بحيث تكون جميع المعلومات مدعومة بالمصدر الأصلي.
حافظ على جودة النص ولكن التزم بالمصدر.

أعد النص المصحح فقط:
`;

    try {
      return await platformGenAIService.generateText(correctionPrompt);
    } catch (error) {
      log.error("Error correcting output", error, "HallucinationService");
      return output; // Return original on error
    }
  }

  /**
   * فحص الاتساق الداخلي
   * Check internal consistency of output
   */
  async checkConsistency(output: string): Promise<{
    isConsistent: boolean;
    contradictions: string[];
  }> {
    const consistencyPrompt = `
قم بفحص الاتساق الداخلي للنص التالي وحدد أي تناقضات:

النص:
"""
${output}
"""

أجب بصيغة JSON:
{
  "isConsistent": true/false,
  "contradictions": ["تناقض 1", "تناقض 2"]
}
`;

    try {
      const parsed =
        await platformGenAIService.generateJson<ConsistencyResponse>(
          consistencyPrompt
        );
      return {
        isConsistent: parsed.isConsistent ?? true,
        contradictions: Array.isArray(parsed.contradictions)
          ? parsed.contradictions.filter(
              (contradiction): contradiction is string =>
                typeof contradiction === "string"
            )
          : [],
      };
    } catch (error) {
      log.error("Error checking consistency", error, "HallucinationService");
      return {
        isConsistent: true,
        contradictions: [],
      };
    }
  }
}

// Export singleton instance
export const hallucinationService = new HallucinationService();
