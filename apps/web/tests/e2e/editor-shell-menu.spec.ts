import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const MENU_SECTIONS = [
  "ملف",
  "تعديل",
  "إضافة",
  "تنسيق",
  "أدوات",
  "مساعدة",
] as const;

const openEditor = async (page: Page): Promise<void> => {
  await page.goto("/editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("app-header")).toBeVisible({ timeout: 30_000 });
};

test.describe("editor shell menu and dock", () => {
  test.setTimeout(120_000);

  test("opens and closes every top menu section", async ({ page }) => {
    await openEditor(page);

    for (const section of MENU_SECTIONS) {
      const trigger = page.getByTestId(`menu-section-${section}`);

      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByRole("menu", { name: section })).toBeVisible();

      await page.locator(".ProseMirror").first().click({ force: true });
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByRole("menu", { name: section })).toHaveCount(0);
    }
  });

  test("renders dock icons at visible dimensions", async ({ page }) => {
    await openEditor(page);
    await expect(page.getByTestId("app-dock-shell")).toBeVisible({
      timeout: 30_000,
    });

    const icons = page.locator('[data-testid="app-dock-shell"] svg');
    await expect(icons).toHaveCount(15);

    const iconBoxes = await icons.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          color: getComputedStyle(node).color,
        };
      })
    );

    for (const box of iconBoxes) {
      expect(box.width).toBeGreaterThanOrEqual(16);
      expect(box.height).toBeGreaterThanOrEqual(16);
      expect(box.color).not.toBe("rgba(0, 0, 0, 0)");
    }
  });

  test("keeps compact menu triggers and dropdown inside the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openEditor(page);

    const menuBoxes = await page
      .locator('[data-testid^="menu-section-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
          };
        })
      );

    for (const box of menuBoxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
    }

    await page.getByTestId("menu-section-مساعدة").click();
    const menuRect = await page
      .getByRole("menu", { name: "مساعدة" })
      .evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
        };
      });

    expect(menuRect.left).toBeGreaterThanOrEqual(0);
    expect(menuRect.right).toBeLessThanOrEqual(390);
  });
});
