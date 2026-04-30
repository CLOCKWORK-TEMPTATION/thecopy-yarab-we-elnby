import assert from "node:assert/strict";

import { act, renderHook } from "@testing-library/react";
import { NextRequest } from "next/server";

import { createCinematographyInputConfig } from "../../src/app/(main)/cinematography-studio/lib/cinematography-config";
import {
  createLocalFootageSummary,
  createLocalShotAnalysis,
} from "../../src/app/(main)/cinematography-studio/lib/local-shot-analysis";

import { installDomEnvironment } from "./dom-environment";
import { createFixtureImageFile, startFixtureServer } from "./fixture-server";

export function runConfigSuite(): void {
  const snapshot = {
    imageMaxMb: process.env["NEXT_PUBLIC_CINE_IMAGE_MAX_MB"],
    videoMaxMb: process.env["NEXT_PUBLIC_CINE_VIDEO_MAX_MB"],
    captureWidth: process.env["NEXT_PUBLIC_CINE_CAPTURE_WIDTH"],
    captureHeight: process.env["NEXT_PUBLIC_CINE_CAPTURE_HEIGHT"],
    captureQuality: process.env["NEXT_PUBLIC_CINE_CAPTURE_QUALITY"],
    captureMime: process.env["NEXT_PUBLIC_CINE_CAPTURE_MIME"],
  };

  try {
    process.env["NEXT_PUBLIC_CINE_IMAGE_MAX_MB"] = "24";
    process.env["NEXT_PUBLIC_CINE_VIDEO_MAX_MB"] = "640";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_WIDTH"] = "1920";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_HEIGHT"] = "1080";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_QUALITY"] = "0.8";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_MIME"] = "image/jpeg";

    const config = createCinematographyInputConfig();

    assert.equal(config.imageMaxSizeBytes, 24 * 1024 * 1024);
    assert.equal(config.videoMaxSizeBytes, 640 * 1024 * 1024);
    assert.equal(config.captureWidth, 1920);
    assert.equal(config.captureHeight, 1080);
    assert.equal(config.captureMimeType, "image/jpeg");
    assert.equal(config.captureQuality, 0.8);
  } finally {
    process.env["NEXT_PUBLIC_CINE_IMAGE_MAX_MB"] = snapshot.imageMaxMb;
    process.env["NEXT_PUBLIC_CINE_VIDEO_MAX_MB"] = snapshot.videoMaxMb;
    process.env["NEXT_PUBLIC_CINE_CAPTURE_WIDTH"] = snapshot.captureWidth;
    process.env["NEXT_PUBLIC_CINE_CAPTURE_HEIGHT"] = snapshot.captureHeight;
    process.env["NEXT_PUBLIC_CINE_CAPTURE_QUALITY"] = snapshot.captureQuality;
    process.env["NEXT_PUBLIC_CINE_CAPTURE_MIME"] = snapshot.captureMime;
  }
}

export async function runLocalFallbackSuite(): Promise<void> {
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

export async function runRouteSuite(): Promise<void> {
  const fixture = await startFixtureServer();
  const snapshot = {
    backendUrl: process.env["BACKEND_URL"],
    nextPublicBackendUrl: process.env["NEXT_PUBLIC_BACKEND_URL"],
    nextPublicApiUrl: process.env["NEXT_PUBLIC_API_URL"],
  };

  try {
    process.env["BACKEND_URL"] = fixture.baseUrl;
    delete process.env["NEXT_PUBLIC_BACKEND_URL"];
    delete process.env["NEXT_PUBLIC_API_URL"];

    const { POST } =
      await import("../../src/app/api/cineai/validate-shot/route");

    const validateShotUrl = new URL(
      "/api/cineai/validate-shot",
      fixture.baseUrl
    );

    const successForm = new FormData();
    successForm.set("image", createFixtureImageFile());
    const successResponse = await POST(
      new NextRequest(validateShotUrl, {
        method: "POST",
        body: successForm,
      })
    );
    const successPayload = (await successResponse.json()) as {
      success?: boolean;
      validation?: { score?: number };
    };

    assert.equal(successResponse.status, 200);
    assert.equal(successPayload.success, true);
    assert.equal(successPayload.validation?.score, 88);
    assert.equal(fixture.state.receivedBodies.length, 1);
    assert.equal(
      typeof fixture.state.receivedBodies[0]?.["imageBase64"],
      "string"
    );
    assert.equal(fixture.state.receivedBodies[0]?.["mimeType"], "image/png");

    const missingImageForm = new FormData();
    missingImageForm.set("note", "missing-image");
    const missingImageResponse = await POST(
      new NextRequest(validateShotUrl, {
        method: "POST",
        body: missingImageForm,
      })
    );
    const missingImagePayload = (await missingImageResponse.json()) as {
      success?: boolean;
      error?: string;
    };

    assert.equal(missingImageResponse.status, 400);
    assert.equal(missingImagePayload.success, false);
    assert.match(missingImagePayload.error ?? "", /Image is required/);

    const failureForm = new FormData();
    failureForm.set("image", createFixtureImageFile());
    const failureUrl = new URL(validateShotUrl);
    failureUrl.searchParams.set("fixtureMode", "fail");
    const failureResponse = await POST(
      new NextRequest(failureUrl, {
        method: "POST",
        body: failureForm,
      })
    );
    const failurePayload = (await failureResponse.json()) as {
      success?: boolean;
      error?: string;
    };

    assert.equal(failureResponse.status, 503);
    assert.equal(failurePayload.success, false);
    assert.match(failurePayload.error ?? "", /Fixture backend failure/);
  } finally {
    await fixture.close();
    if (snapshot.backendUrl === undefined) {
      delete process.env["BACKEND_URL"];
    } else {
      process.env["BACKEND_URL"] = snapshot.backendUrl;
    }
    if (snapshot.nextPublicBackendUrl === undefined) {
      delete process.env["NEXT_PUBLIC_BACKEND_URL"];
    } else {
      process.env["NEXT_PUBLIC_BACKEND_URL"] = snapshot.nextPublicBackendUrl;
    }
    if (snapshot.nextPublicApiUrl === undefined) {
      delete process.env["NEXT_PUBLIC_API_URL"];
    } else {
      process.env["NEXT_PUBLIC_API_URL"] = snapshot.nextPublicApiUrl;
    }
  }
}

export async function runMediaHookSuite(): Promise<void> {
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

export async function runSessionStorageSuite(): Promise<void> {
  const restoreDom = installDomEnvironment();
  try {
    const { SESSION_STORAGE_KEY, clearSession, patchSession, readSession } =
      await import("../../src/app/(main)/cinematography-studio/lib/session-storage");

    clearSession();
    assert.equal(readSession(), null);

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

    window.localStorage.setItem(SESSION_STORAGE_KEY, "{not json");
    assert.equal(readSession(), null);

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

    clearSession();
    assert.equal(readSession(), null);
  } finally {
    restoreDom();
  }
}

export async function runCameraBindingSuite(): Promise<void> {
  const restoreDom = installDomEnvironment();
  try {
    const stoppedTracks: { stop: () => void }[] = [];
    const fakeStream = {
      getTracks: () => [
        { stop: () => stoppedTracks.push({ stop: () => undefined }) },
      ],
    } as unknown as MediaStream;

    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: () => Promise.resolve(fakeStream),
      },
    });

    const { useMediaInputPipeline } =
      await import("../../src/app/(main)/cinematography-studio/hooks/useMediaInputPipeline");

    const { result, unmount } = renderHook(() =>
      useMediaInputPipeline("image")
    );

    await act(async () => {
      await result.current.requestCamera();
    });

    assert.equal(result.current.state.cameraPermission, "granted");
    assert.equal(result.current.state.previewType, "camera");

    const fakeVideo = {
      srcObject: null as unknown,
      play: () => Promise.resolve(),
    } as unknown as HTMLVideoElement;
    (
      result.current.cameraVideoRef as { current: HTMLVideoElement | null }
    ).current = fakeVideo;

    await act(async () => {
      await result.current.requestCamera();
    });

    assert.equal((fakeVideo as { srcObject: unknown }).srcObject, fakeStream);
    unmount();
  } finally {
    restoreDom();
  }
}
