import { NextRequest, NextResponse } from "next/server";

import { ApiError, apiSuccess, errorToFailure, generateRequestId, statusForCode } from "@the-copy/api-client";
import { assertModelTextNotEmpty } from "@the-copy/ai-orchestration";

import { logger } from "@/lib/ai/utils/logger";
import { platformGenAIService } from "@/lib/drama-analyst/services/platformGenAIService";

/**
 * مسار تنفيذ أدوات التطوير الإبداعي
 *
 * يُنفِّذ المهام المختارة عبر طبقة platformGenAIService الموحّدة.
 * يدعم جميع المهام الـ 27 الموزعة على 5 فئات.
 *
 * المسار: POST /api/development/execute
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** استرداد مفتاح Gemini من متغيرات البيئة — للتحقق المسبق فقط */
function getGeminiApiKey(): string {
  return (
    process.env["GEMINI_API_KEY"] ??
    process.env["NEXT_PUBLIC_GEMINI_API_KEY"] ??
    process.env["GOOGLE_GENAI_API_KEY"] ??
    ""
  );
}

/** التحقق من صلاحية مفتاح API */
function isValidApiKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  return key.length > 10 && !/placeholder|change|xxx|demo|test/i.test(key);
}

/** بناء التعليمات الخاصة بكل نوع مهمة */
function buildSystemPrompt(taskId: string): string {
  const prompts: Record<string, string> = {
    // ---- الفئة الأساسية ----
    completion:
      "أنت متخصص في إكمال النصوص الدرامية العربية. أكمل النص المُقدَّم بأسلوب متسق مع الأصل، مع الحفاظ على صوت الشخصيات ونبرة القصة.",
    creative:
      "أنت مبدع في كتابة النصوص الدرامية العربية. أنتج محتوى إبداعياً جديداً مستوحى من النص المُقدَّم، مع إضافة قيمة فنية أصيلة.",
    analysis:
      "أنت محلل متخصص في السيناريو العربي. قدم تحليلاً شاملاً للنص يشمل البنية الدرامية، الشخصيات، الحبكة، والأسلوب.",
    integrated:
      "أنت وكيل متكامل للتحليل والإبداع. حلل النص أولاً ثم قدم اقتراحات إبداعية بناءً على التحليل.",

    // ---- فئة التحليل ----
    "rhythm-mapping":
      "أنت محلل متخصص في إيقاع القصص الدرامية. حلل إيقاع النص وتقلباته العاطفية وديناميكياته الزمنية، مقدماً خريطة مرئية للإيقاع الدرامي.",
    "character-network":
      "أنت محلل متخصص في شبكات الشخصيات. حلل علاقات الشخصيات وديناميكياتها وكيفية تأثيرها على مسار القصة.",
    "dialogue-forensics":
      "أنت محلل متخصص في الحوار الدرامي. شرّح الحوارات من حيث الأصالة، التوتر، الإيقاع، والعمق النفسي للشخصيات.",
    "thematic-mining":
      "أنت محلل متخصص في استخراج الثيمات. اكتشف الموضوعات الرئيسية والثانوية والرمزية في النص الدرامي.",
    "style-fingerprint":
      "أنت محلل متخصص في الأسلوب الكتابي. حلل بصمة الكاتب من حيث المفردات، التراكيب، الصور البلاغية، والنبرة العامة.",
    "conflict-dynamics":
      "أنت محلل متخصص في الصراع الدرامي. حلل ديناميكيات الصراع في النص: أنواعه، مستوياته، وكيفية تطوره وتأثيره على القصة.",

    // ---- فئة الإبداع ----
    "adaptive-rewriting":
      "أنت متخصص في إعادة الكتابة التكيفية. أعد كتابة النص مع الحفاظ على جوهره لكن بتكييفه لسياق أو جمهور أو منصة مختلفة حسب المتطلبات.",
    "scene-generator":
      "أنت متخصص في توليد المشاهد الدرامية. أنتج مشاهد جديدة متسقة مع عالم القصة وشخصياتها وأحداثها.",
    "character-voice":
      "أنت متخصص في محاكاة أصوات الشخصيات. اكتب مقاطع حوارية أو وصفية بصوت شخصية معينة من النص، محافظاً على خصائصها اللغوية والنفسية.",
    "world-builder":
      "أنت متخصص في بناء عوالم القصص. وسّع عالم القصة بإضافة تفاصيل ثرية للأماكن، العادات، التاريخ، والجغرافيا.",

    // ---- الفئة التنبؤية ----
    "plot-predictor":
      "أنت متخصص في التنبؤ بمسار القصص. بناءً على النص المُقدَّم، تنبأ بالتطورات المنطقية للأحداث مع شرح الأسباب الدرامية.",
    "tension-optimizer":
      "أنت متخصص في تحسين التوتر الدرامي. حلل مستويات التوتر في النص واقترح تحسينات لجعل الصراع أكثر إثارة وتأثيراً.",
    "audience-resonance":
      "أنت محلل متخصص في تأثير النصوص على الجمهور. قيّم التأثير العاطفي والثقافي للنص على الجمهور العربي المستهدف.",
    "platform-adapter":
      "أنت متخصص في تكييف النصوص لمنصات مختلفة. حوّل النص ليناسب منصة مختلفة (مسرح، سينما، تلفزيون، منصات رقمية).",

    // ---- الفئة المتقدمة ----
    "character-deep-analyzer":
      "أنت محلل نفسي متخصص في الشخصيات الدرامية. قدم تحليلاً معمقاً لنفسية الشخصيات، دوافعها، تناقضاتها، وقوس تطورها.",
    "dialogue-advanced-analyzer":
      "أنت محلل متقدم للحوار الدرامي. قدم تحليلاً متعمقاً يشمل البُعد الاجتماعي والنفسي والفني للحوارات.",
    "visual-cinematic-analyzer":
      "أنت محلل متخصص في الصورة السينمائية. حلل العناصر البصرية في النص: الزوايا، الإضاءة، التصوير، والرمزية البصرية.",
    "themes-messages-analyzer":
      "أنت محلل متخصص في الرسائل والثيمات العميقة. استخرج الطبقات المعنوية العميقة والرسائل الضمنية والصريحة في النص.",
    "cultural-historical-analyzer":
      "أنت محلل ثقافي وتاريخي متخصص. حلل السياق الثقافي والتاريخي للنص وكيفية توظيفه للهوية العربية والموروث الحضاري.",
    "producibility-analyzer":
      "أنت خبير في إنتاج الأعمال الدرامية. قيّم قابلية النص للإنتاج الفعلي: التكلفة التقريبية، الصعوبات التقنية، متطلبات الكاست والمواقع.",
    "target-audience-analyzer":
      "أنت متخصص في تحليل الجمهور المستهدف. حدد الفئة الجمهورية المثلى للنص وكيفية تعديله ليتناسب معها بشكل أفضل.",
    "literary-quality-analyzer":
      "أنت ناقد أدبي متخصص في الكتابة الدرامية العربية. قيّم الجودة الأدبية الشاملة للنص: اللغة، الصياغة، الصور البلاغية، والقيمة الفنية.",
    "recommendations-generator":
      "أنت مستشار درامي شامل. قدم توصيات شاملة ومفصلة لتحسين النص على جميع المستويات: الفني، الدرامي، التجاري، والإنتاجي.",
  };

  return (
    prompts[taskId] ??
    "أنت متخصص في تطوير النصوص الدرامية العربية. حلل النص المُقدَّم وقدم مخرجات مفيدة ومفصلة."
  );
}

/** بناء الـ prompt الكامل للمهمة */
function buildPrompt(params: {
  taskId: string;
  taskName: string;
  originalText: string;
  analysisReport?: string;
  specialRequirements?: string;
  additionalInfo?: string;
}): string {
  const parts: string[] = [];

  parts.push(`المهمة المطلوبة: ${params.taskName}`);
  parts.push("النص الدرامي الأصلي:");
  parts.push("---");
  parts.push(params.originalText.trim());
  parts.push("---");

  if (params.analysisReport?.trim()) {
    parts.push("\nتقرير التحليل السابق (للسياق):");
    parts.push(params.analysisReport.trim().substring(0, 2000));
  }

  if (params.specialRequirements?.trim()) {
    parts.push(`\nمتطلبات خاصة: ${params.specialRequirements.trim()}`);
  }

  if (params.additionalInfo?.trim()) {
    parts.push(`\nمعلومات إضافية: ${params.additionalInfo.trim()}`);
  }

  parts.push(
    "\nقدم مخرجاتك بشكل منظم ومفصل باللغة العربية. كن محدداً وعملياً في إجاباتك."
  );

  return parts.join("\n");
}

/** نوع جسم الطلب */
interface ExecuteRequestBody {
  taskId?: string;
  taskName?: string;
  originalText?: string;
  analysisReport?: string;
  specialRequirements?: string;
  additionalInfo?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: ExecuteRequestBody;
    try {
      body = (await request.json()) as ExecuteRequestBody;
    } catch {
      return NextResponse.json(
        { success: false, error: "تنسيق الطلب غير صالح" },
        { status: 400 }
      );
    }

    // التحقق من المدخلات الإلزامية
    const originalText =
      typeof body.originalText === "string" ? body.originalText.trim() : "";
    if (!originalText || originalText.length < 20) {
      return NextResponse.json(
        { success: false, error: "النص الأصلي مطلوب (20 حرف على الأقل)" },
        { status: 400 }
      );
    }

    const taskId =
      typeof body.taskId === "string" ? body.taskId.trim() : "analysis";
    const taskName =
      typeof body.taskName === "string" ? body.taskName.trim() : taskId;

    // التحقق من مفتاح API
    const apiKey = getGeminiApiKey();
    if (!isValidApiKey(apiKey)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "مفتاح Gemini API غير متاح أو غير صالح. يرجى تهيئة GEMINI_API_KEY.",
          fallback: true,
        },
        { status: 503 }
      );
    }

    const systemPrompt = buildSystemPrompt(taskId);
    // استخدام conditional spread لتوافق exactOptionalPropertyTypes
    const userPrompt = buildPrompt({
      taskId,
      taskName,
      originalText,
      ...(body.analysisReport !== undefined && {
        analysisReport: body.analysisReport,
      }),
      ...(body.specialRequirements !== undefined && {
        specialRequirements: body.specialRequirements,
      }),
      ...(body.additionalInfo !== undefined && {
        additionalInfo: body.additionalInfo,
      }),
    });

    const requestId = generateRequestId();
    const startedAt = Date.now();

    const generatedText = await platformGenAIService.generateText(
      `${systemPrompt}\n\n${userPrompt}`,
      {
        model: "gemini-2.0-flash",
        temperature: 0.7,
        maxTokens: 4096,
      }
    );

    // إصلاح P0-5 (development empty response):
    // التقرير وثّق أن "إكمال النص" يعرض: "نفّذت المهمة لكن لم تُرجع أي محتوى".
    // الحل: نمنع empty response من المرور كنجاح على الإطلاق.
    // assertModelTextNotEmpty يرفع ApiError(model_empty) عند الفراغ
    // أو placeholder شائع، فيُمسك في catch أدناه ويُرجع رد مصنّف.
    const validatedText = assertModelTextNotEmpty(generatedText, "النموذج");

    return NextResponse.json(
      apiSuccess(
        {
          // نُبقي شكل النجاح القديم لتوافق الواجهة، مع إضافة envelope الموحّد.
          finalDecision: validatedText,
          proposals: [
            {
              agentId: taskId,
              agentName: taskName,
              text: validatedText,
              confidence: 0.85,
            },
          ],
        },
        { requestId, startedAt, version: "1.0" },
      ),
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error("[development/execute] خطأ مصنّف:", {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(error.toFailure(), {
        status: statusForCode(error.code),
      });
    }

    const message = error instanceof Error ? error.message : "فشل تنفيذ المهمة";
    logger.error("[development/execute] خطأ غير متوقع:", message);

    // لا نكشف رسالة تقنية خام؛ errorToFailure يبني رد server_error مصنّف.
    return NextResponse.json(errorToFailure(error), { status: 500 });
  }
}

export function GET(): NextResponse {
  return NextResponse.json({
    success: true,
    data: {
      service: "development-execute",
      source: "platformGenAIService",
      model: "gemini-2.0-flash",
      tasksSupported: 27,
    },
  });
}
