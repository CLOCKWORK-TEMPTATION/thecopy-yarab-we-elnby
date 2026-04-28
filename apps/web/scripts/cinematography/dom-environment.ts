// DOM Environment Setup for Cinematography Integration Tests
// إعداد بيئة DOM لاختبارات التكامل

import { JSDOM } from "jsdom";

/**
 * تثبيت بيئة DOM للاختبارات
 * @returns دالة cleanup لإعادة البيئة الأصلية
 */
export function installDomEnvironment(): () => void {
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
    // @ts-ignore - cleanup function
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
