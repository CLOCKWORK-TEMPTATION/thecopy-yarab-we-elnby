import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import React, { Suspense } from "react";
import { describe, it, expect, vi } from "vitest";

// Helper component for wrapping pages with Suspense
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
);

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

async function renderRouteComponent({
  path,
  PageComponent,
}: {
  path: string;
  PageComponent: React.ComponentType;
}) {
  const Wrapper =
    path === "/directors-studio"
      ? (await import("../(main)/directors-studio/layout")).default
      : RouteWrapper;

  return render(
    <Wrapper>
      <PageWrapper>
        <PageComponent />
      </PageWrapper>
    </Wrapper>
  );
}

type RouteLoader = () => Promise<{ default: React.ComponentType }>;

// Define critical routes for testing
const CRITICAL_ROUTES = [
  {
    path: "/",
    name: "الصفحة الرئيسية",
    elements: ["home", "hero", "welcome"],
    load: () => import("../page"),
  },
  {
    path: "/arabic-creative-writing-studio",
    name: "ورشة الكتابة الإبداعية العربية",
    elements: ["creative", "writing", "studio", "arabic"],
    load: () => import("../(main)/arabic-creative-writing-studio/page"),
  },
  {
    path: "/directors-studio",
    name: "استوديو المخرجين",
    elements: ["director", "studio", "project"],
    load: () => import("../(main)/directors-studio/page"),
  },
  {
    path: "/cinematography-studio",
    name: "استوديو التصوير",
    elements: ["cinema", "photography", "studio"],
    load: () => import("../(main)/cinematography-studio/page"),
  },
  {
    path: "/actorai-arabic",
    name: "استوديو الذكاء الاصطناعي للممثلين",
    elements: ["actor", "ai", "arabic"],
    load: () => import("../(main)/actorai-arabic/page"),
  },
  {
    path: "/brain-storm-ai",
    name: "صفحة العصف الذهني",
    elements: ["brainstorm", "ideas", "creative"],
    load: () => import("../(main)/brain-storm-ai/page"),
  },
  {
    path: "/analysis/seven-stations",
    name: "تحليل المحطات السبع",
    elements: ["analysis", "seven", "stations", "text"],
    load: () => import("../(main)/analysis/seven-stations"),
  },
  {
    path: "/development",
    name: "صفحة التطوير",
    elements: ["development", "creative"],
    load: () => import("../(main)/development/page"),
  },
  {
    path: "/editor",
    name: "محرر النصوص",
    elements: ["editor", "screenplay", "write"],
    load: () => import("../(main)/editor/page"),
  },
  {
    path: "/breakdown",
    name: "تحليل النصوص",
    elements: ["breakdown", "analysis", "script"],
    load: () => import("../(main)/breakdown/page"),
  },
];

type CriticalRoute = (typeof CRITICAL_ROUTES)[number] & {
  load: RouteLoader;
};

function isCriticalConsoleError(message: string) {
  return (
    message.includes("500") ||
    message.includes("Internal Server Error") ||
    message.includes("Failed to fetch") ||
    message.includes("Network Error")
  );
}

async function renderCriticalRoute(route: CriticalRoute) {
  const startTime = performance.now();
  const consoleErrors: string[] = [];
  const consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation((...args) => {
      const message = args.map(String).join(" ");
      if (isCriticalConsoleError(message)) {
        consoleErrors.push(message);
      }
    });

  try {
    const PageComponent = (await route.load()).default;
    const result = await renderRouteComponent({
      path: route.path,
      PageComponent,
    });

    return {
      ...result,
      consoleErrors,
      renderTime: performance.now() - startTime,
    };
  } finally {
    consoleErrorSpy.mockRestore();
  }
}

describe("الاختبارات الحرجة للصفحات الرئيسية", () => {
  describe("اختبار عرض الصفحات الحرجة", () => {
    CRITICAL_ROUTES.forEach((route) => {
      it(`يجب أن تعرض الصفحة ${route.name} بدون أخطاء`, async () => {
        const { container, consoleErrors, renderTime } =
          await renderCriticalRoute(route);

        expect(container).toBeInTheDocument();
        expect(container).toBeInstanceOf(HTMLElement);

        const hasContent = container.textContent?.trim().length > 0;
        expect(hasContent).toBe(true);

        const htmlElement = document.querySelector("html");
        const bodyElement = document.querySelector("body");

        expect(htmlElement).toBeInTheDocument();
        expect(bodyElement).toBeInTheDocument();

        const mainElement = document.querySelector("main");
        const headerElement = document.querySelector("header");

        expect(mainElement ?? headerElement).toBeTruthy();
        expect(consoleErrors).toEqual([]);
        expect(renderTime).toBeLessThan(5000);
      });
    });
  });
});

describe("اختبار الجذر العام للتطبيق", () => {
  it("يجب أن يحتوي التطبيق على عناصر أساسية", () => {
    // Test that the test environment is set up correctly
    expect(document).toBeDefined();
    expect(document.body).toBeInTheDocument();
  });

  it("يجب أن تكون المكتبات الأساسية متاحة", () => {
    // Test that React is available
    expect(React).toBeDefined();
    expect(typeof React.createElement).toBe("function");
  });
});

export { CRITICAL_ROUTES };
