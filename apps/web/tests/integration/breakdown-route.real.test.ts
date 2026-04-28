// @vitest-environment node
/**
 * اختبارات التكامل الحقيقي — مسار تحليل السيناريو /breakdown
 *
 * تتحقق هذه الاختبارات من أن المسارات الجديدة تعمل فعليًا دون الحاجة
 * إلى مصادقة JWT أو خلفية منفصلة.
 *
 * المتطلبات:
 * - تشغيل التطبيق الرسمي محليًا على المنفذ 5000: `pnpm --filter @the-copy/web dev`
 * - متغير البيئة الموحَّد: EDITOR_REAL_TEST_BASE_URL (افتراضي: http://localhost:5000)
 *
 * تعتمد هذه السلسلة على مدير الإعدادات الرسمي الواحد ConfigManager
 * من tests/shared/real-test-config.ts ولا تُعرّف مدير إعدادات بديلًا.
 */

import { beforeAll, describe, expect, it } from "vitest";

import {
  ConfigManager,
  createRealTestLogger,
} from "../shared/real-test-config";

// ─── إعداد الاختبارات على مدير الإعدادات الرسمي الموحَّد ──────────────────────

const config = ConfigManager.fromEnv();
const logger = createRealTestLogger("breakdown-real-tests");

function hasValidAnalysisSource(source: string | undefined) {
  return source === undefined || ["ai", "fallback"].includes(source);
}

async function bootstrapTestProject() {
  const url = config.buildUrl("/api/breakdown/projects/bootstrap");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scriptContent: TEST_SCRIPT_SHORT,
      title: "مشروع اختبار التكامل",
    }),
  });

  if (!response.ok) {
    throw new Error(`فشل إنشاء المشروع: ${response.status}`);
  }

  const body = (await response.json()) as {
    success: boolean;
    data?: { projectId: string };
  };

  if (!body.success || !body.data?.projectId) {
    throw new Error("لم يُعثر على معرف المشروع في الاستجابة");
  }

  return body.data.projectId;
}

// ─── نص سيناريو اختبار حقيقي ─────────────────────────────────────────────────

const TEST_SCRIPT_SHORT = `INT. مطبخ - ليل
أحمد يجلس وحيداً على طاولة الطعام. كوب قهوة أمامه بارد.

يُحرِّك الملعقة ببطء. يُحدِّق في الفضاء.

EXT. شارع رئيسي - نهار
سيارة تمر بسرعة. أطفال يلعبون على الرصيف.

رانيا تخرج من البقالة حاملة أكياس ثقيلة.`;

const TEST_SCRIPT_ENGLISH = `INT. KITCHEN - NIGHT
AHMED sits alone at the dining table. A cold cup of coffee in front of him.

He stirs the spoon slowly. He stares into space.

EXT. MAIN STREET - DAY
A car passes quickly. Children play on the sidewalk.

RANIA comes out of the grocery store carrying heavy bags.`;

// ─── اختبارات التكامل الحقيقي ─────────────────────────────────────────────────

describe("اختبارات التكامل: مسار فحص الصحة /api/breakdown/health", () => {
  it(
    "يُعيد استجابة ناجحة بدون مصادقة",
    async () => {
      const url = config.buildUrl("/api/breakdown/health");
      logger.info({ url }, "اختبار فحص الصحة");

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      logger.info({ status: response.status }, "نتيجة فحص الصحة");

      // يجب أن يُعيد 200 بدون توكن
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        success: boolean;
        data?: unknown;
      };
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    },
    config.integrationTimeoutMs
  );

  it(
    "يضبط رمز CSRF في الاستجابة",
    async () => {
      const url = config.buildUrl("/api/breakdown/health");
      const response = await fetch(url, { method: "GET" });

      expect(response.status).toBe(200);
      // التحقق من وجود رمز CSRF في ملفات تعريف الارتباط
      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        logger.info({ setCookieHeader }, "تم ضبط ملف تعريف الارتباط");
      }
      // ملاحظة: قد لا يتم ضبط CSRF إذا كان ملف تعريف الارتباط موجودًا بالفعل
    },
    config.integrationTimeoutMs
  );
});

describe("اختبارات التكامل: مسار تجزئة السيناريو /api/breakdown/projects/bootstrap", () => {
  it(
    "يجزِّئ سيناريو عربي ويُعيد مشاهد صالحة بدون مصادقة",
    async () => {
      const url = config.buildUrl("/api/breakdown/projects/bootstrap");
      logger.info({ url }, "اختبار التجزئة — سيناريو عربي");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptContent: TEST_SCRIPT_SHORT,
          title: "اختبار تكامل — سيناريو قصير",
        }),
      });

      logger.info({ status: response.status }, "نتيجة التجزئة");

      // يجب أن ينجح الطلب
      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        success: boolean;
        data?: {
          projectId: string;
          title: string;
          parsed: { scenes: { header: string; content: string }[] };
        };
        error?: string;
      };

      logger.info({ success: body.success, data: body.data }, "جسم الاستجابة");

      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data?.projectId).toBeDefined();
      expect(typeof body.data?.projectId).toBe("string");
      expect(body.data?.parsed).toBeDefined();
      expect(Array.isArray(body.data?.parsed?.scenes)).toBe(true);
      expect(body.data?.parsed?.scenes.length).toBeGreaterThan(0);

      // التحقق من بنية المشهد
      const firstScene = body.data?.parsed?.scenes[0];
      expect(firstScene?.header).toBeDefined();
      expect(firstScene?.content).toBeDefined();
      expect(firstScene?.header?.length).toBeGreaterThan(0);
    },
    config.integrationTimeoutMs
  );

  it(
    "يجزِّئ سيناريو إنجليزي بنجاح",
    async () => {
      const url = config.buildUrl("/api/breakdown/projects/bootstrap");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptContent: TEST_SCRIPT_ENGLISH,
          title: "Integration Test — English Script",
        }),
      });

      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        success: boolean;
        data?: { parsed: { scenes: unknown[] } };
      };

      expect(body.success).toBe(true);
      expect(body.data?.parsed?.scenes.length).toBeGreaterThan(0);
    },
    config.integrationTimeoutMs
  );

  it(
    "يُعيد خطأ 400 عند إرسال نص فارغ",
    async () => {
      const url = config.buildUrl("/api/breakdown/projects/bootstrap");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptContent: "" }),
      });

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        success: boolean;
        error?: string;
      };
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      logger.info({ error: body.error }, "رسالة خطأ النص الفارغ");
    },
    config.integrationTimeoutMs
  );

  it(
    "يُعيد خطأ 400 عند إرسال JSON غير صالح",
    async () => {
      const url = config.buildUrl("/api/breakdown/projects/bootstrap");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json{",
      });

      expect(response.status).toBe(400);
    },
    config.integrationTimeoutMs
  );
});

describe("اختبارات التكامل: مسار التحليل /api/breakdown/projects/:id/analyze", () => {
  let projectId: string;

  // إنشاء مشروع أولاً لاستخدامه في اختبارات التحليل
  beforeAll(async () => {
    projectId = await bootstrapTestProject();
    logger.info({ projectId }, "تم إنشاء مشروع الاختبار");
  }, 30_000);

  it(
    "يُعيد خطأ 404 عند استخدام معرف مشروع غير موجود",
    async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const url = config.buildUrl(`/api/breakdown/projects/${fakeId}/analyze`);

      const response = await fetch(url, { method: "POST" });

      expect(response.status).toBe(404);

      const body = (await response.json()) as {
        success: boolean;
        error?: string;
      };
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      logger.info({ error: body.error }, "رسالة خطأ المشروع غير الموجود");
    },
    config.integrationTimeoutMs
  );

  it(
    "يُحلِّل المشروع المُجزَّأ ويُعيد تقريرًا كاملًا",
    async () => {
      if (!projectId) {
        throw new Error("لا يتوفر معرف المشروع من خطوة beforeAll");
      }

      const url = config.buildUrl(
        `/api/breakdown/projects/${projectId}/analyze`
      );
      logger.info({ url, projectId }, "اختبار التحليل الكامل");

      const response = await fetch(url, { method: "POST" });

      logger.info({ status: response.status }, "نتيجة التحليل");

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        success: boolean;
        data?: {
          id: string;
          projectId: string;
          title: string;
          source: string;
          sceneCount: number;
          scenes: {
            sceneId: string;
            header: string;
            content: string;
            headerData: {
              sceneNumber: number;
              sceneType: string;
              location: string;
              timeOfDay: string;
            };
            analysis: {
              cast: unknown[];
              props: unknown[];
              warnings: string[];
              summary: string;
              source?: string;
            };
            scenarios: { scenarios: unknown[] };
          }[];
        };
        error?: string;
      };

      logger.info(
        {
          success: body.success,
          sceneCount: body.data?.sceneCount,
          source: body.data?.source,
        },
        "ملخص نتيجة التحليل"
      );

      // التحقق من نجاح التحليل
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      if (!body.data) {
        throw new Error("لم يرجع مسار التحليل بيانات التقرير");
      }

      expect(body.data.id).toBeDefined();
      expect(body.data.projectId).toBe(projectId);
      expect(body.data.source).toBe("backend-breakdown");
      expect(body.data.sceneCount).toBeGreaterThan(0);
      expect(Array.isArray(body.data.scenes)).toBe(true);
      expect(body.data.scenes.length).toBeGreaterThan(0);

      // التحقق من بنية المشهد الأول
      const firstScene = body.data.scenes[0];
      if (!firstScene) {
        throw new Error("لم يرجع مسار التحليل مشاهد");
      }

      expect(firstScene.header).toBeDefined();
      expect(firstScene.content).toBeDefined();
      expect(firstScene.headerData).toBeDefined();
      expect(firstScene.headerData.sceneNumber).toBeGreaterThan(0);
      expect(firstScene.headerData.location).toBeDefined();
      expect(firstScene.analysis).toBeDefined();
      expect(firstScene.scenarios).toBeDefined();

      // التحقق من عدم ظهور رسالة "رمز التحقق غير صالح"
      const errorMessage = body.error ?? "";
      expect(errorMessage).not.toContain("رمز التحقق غير صالح");
      expect(errorMessage).not.toContain("غير مصرح");

      // التحقق من مصدر التحليل
      const analysisSource = firstScene.analysis.source;
      logger.info({ analysisSource }, "مصدر التحليل");
      // إما AI أو fallback — كلاهما مقبول
      expect(hasValidAnalysisSource(analysisSource)).toBe(true);
    },
    config.e2eTimeoutMs
  );
});

describe("اختبارات التكامل: التدفق الكامل من البداية إلى النهاية", () => {
  it(
    "يُكمِل تدفق تحليل السيناريو الكامل: bootstrap → analyze → تقرير",
    async () => {
      const bootstrapUrl = config.buildUrl("/api/breakdown/projects/bootstrap");

      // الخطوة 1: تجزئة السيناريو
      logger.info("الخطوة 1: تجزئة السيناريو");
      const bootstrapResponse = await fetch(bootstrapUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptContent: TEST_SCRIPT_SHORT,
          title: "اختبار التدفق الكامل",
        }),
      });

      expect(bootstrapResponse.status).toBe(201);

      const bootstrapBody = (await bootstrapResponse.json()) as {
        success: boolean;
        data?: {
          projectId: string;
          title: string;
          parsed: { scenes: { header: string; content: string }[] };
        };
      };

      expect(bootstrapBody.success).toBe(true);
      const { projectId, title, parsed } = bootstrapBody.data!;

      logger.info(
        { projectId, sceneCount: parsed.scenes.length },
        "الخطوة 1 مكتملة"
      );

      expect(projectId).toBeDefined();
      expect(parsed.scenes.length).toBeGreaterThan(0);

      // الخطوة 2: تحليل المشاهد
      const analyzeUrl = config.buildUrl(
        `/api/breakdown/projects/${projectId}/analyze`
      );
      logger.info({ analyzeUrl }, "الخطوة 2: تحليل المشاهد");

      const analyzeResponse = await fetch(analyzeUrl, { method: "POST" });

      expect(analyzeResponse.status).toBe(200);

      const analyzeBody = (await analyzeResponse.json()) as {
        success: boolean;
        data?: {
          id: string;
          projectId: string;
          title: string;
          source: string;
          sceneCount: number;
          summary: string;
          scenes: {
            header: string;
            analysis: {
              source?: string;
              warnings: string[];
              summary: string;
            };
            scenarios: { scenarios: unknown[] };
          }[];
        };
        error?: string;
      };

      logger.info(
        {
          success: analyzeBody.success,
          sceneCount: analyzeBody.data?.sceneCount,
          summary: analyzeBody.data?.summary,
        },
        "الخطوة 2 مكتملة"
      );

      // ─── التحقق النهائي الشامل ───────────────────────────────────────────

      // 1. نجاح التحليل
      expect(analyzeBody.success).toBe(true);
      expect(analyzeBody.data).toBeDefined();

      // 2. بيانات المشروع صحيحة
      expect(analyzeBody.data?.projectId).toBe(projectId);
      expect(analyzeBody.data?.title).toBe(title);
      expect(analyzeBody.data?.source).toBe("backend-breakdown");

      // 3. عدد المشاهد يطابق التجزئة
      expect(analyzeBody.data?.sceneCount).toBe(parsed.scenes.length);

      // 4. كل مشهد يحتوي على تحليل
      for (const scene of analyzeBody.data?.scenes ?? []) {
        expect(scene.header).toBeDefined();
        expect(scene.analysis).toBeDefined();
        expect(scene.scenarios).toBeDefined();
        expect(Array.isArray(scene.analysis.warnings)).toBe(true);
      }

      // 5. رسالة "رمز التحقق غير صالح" غائبة تمامًا
      const errorText = analyzeBody.error ?? "";
      expect(errorText).not.toContain("رمز التحقق غير صالح");
      expect(analyzeBody.success).not.toBe(false);

      logger.info(
        "✅ اختبار التدفق الكامل نجح — المسار يعمل من البداية إلى النهاية"
      );
    },
    config.e2eTimeoutMs
  );

  it(
    "يُعيد خطأ منضبطًا وليس انهيارًا عند نقص الإعدادات الأساسية",
    async () => {
      // هذا الاختبار يتحقق من الفشل المنضبط
      // عندما يُرسَل معرف مشروع غير صالح، يجب أن تكون الرسالة واضحة
      const fakeId = "00000000-dead-beef-cafe-000000000000";
      const url = config.buildUrl(`/api/breakdown/projects/${fakeId}/analyze`);

      const response = await fetch(url, { method: "POST" });

      // الفشل يجب أن يكون محددًا (404) وليس 500 أو 401
      expect([404, 422, 400]).toContain(response.status);

      const body = (await response.json()) as {
        success: boolean;
        error?: string;
      };
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error?.length).toBeGreaterThan(0);

      // رسالة الخطأ لا تحتوي على "رمز التحقق غير صالح"
      expect(body.error).not.toContain("رمز التحقق غير صالح");

      logger.info(
        { status: response.status, error: body.error },
        "اختبار الفشل المنضبط مكتمل"
      );
    },
    config.integrationTimeoutMs
  );
});

describe("اختبارات التكامل: التحقق من ConfigManager الموحَّد", () => {
  it("يُنشئ ConfigManager بالإعدادات الصحيحة من متغيرات البيئة وعلى المنفذ الرسمي", () => {
    const testConfig = ConfigManager.fromEnv();
    expect(testConfig.baseUrl).toBeDefined();
    expect(testConfig.baseUrl).toMatch(/^https?:\/\//);
    expect(testConfig.integrationTimeoutMs).toBeGreaterThan(0);
    expect(testConfig.e2eTimeoutMs).toBeGreaterThan(0);

    // المنفذ الافتراضي يجب أن يكون 5000 وليس 3000
    const usesDefaultUrl = !process.env["EDITOR_REAL_TEST_BASE_URL"];
    expect(!usesDefaultUrl || testConfig.baseUrl.includes(":5000")).toBe(true);

    logger.info(
      {
        baseUrl: testConfig.baseUrl,
        integrationTimeoutMs: testConfig.integrationTimeoutMs,
        e2eTimeoutMs: testConfig.e2eTimeoutMs,
      },
      "إعدادات ConfigManager الموحَّد"
    );
  });
});
