import type { Page } from "@playwright/test";

export interface DirectorsEditorCredentials {
  email: string;
  password: string;
}

export const createUniqueCredentials = (): DirectorsEditorCredentials => {
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  return {
    email: `directors-editor-${nonce}@test.local`,
    password: "Aa!1234567890",
  };
};

export const signupThroughApi = async (
  page: Page,
  credentials: DirectorsEditorCredentials
): Promise<void> => {
  // تعليق عربي: تسجيل الدخول الحقيقي عبر API لضمان وجود جلسة فعلية بدون أي محاكاة.
  const response = await page.request.post("/api/auth/signup", {
    data: {
      email: credentials.email,
      password: credentials.password,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Signup failed with ${response.status()}: ${body}`);
  }
};

export const createProjectViaDirectorsStudio = async (
  page: Page,
  projectTitle: string,
  openInEditor: boolean
): Promise<void> => {
  await page.getByTestId("input-new-project-title").fill(projectTitle);
  const actionTestId = openInEditor
    ? "button-create-project-open-editor"
    : "button-create-project";
  await page.getByTestId(actionTestId).click();
};

export const openLibrarySection = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "المكتبة" }).click();
};
