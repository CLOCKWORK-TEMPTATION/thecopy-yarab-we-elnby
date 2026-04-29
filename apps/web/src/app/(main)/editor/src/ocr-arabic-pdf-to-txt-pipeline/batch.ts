#!/usr/bin/env npx tsx
/**
 * batch.ts — معالجة دفعية لعدة ملفات PDF
 *
 * يقرأ مجلداً كاملاً ويُعالج جميع ملفات PDF الموجودة فيه.
 * يستخدم نفس بنية الوكيل مع تكرار على كل ملف.
 *
 * الاستخدام:
 *   npx tsx src/batch.ts /path/to/pdf/folder
 *   npx tsx src/batch.ts /path/to/pdf/folder --output /path/to/output --format txt
 */

import { readdir, mkdir } from "node:fs/promises";
import { join, extname, basename, resolve } from "node:path";

import { createMCPClient } from "@ai-sdk/mcp";
import { openai } from "@ai-sdk/openai";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";
import { generateText, stepCountIs, type LanguageModel } from "ai";

import { buildAgentConfig, validateEnvironment } from "./config";

import type { MCPClient } from "@ai-sdk/mcp";

// ─── ألوان الطرفية ──────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
} as const;

function log(prefix: string, color: string, msg: string): void {
  console.error(`${color}${C.bold}[${prefix}]${C.reset} ${msg}`);
}

function createChildEnv(extra: Record<string, string>): Record<string, string> {
  const base = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );

  return {
    ...base,
    ...extra,
  };
}

// ─── تحليل المعاملات ────────────────────────────────────────

interface BatchArgs {
  inputDir: string;
  outputDir: string;
  format: "txt" | "md";
}

function parseBatchArgs(): BatchArgs {
  const args = process.argv.slice(2);
  const inputArg = args[0];

  if (inputArg === undefined) {
    console.error(
      "الاستخدام: npx tsx src/batch.ts <مجلد_PDF> [--output <مجلد>] [--format txt|md]"
    );
    process.exit(1);
  }

  const inputDir = resolve(inputArg);
  let outputDir = "";
  let format: "txt" | "md" = "md";

  for (let i = 1; i < args.length; i++) {
    const token = args[i];
    const next = args[i + 1];

    if (token === "--output" && next !== undefined) {
      outputDir = resolve(next);
      i += 1;
    } else if (token === "--format" && next !== undefined) {
      format = next === "txt" ? "txt" : "md";
      i += 1;
    }
  }

  if (!outputDir) {
    outputDir = join(inputDir, "ocr_output");
  }

  return { inputDir, outputDir, format };
}

// ─── إنشاء عميل MCP ─────────────────────────────────────────

async function createBatchMcpClient(mcpServerPath: string): Promise<{
  mcpClient: MCPClient;
  mcpTools: Awaited<ReturnType<MCPClient["tools"]>>;
}> {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", mcpServerPath],
    env: createChildEnv({
      MISTRAL_API_KEY: process.env["MISTRAL_API_KEY"] ?? "",
      OPENAI_API_KEY: process.env["OPENAI_API_KEY"] ?? "",
    }),
  });
  const mcpClient = await createMCPClient({ transport });
  const mcpTools = await mcpClient.tools();
  return { mcpClient, mcpTools };
}

// ─── نوع نتيجة الملف ────────────────────────────────────────

interface FileResult {
  file: string;
  success: boolean;
  output?: string;
  error?: string;
  timeMs: number;
}

// ─── معالجة ملف واحد ────────────────────────────────────────

async function processSinglePdf(
  pdfPath: string,
  outputPath: string,
  agentModel: string,
  mcpTools: Awaited<ReturnType<MCPClient["tools"]>>
): Promise<void> {
  await generateText({
    model: openai(agentModel) as unknown as LanguageModel,
    tools: mcpTools,
    stopWhen: stepCountIs(5),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `حوّل هذا الملف إلى markdown:
inputPath: ${pdfPath}
outputPath: ${outputPath}
استخدم الإعدادات الافتراضية للتطبيع.`,
          },
        ],
      },
    ],
  });
}

// ─── طباعة ملخص النتائج ─────────────────────────────────────

function printResultsSummary(
  results: FileResult[],
  pdfCount: number,
  outputDir: string
): void {
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalTimeMs = results.reduce((sum, r) => sum + r.timeMs, 0);

  console.error();
  log("ملخص", C.green, "═".repeat(50));
  log("ملخص", C.green, `الإجمالي: ${pdfCount} ملف`);
  log("ملخص", C.green, `نجاح: ${succeeded} | فشل: ${failed}`);
  log("ملخص", C.green, `الوقت الكلي: ${(totalTimeMs / 1000).toFixed(1)} ثانية`);
  log("ملخص", C.green, `مجلد الإخراج: ${outputDir}`);

  if (failed > 0) {
    log("ملخص", C.red, "الملفات الفاشلة:");
    for (const r of results.filter((r) => !r.success)) {
      log("ملخص", C.red, `  - ${r.file}: ${r.error}`);
    }
  }
}

// ─── المنطق الرئيسي ────────────────────────────────────────

async function main(): Promise<void> {
  const { inputDir, outputDir, format } = parseBatchArgs();
  const config = buildAgentConfig();

  log("دفعي", C.green, `مجلد الإدخال: ${inputDir}`);
  log("دفعي", C.green, `مجلد الإخراج: ${outputDir}`);
  log("دفعي", C.green, `الصيغة: ${format.toUpperCase()}`);

  // التحقق من البيئة
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    log("خطأ", C.red, `مفاتيح مفقودة: ${envCheck.missing.join(", ")}`);
    process.exit(1);
  }

  // اكتشاف ملفات PDF
  const entries = await readdir(inputDir);
  const pdfFiles = entries.filter((f) => extname(f).toLowerCase() === ".pdf");

  if (pdfFiles.length === 0) {
    log("خطأ", C.yellow, "لا توجد ملفات PDF في المجلد المحدد");
    process.exit(0);
  }

  log("دفعي", C.cyan, `تم اكتشاف ${pdfFiles.length} ملف PDF`);

  // إنشاء مجلد الإخراج
  await mkdir(outputDir, { recursive: true });

  // إنشاء عميل MCP
  let mcpClient: MCPClient | null = null;
  let mcpTools: Awaited<ReturnType<MCPClient["tools"]>> = {};

  try {
    const clientResult = await createBatchMcpClient(config.mcpServerPath);
    mcpClient = clientResult.mcpClient;
    mcpTools = clientResult.mcpTools;
    log("MCP", C.green, "تم الاتصال بخادم OCR");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log("خطأ", C.red, `فشل الاتصال بخادم MCP: ${msg}`);
    process.exit(1);
  }

  // معالجة كل ملف
  const results: FileResult[] = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfFile = pdfFiles[i];
    if (pdfFile === undefined) {
      continue;
    }
    const pdfPath = join(inputDir, pdfFile);
    const outputName = basename(pdfFile, ".pdf") + "." + format;
    const outputPath = join(outputDir, outputName);

    log("تقدم", C.cyan, `[${i + 1}/${pdfFiles.length}] ${pdfFile}`);

    const startTime = Date.now();

    try {
      await processSinglePdf(pdfPath, outputPath, config.agentModel, mcpTools);

      const elapsed = Date.now() - startTime;
      results.push({
        file: pdfFile,
        success: true,
        output: outputPath,
        timeMs: elapsed,
      });
      log(
        "نجاح",
        C.green,
        `${pdfFile} → ${outputName} (${(elapsed / 1000).toFixed(1)}ث)`
      );
    } catch (error: unknown) {
      const elapsed = Date.now() - startTime;
      const msg = error instanceof Error ? error.message : String(error);
      results.push({
        file: pdfFile,
        success: false,
        error: msg,
        timeMs: elapsed,
      });
      log("فشل", C.red, `${pdfFile}: ${msg}`);
    }
  }

  printResultsSummary(results, pdfFiles.length, outputDir);

  // تنظيف
  if (mcpClient) {
    try {
      await mcpClient.close();
    } catch {
      // تجاهل
    }
  }

  // رمز الخروج
  const failedCount = results.filter((r) => !r.success).length;
  process.exitCode = failedCount > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error("خطأ غير متوقع:", error);
  process.exit(1);
});
