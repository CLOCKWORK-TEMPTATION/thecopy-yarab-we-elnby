import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../../../../../");
const editorFixtureRoot = path.join(
  workspaceRoot,
  "apps",
  "web",
  "tests",
  "fixtures",
  "editor"
);

type RuntimeMockFailure = boolean | string;

interface EditorRuntimeRouteMockOptions {
  fileExtractDelayMs?: number;
  fileExtractFailure?: RuntimeMockFailure;
  textExtractFailure?: RuntimeMockFailure;
  suspicionReviewFailure?: RuntimeMockFailure;
  finalReviewFailure?: RuntimeMockFailure;
  includeSchemaElementsInFileExtract?: boolean;
  text?: string;
}

export const fixturePaths = {
  doc: path.join(editorFixtureRoot, "sample-runtime.doc"),
  docx: path.join(editorFixtureRoot, "sample-runtime.docx"),
  pdf: path.join(editorFixtureRoot, "sample-runtime.pdf"),
};

const baseFixtureLines = [
  "الملخص التنفيذي",
  "داخلي - مكتب التحرير - نهار",
  "سليم:",
  "هذا نص اختبار حي داخل المحرر.",
  "تتحرك الكاميرا فوق صفحة التحرير وتعرض الفواصل بوضوح.",
  "نادية:",
  "نحتاج أن يبقى السطح قابلاً للتحرير بعد الفشل.",
];

const buildMockText = (seed = "المحرر"): string => {
  const lines = [...baseFixtureLines];
  for (let index = 1; index <= 56; index += 1) {
    lines.push(
      `داخلي - ${seed} ${index} - نهار`,
      "سليم:",
      `هذا سطر تحقق رقم ${index} لاختبار الصفحات والاستقرار.`,
      "نادية:",
      "الحفظ والتحديد والتشخيص يجب أن تبقى مستقرة.",
      "يكتب المستخدم كلمة جديدة داخل النص بعد انتهاء المسار."
    );
  }
  return lines.join("\n");
};

const inferElementType = (line: string): string => {
  if (/^(داخلي|خارجي)\s*-/u.test(line)) return "scene_header_2";
  if (/^.+:\s*$/u.test(line)) return "CHARACTER";
  if (/^(قطع إلى|انتقال إلى):?$/u.test(line)) return "TRANSITION";
  return "ACTION";
};

const buildSchemaElements = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      elementId: `mock-${index}`,
      elementType: inferElementType(line),
      element: inferElementType(line),
      text: line,
      value: line,
      confidence: 0.98,
    }));

const failureMessage = (
  value: RuntimeMockFailure | undefined,
  fallback: string
): string => (typeof value === "string" ? value : fallback);

export const installEditorRuntimeRouteMocks = async (
  page: Page,
  options: EditorRuntimeRouteMockOptions = {}
): Promise<void> => {
  const includeSchemaElements =
    options.includeSchemaElementsInFileExtract !== false;

  await page.route("**/api/editor-runtime/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ocrConfigured: true,
        ocrAgent: {
          dependencies: {
            pdftoppm: {
              available: true,
            },
          },
        },
      }),
    });
  });

  await page.route("**/api/file-extract", async (route) => {
    if (options.fileExtractDelayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, options.fileExtractDelayMs)
      );
    }

    if (options.fileExtractFailure) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: failureMessage(
            options.fileExtractFailure,
            "mock-file-extract-failure"
          ),
          errorCode: "MOCK_FILE_EXTRACT_FAILURE",
        }),
      });
      return;
    }

    const request = route.request();
    const payload = request.postDataJSON() as
      | { extension?: string; filename?: string }
      | undefined;
    const extension = payload?.extension ?? "docx";
    const text = options.text ?? buildMockText(extension);
    const schemaElements = buildSchemaElements(text);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          text,
          fileType: extension,
          method: extension === "pdf" ? "ocr-mistral" : "mammoth",
          usedOcr: extension === "pdf",
          warnings: [],
          attempts: ["playwright-editor-runtime-mock"],
          qualityScore: 0.99,
          rawExtractedText: text,
          extractionMeta: {
            sourceType: extension,
            processingTimeMs: 1,
            success: true,
            firstVisibleSourceKind:
              extension === "pdf" ? "ocr" : "direct-extraction",
          },
          ...(includeSchemaElements ? { schemaElements } : {}),
        },
      }),
    });
  });

  await page.route("**/api/text-extract", async (route) => {
    if (options.textExtractFailure) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: failureMessage(
            options.textExtractFailure,
            "mock-text-extract-failure"
          ),
        }),
      });
      return;
    }

    const payload = route.request().postDataJSON() as
      | { content?: string; sourceType?: string }
      | undefined;
    const text = payload?.content ?? options.text ?? buildMockText("karank");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        runId: "mock-karank-run",
        visibleVersion: {
          visibleVersionId: "mock-karank-visible",
          stage: "karank",
          text,
          processingTimeMs: 1,
        },
        guidance: {
          rawText: text,
          schemaText: text,
          visibleTextValidity: "valid",
          schemaElements: buildSchemaElements(text),
        },
      }),
    });
  });

  await page.route("**/api/suspicion-review", async (route) => {
    if (options.suspicionReviewFailure) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: failureMessage(
            options.suspicionReviewFailure,
            "mock-suspicion-review-failure"
          ),
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        apiVersion: "1.0",
        importOpId: "mock-import",
        requestId: "mock-suspicion-review",
        status: "skipped",
        reviewedLines: [],
        discoveredLines: [],
        message: "mock suspicion review skipped",
        latencyMs: 1,
      }),
    });
  });

  await page.route("**/api/final-review", async (route) => {
    if (options.finalReviewFailure) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: failureMessage(
            options.finalReviewFailure,
            "mock-final-review-failure"
          ),
        }),
      });
      return;
    }

    const payload = route.request().postDataJSON() as
      | { importOpId?: string }
      | undefined;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        apiVersion: "2.0",
        mode: "auto-apply",
        importOpId: payload?.importOpId ?? "mock-import",
        requestId: "mock-final-review",
        status: "skipped",
        commands: [],
        message: "mock final review skipped",
        latencyMs: 1,
      }),
    });
  });
};

export const getEditorSurface = (page: Page) =>
  page.locator(".ProseMirror").first();

export const openFile = async (page: Page, filePath: string): Promise<void> => {
  await page.getByTestId("menu-section-ملف").click();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByTestId("menu-action-open-file").click(),
  ]);
  await chooser.setFiles(filePath);
};

export const waitForApproval = async (page: Page): Promise<void> => {
  await page
    .locator('[data-testid="approve-visible-version"]')
    .waitFor({ state: "visible", timeout: 180_000 });
};

export const dispatchPaste = async (
  page: Page,
  text: string
): Promise<void> => {
  await getEditorSurface(page).click();
  await page.evaluate((value) => {
    const target = document.querySelector(".ProseMirror");
    if (!target) {
      throw new Error("missing editor");
    }
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) => (type === "text/plain" ? value : ""),
      },
    });
    target.dispatchEvent(event);
  }, text);
};
