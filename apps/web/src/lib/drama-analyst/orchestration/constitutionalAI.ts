/**
 * نظام الذكاء الدستوري
 * Constitutional AI System
 *
 * يضمن التزام جميع الوكلاء بمجموعة من القواعد والمبادئ المحددة مسبقاً
 * Based on Anthropic's Constitutional AI research
 */

import { ConstitutionalRule } from "../core/types";
import { log } from "../services/loggerService";
import { platformGenAIService } from "../services/platformGenAIService";

interface RuleCritiqueResponse {
  hasViolation?: boolean;
  violationDescription?: string;
}

export class ConstitutionalAISystem {
  private rules: ConstitutionalRule[];

  constructor() {
    this.rules = this.initializeRules();
  }

  /**
   * تهيئة القواعد الدستورية الخمس
   * Initialize the five constitutional rules
   */
  private initializeRules(): ConstitutionalRule[] {
    return [
      {
        id: "fidelity_001",
        name: "Original Text Fidelity",
        nameAr: "الأمانة للنص الأصلي",
        description:
          "All developments must respect and build upon the original text",
        critiquePrompt: `
هل هذا التطوير يحترم النص الأصلي ولا يتناقض معه؟
قم بتحديد أي انحرافات عن النص الأصلي أو تناقضات معه.
`,
        revisionPrompt: `
قم بتعديل المخرج ليتوافق مع النص الأصلي مع الحفاظ على التطوير المقترح.
`,
        priority: 1,
      },
      {
        id: "no_positive_bias_002",
        name: "No Positive Bias",
        nameAr: "عدم الانحياز الإيجابي الزائف",
        description: "Avoid unrealistic positive feedback",
        critiquePrompt: `
هل هذا المخرج يحتوي على مديح مبالغ فيه أو انحياز إيجابي غير واقعي؟
حدد أي عبارات مبالغ فيها أو إطراء مفرط.
`,
        revisionPrompt: `
أعد صياغة المخرج ليكون موضوعياً ومتوازناً بدون مبالغة أو انحياز إيجابي.
`,
        priority: 2,
      },
      {
        id: "analysis_based_003",
        name: "Analysis-Report Based",
        nameAr: "الاعتماد على تقرير التحليل",
        description:
          "Development must be informed by the Seven Stations analysis",
        critiquePrompt: `
هل هذا التطوير مبني على نتائج تقرير التحليل (السبع محطات)؟
حدد أي جوانب لم تأخذ التحليل بعين الاعتبار.
`,
        revisionPrompt: `
أعد المخرج مع الأخذ بعين الاعتبار نتائج تقرير التحليل المرفق.
`,
        priority: 1,
      },
      {
        id: "coherence_004",
        name: "Narrative Coherence",
        nameAr: "التماسك السردي",
        description: "Ensure logical coherence in narrative development",
        critiquePrompt: `
هل المخرج متماسك منطقياً ومتسق داخلياً؟
حدد أي تناقضات أو ثغرات منطقية أو قفزات غير مبررة في السرد.
`,
        revisionPrompt: `
صحح أي تناقضات وثغرات منطقية في المخرج.
`,
        priority: 2,
      },
      {
        id: "character_consistency_005",
        name: "Character Consistency",
        nameAr: "اتساق الشخصيات",
        description: "Maintain character consistency throughout",
        critiquePrompt: `
هل الشخصيات متسقة مع تطورها وخصائصها المعرّفة؟
حدد أي سلوكيات أو حوارات غير متسقة مع طبيعة الشخصية.
`,
        revisionPrompt: `
اضبط المخرج ليحافظ على اتساق الشخصيات مع طبيعتها وتطورها.
`,
        priority: 2,
      },
    ];
  }

  /**
   * تطبيق القواعد الدستورية على مخرج
   * Apply constitutional rules to output
   */
  async applyConstitutionalRules(
    output: string,
    context: {
      originalText: string;
      analysisReport: any;
    }
  ): Promise<{
    isValid: boolean;
    violations: RuleViolation[];
    revisedOutput: string;
  }> {
    log.info("Starting constitutional validation", null, "ConstitutionalAI");

    const violations: RuleViolation[] = [];
    let currentOutput = output;

    // فرز القواعد حسب الأولوية (Priority 1 أولاً)
    const sortedRules = this.rules.sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      log.debug(
        "Checking constitutional rule",
        { ruleId: rule.id, ruleName: rule.nameAr },
        "ConstitutionalAI"
      );

      // Critique phase
      const critiqueResult = await this.critiqueWithRule(
        currentOutput,
        rule,
        context
      );

      if (critiqueResult.hasViolation) {
        log.warn(
          "Constitutional violation found",
          { ruleId: rule.id, ruleName: rule.nameAr },
          "ConstitutionalAI"
        );
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          description: critiqueResult.violationDescription,
        });

        // Revision phase
        currentOutput = await this.reviseWithRule(
          currentOutput,
          rule,
          context,
          critiqueResult.violationDescription
        );
      }
    }

    const isValid = violations.length === 0;
    log.info(
      "Constitutional validation complete",
      { isValid, violations: violations.length },
      "ConstitutionalAI"
    );

    return {
      isValid,
      violations,
      revisedOutput: currentOutput,
    };
  }

  /**
   * نقد المخرج بناءً على قاعدة واحدة
   * Critique output based on a single rule
   */
  private async critiqueWithRule(
    output: string,
    rule: ConstitutionalRule,
    context: any
  ): Promise<{
    hasViolation: boolean;
    violationDescription: string;
  }> {
    const critiquePrompt = `
${rule.critiquePrompt}

المخرج المراد نقده:
"""
${output}
"""

النص الأصلي (للمرجعية):
"""
${context.originalText.substring(0, 2000)}...
"""

تقرير التحليل (للمرجعية):
"""
${JSON.stringify(context.analysisReport, null, 2).substring(0, 1000)}
"""

أجب بصيغة JSON:
{
  "hasViolation": true/false,
  "violationDescription": "وصف دقيق للمخالفة إن وجدت، أو سلسلة فارغة إذا لم توجد مخالفة"
}
`;

    try {
      const parsed =
        await platformGenAIService.generateJson<RuleCritiqueResponse>(
          critiquePrompt
        );
      return {
        hasViolation: parsed.hasViolation || false,
        violationDescription: parsed.violationDescription || "",
      };
    } catch (error) {
      log.error("Error in constitutional critique", error, "ConstitutionalAI");
      return {
        hasViolation: false,
        violationDescription: "",
      };
    }
  }

  /**
   * مراجعة المخرج بناءً على قاعدة
   * Revise output based on a rule violation
   */
  private async reviseWithRule(
    output: string,
    rule: ConstitutionalRule,
    context: any,
    violationDescription: string
  ): Promise<string> {
    const revisionPrompt = `
${rule.revisionPrompt}

المخرج الحالي:
"""
${output}
"""

المخالفة المكتشفة:
${violationDescription}

النص الأصلي للمرجعية:
"""
${context.originalText.substring(0, 2000)}...
"""

تقرير التحليل للمرجعية:
"""
${JSON.stringify(context.analysisReport, null, 2).substring(0, 1000)}
"""

قم بتعديل المخرج ليتوافق مع القاعدة: ${rule.nameAr}
أعد المخرج المعدل فقط بدون شروحات أو تعليقات:
`;

    try {
      return await platformGenAIService.generateText(revisionPrompt);
    } catch (error) {
      log.error("Error in constitutional revision", error, "ConstitutionalAI");
      return output; // Return original on error
    }
  }

  /**
   * الحصول على قائمة القواعد
   * Get list of rules
   */
  getRules(): ConstitutionalRule[] {
    return this.rules;
  }

  /**
   * إضافة قاعدة مخصصة
   * Add custom rule
   */
  addCustomRule(rule: ConstitutionalRule): void {
    this.rules.push(rule);
  }
}

interface RuleViolation {
  ruleId: string;
  ruleName: string;
  description: string;
}

// Export singleton instance
export const constitutionalAI = new ConstitutionalAISystem();
