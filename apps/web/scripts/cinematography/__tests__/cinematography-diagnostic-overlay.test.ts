/**
 * @fileoverview سويت تكامل لطبقة التشخيص (DiagnosticOverlay).
 *
 * تثبت:
 *   1. ناقل الأحداث (`diagnostics-bus`) لا يستهلك بصمة عند تعطيل العلم البيئي.
 *   2. ينشر ويستلم بدقة عند تفعيل العلم.
 *   3. مكوّن العرض البصري يُخفي نفسه عندما `visible=false`.
 *   4. مكوّن العرض البصري يحترم `aria-live="polite"` و `role="status"`.
 *   5. الحاوية تستجيب لاختصار `Ctrl+Shift+D`.
 */

import assert from "node:assert/strict";

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import * as React from "react";

interface BusModule {
  isDiagnosticsEnabled: () => boolean;
  publishDiagnostics: (payload: unknown) => void;
  subscribeDiagnostics: (cb: (p: unknown) => void) => () => void;
  snapshotDiagnostics: () => unknown;
  resetDiagnostics: () => void;
}

interface OverlayModule {
  DiagnosticOverlay: React.ComponentType<{
    visible: boolean;
    camera: {
      permission: string;
      previewType: string | null;
      msSinceLastFrame: number | null;
    };
    session: {
      storageKey: string;
      payloadBytes: number;
      savedAt: string | null;
    };
    assistant: {
      isLoading: boolean;
      lastQuestion: string | null;
      answerLength: number;
      error: string | null;
    };
    viewport: { width: number; height: number };
    renderCounts: { studio: number; production: number };
  }>;
}

interface ContainerModule {
  DiagnosticOverlayContainer: React.ComponentType;
}

function installDom(): () => void {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });

  const previousWindow = (globalThis as { window?: Window }).window;
  const previousDocument = (globalThis as { document?: Document }).document;
  const previousNavigator = (globalThis as { navigator?: Navigator }).navigator;

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
  Object.defineProperty(dom.window, "matchMedia", {
    configurable: true,
    writable: true,
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
      media: "",
    }),
  });

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
  };
}

async function loadBus(): Promise<BusModule> {
  // import dinamic لإجبار تقييم process.env عند الاستدعاء.
  const moduleRef =
    (await import("../../../src/app/(main)/cinematography-studio/lib/diagnostics-bus")) as unknown as BusModule;
  return moduleRef;
}

async function loadOverlay(): Promise<OverlayModule> {
  const moduleRef =
    (await import("../../../src/app/(main)/cinematography-studio/components/diagnostics/DiagnosticOverlay")) as unknown as OverlayModule;
  return moduleRef;
}

async function loadContainer(): Promise<ContainerModule> {
  const moduleRef =
    (await import("../../../src/app/(main)/cinematography-studio/components/diagnostics/DiagnosticOverlayContainer")) as unknown as ContainerModule;
  return moduleRef;
}

/**
 * يثبت أن الناقل يكون معطّلًا حين علم البيئة غير مضبوط على "1"،
 * وأنه يصير فعالًا عند تفعيله.
 */
function exerciseBusEnvFlag(bus: BusModule): void {
  const previousFlag = process.env.NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS;
  try {
    delete process.env.NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS;
    bus.resetDiagnostics();
    assert.equal(bus.isDiagnosticsEnabled(), false);

    const events: unknown[] = [];
    const off = bus.subscribeDiagnostics((p) => events.push(p));
    bus.publishDiagnostics({
      slice: "camera",
      data: { permission: "granted", previewType: "camera", lastFrameAt: 1 },
    });
    assert.equal(events.length, 0, "expected no events while flag disabled");
    off();

    process.env.NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS = "1";
    assert.equal(bus.isDiagnosticsEnabled(), true);
    bus.resetDiagnostics();

    const enabledEvents: unknown[] = [];
    const off2 = bus.subscribeDiagnostics((p) => enabledEvents.push(p));
    bus.publishDiagnostics({
      slice: "assistant",
      data: {
        isLoading: true,
        lastQuestion: "test?",
        answerLength: 0,
        error: null,
      },
    });
    assert.equal(enabledEvents.length, 1);
    off2();
  } finally {
    if (previousFlag === undefined) {
      delete process.env.NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS;
    } else {
      process.env.NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS = previousFlag;
    }
  }
}

/**
 * يثبت أن مكوّن العرض البصري:
 * - لا يُرَكَّب في DOM عند `visible=false`.
 * - يُرَكَّب مع `role="status"` و `aria-live="polite"` عند `visible=true`.
 * - يعرض الحقول الستة المطلوبة في العقد.
 */
function exerciseOverlayPresentation(
  overlay: OverlayModule
): void {
  const baseProps = {
    camera: {
      permission: "granted",
      previewType: "camera" as const,
      msSinceLastFrame: 42,
    },
    session: {
      storageKey: "cinematography-studio.session.v1",
      payloadBytes: 256,
      savedAt: new Date("2026-04-25T18:30:00Z").toISOString(),
    },
    assistant: {
      isLoading: false,
      lastQuestion: "ما العدسة المثالية للوجه؟",
      answerLength: 124,
      error: null,
    },
    viewport: { width: 1920, height: 1080 },
    renderCounts: { studio: 3, production: 7 },
  };

  // 1) hidden case
  const hiddenUtils = render(
    React.createElement(overlay.DiagnosticOverlay, {
      ...baseProps,
      visible: false,
    })
  );
  assert.equal(
    hiddenUtils.container.querySelector(
      '[data-testid="cine-diagnostic-overlay"]'
    ),
    null,
    "overlay must not render when visible=false"
  );
  hiddenUtils.unmount();

  // 2) visible case
  const visibleUtils = render(
    React.createElement(overlay.DiagnosticOverlay, {
      ...baseProps,
      visible: true,
    })
  );
  const root = visibleUtils.container.querySelector(
    '[data-testid="cine-diagnostic-overlay"]'
  );
  assert.ok(root, "overlay must render when visible=true");
  assert.equal(root?.getAttribute("role"), "status");
  assert.equal(root?.getAttribute("aria-live"), "polite");

  const text = root?.textContent ?? "";
  // الحقول الستة من العقد:
  assert.match(text, /Camera/i, "Camera section missing");
  assert.match(text, /Session/i, "Session section missing");
  assert.match(text, /Assistant/i, "Assistant section missing");
  assert.match(text, /Viewport/i, "Viewport section missing");
  assert.match(text, /Renders/i, "Renders section missing");
  assert.match(
    text,
    /cinematography-studio\.session\.v1/,
    "Session storage key missing"
  );
  assert.match(text, /1920/, "Viewport width missing");
  assert.match(text, /124 chars/, "Assistant answer length missing");

  visibleUtils.unmount();
}

/**
 * يثبت أن الحاوية تستجيب لاختصار Ctrl+Shift+D وتُبدّل ظهور المكوّن.
 */
function exerciseContainerHotkey(
  container: ContainerModule,
  bus: BusModule
): void {
  bus.resetDiagnostics();
  // ضمان وجود قيمة في الـ localStorage حتى تُحسب الجلسة بحجم > 0.
  window.localStorage.setItem(
    "cinematography-studio.session.v1",
    JSON.stringify({ phase: "production", savedAt: new Date().toISOString() })
  );

  const utils = render(
    React.createElement(container.DiagnosticOverlayContainer)
  );

  // قبل أي ضغط: غير ظاهر.
  assert.equal(
    utils.container.querySelector('[data-testid="cine-diagnostic-overlay"]'),
    null
  );

  // الضغط على Ctrl+Shift+D يُظهر.
  act(() => {
    fireEvent.keyDown(window, {
      key: "D",
      ctrlKey: true,
      shiftKey: true,
    });
  });

  const visibleNow = utils.container.querySelector(
    '[data-testid="cine-diagnostic-overlay"]'
  );
  assert.ok(visibleNow, "overlay must appear after Ctrl+Shift+D");

  // الضغط مرة أخرى يُخفي.
  act(() => {
    fireEvent.keyDown(window, {
      key: "d",
      ctrlKey: true,
      shiftKey: true,
    });
  });
  assert.equal(
    utils.container.querySelector('[data-testid="cine-diagnostic-overlay"]'),
    null,
    "overlay must hide after second Ctrl+Shift+D"
  );

  utils.unmount();
}

/**
 * نقطة الدخول للسويت — تستدعى من `run-integration-tests.ts`.
 */
export async function runDiagnosticOverlaySuite(): Promise<void> {
  const restoreDom = installDom();
  try {
    const bus = await loadBus();
    exerciseBusEnvFlag(bus);

    const overlay = await loadOverlay();
    exerciseOverlayPresentation(overlay);

    // الحاوية تتطلب العلم مفعّلًا لتلتقط الأحداث.
    process.env.NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS = "1";
    const container = await loadContainer();
    exerciseContainerHotkey(container, bus);
  } finally {
    delete process.env.NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS;
    restoreDom();
  }
}
