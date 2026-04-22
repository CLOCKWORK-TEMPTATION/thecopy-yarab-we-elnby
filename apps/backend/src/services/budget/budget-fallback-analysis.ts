import type { BudgetAnalysis } from "./budget-types";
import { buildScenarioInsights } from "./budget-fallback-insights";

function buildAnalysisCollections(insights: ReturnType<typeof buildScenarioInsights>): Pick<
  BudgetAnalysis,
  "recommendations" | "riskFactors" | "costOptimization"
> {
  return {
    recommendations: [
      `جدول التصوير المقترح هو ${insights.shootingDays} يوم مع توزيع المواقع على ${insights.locationCount} موقع رئيسي.`,
      insights.actionLevel > 0
        ? "قفل مشاهد الحركة في وحدات تصوير متجاورة سيقلل تكلفة النقل والتأمين."
        : "تجميع المشاهد حسب الموقع سيخفض أيام العمل الضائعة بين التنقلات.",
      insights.nightShootCount > 0
        ? "يفضل حصر الليالي في بلوكات محددة لتقليل كلفة الإضاءة والعمل الإضافي."
        : "الحفاظ على ساعات تصوير نهارية ثابتة سيحسن كفاءة الطاقم.",
    ],
    riskFactors: [
      insights.actionLevel > 0
        ? "وجود مطاردات أو حركة مرتفعة يرفع متطلبات التأمين والسلامة."
        : "أي توسع غير مخطط في عدد المواقع سيرفع ميزانية اللوجستيات بسرعة.",
      insights.vfxLevel > 0
        ? "المؤثرات البصرية تحتاج تنسيقاً مبكراً حتى لا تتضخم كلفة ما بعد الإنتاج."
        : "ضغط الجدول على مرحلة ما بعد الإنتاج قد يدفع إلى ساعات تحرير إضافية.",
      insights.crowdLevel > 0
        ? "إدارة الحشود والكومبارس تحتاج تصاريح وطاقم حركة إضافي."
        : "إذا زاد عدد الممثلين عن التقدير الحالي فستتأثر بنود الكاست والنقل مباشرة.",
    ],
    costOptimization: [
      insights.locationCount > 2
        ? "تقليل عدد المواقع أو دمجها بصرياً سيخفض النقل والتصاريح."
        : "الحفاظ على المواقع الحالية ضمن جدول مضغوط سيحفظ المصروفات اللوجستية.",
      insights.vehicleCount > 0
        ? "إعادة استخدام المركبات نفسها بين المشاهد سيخفض الاستئجار والنقل."
        : "استخدام حزمة كاميرا واحدة متعددة الاستخدامات سيقلل الإيجارات اليومية.",
      insights.vfxLevel > 0
        ? "تحديد لقطات VFX الحرجة فقط قبل التصوير يمنع الإنفاق غير الضروري في البوست."
        : "إغلاق المراجعات التحريرية على مراحل أسبوعية سيمنع تكرار العمل في البوست.",
    ],
  };
}

export function buildFallbackAnalysis(
  scenario: string,
  title: string | undefined
): BudgetAnalysis {
  const insights = buildScenarioInsights(scenario, title);
  const collections = buildAnalysisCollections(insights);

  return {
    summary:
      `تم إنشاء تقدير تشغيل احتياطي قابل للاستخدام لـ "${insights.canonicalTitle}" ` +
      `بناءً على ${insights.sceneCount} مشهد تقريبي و${insights.locationCount} موقع رئيسي.`,
    ...collections,
    shootingSchedule: {
      totalDays: insights.shootingDays,
      phases: {
        preProduction: insights.preProductionDays,
        production: insights.shootingDays,
        postProduction: insights.postProductionDays,
      },
    },
  };
}
