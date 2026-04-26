import { expect, type Page } from "@playwright/test";

/**
 * @description انتظار استقرار مسار الاستيراد الحي بالقدر الكافي
 * لاختبار تخطيط الصفحات. لا نفرض نجاح خط المعالجة؛ يكفي أن يصل
 * المحتوى والـ pagination إلى حالة مستقرة قابلة للفحص.
 */
export const waitForLivePaginationState = async (
  page: Page,
  timeoutMs: number
): Promise<void> => {
  await page.waitForFunction(
    () => {
      const blocks = document.querySelectorAll("[data-type]").length;
      const footers = document.querySelectorAll(".tiptap-page-footer").length;
      const header = document.querySelector('[data-testid="app-header"]');
      const headerText = header?.textContent ?? "";

      return (
        blocks > 0 &&
        footers > 0 &&
        (headerText.includes("مستقر") || headerText.includes("فشل بعد الظهور"))
      );
    },
    { timeout: timeoutMs }
  );
};

/**
 * @description تمرير حاوية المحرر إلى فوتر صفحة محددة حتى تصبح المنطقة
 * المستهدفة مرئية ويمكن فحصها بصريًا عبر hit testing.
 */
export const scrollEditorToFooter = async (
  page: Page,
  footerPageNumber: number
): Promise<void> => {
  await page.evaluate((pageNumber) => {
    const container = document.querySelector<HTMLElement>(".app-editor-scroll");
    const footer = document.querySelector<HTMLElement>(
      `.tiptap-page-footer[data-footer-page-number="${pageNumber}"]`
    );

    if (!container || !footer) return;

    const containerRect = container.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const targetScrollTop =
      footerRect.top - containerRect.top + container.scrollTop - 220;

    container.scrollTop = Math.max(0, targetScrollTop);
  }, footerPageNumber);

  await page.waitForTimeout(750);
};

interface SurfaceAudit {
  pageNumber: number;
  hasContentLeak: boolean;
  pageNumberOffsetLeft: number | null;
  footerWidth: number | null;
  samples: {
    x: number;
    y: number;
    topClass: string | null;
    contentType: string | null;
  }[];
}

/**
 * @description فحص سطح الفوتر نفسه عبر نقاط عينة مرئية للتأكد من عدم
 * تسرب أي عنصر محتوى فعلي إلى منطقة التذييل.
 */
export const auditFooterSurface = async (
  page: Page,
  footerPageNumber: number
): Promise<SurfaceAudit> => {
  await scrollEditorToFooter(page, footerPageNumber);

  return page.evaluate((pageNumber) => {
    const footer = document.querySelector<HTMLElement>(
      `.tiptap-page-footer[data-footer-page-number="${pageNumber}"]`
    );
    if (!footer) {
      throw new Error(`missing footer ${pageNumber}`);
    }

    const footerRect = footer.getBoundingClientRect();
    const pageNumberParagraph = Array.from(footer.querySelectorAll("p")).find(
      (node) => (node.textContent || "").trim().length > 0
    );
    const pageNumberRect = pageNumberParagraph?.getBoundingClientRect();
    const samplePoints = [
      { x: footerRect.left + 18, y: footerRect.top + footerRect.height / 2 },
      {
        x: footerRect.left + footerRect.width / 2,
        y: footerRect.top + footerRect.height / 2,
      },
      { x: footerRect.right - 18, y: footerRect.top + footerRect.height / 2 },
    ];

    const samples = samplePoints.map((point) => {
      const topElement = document.elementFromPoint(point.x, point.y);
      const topNode = topElement instanceof HTMLElement ? topElement : null;
      const contentNode = topNode?.closest?.(
        "[data-type]"
      ) as HTMLElement | null;

      return {
        x: Number(point.x.toFixed(2)),
        y: Number(point.y.toFixed(2)),
        topClass: topNode?.className ?? null,
        contentType: contentNode?.getAttribute("data-type") ?? null,
      };
    });

    return {
      pageNumber,
      hasContentLeak: samples.some((sample) => sample.contentType !== null),
      pageNumberOffsetLeft:
        pageNumberRect && footerRect
          ? Number((pageNumberRect.left - footerRect.left).toFixed(2))
          : null,
      footerWidth: Number(footerRect.width.toFixed(2)),
      samples,
    };
  }, footerPageNumber);
};

interface GapAudit {
  pageNumber: number;
  hasContentLeak: boolean;
  gapDisplay: string | null;
  samples: {
    x: number;
    y: number;
    topClass: string | null;
    contentType: string | null;
  }[];
}

/**
 * @description فحص الفاصل الأسود بين صفحتين للتأكد من عدم مرور أي عنصر
 * محتوى حي بداخله.
 */
export const auditPageGap = async (
  page: Page,
  footerPageNumber: number
): Promise<GapAudit> => {
  await scrollEditorToFooter(page, footerPageNumber);

  return page.evaluate((pageNumber) => {
    const gap = document.querySelector<HTMLElement>(
      `.tiptap-page-footer[data-footer-page-number="${pageNumber}"] + .tiptap-pagination-gap`
    );
    if (!gap) {
      throw new Error(`missing gap after footer ${pageNumber}`);
    }

    const gapRect = gap.getBoundingClientRect();
    const samplePoints = [
      {
        x: gapRect.left + gapRect.width / 2,
        y: gapRect.top + gapRect.height / 2,
      },
      { x: gapRect.left + 18, y: gapRect.top + gapRect.height / 2 },
      { x: gapRect.right - 18, y: gapRect.top + gapRect.height / 2 },
    ];

    const samples = samplePoints.map((point) => {
      const topElement = document.elementFromPoint(point.x, point.y);
      const topNode = topElement instanceof HTMLElement ? topElement : null;
      const contentNode = topNode?.closest?.(
        "[data-type]"
      ) as HTMLElement | null;

      return {
        x: Number(point.x.toFixed(2)),
        y: Number(point.y.toFixed(2)),
        topClass: topNode?.className ?? null,
        contentType: contentNode?.getAttribute("data-type") ?? null,
      };
    });

    return {
      pageNumber,
      hasContentLeak: samples.some((sample) => sample.contentType !== null),
      gapDisplay: getComputedStyle(gap).display,
      samples,
    };
  }, footerPageNumber);
};

interface TerminalSummary {
  terminalFooterPage: number;
  hiddenTrailingCount: number;
  terminalGapDisplay: string | null;
  terminalHeaderDisplay: string | null;
}

/**
 * @description قراءة حالة قصّ الصفحات الذيلية بعد الاستيراد.
 */
export const readTerminalPaginationSummary = async (
  page: Page
): Promise<TerminalSummary> => {
  return page.evaluate(() => {
    const pageBreaks = Array.from(
      document.querySelectorAll<HTMLElement>(".tiptap-page-break")
    );
    const terminalBreak = pageBreaks.find(
      (pageBreak) => pageBreak.dataset["filmlaneTerminalPage"] === "true"
    );

    if (!terminalBreak) {
      throw new Error("missing terminal page break");
    }

    const terminalFooter = terminalBreak.querySelector<HTMLElement>(
      ".tiptap-page-footer"
    );
    const terminalGap = terminalBreak.querySelector<HTMLElement>(
      ".tiptap-pagination-gap"
    );
    const terminalHeader = terminalBreak.querySelector<HTMLElement>(
      ".tiptap-page-header"
    );

    return {
      terminalFooterPage: Number(
        terminalFooter?.dataset["footerPageNumber"] ?? "0"
      ),
      hiddenTrailingCount: pageBreaks.filter(
        (pageBreak) => getComputedStyle(pageBreak).display === "none"
      ).length,
      terminalGapDisplay: terminalGap
        ? getComputedStyle(terminalGap).display
        : null,
      terminalHeaderDisplay: terminalHeader
        ? getComputedStyle(terminalHeader).display
        : null,
    };
  });
};

/**
 * @description تأكيد سريع على أن الملخص الطرفي الناتج صالح للاعتماد داخل الاختبار.
 */
export const expectTerminalPaginationSummary = (
  summary: TerminalSummary
): void => {
  expect(summary.terminalFooterPage).toBeGreaterThan(0);
  expect(summary.hiddenTrailingCount).toBeGreaterThan(0);
  expect(summary.terminalGapDisplay).toBe("none");
  expect(summary.terminalHeaderDisplay).toBe("none");
};
