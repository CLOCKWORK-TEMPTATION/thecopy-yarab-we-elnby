import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../../../../../");

export const fixturePaths = {
  doc: path.join(
    workspaceRoot,
    "output",
    "migration-runtime-tests",
    "sample-runtime.doc"
  ),
  docx: path.join(
    workspaceRoot,
    "output",
    "migration-runtime-tests",
    "sample-runtime.docx"
  ),
  pdf: path.join(workspaceRoot, "output", "codex-fixtures", "sample.pdf"),
};

export const getEditorSurface = (page: Page) =>
  page.locator(".ProseMirror").first();

export const openFile = async (page: Page, filePath: string): Promise<void> => {
  await page.getByTestId("menu-section-ملف").click();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByTestId("menu-action-open-file").click(),
  ]);
  await chooser.setFiles(filePath);
};

export const waitForApproval = async (page: Page): Promise<void> => {
  await page
    .locator('[data-testid="approve-visible-version"]')
    .waitFor({ state: "visible", timeout: 180_000 });
};

export const dispatchPaste = async (
  page: Page,
  text: string
): Promise<void> => {
  await getEditorSurface(page).click();
  await page.evaluate((value) => {
    const target = document.querySelector(".ProseMirror");
    if (!target) {
      throw new Error("missing editor");
    }
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) => (type === "text/plain" ? value : ""),
      },
    });
    target.dispatchEvent(event);
  }, text);
};
