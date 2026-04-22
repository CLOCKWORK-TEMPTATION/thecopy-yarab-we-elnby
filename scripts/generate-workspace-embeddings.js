/**
 * generate-workspace-embeddings.js — v2.1
 *
 * نظام توليد embeddings متطور لمستودع "The Copy"
 *
 * النماذج المستخدمة (حسب توثيق Gemini API الرسمي):
 *  - PRIMARY:  gemini-embedding-2-preview  (multimodal، الأحدث، نوفمبر 2025)
 *  - FALLBACK: gemini-embedding-001        (text-only، stable، يونيو 2025)
 *
 * أفضل الممارسات المطبّقة:
 *  - task prefix في prompt لـ gemini-embedding-2-preview بدلاً من taskType
 *    → documents: "title: {path} | text: {content}"
 *    → queries:   "task: code retrieval | query: {text}"
 *  - taskType field لـ gemini-embedding-001 (RETRIEVAL_DOCUMENT / CODE_RETRIEVAL_QUERY)
 *  - Normalization يدوي للأبعاد < 3072 (3072 فقط auto-normalized)
 *  - outputDimensionality = 1536 (MTEB score 68.17 ≈ 3072 score 68.16)
 *  - chunking ذكي للملفات الكبيرة (sliding window)
 *  - Incremental mode بـ SHA-256 hash cache
 *  - CLI: --incremental | --force | --filter= | --dry-run | --search=
 *  - Retry logic مع exponential backoff
 */

const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

// ─────────────────────────────────────────────
// 1. إعداد البيئة
// ─────────────────────────────────────────────
function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  try {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...values] = trimmed.split("=");
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join("=").trim();
        }
      }
    });
    console.log("✅ Loaded .env");
  } catch {
    console.warn("⚠️  No .env file found");
  }
}
loadEnvFile();

// ─────────────────────────────────────────────
// 2. CLI Arguments
// ─────────────────────────────────────────────
const args = process.argv.slice(2);
const CLI = {
  incremental: args.includes("--incremental"),
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  filter: (args.find((a) => a.startsWith("--filter=")) || "").replace("--filter=", "") || null,
  verbose: args.includes("--verbose"),
};

if (CLI.dryRun) console.log("🔍 DRY RUN — لن يُكتب أي ملف");

// ─────────────────────────────────────────────
// 3. Config ثوابت
// ─────────────────────────────────────────────
// النماذج الرسمية حسب توثيق Gemini API
const MODELS = {
  // gemini-embedding-2-preview: multimodal، لا يدعم taskType field،
  // بدلاً منه تُضاف تعليمة المهمة كـ prefix في النص
  PRIMARY: "gemini-embedding-2-preview",
  // gemini-embedding-001: text-only، stable، يدعم taskType field
  FALLBACK: "gemini-embedding-001",
};

// Task prefixes لـ gemini-embedding-2-preview (asymmetric retrieval)
const TASK_PREFIX = {
  DOCUMENT: (title, content) => `title: ${title} | text: ${content}`,
  QUERY: (q) => `task: code retrieval | query: ${q}`,
  SEARCH_QUERY: (q) => `task: search result | query: ${q}`,
};

// taskType values لـ gemini-embedding-001
const TASK_TYPE_001 = {
  DOCUMENT: "RETRIEVAL_DOCUMENT",
  CODE_QUERY: "CODE_RETRIEVAL_QUERY",
  QUERY: "RETRIEVAL_QUERY",
};

const CONFIG = {
  model: MODELS.PRIMARY,
  // 1536: MTEB 68.17 ≈ 3072 MTEB 68.16 — أفضل balance بين الجودة والتخزين
  // ملاحظة: 3072 فقط auto-normalized؛ ما دونه يحتاج normalization يدوي
  embeddingDimension: 1536,
  requiresNormalization: true, // صحيح لأي dimension < 3072
  batchSize: 5,
  chunkMaxChars: 3000,
  chunkOverlapChars: 300,
  maxRetries: 3,
  retryDelayMs: 1200,
  rateLimitDelayMs: 200,
  indexPath: path.join(process.cwd(), "WORKSPACE-EMBEDDING-INDEX.json"),
  summaryPath: path.join(process.cwd(), "WORKSPACE-EMBEDDING-SUMMARY.md"),
  hashCachePath: path.join(process.cwd(), ".embedding-hash-cache.json"),
};

const SOURCE_ROOTS = [
  { base: "apps/web/src", type: "source-web", extensions: [".ts", ".tsx"] },
  { base: "apps/backend/src", type: "source-backend", extensions: [".ts"] },
];

// كل حزمة لها src/
const PACKAGE_NAMES = [
  "breakapp", "cinematography", "core-memory",
  "prompt-engineering", "shared", "ui",
];
PACKAGE_NAMES.forEach((pkg) => {
  SOURCE_ROOTS.push({
    base: `packages/${pkg}/src`,
    type: `source-pkg-${pkg}`,
    extensions: [".ts", ".tsx"],
  });
});

const PRIORITY_FILES = [
  { path: "README.md", type: "docs" },
  { path: "package.json", type: "config" },
  { path: "turbo.json", type: "config" },
  { path: "pnpm-workspace.yaml", type: "config" },
  { path: "docs/ARCHITECTURE.md", type: "docs" },
  { path: "docs/API.md", type: "docs" },
  { path: "docs/FRONTEND-BACKEND-STATE.md", type: "docs" },
  { path: "apps/web/package.json", type: "config" },
  { path: "apps/backend/package.json", type: "config" },
  { path: "AGENTS.md", type: "docs" },
  { path: ".repo-agent/OPERATING-CONTRACT.md", type: "docs" },
  { path: "output/session-state.md", type: "docs" },
];

// ─────────────────────────────────────────────
// 4. Gemini Client
// ─────────────────────────────────────────────
const apiKey = process.env.GOOGLE_GENAI_API_KEY;
let ai = null;
let apiAvailable = false;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn("⚠️  GOOGLE_GENAI_API_KEY not set — سيُستخدم mock embeddings");
}

async function checkGeminiAvailability() {
  if (!ai) return false;

  // جرّب النموذج الأساسي gemini-embedding-2-preview
  try {
    // gemini-embedding-2-preview لا يقبل taskType — نستخدم task prefix في النص
    await ai.models.embedContent({
      model: MODELS.PRIMARY,
      contents: [TASK_PREFIX.DOCUMENT("test", "hello world")],
      config: { outputDimensionality: 128 },
    });
    console.log(`✅ Gemini API متاحة — النموذج: ${MODELS.PRIMARY}`);
    CONFIG.model = MODELS.PRIMARY;
    CONFIG.useTaskPrefix = true;   // استخدم prefix بدل taskType
    CONFIG.requiresNormalization = true; // 1536 < 3072 → يحتاج normalization
    return true;
  } catch (primaryErr) {
    console.warn(`⚠️  ${MODELS.PRIMARY} غير متاح: ${primaryErr.message}`);
  }

  // fallback: gemini-embedding-001 (يدعم taskType field)
  try {
    await ai.models.embedContent({
      model: MODELS.FALLBACK,
      contents: ["hello world"],
      config: {
        taskType: TASK_TYPE_001.DOCUMENT,
        outputDimensionality: 128,
      },
    });
    console.log(`✅ Gemini API متاحة — النموذج: ${MODELS.FALLBACK} (fallback)`);
    CONFIG.model = MODELS.FALLBACK;
    CONFIG.useTaskPrefix = false;  // gemini-embedding-001 يستخدم taskType
    CONFIG.requiresNormalization = true;
    return true;
  } catch (fallbackErr) {
    console.warn(`⚠️  ${MODELS.FALLBACK} غير متاح: ${fallbackErr.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────
// 5. Hash Cache (Incremental)
// ─────────────────────────────────────────────
function loadHashCache() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG.hashCachePath, "utf-8"));
  } catch {
    return {};
  }
}

function saveHashCache(cache) {
  if (!CLI.dryRun) {
    fs.writeFileSync(CONFIG.hashCachePath, JSON.stringify(cache, null, 2), "utf-8");
  }
}

function fileHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// ─────────────────────────────────────────────
// 6. جمع المحتوى
// ─────────────────────────────────────────────

/**
 * تقسيم النص إلى chunks بـ sliding window
 */
function chunkText(text, filePath) {
  const chunks = [];
  const maxLen = CONFIG.chunkMaxChars;
  const overlap = CONFIG.chunkOverlapChars;

  if (text.length <= maxLen) {
    return [{ path: filePath, chunkIndex: 0, totalChunks: 1, content: text }];
  }

  let offset = 0;
  let chunkIndex = 0;
  while (offset < text.length) {
    const slice = text.slice(offset, offset + maxLen);
    chunks.push({
      path: filePath,
      chunkIndex,
      totalChunks: -1, // يُحدَّث لاحقاً
      content: slice,
    });
    offset += maxLen - overlap;
    chunkIndex++;
  }
  chunks.forEach((c) => (c.totalChunks = chunks.length));
  return chunks;
}

/**
 * اقرأ ملفات مجلد بشكل recursion مع حد عمق
 */
async function collectFromDirectory(baseRelPath, fileType, extensions, maxDepth = 6) {
  const rootDir = process.cwd();
  const absBase = path.join(rootDir, baseRelPath);
  const chunks = [];

  async function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await fsPromises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__mocks__") continue;

      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, "/");

      if (CLI.filter && !relPath.includes(CLI.filter)) continue;

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (extensions.includes(path.extname(entry.name))) {
        try {
          const content = await fsPromises.readFile(fullPath, "utf-8");
          const textChunks = chunkText(content, relPath);

          textChunks.forEach((c) => {
            chunks.push({
              ...c,
              type: fileType,
              metadata: {
                size: content.length,
                extension: path.extname(entry.name),
                package: baseRelPath.split("/")[1] || baseRelPath,
              },
            });
          });
        } catch {
          // تجاهل ملفات binary أو غير قابلة للقراءة
        }
      }
    }
  }

  try {
    await walk(absBase, 0);
  } catch {
    // المجلد غير موجود — تجاهل
  }
  return chunks;
}

async function collectPriorityFiles() {
  const rootDir = process.cwd();
  const chunks = [];

  for (const { path: relPath, type } of PRIORITY_FILES) {
    const fullPath = path.join(rootDir, relPath);
    try {
      const content = await fsPromises.readFile(fullPath, "utf-8");
      const textChunks = chunkText(content, relPath);
      textChunks.forEach((c) => {
        chunks.push({
          ...c,
          type,
          metadata: {
            size: content.length,
            lastModified: fs.statSync(fullPath).mtime.toISOString(),
          },
        });
      });
    } catch {
      if (CLI.verbose) console.warn(`⚠️  تعذّر قراءة ${relPath}`);
    }
  }
  return chunks;
}

async function collectWorkspaceContent() {
  console.log("📁 جمع المحتوى...");
  const all = [];

  // أولوية
  const priority = await collectPriorityFiles();
  all.push(...priority);
  console.log(`  ✔ ملفات الأولوية: ${priority.length} chunk`);

  // كود المصدر
  let srcTotal = 0;
  for (const root of SOURCE_ROOTS) {
    const chunks = await collectFromDirectory(root.base, root.type, root.extensions);
    srcTotal += chunks.length;
    all.push(...chunks);
  }
  console.log(`  ✔ كود المصدر: ${srcTotal} chunk`);

  return all;
}

// ─────────────────────────────────────────────
// 7. توليد الـ Embeddings
// ─────────────────────────────────────────────

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * normalize vector للـ L2 norm
 * مطلوب لأي dimension < 3072 حسب توثيق Gemini API الرسمي
 * "For other dimensions, including 768 and 1536, you need to normalize the embeddings"
 */
function normalizeVector(values) {
  const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return values;
  return values.map((v) => v / magnitude);
}

/**
 * بناء request حسب النموذج المُختار:
 *  - gemini-embedding-2-preview: task prefix في النص (لا taskType)
 *  - gemini-embedding-001: taskType field
 */
function buildEmbedRequest(contents, isQuery = false) {
  const baseConfig = { outputDimensionality: CONFIG.embeddingDimension };

  if (CONFIG.useTaskPrefix) {
    // gemini-embedding-2-preview — task prefix مُدمج بالفعل في النص عند الاستدعاء
    return {
      model: CONFIG.model,
      contents,
      config: baseConfig,
    };
  } else {
    // gemini-embedding-001 — taskType field
    return {
      model: CONFIG.model,
      contents,
      config: {
        ...baseConfig,
        taskType: isQuery ? TASK_TYPE_001.CODE_QUERY : TASK_TYPE_001.DOCUMENT,
      },
    };
  }
}

async function embedWithRetry(contents, isQuery = false, attempt = 0) {
  try {
    const request = buildEmbedRequest(contents, isQuery);
    const response = await ai.models.embedContent(request);

    return response.embeddings.map((e) => {
      const values = e.values;
      // normalization مطلوب لأي dimension < 3072
      return CONFIG.requiresNormalization ? normalizeVector(values) : values;
    });
  } catch (err) {
    if (attempt < CONFIG.maxRetries) {
      const delay = CONFIG.retryDelayMs * Math.pow(2, attempt);
      console.warn(`  ⟳ retry ${attempt + 1}/${CONFIG.maxRetries} بعد ${delay}ms`);
      await sleep(delay);
      return embedWithRetry(contents, isQuery, attempt + 1);
    }
    throw err;
  }
}

async function generateBatchEmbeddings(chunks, hashCache) {
  const results = [];
  const batchSize = CONFIG.batchSize;
  const total = chunks.length;
  let skipped = 0;

  for (let i = 0; i < total; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    // فلترة الـ cache
    const toEmbed = [];
    const cached = [];

    for (const chunk of batch) {
      const cacheKey = `${chunk.path}:${chunk.chunkIndex}`;
      const hash = fileHash(chunk.content);
      if (
        CLI.incremental &&
        !CLI.force &&
        hashCache[cacheKey] &&
        hashCache[cacheKey].hash === hash &&
        hashCache[cacheKey].embedding
      ) {
        cached.push({ chunk, embedding: hashCache[cacheKey].embedding });
        skipped++;
      } else {
        toEmbed.push({ chunk, hash, cacheKey });
      }
    }

    cached.forEach(({ chunk, embedding }) => {
      results.push({ ...chunk, embedding, cached: true });
    });

    if (toEmbed.length === 0) continue;

    process.stdout.write(`  📦 batch ${batchNum}/${totalBatches} (${toEmbed.length} جديد) ... `);

    if (CLI.dryRun) {
      toEmbed.forEach(({ chunk }) => results.push({ ...chunk, embedding: null, dryRun: true }));
      console.log("SKIP (dry-run)");
      continue;
    }

    try {
      const contents = toEmbed.map(({ chunk }) => {
        const title = chunk.chunkIndex > 0
          ? `${chunk.path} (chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks})`
          : chunk.path;
        const text = chunk.content.slice(0, CONFIG.chunkMaxChars);

        if (CONFIG.useTaskPrefix) {
          // gemini-embedding-2-preview: صيغة asymmetric retrieval الرسمية
          // "title: {title} | text: {content}"
          return TASK_PREFIX.DOCUMENT(title, text);
        } else {
          // gemini-embedding-001: النص مباشرة، taskType يُمرَّر في config
          return `${title}\n\n${text}`;
        }
      });

      const vectors = await embedWithRetry(contents, false);

      toEmbed.forEach(({ chunk, hash, cacheKey }, idx) => {
        const embedding = vectors[idx];
        results.push({ ...chunk, embedding });
        // حفظ في cache
        hashCache[cacheKey] = { hash, embedding };
      });

      console.log("✓");
      await sleep(CONFIG.rateLimitDelayMs);
    } catch (err) {
      console.log(`✗ (${err.message})`);
      toEmbed.forEach(({ chunk }) => {
        results.push({ ...chunk, embedding: null, error: err.message });
      });
    }
  }

  if (skipped > 0) console.log(`  ⚡ تخطّى ${skipped} chunk من الـ cache`);
  return results;
}

// ─────────────────────────────────────────────
// 8. Mock Embeddings
// ─────────────────────────────────────────────

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return Math.abs(h);
}

function deterministicVector(seed, dim) {
  const v = new Array(dim);
  let s = seed;
  for (let i = 0; i < dim; i++) {
    s = (s * 9301 + 49297) % 233280;
    v[i] = (s / 233280) * 2 - 1;
  }
  const mag = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  return v.map((x) => x / mag);
}

async function generateMockEmbeddings(chunks) {
  console.log("🎭 Mock embeddings (API غير متاحة)");
  const dim = CONFIG.embeddingDimension;
  return chunks.map((chunk) => ({
    ...chunk,
    embedding: deterministicVector(simpleHash(chunk.path + chunk.content.slice(0, 100)), dim),
    mock: true,
  }));
}

// ─────────────────────────────────────────────
// 9. بناء الـ Index
// ─────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function buildSearchIndex(embeddings) {
  return embeddings
    .filter((e) => e.embedding)
    .map((e) => ({
      path: e.path,
      chunkIndex: e.chunkIndex ?? 0,
      totalChunks: e.totalChunks ?? 1,
      type: e.type,
      content: e.content.slice(0, 400),
      embedding: e.embedding,
      metadata: e.metadata,
    }));
}

function analyzeVectors(embeddings) {
  const valid = embeddings.filter((e) => e.embedding);
  if (valid.length === 0) return null;

  const dim = valid[0].embedding.length;
  const mean = new Array(dim).fill(0);
  valid.forEach((e) => e.embedding.forEach((v, i) => (mean[i] += v / valid.length)));
  const avg = mean.reduce((s, v) => s + Math.abs(v), 0) / dim;

  return {
    dimensions: dim,
    totalChunks: valid.length,
    averageMeanComponent: avg,
    mockCount: embeddings.filter((e) => e.mock).length,
    cachedCount: embeddings.filter((e) => e.cached).length,
    errorCount: embeddings.filter((e) => e.error).length,
  };
}

async function buildIndex(chunks, embeddings) {
  // تجميع per-file
  const byFile = {};
  embeddings.forEach((e) => {
    if (!byFile[e.path]) byFile[e.path] = [];
    byFile[e.path].push(e);
  });

  const fileCount = Object.keys(byFile).length;

  return {
    version: "2.0.0",
    metadata: {
      generated: new Date().toISOString(),
      model: CONFIG.model,
      embeddingDimension: CONFIG.embeddingDimension,
      totalChunks: chunks.length,
      totalFiles: fileCount,
      totalEmbeddings: embeddings.filter((e) => e.embedding).length,
      incremental: CLI.incremental,
      cliArgs: CLI,
    },
    searchIndex: buildSearchIndex(embeddings),
    summary: {
      byType: Object.entries(
        embeddings.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {})
      ).map(([type, count]) => ({ type, count })),
      successRate:
        ((embeddings.filter((e) => e.embedding).length / embeddings.length) * 100).toFixed(1) + "%",
    },
    vectorAnalysis: analyzeVectors(embeddings),
  };
}

// ─────────────────────────────────────────────
// 10. Semantic Search Utility
// ─────────────────────────────────────────────

/**
 * بحث دلالي بسيط يُقرأ من WORKSPACE-EMBEDDING-INDEX.json
 * الاستخدام: node scripts/generate-workspace-embeddings.js --search="authentication flow"
 */
async function runSemanticSearch(query) {
  const idxRaw = fs.readFileSync(CONFIG.indexPath, "utf-8");
  const idx = JSON.parse(idxRaw);
  const searchIndex = idx.searchIndex;

  if (!ai) {
    console.error("❌ مطلوب GOOGLE_GENAI_API_KEY للبحث الدلالي");
    return;
  }

  // تحقق من النموذج المُستخدم في الـ index
  const indexModel = idx.metadata?.model || MODELS.PRIMARY;
  const usingPreview = indexModel === MODELS.PRIMARY;

  console.log(`🔍 بحث عن: "${query}" (النموذج: ${indexModel})`);

  // صيغة query حسب النموذج:
  // gemini-embedding-2-preview: "task: code retrieval | query: {text}"
  // gemini-embedding-001: النص مباشرة مع taskType: CODE_RETRIEVAL_QUERY
  let queryVec;
  if (usingPreview) {
    const formattedQuery = TASK_PREFIX.QUERY(query);
    const response = await ai.models.embedContent({
      model: MODELS.PRIMARY,
      contents: [formattedQuery],
      config: { outputDimensionality: CONFIG.embeddingDimension },
    });
    const raw = response.embeddings[0].values;
    queryVec = normalizeVector(raw);
  } else {
    const response = await ai.models.embedContent({
      model: MODELS.FALLBACK,
      contents: [query],
      config: {
        taskType: TASK_TYPE_001.CODE_QUERY,
        outputDimensionality: CONFIG.embeddingDimension,
      },
    });
    const raw = response.embeddings[0].values;
    queryVec = normalizeVector(raw);
  }

  const scored = searchIndex
    .map((item) => ({ ...item, score: cosineSimilarity(queryVec, item.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  console.log("\n📊 أفضل 10 نتائج:\n");
  scored.forEach((r, i) => {
    console.log(`  ${i + 1}. [${(r.score * 100).toFixed(1)}%] ${r.path}:chunk${r.chunkIndex}`);
    console.log(`     ${r.content.slice(0, 120).replace(/\n/g, " ")}\n`);
  });
}

// ─────────────────────────────────────────────
// 11. حفظ وتقرير
// ─────────────────────────────────────────────

async function saveIndex(index) {
  if (CLI.dryRun) {
    console.log("🔍 DRY-RUN: لن يُكتب الـ index");
    return;
  }
  await fsPromises.writeFile(CONFIG.indexPath, JSON.stringify(index, null, 2), "utf-8");
  console.log(`💾 Index محفوظ: ${CONFIG.indexPath}`);

  const md = buildMarkdownReport(index);
  await fsPromises.writeFile(CONFIG.summaryPath, md, "utf-8");
  console.log(`📄 Summary: ${CONFIG.summaryPath}`);
}

function buildMarkdownReport(idx) {
  const { metadata, summary, vectorAnalysis: va } = idx;
  const mock = va?.mockCount || 0;
  const cached = va?.cachedCount || 0;
  const errors = va?.errorCount || 0;

  return `# Workspace Embedding Index — The Copy
> Generated: ${new Date(metadata.generated).toLocaleString("ar-EG")}  
> Model: \`${metadata.model}\` | Dimensions: ${metadata.embeddingDimension}  
> Total Chunks: ${metadata.totalChunks} | Files: ${metadata.totalFiles} | Embedded: ${metadata.totalEmbeddings}  
> Mode: ${metadata.incremental ? "**Incremental**" : "Full"} | Success: ${summary.successRate}

---

## محتوى المستودع

| النوع | عدد الـ chunks |
|-------|---------------|
${summary.byType.map((r) => `| ${r.type} | ${r.count} |`).join("\n")}

---

## إحصائيات التضمين

| المعيار | القيمة |
|---------|--------|
| الأبعاد | ${va?.dimensions ?? "—"} |
| إجمالي chunks | ${va?.totalChunks ?? 0} |
| Mock | ${mock} |
| من الـ Cache | ${cached} |
| أخطاء | ${errors} |

---

## النماذج المستخدمة

| النموذج | الوضع | صيغة الـ query | صيغة الـ document |
|---------|-------|----------------|-------------------|
| \`gemini-embedding-2-preview\` | Primary | \`task: code retrieval | query: {text}\` | \`title: {path} | text: {content}\` |
| \`gemini-embedding-001\` | Fallback | \`taskType: CODE_RETRIEVAL_QUERY\` | \`taskType: RETRIEVAL_DOCUMENT\` |

> الأبعاد **1536** (MTEB 68.17) مع normalization تلقائي — أفضل balance جودة/تخزين.

## الاستخدام

\`\`\`bash
# توليد كامل
node scripts/generate-workspace-embeddings.js

# incremental (يُعيد فقط الملفات المتغيرة)
node scripts/generate-workspace-embeddings.js --incremental

# فلترة على package معين
node scripts/generate-workspace-embeddings.js --filter=packages/editor

# بحث دلالي (code retrieval query تلقائياً)
node scripts/generate-workspace-embeddings.js --search="authentication flow"

# dry run (بدون كتابة)
node scripts/generate-workspace-embeddings.js --dry-run
\`\`\`
`;
}

// ─────────────────────────────────────────────
// 12. Main
// ─────────────────────────────────────────────

async function main() {
  // وضع البحث
  const searchArg = args.find((a) => a.startsWith("--search="));
  if (searchArg) {
    await runSemanticSearch(searchArg.replace("--search=", ""));
    return;
  }

  console.log(`\n🚀 توليد Workspace Embeddings — v2.0`);
  console.log(`   Mode: ${CLI.incremental ? "incremental" : CLI.force ? "force" : "auto"}`);
  if (CLI.filter) console.log(`   Filter: ${CLI.filter}`);
  console.log();

  apiAvailable = await checkGeminiAvailability();

  const hashCache = loadHashCache();

  // 1. جمع المحتوى
  const chunks = await collectWorkspaceContent();
  console.log(`\n📦 إجمالي chunks: ${chunks.length}\n`);

  if (chunks.length === 0) {
    console.error("❌ لم يُجمع أي محتوى");
    process.exit(1);
  }

  // 2. توليد embeddings
  let embeddings;
  if (apiAvailable) {
    embeddings = await generateBatchEmbeddings(chunks, hashCache);
  } else {
    embeddings = await generateMockEmbeddings(chunks);
  }

  // 3. حفظ cache
  if (apiAvailable) saveHashCache(hashCache);

  // 4. بناء index
  const index = await buildIndex(chunks, embeddings);

  // 5. حفظ
  await saveIndex(index);

  console.log(`\n✅ اكتمل!`);
  console.log(`   Files: ${index.metadata.totalFiles}`);
  console.log(`   Chunks: ${index.metadata.totalChunks}`);
  console.log(`   Embedded: ${index.metadata.totalEmbeddings}`);
  if (index.vectorAnalysis?.mockCount > 0)
    console.log(`   Mock: ${index.vectorAnalysis.mockCount}`);
  if (index.vectorAnalysis?.cachedCount > 0)
    console.log(`   Cached: ${index.vectorAnalysis.cachedCount}`);
}

main().catch((err) => {
  console.error("💥 Fatal:", err);
  process.exit(1);
});

module.exports = { cosineSimilarity, fileHash, chunkText };
