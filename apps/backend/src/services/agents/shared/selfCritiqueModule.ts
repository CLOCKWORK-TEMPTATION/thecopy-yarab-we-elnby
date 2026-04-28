/**
 * وحدة النقد الذاتي - Self-Critique Module
 *
 * @module selfCritiqueModule
 * @description
 * وحدة متخصصة في تحسين مخرجات الوكلاء من خلال دورات النقد الذاتي.
 * يمكن استخدامها من أي وكيل لتحسين جودة النتائج بشكل تكراري.
 *
 * مبنية على أبحاث Self-Refine و Constitutional AI
 *
 * @example
 * ```typescript
 * const result = await selfCritiqueModule.applySelfCritique(
 *   output,
 *   'تحليل الشخصيات',
 *   { projectName: 'مشروع فيلم' },
 *   3
 * );
 * ```
 */

import { logger } from "@/lib/logger";
import { geminiService } from "@/services/gemini.service";
import { SelfCritiqueResult } from "@core/types";

/**
 * فئة وحدة النقد الذاتي
 *
 * @description
 * توفر آليات لتحسين المخرجات من خلال:
 * 1. توليد نقد للمخرج الحالي
 * 2. تحديد ما إذا كان التحسين مطلوباً
 * 3. تحسين المخرج بناءً على النقد
 * 4. حساب درجة التحسين
 */
export class SelfCritiqueModule {
  /**
   * تطبيق النقد الذاتي على مخرج
   *
   * @description
   * يقوم بتشغيل دورات متكررة من النقد والتحسين حتى الوصول
   * إلى نتيجة مرضية أو استنفاد عدد التكرارات المسموح
   *
   * @param output - النص المراد تحسينه
   * @param task - وصف المهمة الأصلية
   * @param context - سياق إضافي للمساعدة في التحسين
   * @param maxIterations - الحد الأقصى لعدد التكرارات (افتراضي: 3)
   * @returns وعد بنتيجة النقد الذاتي تشمل النص المحسّن ودرجة التحسين
   */
  async applySelfCritique(
    output: string,
    task: string,
    context: Record<string, unknown>,
    maxIterations = 3,
  ): Promise<SelfCritiqueResult> {
    logger.info("بدء عملية النقد الذاتي", {
      maxIterations,
      outputLength: output.length,
    });

    const { currentOutput, critiques, iteration } =
      await this.runCritiqueIterations(output, task, context, maxIterations);

    const improvementScore = await this.calculateImprovement(
      output,
      currentOutput,
    );

    logger.info("اكتملت عملية النقد الذاتي", {
      improvementPercentage: (improvementScore * 100).toFixed(1),
      totalIterations: iteration,
    });

    return {
      improved: improvementScore > 0.1,
      iterations: iteration,
      finalText: currentOutput,
      improvementScore,
      originalOutput: output,
      critiques,
      refinedOutput: currentOutput,
    };
  }

  /**
   * تنفيذ دورات النقد الذاتي المتكررة
   */
  private async runCritiqueIterations(
    output: string,
    task: string,
    context: Record<string, unknown>,
    maxIterations: number,
  ): Promise<{
    currentOutput: string;
    critiques: string[];
    iteration: number;
  }> {
    let currentOutput = output;
    const critiques: string[] = [];
    let iteration = 0;

    for (let i = 0; i < maxIterations; i++) {
      iteration = i + 1;
      logger.debug("تكرار النقد الذاتي", { iteration, maxIterations });

      const critique = await this.generateCritique(
        currentOutput,
        task,
        context,
      );
      critiques.push(critique);

      const shouldImprove = await this.needsImprovement(
        currentOutput,
        critique,
      );
      if (!shouldImprove) {
        logger.info("المخرج جيد بما فيه الكفاية", {
          iteration,
          totalIterations: maxIterations,
        });
        break;
      }

      currentOutput = await this.refineOutput(
        currentOutput,
        critique,
        task,
        context,
      );
    }

    return { currentOutput, critiques, iteration };
  }

  /**
   * توليد نقد للمخرج
   *
   * @description
   * يستخدم نموذج اللغة لتوليد تقييم نقدي شامل للمخرج
   * يشمل نقاط القوة والضعف والتحسينات المقترحة
   *
   * @param output - النص المراد نقده
   * @param task - وصف المهمة الأصلية
   * @param context - السياق الإضافي
   * @returns وعد بنص النقد
   */
  private async generateCritique(
    output: string,
    task: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    const critiquePrompt = `
أنت ناقد محترف متخصص في المحتوى الدرامي.

المهمة الأصلية:
${task}

السياق:
${JSON.stringify(context, null, 2).substring(0, 1000)}

المخرج الحالي:
"""
${output}
"""

قم بتقييم المخرج نقدياً من حيث:
1. **نقاط القوة**: ما الجيد في المخرج؟
2. **نقاط الضعف**: ما الذي يحتاج تحسين؟
3. **التحسينات المقترحة**: كيف يمكن تحسينه؟
4. **الأخطاء**: هل هناك أخطاء أو تناقضات؟

قدم تقييماً نقدياً مفصلاً:
`;

    try {
      return await geminiService.generateText(critiquePrompt);
    } catch (error) {
      logger.error("فشل في توليد النقد", {
        error: error instanceof Error ? error.message : "خطأ غير معروف",
      });
      return "لا يوجد نقد متاح";
    }
  }

  /**
   * فحص إذا كان المخرج يحتاج تحسين
   *
   * @description
   * يحلل النقد لتحديد ما إذا كان المخرج يحتاج إلى تحسين إضافي
   *
   * @param output - النص الحالي
   * @param critique - النقد المولّد
   * @returns وعد بقيمة منطقية تشير إلى الحاجة للتحسين
   */
  private async needsImprovement(
    output: string,
    critique: string,
  ): Promise<boolean> {
    const checkPrompt = `
بناءً على النقد التالي:
"""
${critique}
"""

هل المخرج بحاجة لتحسين إضافي؟

أجب بـ "yes" إذا كان يحتاج تحسين، أو "no" إذا كان جيداً بما فيه الكفاية.
أجب بكلمة واحدة فقط:
`;

    try {
      const result = await geminiService.generateText(checkPrompt);
      return result.trim().toLowerCase().includes("yes");
    } catch (error) {
      logger.error("فشل في التحقق من الحاجة للتحسين", {
        error: error instanceof Error ? error.message : "خطأ غير معروف",
      });
      return false; // افتراضي: لا حاجة للتحسين في حالة الخطأ
    }
  }

  /**
   * تحسين المخرج بناءً على النقد
   *
   * @description
   * يولّد نسخة محسّنة من المخرج بناءً على النقد والملاحظات
   *
   * @param output - النص الحالي
   * @param critique - النقد المولّد
   * @param task - وصف المهمة الأصلية
   * @param context - السياق الإضافي
   * @returns وعد بالنص المحسّن
   */
  private async refineOutput(
    output: string,
    critique: string,
    task: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    const refinementPrompt = `
المهمة الأصلية:
${task}

السياق:
${JSON.stringify(context, null, 2).substring(0, 1000)}

المخرج الحالي:
"""
${output}
"""

النقد والملاحظات:
"""
${critique}
"""

قم بتحسين المخرج بناءً على النقد والملاحظات.
احتفظ بالجوانب الجيدة، وحسّن نقاط الضعف.

أعد المخرج المحسّن فقط بدون شروحات:
`;

    try {
      return await geminiService.generateText(refinementPrompt);
    } catch (error) {
      logger.error("فشل في تحسين المخرج", {
        error: error instanceof Error ? error.message : "خطأ غير معروف",
      });
      return output; // إرجاع الأصلي في حالة الخطأ
    }
  }

  /**
   * حساب درجة التحسين
   *
   * @description
   * يقيس مدى التحسين بين النص الأصلي والمحسّن على مقياس من 0 إلى 1
   *
   * @param original - النص الأصلي
   * @param refined - النص المحسّن
   * @returns وعد بدرجة التحسين (0-1)
   */
  private async calculateImprovement(
    original: string,
    refined: string,
  ): Promise<number> {
    // مقارنة بسيطة - يمكن تحسينها بمقاييس أكثر تطوراً
    if (original === refined) return 0;

    const assessmentPrompt = `
المخرج الأصلي:
"""
${original.substring(0, 1500)}
"""

المخرج المحسّن:
"""
${refined.substring(0, 1500)}
"""

قيّم مستوى التحسين على مقياس من 0 إلى 1:
- 0 = لا يوجد تحسين أو أسوأ
- 0.5 = تحسين متوسط
- 1 = تحسين ممتاز

أجب برقم فقط (مثال: 0.75):
`;

    try {
      const result = await geminiService.generateText(assessmentPrompt);
      const score = parseFloat(result.trim());
      return isNaN(score) ? 0.5 : Math.min(Math.max(score, 0), 1);
    } catch (error) {
      logger.error("فشل في حساب درجة التحسين", {
        error: error instanceof Error ? error.message : "خطأ غير معروف",
      });
      return 0.5; // افتراضي: تحسين متوسط
    }
  }
}

/** نسخة مفردة من وحدة النقد الذاتي للاستخدام المشترك */
export const selfCritiqueModule = new SelfCritiqueModule();
