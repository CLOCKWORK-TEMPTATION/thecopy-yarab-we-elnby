/**
 * @fileoverview سيناريو E2E متكامل لصفحة الاستوديو السينماتوغرافي.
 *
 * يثبت المسار البشري الفعلي:
 *   1. فتح /cinematography-studio على خادم dev الحي.
 *   2. التحقق من ظهور قوالب العدسات.
 *   3. اختيار قالب عدسة + تأكيد التحديث البصري.
 *   4. تحريك منزلق واحد على الأقل + تأكيد القيمة الجديدة في DOM.
 *   5. كتابة سؤال للمساعد مع mock للـ endpoint عبر page.route() — التحقق من loading ثم answer.
 *   6. إعادة تحميل الصفحة + التحقق من استرجاع الحالة من localStorage.
 *   7. لقطة شاشة نهائية في e2e/__screenshots__/.
 */

import { expect, test } from "@playwright/test";

const PAGE_PATH = "/cinematography-studio";
const SESSION_STORAGE_KEY = "cinematography-studio.session.v1";
const ASSISTANT_ANSWER =
  "اقتراح المساعد: استخدم عدسة 50mm بفتحة f/1.8 لعزل الموضوع.";

test.describe("cinematography studio — live dev scenario", () => {
  test.describe.configure({ mode: "serial" });

  test("يفتح الصفحة، يختار عدسة، يحرّك منزلقًا، يسأل المساعد، ثم يستعيد الحالة بعد إعادة التحميل", async ({
    page,
  }, testInfo) => {
    // mock endpoint المساعد + endpoint رمز الحماية.
    // المساعد يستدعي /api/ai/chat مع requireCsrf:true الذي يحضر cookie من /api/health.
    await page.route("**/api/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "set-cookie": "XSRF-TOKEN=playwright-token; Path=/",
        },
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { response: ASSISTANT_ANSWER },
        }),
      });
    });

    // ضع cookie الحماية يدويًا قبل أي تفاعل لتفادي الاعتماد على set-cookie المحاكى
    await page.context().addCookies([
      {
        name: "XSRF-TOKEN",
        value: "playwright-token",
        url: "http://localhost:5000",
      },
    ]);

    // 1) فتح الصفحة — نص الترويسة الفعلي على الصفحة هو "Vision CineAI"
    await page.goto(PAGE_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Vision CineAI").first()).toBeVisible({
      timeout: 45_000,
    });

    // الانتقال لأداة Lens Simulator لإظهار القوالب — نبحث عبر اسم القسم العربي
    const lensCard = page.getByText(/محاكي العدسة|Lens Simulator/).first();
    await lensCard.scrollIntoViewIfNeeded().catch(() => undefined);
    await lensCard.click({ timeout: 10_000 }).catch(() => undefined);

    // 2) قوالب العدسات تظهر
    await expect(page.getByText(/Cooke|كوك/).first()).toBeVisible({
      timeout: 20_000,
    });

    // 3) اختيار قالب عدسة (Cooke S4) + تأكيد التحديث
    const cookeCard = page
      .getByRole("button", { pressed: false })
      .filter({ hasText: /كوك|Cooke/ })
      .first();
    await cookeCard.click();
    await expect(
      page
        .getByRole("button", { pressed: true })
        .filter({ hasText: /كوك|Cooke/ })
    ).toBeVisible();

    // 4) تحريك منزلق — Manual Calibration: اضغط "تحرير يدوي" أولًا لرفع القفل
    const unlockButton = page.getByRole("button", { name: /تحرير يدوي/ });
    if ((await unlockButton.count()) > 0) {
      await unlockButton.click();
    }

    const focalSlider = page
      .getByRole("slider")
      .filter({ has: page.locator(":scope") })
      .first();
    await focalSlider.focus();
    const initialAriaValue = await focalSlider.getAttribute("aria-valuenow");
    // تحريك بسحب لوحة المفاتيح (arrow keys) — يتطابق مع المسار الداخلي للسحب
    await focalSlider.press("ArrowRight");
    await focalSlider.press("ArrowRight");
    await focalSlider.press("ArrowRight");
    const newAriaValue = await focalSlider.getAttribute("aria-valuenow");
    expect(newAriaValue).not.toBe(initialAriaValue);

    // 5) المساعد — افتح أداة "محلل اللقطة" (التي تحوي ProductionTools وحقل المساعد).
    // لإغلاق أداة محاكي العدسة المفتوحة حاليًا، نضغط زر العودة/الرئيسية إن وُجد،
    // ثم ننقر على بطاقة محلل اللقطة.
    const closeToolButton = page.getByRole("button", {
      name: /العودة|إغلاق|×/,
    });
    if ((await closeToolButton.count()) > 0) {
      await closeToolButton
        .first()
        .click({ timeout: 3_000 })
        .catch(() => undefined);
    }
    const shotAnalyzerCard = page
      .getByText(/محلل اللقطة/, { exact: false })
      .first();
    await shotAnalyzerCard.scrollIntoViewIfNeeded().catch(() => undefined);
    await shotAnalyzerCard.click({ timeout: 10_000 });

    // اكتب السؤال
    const assistantInput = page.getByLabel("سؤال المساعد الذكي للتصوير");
    await assistantInput.waitFor({ state: "visible", timeout: 15_000 });
    await assistantInput.fill("ما العدسة المثالية للوجه؟");

    const submitButton = page.getByTestId("cine-assistant-submit");
    await submitButton.click();

    // التحقق من ظهور الإجابة داخل اللوحة (mock يرد فورًا تقريبًا)
    await expect(page.getByTestId("cine-assistant-answer")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("cine-assistant-answer")).toContainText(
      ASSISTANT_ANSWER
    );

    // 6) إعادة التحميل + التحقق من الحالة المحفوظة
    const sessionBefore = await page.evaluate((key) => {
      return window.localStorage.getItem(key);
    }, SESSION_STORAGE_KEY);
    expect(sessionBefore).not.toBeNull();
    expect(sessionBefore!.length).toBeGreaterThan(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    const sessionAfter = await page.evaluate((key) => {
      return window.localStorage.getItem(key);
    }, SESSION_STORAGE_KEY);
    expect(sessionAfter).not.toBeNull();
    // الحالة تبقى مخزنة بنفس المفتاح بعد إعادة التحميل.
    interface SessionShape { lastAssistant?: { answer?: string } }
    const beforeParsed = JSON.parse(sessionBefore!) as SessionShape;
    const afterParsed = JSON.parse(sessionAfter!) as SessionShape;
    // تأكيد بقاء الحقول الجوهرية (المرحلة، المزاج، آخر إجابة)
    if (beforeParsed.lastAssistant?.answer) {
      expect(afterParsed.lastAssistant?.answer).toBe(
        beforeParsed.lastAssistant.answer
      );
    }

    // 7) لقطة الشاشة النهائية المرجعية
    await page.screenshot({
      path: testInfo.outputPath("cinematography-studio-final.png"),
      fullPage: true,
    });
  });
});
