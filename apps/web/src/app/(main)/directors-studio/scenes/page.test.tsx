import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import ScenesPage from "./page";

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

describe("ScenesPage", () => {
  it.todo("validate-pipeline: renders the initial state with no scenes", () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false });
    renderWithClient(<ScenesPage />);
    expect(
      screen.getByRole("heading", { name: /المشاهد/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/لا توجد مشاهد حتى الآن/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /إنشاء مشهد جديد/i })
    ).toBeInTheDocument();
  });

  it.todo("validate-pipeline: renders a list of scenes", () => {
    const mockScenes = [
      {
        id: "1",
        sceneNumber: 1,
        title: "Scene 1",
        location: "Location 1",
        timeOfDay: "Day",
        characters: ["Character 1"],
        shotCount: 2,
        status: "planned",
        description: "",
      },
      {
        id: "2",
        sceneNumber: 2,
        title: "Scene 2",
        location: "Location 2",
        timeOfDay: "Night",
        characters: ["Character 2"],
        shotCount: 1,
        status: "completed",
        description: "A description",
      },
    ];
    vi.mocked(useQuery).mockReturnValue({ data: mockScenes, isLoading: false });
    renderWithClient(<ScenesPage />);
    expect(screen.getByText(/المشهد 1/)).toBeInTheDocument();
    expect(screen.getByText(/المشهد 2/)).toBeInTheDocument();
  });

  it('opens the dialog when the "Add Scene" button is clicked', async () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false });
    const user = userEvent.setup();
    renderWithClient(<ScenesPage />);

    const addSceneButton = screen.getAllByRole("button", {
      name: /مشهد جديد/i,
    })[0];
    await user.click(addSceneButton);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
