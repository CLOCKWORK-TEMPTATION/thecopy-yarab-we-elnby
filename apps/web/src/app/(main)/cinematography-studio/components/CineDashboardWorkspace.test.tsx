import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_PHASE_CARD } from "./cine-studio-config";
import { CineDashboardWorkspace } from "./CineDashboardWorkspace";

vi.mock("./scene/SceneStudioPanel", () => ({
  SceneStudioPanel: () => <div>Scene Studio</div>,
}));

describe("CineDashboardWorkspace", () => {
  it("exposes the full scene studio on the dashboard", () => {
    render(
      <CineDashboardWorkspace
        activeView="dashboard"
        visualMood="noir"
        moodLabel="نوير"
        currentPhaseData={DEFAULT_PHASE_CARD}
        availableToolsCount={4}
        currentTabValue="pre-production"
        onMoodChange={() => undefined}
        onViewChange={() => undefined}
        onToolClick={() => undefined}
        onPhaseClick={() => undefined}
        onTabChange={() => undefined}
        phaseContent={null}
      />
    );

    expect(screen.getByText("Scene Studio")).toBeInTheDocument();
  });
});
