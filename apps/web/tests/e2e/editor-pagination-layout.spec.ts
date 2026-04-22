import { expect, test } from "@playwright/test";

import {
  ConfigManager,
  createRealTestLogger,
} from "../shared/real-test-config";
import {
  auditFooterSurface,
  auditPageGap,
  expectTerminalPaginationSummary,
  readTerminalPaginationSummary,
  waitForLivePaginationState,
} from "./helpers/editor-pagination";
import { openFile } from "./helpers/progressive";

const config = ConfigManager.fromEnv();
const logger = createRealTestLogger("editor-pagination-e2e");

test.describe("تخطيط الصفحات الحي في المحرر", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(config.e2eTimeoutMs);

  test("يحافظ على الفوتر والفاصل وآخر صفحة عند استيراد ملف DOCX الحقيقي", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await openFile(page, config.fixturePath);
    await waitForLivePaginationState(page, config.importWaitMs);

    const terminalSummary = await readTerminalPaginationSummary(page);
    logger.info({ terminalSummary }, "تمت قراءة حالة الصفحات الطرفية");
    expectTerminalPaginationSummary(terminalSummary);

    const middlePageNumber =
      terminalSummary.terminalFooterPage >= 4
        ? 4
        : Math.max(1, terminalSummary.terminalFooterPage - 1);

    const middleFooterAudit = await auditFooterSurface(page, middlePageNumber);
    logger.info({ middleFooterAudit }, "تم فحص سطح فوتر صفحة وسطية");
    expect(middleFooterAudit.hasContentLeak).toBe(false);
    expect(middleFooterAudit.pageNumberOffsetLeft).not.toBeNull();
    expect(middleFooterAudit.footerWidth).not.toBeNull();
    expect(middleFooterAudit.pageNumberOffsetLeft ?? Infinity).toBeLessThan(
      (middleFooterAudit.footerWidth ?? 0) * 0.25
    );

    const gapAudit = await auditPageGap(page, middlePageNumber);
    logger.info({ gapAudit }, "تم فحص الفاصل بين الصفحات");
    expect(gapAudit.gapDisplay).toBe("block");
    expect(gapAudit.hasContentLeak).toBe(false);

    const terminalFooterAudit = await auditFooterSurface(
      page,
      terminalSummary.terminalFooterPage
    );
    logger.info({ terminalFooterAudit }, "تم فحص الفوتر الأخير الظاهر");
    expect(terminalFooterAudit.hasContentLeak).toBe(false);
    expect(terminalFooterAudit.pageNumberOffsetLeft ?? Infinity).toBeLessThan(
      (terminalFooterAudit.footerWidth ?? 0) * 0.25
    );
  });
});
