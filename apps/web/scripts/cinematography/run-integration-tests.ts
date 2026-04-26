import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { resolve } from "node:path";

// @ts-ignore — لا يوجد @types/jsdom مثبت، jsdom لها types بداخلها من الإصدار 28+
 
import { renderHook, act, cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { NextRequest } from "next/server";

import { createCinematographyInputConfig } from "../../src/app/(main)/cinematography-studio/lib/cinematography-config";
import {
  createLocalFootageSummary,
  createLocalShotAnalysis,
} from "../../src/app/(main)/cinematography-studio/lib/local-shot-analysis";
import { ensureMediaFixtures } from "../../tests/fixtures/media/ensure-media-fixtures.mjs";

import { runDiagnosticOverlaySuite } from "./__tests__/cinematography-diagnostic-overlay.test";
import { runSliderDragSuite } from "./__tests__/cinematography-slider-drag.test";

interface SuiteResult {
  name: string;
  status: "passed" | "failed";
  durationMs: number;
  details?: string;
}

interface FixtureServerState {
  receivedBodies: Record<string, unknown>[];
}

interface StartedFixtureServer {
  baseUrl: string;
  close: () => Promise<void>;
  state: FixtureServerState;
}

const outputDirectory = resolve(
  process.cwd(),
  "../../output/cinematography-integration"
);
const reportPath = resolve(outputDirectory, "integration-results.json");
const fixtureImagePath = resolve(
  process.cwd(),
  "tests/fixtures/media/sample-shot.png"
);

mkdirSync(outputDirectory, { recursive: true });

// تأكد من وجود ملفات وسائط الاختبار قبل أي suite — حتى لا يفشل المسار بـ ENOENT
// عند تشغيل المُكامل دون global setup الخاص بـ Playwright.
await ensureMediaFixtures();

async function runSuite(
  name: string,
  runner: () => Promise<void>
): Promise<SuiteResult> {
  const startedAt = Date.now();
  process.stdout.write(`RUN ${name}\n`);

  try {
    await runner();
    const result: SuiteResult = {
      name,
      status: "passed",
      durationMs: Date.now() - startedAt,
    };
    process.stdout.write(`PASS ${name}\n`);
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.stack ?? error.message : String(error);
    const result: SuiteResult = {
      name,
      status: "failed",
      durationMs: Date.now() - startedAt,
      details: message,
    };
    process.stderr.write(`FAIL ${name}\n${message}\n`);
    return result;
  }
}

function createFixtureImageFile(): File {
  const bytes = readFileSync(fixtureImagePath);
  return new File([bytes], "sample-shot.png", {
    type: "image/png",
    lastModified: Date.now(),
  });
}

function readBodyAsText(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => resolveBody(raw));
    request.on("error", rejectBody);
  });
}

async function startFixtureServer(): Promise<StartedFixtureServer> {
  const state: FixtureServerState = {
    receivedBodies: [],
  };

  const server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const fixtureMode =
        requestUrl.searchParams.get("fixtureMode") === "fail"
          ? "fail"
          : "success";

      if (request.method === "GET" && requestUrl.pathname === "/health") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true, fixtureMode }));
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/cineai/validate-shot"
      ) {
        const bodyText = await readBodyAsText(request);
        const payload = bodyText
          ? (JSON.parse(bodyText) as Record<string, unknown>)
          : {};
        state.receivedBodies.push(payload);

        if (fixtureMode === "fail") {
          response.writeHead(503, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              success: false,
              error: "Fixture backend failure",
            })
          );
          return;
        }

        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            success: true,
            validation: {
              score: 88,
              exposure: "Balanced",
              composition: "Strong thirds",
              focus: "Sharp",
              colorBalance: "Neutral",
              suggestions: ["تحسين خفيف في فصل الخلفية."],
            },
          })
        );
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/cineai/color-grading"
      ) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            success: true,
            sceneType: "generic",
            palette: ["#111111", "#3a3a3a", "#7f5f3a", "#c9a56a", "#f4e2b8"],
          })
        );
        return;
      }

      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ success: false, error: "Not found" }));
    }
  );

  await new Promise<void>((resolveStart, rejectStart) => {
    server.once("error", rejectStart);
    server.listen(0, "127.0.0.1", () => resolveStart());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("تعذر الحصول على عنوان خادم التكامل.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    state,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) {
            rejectClose(error);
            return;
          }
          resolveClose();
        });
      }),
  };
}

function installDomEnvironment(): () => void {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousNavigator = globalThis.navigator;
  const previousMatchMedia = globalThis.window?.matchMedia;
  const previousCreateObjectUrl = (
    URL as typeof URL & {
      createObjectURL?: (file: File) => string;
    }
  ).createObjectURL;
  const previousRevokeObjectUrl = (
    URL as typeof URL & {
      revokeObjectURL?: (url: string) => void;
    }
  ).revokeObjectURL;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: dom.window,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: dom.window.document,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: dom.window.navigator,
  });

  Object.defineProperty(globalThis.window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });

  (
    URL as typeof URL & { createObjectURL: (file: File) => string }
  ).createObjectURL = () => "blob:cinematography-test";
  (
    URL as typeof URL & { revokeObjectURL: (url: string) => void }
  ).revokeObjectURL = () => undefined;

  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  return () => {
    cleanup();
    dom.window.close();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: previousDocument,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      writable: true,
      value: previousNavigator,
    });

    if (previousWindow && previousMatchMedia) {
      Object.defineProperty(previousWindow, "matchMedia", {
        configurable: true,
        writable: true,
        value: previousMatchMedia,
      });
    }

    if (previousCreateObjectUrl) {
      (
        URL as typeof URL & { createObjectURL: (file: File) => string }
      ).createObjectURL = previousCreateObjectUrl;
    } else {
      Reflect.deleteProperty(URL, "createObjectURL");
    }

    if (previousRevokeObjectUrl) {
      (
        URL as typeof URL & { revokeObjectURL: (url: string) => void }
      ).revokeObjectURL = previousRevokeObjectUrl;
    } else {
      Reflect.deleteProperty(URL, "revokeObjectURL");
    }
  };
}

async function runConfigSuite(): Promise<void> {
  const snapshot = {
    imageMaxMb: process.env.NEXT_PUBLIC_CINE_IMAGE_MAX_MB,
    videoMaxMb: process.env.NEXT_PUBLIC_CINE_VIDEO_MAX_MB,
    captureWidth: process.env.NEXT_PUBLIC_CINE_CAPTURE_WIDTH,
    captureHeight: process.env.NEXT_PUBLIC_CINE_CAPTURE_HEIGHT,
    captureQuality: process.env.NEXT_PUBLIC_CINE_CAPTURE_QUALITY,
    captureMime: process.env.NEXT_PUBLIC_CINE_CAPTURE_MIME,
  };

  try {
    process.env.NEXT_PUBLIC_CINE_IMAGE_MAX_MB = "24";
    process.env.NEXT_PUBLIC_CINE_VIDEO_MAX_MB = "640";
    process.env.NEXT_PUBLIC_CINE_CAPTURE_WIDTH = "1920";
    process.env.NEXT_PUBLIC_CINE_CAPTURE_HEIGHT = "1080";
    process.env.NEXT_PUBLIC_CINE_CAPTURE_QUALITY = "0.8";
    process.env.NEXT_PUBLIC_CINE_CAPTURE_MIME = "image/jpeg";

    const config = createCinematographyInputConfig();

    assert.equal(config.imageMaxSizeBytes, 24 * 1024 * 1024);
    assert.equal(config.videoMaxSizeBytes, 640 * 1024 * 1024);
    assert.equal(config.captureWidth, 1920);
    assert.equal(config.captureHeight, 1080);
    assert.equal(config.captureMimeType, "image/jpeg");
    assert.equal(config.captureQuality, 0.8);
  } finally {
    process.env.NEXT_PUBLIC_CINE_IMAGE_MAX_MB = snapshot.imageMaxMb;
    process.env.NEXT_PUBLIC_CINE_VIDEO_MAX_MB = snapshot.videoMaxMb;
    process.env.NEXT_PUBLIC_CINE_CAPTURE_WIDTH = snapshot.captureWidth;
    process.env.NEXT_PUBLIC_CINE_CAPTURE_HEIGHT = snapshot.captureHeight;
    process.env.NEXT_PUBLIC_CINE_CAPTURE_QUALITY = snapshot.captureQuality;
    process.env.NEXT_PUBLIC_CINE_CAPTURE_MIME = snapshot.captureMime;
  }
}

async function runLocalFallbackSuite(): Promise<void> {
  const analysis = await createLocalShotAnalysis(
    createFixtureImageFile(),
    "noir"
  );
  assert.ok(analysis.score >= 0 && analysis.score <= 100);
  assert.ok(analysis.exposure >= 0 && analysis.exposure <= 100);
  assert.ok(Array.isArray(analysis.issues));
  assert.ok(analysis.issues.length > 0);

  const summary = await createLocalFootageSummary(
    createFixtureImageFile(),
    "vintage"
  );
  assert.ok(summary.score >= 0 && summary.score <= 100);
  assert.equal(typeof summary.status, "string");
  assert.equal(typeof summary.exposure, "string");
  assert.equal(typeof summary.colorBalance, "string");
  assert.equal(typeof summary.focus, "string");
}

async function runRouteSuite(): Promise<void> {
  const fixture = await startFixtureServer();
  const snapshot = {
    backendUrl: process.env.BACKEND_URL,
    nextPublicBackendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
    nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL,
  };

  try {
    process.env.BACKEND_URL = fixture.baseUrl;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    delete process.env.NEXT_PUBLIC_API_URL;

    const { POST } =
      await import("../../src/app/api/cineai/validate-shot/route");

    const successForm = new FormData();
    successForm.set("image", createFixtureImageFile());

    const successRequest = new NextRequest(
      "http://localhost:5000/api/cineai/validate-shot",
      {
        method: "POST",
        body: successForm,
      }
    );
    const successResponse = await POST(successRequest);
    const successPayload = (await successResponse.json()) as {
      success?: boolean;
      validation?: { score?: number };
    };

    assert.equal(successResponse.status, 200);
    assert.equal(successPayload.success, true);
    assert.equal(successPayload.validation?.score, 88);
    assert.equal(fixture.state.receivedBodies.length, 1);
    assert.equal(typeof fixture.state.receivedBodies[0]?.imageBase64, "string");
    assert.equal(fixture.state.receivedBodies[0]?.mimeType, "image/png");

    const missingImageForm = new FormData();
    missingImageForm.set("note", "missing-image");
    const missingImageRequest = new NextRequest(
      "http://localhost:5000/api/cineai/validate-shot",
      {
        method: "POST",
        body: missingImageForm,
      }
    );
    const missingImageResponse = await POST(missingImageRequest);
    const missingImagePayload = (await missingImageResponse.json()) as {
      success?: boolean;
      error?: string;
    };

    assert.equal(missingImageResponse.status, 400);
    assert.equal(missingImagePayload.success, false);
    assert.match(missingImagePayload.error ?? "", /Image is required/);

    const failureForm = new FormData();
    failureForm.set("image", createFixtureImageFile());
    const failureRequest = new NextRequest(
      "http://localhost:5000/api/cineai/validate-shot?fixtureMode=fail",
      {
        method: "POST",
        body: failureForm,
      }
    );
    const failureResponse = await POST(failureRequest);
    const failurePayload = (await failureResponse.json()) as {
      success?: boolean;
      error?: string;
    };

    assert.equal(failureResponse.status, 503);
    assert.equal(failurePayload.success, false);
    assert.match(failurePayload.error ?? "", /Fixture backend failure/);
  } finally {
    await fixture.close();
    process.env.BACKEND_URL = snapshot.backendUrl;
    process.env.NEXT_PUBLIC_BACKEND_URL = snapshot.nextPublicBackendUrl;
    process.env.NEXT_PUBLIC_API_URL = snapshot.nextPublicApiUrl;
  }
}

async function runMediaHookSuite(): Promise<void> {
  const restoreDom = installDomEnvironment();
  const originalWarn = console.warn;
  const warnCalls: string[] = [];

  try {
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args.map((value) => String(value)).join(" "));
    };

    const { useMediaInputPipeline } =
      await import("../../src/app/(main)/cinematography-studio/hooks/useMediaInputPipeline");

    const { result, unmount } = renderHook(() =>
      useMediaInputPipeline("image")
    );

    await act(async () => {
      await result.current.selectMediaFile(createFixtureImageFile());
    });

    assert.equal(result.current.canAnalyze, true);
    assert.equal(result.current.state.analysisFile?.type, "image/png");

    act(() => {
      result.current.setMode("camera");
    });

    assert.equal(result.current.canAnalyze, false);
    assert.equal(result.current.state.analysisFile, null);
    assert.equal(result.current.state.previewUrl, null);

    await act(async () => {
      await result.current.selectMediaFile(
        new File(["invalid"], "bad.txt", { type: "text/plain" })
      );
    });

    assert.match(result.current.state.error ?? "", /صيغة الملف غير مدعومة/);
    assert.ok(warnCalls.some((call) => call.includes("media error")));
    assert.ok(warnCalls.some((call) => call.includes("WARN")));

    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await act(async () => {
      await result.current.requestCamera();
    });

    assert.equal(result.current.state.cameraPermission, "unsupported");
    assert.match(result.current.state.error ?? "", /لا يدعم الوصول للكاميرا/);

    unmount();
  } finally {
    console.warn = originalWarn;
    restoreDom();
  }
}

async function runSessionStorageSuite(): Promise<void> {
  const restoreDom = installDomEnvironment();
  try {
    const { SESSION_STORAGE_KEY, clearSession, patchSession, readSession } =
      await import(
        "../../src/app/(main)/cinematography-studio/lib/session-storage"
      );

    // البداية: لا توجد جلسة محفوظة
    clearSession();
    assert.equal(readSession(), null);

    // كتابة جلسة كاملة
    patchSession({
      phase: "production",
      mood: "vintage",
      view: "phases",
      activeTool: "shot-analyzer",
      technicalSettings: {
        focusPeaking: false,
        falseColor: true,
        colorTemp: 4200,
      },
      lastAnalysis: {
        score: 72,
        exposure: 65,
        dynamicRange: "balanced",
        grainLevel: "fine",
        issues: ["تحقق من توازن الألوان"],
      },
    });

    const restored = readSession();
    assert.ok(restored, "expected session to be restored");
    assert.equal(restored?.phase, "production");
    assert.equal(restored?.mood, "vintage");
    assert.equal(restored?.view, "phases");
    assert.equal(restored?.activeTool, "shot-analyzer");
    assert.equal(restored?.technicalSettings?.colorTemp, 4200);
    assert.equal(restored?.lastAnalysis?.score, 72);
    assert.equal(restored?.lastAnalysis?.issues.length, 1);

    // البيانات الفاسدة لا ترمي
    window.localStorage.setItem(SESSION_STORAGE_KEY, "{not json");
    assert.equal(readSession(), null);

    // قيم خارج النطاق تُهمل بدل أن تُحفظ
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        phase: "not-a-phase",
        mood: "noir",
        technicalSettings: {
          focusPeaking: true,
          falseColor: false,
          colorTemp: 99999,
        },
      })
    );
    const partial = readSession();
    assert.equal(partial?.phase, undefined);
    assert.equal(partial?.mood, "noir");
    assert.equal(partial?.technicalSettings, undefined);

    // المسح يعيد null
    clearSession();
    assert.equal(readSession(), null);
  } finally {
    restoreDom();
  }
}

async function runCameraBindingSuite(): Promise<void> {
  // يثبت أن البث يُربط بعنصر الفيديو حتى لو ركّب الـ video بعد منح الإذن.
  const restoreDom = installDomEnvironment();
  try {
    interface FakeTrack { stop: () => void }
    const stoppedTracks: FakeTrack[] = [];
    const fakeStream = {
      getTracks: () => [{ stop: () => stoppedTracks.push({ stop: () => {} }) }],
    } as unknown as MediaStream;

    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: async () => fakeStream,
      },
    });

    const { useMediaInputPipeline } = await import(
      "../../src/app/(main)/cinematography-studio/hooks/useMediaInputPipeline"
    );

    const { result, unmount } = renderHook(() =>
      useMediaInputPipeline("image")
    );

    await act(async () => {
      await result.current.requestCamera();
    });

    assert.equal(result.current.state.cameraPermission, "granted");
    assert.equal(result.current.state.previewType, "camera");

    // محاكاة تركيب عنصر فيديو متأخر (بعد منح الإذن).
    const fakeVideo = {
      srcObject: null as unknown,
      play: () => Promise.resolve(),
    } as unknown as HTMLVideoElement;
    (
      result.current.cameraVideoRef as { current: HTMLVideoElement | null }
    ).current = fakeVideo;

    // إعادة تشغيل effect: نلمس previewType (يبقى camera) لكي يعيد useEffect المحاولة.
    // الطريقة الأبسط هنا: نطلب الكاميرا مرة أخرى — يُعيد applyPreview ثم يُربط.
    await act(async () => {
      await result.current.requestCamera();
    });

    assert.equal(
      (fakeVideo as { srcObject: unknown }).srcObject,
      fakeStream,
      "expected stream to be bound to video element after late mount"
    );

    unmount();
  } finally {
    restoreDom();
  }
}

const suiteResults: SuiteResult[] = [];

suiteResults.push(
  await runSuite("cinematography-config", runConfigSuite),
  await runSuite("cinematography-local-fallback", runLocalFallbackSuite),
  await runSuite("cinematography-validate-shot-route", runRouteSuite),
  await runSuite("cinematography-media-hook", runMediaHookSuite),
  await runSuite("cinematography-session-storage", runSessionStorageSuite),
  await runSuite("cinematography-camera-binding", runCameraBindingSuite),
  await runSuite("cinematography-slider-drag", async () => {
    await runSliderDragSuite();
  }),
  await runSuite(
    "cinematography-diagnostic-overlay",
    runDiagnosticOverlaySuite
  )
);

writeFileSync(
  reportPath,
  JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      suites: suiteResults,
    },
    null,
    2
  )
);

const failedSuites = suiteResults.filter((suite) => suite.status === "failed");

if (failedSuites.length > 0) {
  process.stderr.write(
    `Integration suites failed: ${failedSuites
      .map((suite) => suite.name)
      .join(", ")}\n`
  );
  process.exit(1);
} else {
  process.stdout.write(`Integration report: ${reportPath}\n`);
  process.exit(0);
}
