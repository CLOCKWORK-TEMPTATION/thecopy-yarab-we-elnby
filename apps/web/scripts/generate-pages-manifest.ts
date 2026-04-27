#!/usr/bin/env node
/**
 * Generate pages manifest
 * Scans main app pages to build a manifest file
 */

import { logger } from "@/lib/logger";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { safeResolve } = require("./safe-path.cjs") as {
  safeResolve: (basePath: string, ...userPaths: string[]) => string;
};
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

interface PageInfo {
  slug: string;
  path: string;
  title: string;
}

// SECURITY FIX: Use safe path resolution to prevent traversal attacks
const MAIN_PAGES_DIR = safeResolve(PROJECT_ROOT, "src/app/(main)");
const OUTPUT_FILE = safeResolve(PROJECT_ROOT, "src/config/pages.manifest.json");

// Map of slugs to Arabic titles and descriptions
const PAGE_METADATA: Record<string, { title: string; description: string }> = {
  editor: {
    title: "كتابة",
    description:
      "محرر متخصص لكتابة سيناريوهات الأفلام والمسلسلات باللغة العربية، مع ميزات تنسيق متقدمة.",
  },
  analysis: {
    title: "تحليل",
    description:
      "نظام تحليل متقدم يمر بسبع محطات متخصصة لتحليل شامل ومتعمق للنص الدرامي.",
  },
  development: {
    title: "تطوير",
    description:
      "احصل على تحليل درامي آلي فوري لنصك، استنادًا إلى أشهر الهياكل القصصية والنماذج الأدبية.",
  },
  brainstorm: {
    title: "الورشة",
    description:
      "فريق من وكلاء الذكاء الاصطناعي يتعاونون لتقديم وجهات نظر متنوعة وأفكار مبتكرة لتطوير كتاباتك.",
  },
  breakdown: {
    title: "تفكيك",
    description:
      "تحليل تفصيلي وتفكيك للنص الدرامي إلى عناصره الأساسية لفهم أعمق.",
  },
  new: {
    title: "جديد",
    description: "ابدأ مشروعًا جديدًا أو استكشف أحدث الأدوات والميزات المتاحة.",
  },
  "actorai-arabic": {
    title: "الممثل الذكي",
    description:
      "أداة ذكاء اصطناعي متخصصة لتطوير الشخصيات الدرامية وتحليل الأداء التمثيلي.",
  },
  "arabic-creative-writing-studio": {
    title: "استوديو الكتابة الإبداعية",
    description:
      "بيئة متكاملة للكتابة الإبداعية باللغة العربية مع أدوات وموارد احترافية.",
  },
  "arabic-prompt-engineering-studio": {
    title: "استوديو هندسة التوجيهات",
    description:
      "ورشة متخصصة لصياغة وتطوير توجيهات الذكاء الاصطناعي باللغة العربية.",
  },
  "cinematography-studio": {
    title: "استوديو التصوير السينمائي",
    description:
      "أدوات وتقنيات متقدمة لتخطيط المشاهد وتصميم اللقطات السينمائية.",
  },
  "directors-studio": {
    title: "استوديو المخرج",
    description:
      "منصة شاملة لإدارة المشاريع الدرامية من منظور المخرج السينمائي.",
  },
};

function generateManifest(): void {
  logger.info("🔍 Scanning pages in:", MAIN_PAGES_DIR);

  if (!fs.existsSync(MAIN_PAGES_DIR)) {
    logger.error("❌ Main pages directory not found:", MAIN_PAGES_DIR);
    process.exit(1);
  }

  const pages: PageInfo[] = [];
  const entries = fs.readdirSync(MAIN_PAGES_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    // SECURITY FIX: Use safe path resolution for subdirectories
    let pagePath: string;
    try {
      pagePath = safeResolve(MAIN_PAGES_DIR, path.join(slug, "page.tsx"));
    } catch (error) {
      logger.warn(`Skipping invalid path for slug: ${slug}`);
      continue;
    }

    // Check if page.tsx exists in this directory
    if (fs.existsSync(pagePath)) {
      const metadata = PAGE_METADATA[slug] ?? {
        title: slug,
        description: `صفحة ${slug}`,
      };

      pages.push({
        slug,
        path: `/${slug}`,
        title: metadata.title,
      });

      logger.info(`✅ Found page: ${slug} → ${metadata.title}`);
    } else {
      logger.info(`⏭️  Skipping ${slug} (no page.tsx)`);
    }
  }

  // Sort pages alphabetically by slug for consistency
  pages.sort((a, b) => a.slug.localeCompare(b.slug));

  // Create config directory if it doesn't exist
  const configDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Write manifest file
  fs.writeFileSync(
    OUTPUT_FILE,
    `${JSON.stringify({ pages, metadata: PAGE_METADATA }, null, 2)}\n`
  );

  logger.info(`\n✨ Generated manifest with ${pages.length} pages`);
  logger.info(`📝 Output: ${OUTPUT_FILE}`);
}

try {
  generateManifest();
} catch (error) {
  logger.error("❌ Error generating manifest:", error);
  process.exit(1);
}
