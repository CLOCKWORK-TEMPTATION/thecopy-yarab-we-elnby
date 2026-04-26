#!/usr/bin/env node
/**
 * lint-chunked.mjs — يقسّم lint على مجموعات منفصلة لتفادي OOM في برنامج
 * typed-lint عندما يكون hosts node heap محدوداً (~4-8GB).
 *
 * السبب: مشروع typescript-eslint يبني program كاملاً للنوع لكل ملف من
 * tsconfig.check.json (526 ملف TS داخل src). البرنامج المُحمَّل دفعة واحدة
 * يتجاوز 8GB heap على بيئتنا، فيتوقف بـ FATAL ERROR mark-compacts.
 *
 * هذا السكربت يشغّل eslint مرة واحدة لكل مجموعة من المسارات أعلى مستوى داخل
 * src/ بالإضافة إلى scripts/ + agents/ + examples/ + mcp-server.ts، ويجمع
 * نتائج الخروج. لا يُضعِف أي قاعدة فحص: نفس eslint.config.js + نفس tsconfig
 * + نفس الملفات. التغيير فقط هو تجزئة الاستدعاء.
 *
 * البقاء داخل عقد الفحص: إذا فشل أي chunk، تمرّ النتيجة كفشل كلي (exit ≠ 0)،
 * وتظهر كل الأخطاء/التحذيرات لكل المجموعات.
 *
 * استخدام:
 *   node scripts/lint-chunked.mjs                # القياسي
 *   node scripts/lint-chunked.mjs --fix          # وضع الإصلاح
 *   node scripts/lint-chunked.mjs --max-warnings=0  # وضع strict
 *
 * أي flag يُمَرَّر إلى eslint كما هو.
 */

import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "..");

/**
 * Top-level مسارات يجب lint-ها. تُمَرَّر إلى eslint كأنماط مسار صريحة.
 * نتجنّب "." لأن ذلك يُحمّل البرنامج كاملاً ويسبب OOM.
 */
function discoverChunks() {
  const chunks = [];
  const srcDir = join(backendRoot, "src");
  if (existsSync(srcDir)) {
    for (const entry of readdirSync(srcDir)) {
      const full = join(srcDir, entry);
      if (statSync(full).isDirectory()) {
        chunks.push(`src/${entry}`);
      } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
        chunks.push(`src/${entry}`);
      }
    }
  }

  for (const topLevel of ["scripts", "agents", "examples"]) {
    const full = join(backendRoot, topLevel);
    if (existsSync(full) && statSync(full).isDirectory()) {
      const hasTs = readdirSync(full).some(
        (f) => f.endsWith(".ts") || f.endsWith(".tsx") || statSync(join(full, f)).isDirectory()
      );
      if (hasTs) chunks.push(topLevel);
    }
  }

  const mcp = join(backendRoot, "mcp-server.ts");
  if (existsSync(mcp)) chunks.push("mcp-server.ts");

  return chunks;
}

function runEslint(target, extraArgs) {
  return new Promise((resolveRun) => {
    const args = [
      "--max-old-space-size=8192",
      join(backendRoot, "node_modules", "eslint", "bin", "eslint.js"),
      target,
      "--cache",
      ...extraArgs,
    ];
    const proc = spawn(process.execPath, args, {
      cwd: backendRoot,
      stdio: "inherit",
    });
    proc.on("close", (code) => resolveRun(code ?? 0));
    proc.on("error", (err) => {
      console.error(`[lint-chunked] فشل تشغيل eslint على ${target}:`, err);
      resolveRun(1);
    });
  });
}

const userArgs = process.argv.slice(2);
const chunks = discoverChunks();

if (chunks.length === 0) {
  console.error("[lint-chunked] لم تُعثر على أي مجموعة للفحص");
  process.exit(1);
}

console.log(`[lint-chunked] فحص ${chunks.length} مجموعة بالتسلسل:`);
for (const c of chunks) console.log(`  - ${c}`);

let aggregateCode = 0;
for (const target of chunks) {
  console.log(`\n[lint-chunked] >>> ${target}`);
  const code = await runEslint(target, userArgs);
  if (code !== 0) {
    aggregateCode = code;
    console.log(`[lint-chunked] <<< ${target} (exit ${code})`);
  } else {
    console.log(`[lint-chunked] <<< ${target} (clean)`);
  }
}

if (aggregateCode !== 0) {
  console.error(`\n[lint-chunked] فشل lint في مجموعة أو أكثر (exit ${aggregateCode})`);
} else {
  console.log("\n[lint-chunked] جميع المجموعات نظيفة");
}

process.exit(aggregateCode);
