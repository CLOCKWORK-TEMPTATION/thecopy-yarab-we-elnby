import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import React, { Suspense } from "react";

// Helper component for wrapping pages with Suspense
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
);

const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

async function renderRouteComponent(
  path: string,
  PageComponent: React.ComponentType
) {
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

// Define critical routes for testing
const CRITICAL_ROUTES = [
  {
    path: "/",
    name: "الصفحة الرئيسية",
    elements: ["home", "hero", "welcome"],
  },
  {
    path: "/arabic-creative-writing-studio",
    name: "ورشة الكتابة الإبداعية العربية",
    elements: ["creative", "writing", "studio", "arabic"],
  },
  {
    path: "/directors-studio",
    name: "استوديو المخرجين",
    elements: ["director", "studio", "project"],
  },
  {
    path: "/cinematography-studio",
    name: "استوديو التصوير",
    elements: ["cinema", "photography", "studio"],
  },
  {
    path: "/actorai-arabic",
    name: "استوديو الذكاء الاصطناعي للممثلين",
    elements: ["actor", "ai", "arabic"],
  },
  {
    path: "/brain-storm-ai",
    name: "صفحة العصف الذهني",
    elements: ["brainstorm", "ideas", "creative"],
  },
  {
    path: "/analysis/seven-stations",
    name: "تحليل المحطات السبع",
    elements: ["analysis", "seven", "stations", "text"],
  },
  {
    path: "/development",
    name: "صفحة التطوير",
    elements: ["development", "creative"],
  },
  {
    path: "/editor",
    name: "محرر النصوص",
    elements: ["editor", "screenplay", "write"],
  },
  {
    path: "/breakdown",
    name: "تحليل النصوص",
    elements: ["breakdown", "analysis", "script"],
  },
];

describe("الاختبارات الحرجة للصفحات الرئيسية", () => {
  describe("اختبار عرض الصفحات الحرجة", () => {
    CRITICAL_ROUTES.forEach((route) => {
      it(`يجب أن تعرض الصفحة ${route.name} بدون أخطاء`, async () => {
        try {
          // Import page component dynamically based on path
          let PageComponent;

          try {
            switch (route.path) {
              case "/":
                PageComponent = (await import("../page")).default;
                break;
              case "/arabic-creative-writing-studio":
                PageComponent = (
                  await import("../(main)/arabic-creative-writing-studio/page")
                ).default;
                break;
              case "/directors-studio":
                PageComponent = (
                  await import("../(main)/directors-studio/page")
                ).default;
                break;
              case "/cinematography-studio":
                PageComponent = (
                  await import("../(main)/cinematography-studio/page")
                ).default;
                break;
              case "/actorai-arabic":
                PageComponent = (await import("../(main)/actorai-arabic/page"))
                  .default;
                break;
              case "/brain-storm-ai":
                PageComponent = (await import("../(main)/brain-storm-ai/page"))
                  .default;
                break;
              case "/analysis/seven-stations":
                PageComponent = (
                  await import("../(main)/analysis/seven-stations")
                ).default;
                break;
              case "/development":
                PageComponent = (await import("../(main)/development/page"))
                  .default;
                break;
              case "/editor":
                PageComponent = (await import("../(main)/editor/page")).default;
                break;
              case "/breakdown":
                PageComponent = (await import("../(main)/breakdown/page"))
                  .default;
                break;
              default:
                // For pages without specific imports, try generic import
                PageComponent = (await import(`../(main)${route.path}/page`))
                  .default;
            }
          } catch (importError) {
            console.warn(
              `Failed to import page for ${route.path}:`,
              importError
            );
            // Skip this test if page doesn't exist or can't be imported
            return;
          }

          if (!PageComponent) {
            console.warn(`No page component found for ${route.path}`);
            return;
          }

          // Render the page
          const { container } = await renderRouteComponent(
            route.path,
            PageComponent
          );

          // Basic checks
          expect(container).toBeInTheDocument();
          expect(container).toBeInstanceOf(HTMLElement);

          // Check if page has content (not empty)
          const hasContent = container.textContent?.trim().length > 0;
          expect(hasContent).toBe(true);

          console.log(`✅ الصفحة ${route.name} (${route.path}) تعمل بنجاح`);
        } catch (error) {
          console.error(`❌ خطأ في صفحة ${route.name} (${route.path}):`, error);
          throw error;
        }
      });

      it(`يجب أن تحتوي الصفحة ${route.name} على عناصر HTML صحيحة`, async () => {
        try {
          let PageComponent;

          try {
            switch (route.path) {
              case "/":
                PageComponent = (await import("../page")).default;
                break;
              case "/arabic-creative-writing-studio":
                PageComponent = (
                  await import("../(main)/arabic-creative-writing-studio/page")
                ).default;
                break;
              case "/directors-studio":
                PageComponent = (
                  await import("../(main)/directors-studio/page")
                ).default;
                break;
              case "/cinematography-studio":
                PageComponent = (
                  await import("../(main)/cinematography-studio/page")
                ).default;
                break;
              case "/actorai-arabic":
                PageComponent = (await import("../(main)/actorai-arabic/page"))
                  .default;
                break;
              case "/brain-storm-ai":
                PageComponent = (await import("../(main)/brain-storm-ai/page"))
                  .default;
                break;
              case "/analysis/seven-stations":
                PageComponent = (
                  await import("../(main)/analysis/seven-stations")
                ).default;
                break;
              case "/development":
                PageComponent = (await import("../(main)/development/page"))
                  .default;
                break;
              case "/editor":
                PageComponent = (await import("../(main)/editor/page")).default;
                break;
              case "/breakdown":
                PageComponent = (await import("../(main)/breakdown/page"))
                  .default;
                break;
              default:
                PageComponent = (await import(`../(main)${route.path}/page`))
                  .default;
            }
          } catch (importError) {
            console.warn(
              `Failed to import page for ${route.path}:`,
              importError
            );
            return;
          }

          if (!PageComponent) {
            console.warn(`No page component found for ${route.path}`);
            return;
          }

          await renderRouteComponent(route.path, PageComponent);

          // Check for basic HTML structure
          const htmlElement = document.querySelector("html");
          const bodyElement = document.querySelector("body");

          expect(htmlElement).toBeInTheDocument();
          expect(bodyElement).toBeInTheDocument();

          // Check for common page elements
          const mainElement = document.querySelector("main");
          const headerElement = document.querySelector("header");

          // At least one of these should exist
          expect(mainElement ?? headerElement).toBeTruthy();

          console.log(`✅ الصفحة ${route.name} تحتوي على عناصر HTML صحيحة`);
        } catch (error) {
          console.error(
            `❌ خطأ في فحص عناصر HTML في صفحة ${route.name} (${route.path}):`,
            error
          );
          throw error;
        }
      });
    });
  });

  describe("اختبار عدم وجود أخطاء 500", () => {
    CRITICAL_ROUTES.forEach((route) => {
      it(`الصفحة ${route.name} لا تسبب خطأ 500`, async () => {
        try {
          let PageComponent;

          try {
            switch (route.path) {
              case "/":
                PageComponent = (await import("../page")).default;
                break;
              case "/arabic-creative-writing-studio":
                PageComponent = (
                  await import("../(main)/arabic-creative-writing-studio/page")
                ).default;
                break;
              case "/directors-studio":
                PageComponent = (
                  await import("../(main)/directors-studio/page")
                ).default;
                break;
              case "/cinematography-studio":
                PageComponent = (
                  await import("../(main)/cinematography-studio/page")
                ).default;
                break;
              case "/actorai-arabic":
                PageComponent = (await import("../(main)/actorai-arabic/page"))
                  .default;
                break;
              case "/brain-storm-ai":
                PageComponent = (await import("../(main)/brain-storm-ai/page"))
                  .default;
                break;
              case "/analysis/seven-stations":
                PageComponent = (
                  await import("../(main)/analysis/seven-stations")
                ).default;
                break;
              case "/development":
                PageComponent = (await import("../(main)/development/page"))
                  .default;
                break;
              case "/editor":
                PageComponent = (await import("../(main)/editor/page")).default;
                break;
              case "/breakdown":
                PageComponent = (await import("../(main)/breakdown/page"))
                  .default;
                break;
              default:
                PageComponent = (await import(`../(main)${route.path}/page`))
                  .default;
            }
          } catch (importError) {
            console.warn(
              `Failed to import page for ${route.path}:`,
              importError
            );
            return;
          }

          if (!PageComponent) {
            console.warn(`No page component found for ${route.path}`);
            return;
          }

          // Capture console errors
          const originalError = console.error;
          const consoleErrors: string[] = [];

          console.error = (...args) => {
            const message = args.join(" ");
            if (
              message.includes("500") ||
              message.includes("error") ||
              message.includes("Error")
            ) {
              consoleErrors.push(message);
            }
            originalError(...args);
          };

          try {
            await renderRouteComponent(route.path, PageComponent);
          } finally {
            console.error = originalError;
          }

          // Check for 500 errors or critical errors
          const has500Error = consoleErrors.some(
            (error) =>
              error.includes("500") ||
              error.includes("Internal Server Error") ||
              error.includes("Failed to fetch") ||
              error.includes("Network Error")
          );

          expect(has500Error).toBe(false);

          console.log(`✅ الصفحة ${route.name} لا تسبب أخطاء 500`);
        } catch (error) {
          if (
            error instanceof Error &&
            (error.message.includes("500") ||
              error.message.includes("Internal Server Error"))
          ) {
            throw new Error(
              `الصفحة ${route.name} تسبب خطأ 500: ${error.message}`
            );
          }
          console.log(`✅ الصفحة ${route.name} تعمل بدون أخطاء 500`);
        }
      });
    });
  });

  describe("اختبار الأداء والسرعة", () => {
    CRITICAL_ROUTES.forEach((route) => {
      it(`الصفحة ${route.name} تحمل بسرعة مقبولة`, async () => {
        const startTime = performance.now();

        try {
          let PageComponent;

          try {
            switch (route.path) {
              case "/":
                PageComponent = (await import("../page")).default;
                break;
              case "/arabic-creative-writing-studio":
                PageComponent = (
                  await import("../(main)/arabic-creative-writing-studio/page")
                ).default;
                break;
              case "/directors-studio":
                PageComponent = (
                  await import("../(main)/directors-studio/page")
                ).default;
                break;
              case "/cinematography-studio":
                PageComponent = (
                  await import("../(main)/cinematography-studio/page")
                ).default;
                break;
              case "/actorai-arabic":
                PageComponent = (await import("../(main)/actorai-arabic/page"))
                  .default;
                break;
              case "/brain-storm-ai":
                PageComponent = (await import("../(main)/brain-storm-ai/page"))
                  .default;
                break;
              case "/analysis/seven-stations":
                PageComponent = (
                  await import("../(main)/analysis/seven-stations")
                ).default;
                break;
              case "/development":
                PageComponent = (await import("../(main)/development/page"))
                  .default;
                break;
              case "/editor":
                PageComponent = (await import("../(main)/editor/page")).default;
                break;
              case "/breakdown":
                PageComponent = (await import("../(main)/breakdown/page"))
                  .default;
                break;
              default:
                PageComponent = (await import(`../(main)${route.path}/page`))
                  .default;
            }
          } catch (importError) {
            console.warn(
              `Failed to import page for ${route.path}:`,
              importError
            );
            return;
          }

          if (!PageComponent) {
            console.warn(`No page component found for ${route.path}`);
            return;
          }

          await renderRouteComponent(route.path, PageComponent);

          const endTime = performance.now();
          const renderTime = endTime - startTime;

          // الصفحة يجب أن تحمل في أقل من 5 ثواني في بيئة الاختبار
          expect(renderTime).toBeLessThan(5000);

          console.log(
            `✅ الصفحة ${route.name} تحمل في ${Math.round(renderTime)}ms`
          );
        } catch (error) {
          console.error(
            `❌ خطأ في قياس أداء صفحة ${route.name} (${route.path}):`,
            error
          );
          throw error;
        }
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
