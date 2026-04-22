import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pino, { type Logger } from "pino";

/**
 * @description مدير إعدادات الاختبارات الحية.
 * يقرأ متغيرات البيئة، ويطبّق القيم الافتراضية الآمنة، ويتحقق من وجود
 * ملف الـ DOCX الحقيقي المستخدم في اختبارات التكامل والنهاية إلى النهاية.
 */
export class ConfigManager {
  private static readonly __dirname = path.dirname(
    fileURLToPath(import.meta.url)
  );
  private static readonly workspaceRoot = path.resolve(
    ConfigManager.__dirname,
    "..",
    "..",
    "..",
    ".."
  );
  private static readonly trackedEditorFixturePath = path.join(
    ConfigManager.workspaceRoot,
    "apps",
    "web",
    "tests",
    "fixtures",
    "editor",
    "QA-Report-TheCopy-Editor-2026-04-13.docx"
  );

  readonly baseUrl: string;
  readonly fileExtractUrl: string;
  readonly fixturePath: string;
  readonly importWaitMs: number;
  readonly integrationTimeoutMs: number;
  readonly e2eTimeoutMs: number;

  private constructor() {
    this.baseUrl = this.resolveUrl(
      process.env["EDITOR_REAL_TEST_BASE_URL"],
      "http://localhost:5000"
    );
    this.fileExtractUrl = this.resolveUrl(
      process.env["EDITOR_REAL_TEST_FILE_EXTRACT_URL"],
      "http://localhost:3001/api/file-extract"
    );
    this.fixturePath = path.resolve(
      process.env["EDITOR_REAL_TEST_FIXTURE_PATH"] ||
        ConfigManager.trackedEditorFixturePath
    );
    this.importWaitMs = this.resolveInteger(
      process.env["EDITOR_REAL_TEST_IMPORT_WAIT_MS"],
      90_000
    );
    this.integrationTimeoutMs = this.resolveInteger(
      process.env["EDITOR_REAL_TEST_INTEGRATION_TIMEOUT_MS"],
      180_000
    );
    this.e2eTimeoutMs = this.resolveInteger(
      process.env["EDITOR_REAL_TEST_E2E_TIMEOUT_MS"],
      240_000
    );
  }

  static fromEnv(): ConfigManager {
    return new ConfigManager();
  }

  /**
   * @description التحقق من أن ملف الاختبار الحقيقي موجود ويمكن الوصول إليه.
   */
  async assertFixtureAccessible(): Promise<void> {
    await access(this.fixturePath);
  }

  /**
   * @description بناء عنوان URL كامل اعتمادًا على baseUrl الموحّد للواجهة الرسمية.
   * يُزال أي شرطة مائلة زائدة في النهاية ثم يُلصق المسار الممرَّر.
   */
  buildUrl(routePath: string): string {
    const trimmedBase = this.baseUrl.replace(/\/$/, "");
    const normalizedPath = routePath.startsWith("/")
      ? routePath
      : `/${routePath}`;
    return `${trimmedBase}${normalizedPath}`;
  }

  private resolveInteger(
    rawValue: string | undefined,
    fallback: number
  ): number {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private resolveUrl(rawValue: string | undefined, fallback: string): string {
    const candidate = rawValue?.trim() || fallback;
    return new URL(candidate).toString();
  }
}

/**
 * @description إنشاء مسجل احترافي موحد لاختبارات التشغيل الحي.
 */
export const createRealTestLogger = (scope: string): Logger =>
  pino({
    name: "editor-real-tests",
    level: process.env["EDITOR_REAL_TEST_LOG_LEVEL"] || "info",
    base: {
      scope,
    },
  });
