import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthRequiredError } from "@/lib/api";

import { DIRECTORS_STUDIO_DEMO_PROJECT_ID } from "../lib/demoProject";
import { ProjectProvider } from "../lib/ProjectContext";

import { NoProjectSection } from "./NoProjectSection";

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  toast: vi.fn(),
  createProjectMutate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/hooks/useProject", () => ({
  useProjects: () => ({ data: [], isLoading: false }),
  useCreateProject: () => ({
    isPending: false,
    mutateAsync: mocks.createProjectMutate,
  }),
}));

function renderNoProjectSection() {
  return render(
    <ProjectProvider>
      <NoProjectSection />
    </ProjectProvider>
  );
}

describe("NoProjectSection", () => {
  beforeEach(() => {
    mocks.routerPush.mockReset();
    mocks.toast.mockReset();
    mocks.createProjectMutate.mockReset();
  });

  it("يفتح مشروعاً تجريبياً محلياً دون استدعاء إنشاء مشروع محفوظ", async () => {
    const user = userEvent.setup();
    renderNoProjectSection();

    await user.click(screen.getByTestId("button-open-demo-project"));

    expect(mocks.createProjectMutate).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("currentProject")).toContain(
      DIRECTORS_STUDIO_DEMO_PROJECT_ID
    );
    expect(
      window.localStorage.getItem("filmlane.autosave.document-text.v1")
    ).toContain("غرفة مونتاج");
  });

  it("يفتح المحرر مع معرف المشروع التجريبي", async () => {
    const user = userEvent.setup();
    renderNoProjectSection();

    await user.click(screen.getByTestId("button-open-demo-project-editor"));

    expect(mocks.routerPush).toHaveBeenCalledWith(
      expect.stringContaining(`projectId=${DIRECTORS_STUDIO_DEMO_PROJECT_ID}`)
    );
  });

  it("يعرض مسار دخول وتجربة عند رفض إنشاء المشروع بسبب المصادقة", async () => {
    const user = userEvent.setup();
    mocks.createProjectMutate.mockRejectedValue(new AuthRequiredError());
    renderNoProjectSection();

    await user.type(
      screen.getByTestId("input-new-project-title"),
      "مشروع محفوظ"
    );
    await user.click(screen.getByTestId("button-create-project"));

    await waitFor(() => {
      expect(screen.getByTestId("button-auth-fallback-login")).toBeVisible();
      expect(screen.getByTestId("button-auth-fallback-demo")).toBeVisible();
    });
  });
});
