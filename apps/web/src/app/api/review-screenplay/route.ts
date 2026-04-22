import { logger } from "@/lib/ai/utils/logger";

import { NextRequest, NextResponse } from "next/server";
import { platformGenAIService } from "@/lib/drama-analyst/services/platformGenAIService";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: "النص قصير جداً للمراجعة" },
        { status: 400 }
      );
    }

    const prompt = `أنت خبير في كتابة السيناريوهات العربية. قم بمراجعة النص التالي وقدم ملاحظات على:
1. استمرارية الحبكة
2. تطور الشخصيات
3. قوة الحوار
4. التناقضات في النص

قدم اقتراحات محددة لتحسين النص مع الحفاظ على الأسلوب العربي الأصيل.

النص:
${text}`;

    const review = await platformGenAIService.generateText(prompt, {
      model: "gemini-2.5-flash",
      temperature: 0.9,
      maxTokens: 48192,
    });

    return NextResponse.json({
      review: review || "فشل في الحصول على المراجعة",
    });
  } catch (error: unknown) {
    logger.error("Error reviewing screenplay:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء المراجعة" },
      { status: 500 }
    );
  }
}
