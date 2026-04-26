#!/usr/bin/env npx tsx
/**
 * agent.ts — وكيل OCR العربي الرئيسي
 *
 * مبني على Vercel AI SDK v6 مع دعم MCP.
 * يُنسّق عملية تحويل ملفات PDF العربية الممسوحة ضوئياً إلى نص.
 *
 * البنية المعمارية:
 *   ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
 *   │  المستخدم   │────▶│  ToolLoop    │────▶│  MCP Server     │
 *   │  (CLI)      │◀────│  Agent       │◀────│  (Mistral OCR)  │
 *   └─────────────┘     └──────┬───────┘     └─────────────────┘
 *                              │
 *                    ┌─────────┴─────────┐
 *                    │  أدوات محلية:     │
 *                    │  - تصنيف PDF     │
 *                    │  - قراءة ملفات   │
 *                    │  - كتابة ملفات   │
 *                    │  - سرد ملفات     │
 *                    └─────────┬─────────┘
 *                              │
 *                    ┌─────────┴─────────┐
 *                    │  أدوات المهارة:   │
 *                    │  (skill scripts)  │
 *                    │  - OCR Mistral   │
 *                    │  - كتابة مخرجات  │
 *                    │  - تحسين صور     │
 *                    │  - تصنيف PDF     │
 *                    └───────────────────┘
 */

import { resolve } from "node:path";

import { createMCPClient } from "@ai-sdk/mcp";
import { openai } from "@ai-sdk/openai";

import {
  StdioClientTransport,
  ToolLoopAgent,
  stepCountIs,
  type ToolSet,
} from "./ai-runtime.js";
import { buildAgentConfig, validateEnvironment } from "./config";
import {
  skillClassifyPdf,
  skillEnhanceImages,
  skillOcrMistral,
  skillWriteOutput,
} from "./skill-tools";
import {
  classifyPdfTool,
  listFilesTool,
  readFileTool,
  writeFileTool,
} from "./tools";

// ─── ألوان الطرفية ──────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
} as const;

function log(prefix: string, color: string, msg: string): void {
  process.stderr.write(`${color}${C.bold}[${prefix}]${C.reset} ${msg}\n`);
}

// ─── إنشاء عميل MCP ────────────────────────────────────────

async function createOcrMcpClient(serverPath: string) {
  log("MCP", C.blue, `الاتصال بخادم OCR: ${serverPath}`);

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", serverPath],
    env: {
      ...process.env,
      // تمرير مفاتيح API للخادم
      MISTRAL_API_KEY: process.env["MISTRAL_API_KEY"] ?? "",
      OPENAI_API_KEY: process.env["OPENAI_API_KEY"] ?? "",
    },
  });

  const client = await createMCPClient({ transport });
  log("MCP", C.green, "تم الاتصال بنجاح");

  return client;
}

// ─── تعليمات الوكيل ─────────────────────────────────────────

const AGENT_INSTRUCTIONS = `أنت وكيل متخصص في استخراج النص العربي من ملفات PDF الممسوحة ضوئياً (OCR).

## مجموعات الأدوات المتاحة:

### 1. أدوات المهارة (skill scripts) — المسار الأساسي:
- **skill_classify_pdf**: تصنيف PDF (نصي / ممسوح / مختلط / محمي) — الخطوة الأولى دائماً
- **skill_ocr_mistral**: استخراج OCR عبر Mistral API → يُنتج ملف JSON خام
- **skill_write_output**: تحويل JSON الخام إلى TXT أو Markdown نهائي
- **skill_enhance_images**: تحسين جودة الصور قبل OCR (عند ضعف النتائج)

### 2. أدوات MCP (خادم OCR المتكامل) — مسار بديل:
- **convert_document_to_markdown**: تحويل شامل (OCR + تطبيع + LLM اختياري) في خطوة واحدة

### 3. أدوات نظام الملفات:
- **read_file**: قراءة محتوى ملف
- **write_file**: كتابة ملف جديد (يتجنب الكتابة فوق الموجود)
- **list_files**: سرد ملفات في مجلد مع تصفية حسب الامتداد
- **classify_pdf**: تصنيف سريع مدمج (بديل خفيف لـ skill_classify_pdf)

## سير العمل المعتاد (المسار الأساسي عبر أدوات المهارة):
1. إذا أعطاك المستخدم مسار مجلد → استخدم list_files لاكتشاف PDFs
2. صنّف كل ملف عبر **skill_classify_pdf**
3. إذا كان ممسوحاً أو مختلطاً:
   أ. نفّذ OCR عبر **skill_ocr_mistral** → ينتج ملف JSON
   ب. حوّل JSON إلى الصيغة المطلوبة عبر **skill_write_output**
4. إذا كانت النتائج ضعيفة → استخدم **skill_enhance_images** ثم أعد OCR
5. أبلغ المستخدم بالنتائج (المحرك، عدد الصفحات، الحجم، الوقت)

## المسار البديل (عبر MCP — خطوة واحدة):
- استخدم **convert_document_to_markdown** مباشرةً عندما:
  - المستخدم يريد تحويل سريع بدون تحكم تفصيلي
  - يريد تفعيل تطبيع النص العربي المتقدم (normalizer)
  - يريد تحسين LLM اختياري

## خيارات التطبيع المتاحة في convert_document_to_markdown:
- normalizeHamza: توحيد الهمزات (الافتراضي: true)
- removeDiacritics: إزالة التشكيل (الافتراضي: true)
- normalizeDigits: توحيد الأرقام — "arabic" أو "western" أو "none"
- scriptSpecificRules: قواعد السيناريوهات (الافتراضي: true)
- fixConnectedLetters: إصلاح الحروف الملتصقة (الافتراضي: true)

## قواعد استخراج النص (غير قابلة للتفاوض):
- الدقة الحرفية: لا تصحح أخطاء إملائية، لا تُعد الصياغة
- التشكيل: حافظ على كل علامات التشكيل إن وُجدت
- البنية: أسطر وفقرات كما في الأصل تماماً
- غير واضح: ضعه بين {غير واضح: وصف}
- لا تخمن أبداً — ضع العلامة وامضِ

## قواعد عامة:
- تحدث بالعربية المصرية المهنية دائماً
- أبلغ المستخدم بأي أخطاء أو تحذيرات فوراً
- لا تكتب فوق ملفات موجودة بدون إذن
- إذا كان الملف محمياً (protected) → أبلغ المستخدم وأوقف المعالجة
- إذا كان الملف أكبر من 50 صفحة → أبلغ المستخدم بالعدد قبل البدء`;

// ─── بناء الوكيل ────────────────────────────────────────────

async function buildAgent() {
  const config = buildAgentConfig();

  // التحقق من البيئة
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    log("خطأ", C.red, `مفاتيح API مفقودة: ${envCheck.missing.join(", ")}`);
    log("خطأ", C.red, "أنشئ ملف .env بناءً على .env.example");
    process.exit(1);
  }

  // إنشاء عميل MCP للاتصال بخادم OCR
  let mcpClient: Awaited<ReturnType<typeof createOcrMcpClient>> | null = null;
  let mcpTools: ToolSet = {};

  try {
    mcpClient = await createOcrMcpClient(config.mcpServerPath);
    mcpTools = await mcpClient.tools();
    log(
      "أدوات",
      C.cyan,
      `تم تحميل ${Object.keys(mcpTools).length} أداة من خادم MCP`
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log("تحذير", C.yellow, `فشل الاتصال بخادم MCP: ${msg}`);
    log("تحذير", C.yellow, "الوكيل سيعمل بالأدوات المحلية فقط");
  }

  // دمج كل الأدوات: محلية + مهارة (skill) + MCP
  const allTools: ToolSet = {
    // أدوات نظام الملفات
    classify_pdf: classifyPdfTool,
    read_file: readFileTool,
    write_file: writeFileTool,
    list_files: listFilesTool,
    // أدوات المهارة (skill scripts)
    skill_classify_pdf: skillClassifyPdf,
    skill_ocr_mistral: skillOcrMistral,
    skill_write_output: skillWriteOutput,
    skill_enhance_images: skillEnhanceImages,
    // أدوات MCP (خادم OCR المتكامل)
    ...mcpTools,
  };

  const skillCount = 4;
  const localCount = 4;
  const mcpCount = Object.keys(mcpTools).length;
  log(
    "وكيل",
    C.green,
    `إجمالي الأدوات: ${Object.keys(allTools).length} (${skillCount} مهارة + ${localCount} محلية + ${mcpCount} MCP)`
  );

  // بناء الوكيل
  const agent = new ToolLoopAgent<never, ToolSet>({
    model: openai(config.agentModel),
    instructions: AGENT_INSTRUCTIONS,
    tools: allTools,
    stopWhen: stepCountIs(config.maxSteps),

    // ─── دوال رد النداء ─────────────────────────────
    onStepFinish: ({ text, toolCalls }) => {
      if (toolCalls && toolCalls.length > 0) {
        for (const call of toolCalls) {
          const callArgs =
            "input" in call
              ? (call as Record<string, unknown>).input
              : (call as Record<string, unknown>).args;
          log(
            "أداة",
            C.cyan,
            `← ${call.toolName}(${JSON.stringify(callArgs ?? {}).substring(0, 100)}...)`
          );
        }
      }
      if (text) {
        log("وكيل", C.dim, text.substring(0, 200));
      }
    },
  });

  return { agent, mcpClient, config };
}

// ─── واجهة سطر الأوامر ──────────────────────────────────────

function buildUserPrompt(args: string[], defaultInputDir: string): string {
  if (args.length === 0) {
    log("وضع", C.yellow, "لم يُحدد ملف — سيتم سرد ملفات PDF المتاحة");
    return `اسرد ملفات PDF في المجلد: ${defaultInputDir}`;
  }

  if (args[0] === "--prompt" || args[0] === "-p") {
    return args.slice(1).join(" ");
  }

  const pdfPath = resolve(args[0]);
  const outputFormat = args.includes("--txt") ? "txt" : "md";
  const outputPath = args.find((a) => a.startsWith("--output="))?.split("=")[1];

  return `حوّل ملف PDF التالي إلى ${outputFormat}:
المسار: ${pdfPath}${outputPath ? `\nمسار الإخراج: ${outputPath}` : ""}

الخطوات:
1. صنّف الملف أولاً
2. إذا كان ممسوحاً أو مختلطاً — نفّذ OCR عبر convert_document_to_markdown
3. اكتب النتيجة في ملف ${outputFormat}
4. أبلغني بالنتائج`;
}

async function main(): Promise<void> {
  log("بدء", C.green, "وكيل OCR العربي — Vercel AI SDK v6");
  log("بدء", C.dim, "─".repeat(50));

  const { agent, mcpClient, config } = await buildAgent();
  const userPrompt = buildUserPrompt(
    process.argv.slice(2),
    config.defaultInputDir
  );

  log("طلب", C.blue, userPrompt.substring(0, 150));
  log("بدء", C.dim, "─".repeat(50));

  try {
    // تشغيل الوكيل
    const result = await agent.generate({
      prompt: userPrompt,
    });

    // عرض النتيجة النهائية
    process.stderr.write("\n");
    log("نتيجة", C.green, "─".repeat(50));
    process.stderr.write(`${result.text ?? ""}\n`);
    log("نتيجة", C.green, "─".repeat(50));

    // إحصائيات الاستخدام
    const usage =
      result.usage && typeof result.usage === "object"
        ? (result.usage as Record<string, number>)
        : undefined;
    if (usage) {
      const input = usage["promptTokens"] ?? usage["inputTokens"] ?? 0;
      const output = usage["completionTokens"] ?? usage["outputTokens"] ?? 0;
      const total = usage["totalTokens"] ?? input + output;
      log(
        "إحصائيات",
        C.dim,
        `الرموز: ${input} إدخال + ${output} إخراج = ${total} إجمالي`
      );
    }
    log("إحصائيات", C.dim, `الخطوات: ${result.steps?.length ?? 0}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log("خطأ", C.red, `فشل تشغيل الوكيل: ${msg}`);
    if (error instanceof Error && error.stack) {
      process.stderr.write(`${error.stack}\n`);
    }
    process.exitCode = 1;
  } finally {
    // تنظيف اتصال MCP
    if (mcpClient) {
      try {
        await mcpClient.close();
        log("MCP", C.dim, "تم إغلاق الاتصال");
      } catch {
        // تجاهل أخطاء الإغلاق
      }
    }
  }
}

// ─── نقطة الدخول ────────────────────────────────────────────

main().catch((error) => {
  const details =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`خطأ غير متوقع: ${details}\n`);
  process.exit(1);
});
