/**
 * @description متحكم تصدير PDF/A عبر Puppeteer
 */

import {
  sendJson,
  readJsonBody,
  corsHeaders,
  isHttpTypedError,
} from "../utils/http-helpers.mjs";

const resolvePuppeteerLaunchOptions = () => {
  const disableSandbox = process.env.PUPPETEER_DISABLE_SANDBOX === "true";
  return resolvePuppeteerLaunchOptionsForSandboxMode(disableSandbox);
};

const resolvePuppeteerLaunchOptionsForSandboxMode = (disableSandbox) => {
  return {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: disableSandbox
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      : ["--disable-dev-shm-usage"],
  };
};

const isSandboxLaunchFailure = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Failed to move to new namespace") ||
    message.includes("No usable sandbox") ||
    message.includes("Operation not permitted")
  );
};

const launchBrowser = async (puppeteer) => {
  try {
    return await puppeteer.launch(resolvePuppeteerLaunchOptions());
  } catch (error) {
    const explicitDisable = process.env.PUPPETEER_DISABLE_SANDBOX === "true";
    const allowFallback = process.env.PUPPETEER_ALLOW_SANDBOX_FALLBACK !== "false";
    if (!explicitDisable && allowFallback && isSandboxLaunchFailure(error)) {
      console.warn(
        "[export/pdfa] Chromium sandbox unavailable; retrying with container-level isolation fallback."
      );
      return puppeteer.launch(resolvePuppeteerLaunchOptionsForSandboxMode(true));
    }
    throw error;
  }
};

/**
 * يُصدّر HTML إلى PDF عالي الجودة عبر Puppeteer (مرحلة PDF/A).
 * Puppeteer يدعم Arabic/RTL بشكل كامل عبر Chromium.
 */
export const handleExportPdfA = async (req, res) => {
  let browser = null;
  try {
    const body = await readJsonBody(req);
    const html = typeof body?.html === "string" ? body.html : "";
    if (!html.trim()) {
      sendJson(res, 400, { success: false, error: "HTML content is empty." });
      return;
    }

    const puppeteer = await import("puppeteer");
    browser = await launchBrowser(puppeteer);
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "24px", right: "24px", bottom: "24px", left: "24px" },
      displayHeaderFooter: false,
      preferCSSPageSize: false,
    });

    await browser.close();
    browser = null;

    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      ...corsHeaders,
    });
    res.end(Buffer.from(pdfBuffer));
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // تجاهل أخطاء إغلاق المتصفح
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("[export/pdfa] Error:", message);
    sendJson(res, isHttpTypedError(error) ? error.statusCode : 500, {
      success: false,
      error: message,
    });
  }
};
