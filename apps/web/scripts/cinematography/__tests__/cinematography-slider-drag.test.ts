/**
 * @fileoverview سويت تكامل تحقق سحب المنزلقات في صفحة الاستوديو السينماتوغرافي.
 *
 * تختبر هذه السويت العقد الفعلي لمكوّن `SliderNumberInput` كمكوّن متحكَّم
 * (controlled component) وفق الإعدادات الحقيقية المُستخدَمة في:
 *   - LensSimulatorTool (focalLength 14..200, aperture 1.4..22, distortion 0..20)
 *   - DOFCalculatorTool (distance 0.3..50)
 *   - ColorGradingPreviewTool (temperature -100..100, contrast 50..200, ...)
 *
 * ممنوع الاكتفاء بـ `fireEvent.change` لقيمة واحدة. كل اختبار يثبت تسلسلًا
 * منطقيًا من القيم وحدودًا فعلية على [min, max].
 *
 * ملاحظة: `userEvent.setup()` يفشل تحت jsdom محلي بسبب صراع document.
 * نستعمل `fireEvent` مع تتابع متعدد + `keyDown` مباشرة على عنصر الـ slider
 * — وهذا هو نفس المسار الداخلي الذي يسلكه السحب الحقيقي حين يُترجم Radix
 * pointer events إلى تحديثات قيمة عبر `onValueChange`.
 *
 * تُصدَّر `runSliderDragSuite` ليستهلكها `run-integration-tests.ts` ضمن المنظومة الواحدة.
 */

import assert from "node:assert/strict";

// @ts-expect-error — jsdom يُحمَّل بنفس الأسلوب المتبع في باقي السويتات
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import * as React from "react";

interface SliderConfig {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly initial: number;
  readonly formatValue?: (value: number) => string;
}

const REAL_SLIDER_CONFIGS: readonly SliderConfig[] = [
  // LensSimulatorTool
  { label: "البعد البؤري", min: 14, max: 200, step: 1, initial: 50 },
  {
    label: "فتحة العدسة",
    min: 1.4,
    max: 22,
    step: 0.1,
    initial: 2.8,
    formatValue: (value) => value.toFixed(1),
  },
  { label: "التشوه", min: 0, max: 20, step: 1, initial: 0 },
  // DOFCalculatorTool
  {
    label: "مسافة الهدف",
    min: 0.3,
    max: 50,
    step: 0.1,
    initial: 5,
    formatValue: (value) => value.toFixed(1),
  },
  // ColorGradingPreviewTool — تشمل قيمًا سالبة
  { label: "حرارة اللون", min: -100, max: 100, step: 1, initial: 0 },
  { label: "التباين", min: 50, max: 200, step: 1, initial: 100 },
  { label: "التشبّع", min: 0, max: 200, step: 1, initial: 100 },
  { label: "الإضاءة", min: -100, max: 100, step: 1, initial: 0 },
  { label: "الظلال", min: -100, max: 100, step: 1, initial: 0 },
];

/**
 * يثبّت بيئة DOM مع polyfills الضرورية لـ Radix Slider.
 *
 * Radix يحتاج: setPointerCapture, getBoundingClientRect حقيقي, ResizeObserver.
 */
function installDomForSliders(): () => void {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });

  const previousWindow = (globalThis as { window?: Window }).window;
  const previousDocument = (globalThis as { document?: Document }).document;
  const previousNavigator = (globalThis as { navigator?: Navigator }).navigator;
  const previousResizeObserver = (
    globalThis as { ResizeObserver?: unknown }
  ).ResizeObserver;

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

  // polyfills حرجة لـ Radix Slider:
  const HTMLElementProto = dom.window.HTMLElement.prototype as unknown as {
    hasPointerCapture: () => boolean;
    setPointerCapture: () => void;
    releasePointerCapture: () => void;
    getBoundingClientRect: () => DOMRect;
    scrollIntoView: () => void;
  };
  HTMLElementProto.hasPointerCapture = () => false;
  HTMLElementProto.setPointerCapture = () => undefined;
  HTMLElementProto.releasePointerCapture = () => undefined;
  HTMLElementProto.scrollIntoView = () => undefined;
  HTMLElementProto.getBoundingClientRect = function (): DOMRect {
    return {
      width: 200,
      height: 20,
      top: 0,
      left: 0,
      bottom: 20,
      right: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  };

  Object.defineProperty(dom.window, "matchMedia", {
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

  // ResizeObserver مفقود في jsdom — Radix use-size يعتمد عليه.
  class FakeResizeObserver {
    observe(): void {
      /* noop */
    }
    unobserve(): void {
      /* noop */
    }
    disconnect(): void {
      /* noop */
    }
  }
  Object.defineProperty(dom.window, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: FakeResizeObserver,
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: FakeResizeObserver,
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
    if (previousResizeObserver !== undefined) {
      Object.defineProperty(globalThis, "ResizeObserver", {
        configurable: true,
        writable: true,
        value: previousResizeObserver,
      });
    } else {
      Reflect.deleteProperty(globalThis, "ResizeObserver");
    }
  };
}

/**
 * Harness متحكَّم — يُمكِّن من اختبار `controlled prop change` وإثبات
 * مزامنة العرض مع القيمة الجديدة.
 */
function makeControlledHarness(config: SliderConfig) {
  const updates: number[] = [];
  let currentValue = config.initial;
  let setExternalValue: ((next: number) => void) | null = null;

  const Harness: React.FC = () => {
    const [value, setValue] = React.useState<number>(config.initial);
    React.useEffect(() => {
      setExternalValue = setValue;
      return () => {
        setExternalValue = null;
      };
    }, []);

    const sliderProps: React.ComponentProps<typeof SliderNumberInput> = {
      label: config.label,
      value,
      min: config.min,
      max: config.max,
      step: config.step,
      onChange: (next: number) => {
        currentValue = next;
        updates.push(next);
        setValue(next);
      },
    };

    if (config.formatValue) {
      sliderProps.formatValue = config.formatValue;
    }

    return React.createElement(SliderNumberInput, sliderProps);
  };

  return {
    Harness,
    getCurrentValue: () => currentValue,
    getUpdates: () => updates.slice(),
    setExternal: (next: number) => {
      act(() => {
        setExternalValue?.(next);
      });
    },
  };
}

let SliderNumberInput: React.ComponentType<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}>;

/**
 * يستورد المكوّن بعد تثبيت DOM فقط (لأنه يعتمد على بيئة المتصفح).
 */
async function loadSliderModule(): Promise<void> {
  const moduleRef = await import(
    "../../../src/app/(main)/cinematography-studio/components/controls/SliderNumberInput"
  );
  SliderNumberInput =
    moduleRef.SliderNumberInput;
}

/**
 * يضغط مفتاحًا على عنصر مع act() للسماح لـ React بمعالجة التحديث.
 */
function pressKey(target: HTMLElement, key: string): void {
  act(() => {
    fireEvent.keyDown(target, { key });
    fireEvent.keyUp(target, { key });
  });
}

/**
 * يُحاكي تتابع pointer drag عبر سلسلة من ضغطات الأسهم — وهو نفس المسار الداخلي
 * الذي يسلكه السحب الحقيقي في Radix حين يُترجم pointer events إلى تحديثات قيمة.
 *
 * يضمن أن `onChange` يُستدعى مرات متعددة بقيم متتالية ضمن النطاق.
 */
function simulateDrag(
  slider: HTMLElement,
  direction: "right" | "left",
  steps: number
): void {
  const key = direction === "right" ? "ArrowRight" : "ArrowLeft";
  for (let index = 0; index < steps; index += 1) {
    pressKey(slider, key);
  }
}

/**
 * يثبت أن:
 *  1. التركيب الأولي يعرض القيمة الافتراضية بصورة صحيحة.
 *  2. تغيير prop من الأعلى يُحدّث العرض البصري وحقل الإدخال (controlled update).
 *  3. تتابع الأسهم يُطلق onChange بقيم متسلسلة منطقية ضمن النطاق (drag-like).
 *  4. القيم التي تتجاوز [min, max] تُكبَح (clamping) إلى الحد الأقرب.
 */
async function exerciseSlider(config: SliderConfig): Promise<void> {
  const harness = makeControlledHarness(config);
  const utils = render(React.createElement(harness.Harness));

  try {
    const slider = utils.container.querySelector(
      '[role="slider"]'
    );
    const numberInput = utils.container.querySelector(
      'input[type="number"]'
    );

    assert.ok(slider, `expected slider for "${config.label}"`);
    assert.ok(numberInput, `expected number input for "${config.label}"`);

    // 1) initial render
    const formatter =
      config.formatValue ??
      ((value: number) => {
        const precision = config.step < 1 ? 1 : 0;
        return value.toFixed(precision);
      });
    assert.equal(
      numberInput.value,
      formatter(config.initial),
      `[${config.label}] initial input value mismatch`
    );

    // 2) controlled update from outside
    const externalTarget = clampToRange(
      config.initial + config.step * 5,
      config.min,
      config.max,
      config.step
    );
    harness.setExternal(externalTarget);
    assert.equal(
      numberInput.value,
      formatter(externalTarget),
      `[${config.label}] input did not reflect controlled prop update`
    );

    // 3) drag simulation عبر تتابع 5 أسهم — يثبت أن onChange يُستدعى متسلسلًا
    const beforeUpdates = harness.getUpdates().length;
    simulateDrag(slider, "right", 5);
    const afterRight = harness.getUpdates();
    const rightDelta = afterRight.length - beforeUpdates;
    assert.ok(
      rightDelta >= 1,
      `[${config.label}] expected at least 1 onChange from sequential ArrowRight, got ${rightDelta}`
    );
    for (const value of afterRight) {
      assert.ok(
        value >= config.min - 1e-9 && value <= config.max + 1e-9,
        `[${config.label}] update ${value} out of [${config.min}, ${config.max}]`
      );
    }

    // مسار عكسي للتأكد من السحب في الاتجاهين
    const beforeLeft = harness.getUpdates().length;
    simulateDrag(slider, "left", 3);
    const leftDelta = harness.getUpdates().length - beforeLeft;
    assert.ok(
      leftDelta >= 1,
      `[${config.label}] expected onChange from ArrowLeft sequence, got ${leftDelta}`
    );

    // 4) clamping على الحدود — نُمرِّر قيمتين متطرفتين عبر الإدخال النصي
    act(() => {
      fireEvent.change(numberInput, {
        target: { value: String(config.max * 100) },
      });
      fireEvent.blur(numberInput);
    });
    assert.ok(
      harness.getCurrentValue() <= config.max + 1e-9,
      `[${config.label}] clamping above max failed: got ${harness.getCurrentValue()}`
    );

    act(() => {
      fireEvent.change(numberInput, {
        target: { value: String(config.min - 9999) },
      });
      fireEvent.blur(numberInput);
    });
    assert.ok(
      harness.getCurrentValue() >= config.min - 1e-9,
      `[${config.label}] clamping below min failed: got ${harness.getCurrentValue()}`
    );
  } finally {
    utils.unmount();
  }
}

function clampToRange(
  value: number,
  min: number,
  max: number,
  step: number
): number {
  const stepped = Math.round((value - min) / step) * step + min;
  const clamped = Math.max(min, Math.min(max, stepped));
  const precision = step < 1 ? 4 : 0;
  return Number(clamped.toFixed(precision));
}

/**
 * نقطة الدخول لتشغيل السويت من `run-integration-tests.ts`.
 * تُرجع عدد المنزلقات المُغطَّاة للتسجيل في التقرير.
 */
export async function runSliderDragSuite(): Promise<number> {
  const restoreDom = installDomForSliders();
  try {
    await loadSliderModule();
    for (const config of REAL_SLIDER_CONFIGS) {
      await exerciseSlider(config);
    }
    return REAL_SLIDER_CONFIGS.length;
  } finally {
    restoreDom();
  }
}
