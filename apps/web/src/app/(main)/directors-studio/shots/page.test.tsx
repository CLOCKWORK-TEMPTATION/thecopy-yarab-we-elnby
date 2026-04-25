import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import ShotsPage from "./page";

const queryClient = new QueryClient();

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

// Mock the API calls
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  };
});

// ProjectContext mock — useCurrentProject() يرمي خارج ProjectProvider في الإنتاج،
// لكن الصفحة تستهلكه مباشرةً. mock يوفّر مشروعاً افتراضياً للاختبار دون الحاجة
// لتشغيل ProjectProvider الكامل (sessionStorage + window.dispatchEvent).
vi.mock("@/app/(main)/directors-studio/lib/ProjectContext", () => ({
  useCurrentProject: () => ({
    project: { id: "test-project", name: "Test Project", scriptContent: null },
    projectId: "test-project",
    setProject: vi.fn(),
    clearProject: vi.fn(),
  }),
}));

describe("ShotsPage", () => {
  it.todo(
    "validate-pipeline: renders the initial state with no scene selected",
    () => {
      vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false });
      renderWithClient(<ShotsPage />);
      expect(
        screen.getByRole("heading", { name: /اللقطات/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/اختر مشهد لعرض اللقطات/)).toBeInTheDocument();
    }
  );

  it.todo("validate-pipeline: renders a list of scenes in the selector", () => {
    const mockScenes = [
      { id: "1", sceneNumber: 1, title: "Scene 1" },
      { id: "2", sceneNumber: 2, title: "Scene 2" },
    ];
    vi.mocked(useQuery).mockReturnValue({ data: mockScenes, isLoading: false });
    renderWithClient(<ShotsPage />);
    expect(screen.getByText(/المشهد 1: Scene 1/)).toBeInTheDocument();
    expect(screen.getByText(/المشهد 2: Scene 2/)).toBeInTheDocument();
  });

  it("renders a list of shots when a scene is selected", async () => {
    const mockShots = [
      {
        id: "1",
        shotNumber: 1,
        shotType: "Wide",
        cameraAngle: "Eye Level",
        cameraMovement: "Static",
        lighting: "Daylight",
        aiSuggestion: "",
      },
      {
        id: "2",
        shotNumber: 2,
        shotType: "Close-up",
        cameraAngle: "High Angle",
        cameraMovement: "Pan",
        lighting: "Night",
        aiSuggestion: "A suggestion",
      },
    ];
    vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "scenes") {
        return {
          data: [{ id: "1", sceneNumber: 1, title: "Scene 1" }],
          isLoading: false,
        };
      }
      if (queryKey[0] === "shots") {
        return { data: mockShots, isLoading: false };
      }
      return { data: [], isLoading: false };
    });

    const user = userEvent.setup();
    renderWithClient(<ShotsPage />);

    const sceneSelector = screen.getByRole("combobox");
    await user.selectOptions(sceneSelector, "1");

    expect(await screen.findByText(/لقطة #1/)).toBeInTheDocument();
    expect(await screen.findByText(/لقطة #2/)).toBeInTheDocument();
  });

  it("renders a message when there are no shots for the selected scene", async () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "scenes") {
        return {
          data: [{ id: "1", sceneNumber: 1, title: "Scene 1" }],
          isLoading: false,
        };
      }
      if (queryKey[0] === "shots") {
        return { data: [], isLoading: false };
      }
      return { data: [], isLoading: false };
    });

    const user = userEvent.setup();
    renderWithClient(<ShotsPage />);

    const sceneSelector = screen.getByRole("combobox");
    await user.selectOptions(sceneSelector, "1");

    expect(
      await screen.findByText(/لا توجد لقطات لهذا المشهد حتى الآن/)
    ).toBeInTheDocument();
  });
});
