import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectTabs } from "./ProjectTabs";
import { SceneCardProps } from "../helpers/projectSummary";

const mockScenes: SceneCardProps[] = [
  {
    id: "1",
    sceneNumber: 1,
    title: "Scene 1",
    location: "Location 1",
    timeOfDay: "Day",
    characters: ["Character 1", "Character 2"],
    shotCount: 2,
    status: "planned",
  },
  {
    id: "2",
    sceneNumber: 2,
    title: "Scene 2",
    location: "Location 2",
    timeOfDay: "Night",
    characters: ["Character 3"],
    shotCount: 1,
    status: "completed",
  },
];

const mockCharacters = [
  {
    id: "1",
    name: "Character 1",
    appearances: 1,
    consistencyStatus: "good",
    lastSeen: "Scene 1",
  },
  {
    id: "2",
    name: "Character 2",
    appearances: 1,
    consistencyStatus: "warning",
    lastSeen: "Scene 1",
  },
];

const queryClient = new QueryClient();

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe("ProjectTabs", () => {
  it("renders the scenes tab by default", () => {
    renderWithClient(
      <ProjectTabs scenes={mockScenes} characters={mockCharacters} />
    );
    expect(screen.getByTestId("tab-scenes")).toBeInTheDocument();
    expect(screen.getByTestId("card-scene-1")).toBeInTheDocument();
  });

  it("renders the characters tab when clicked", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <ProjectTabs scenes={mockScenes} characters={mockCharacters} />
    );

    const charactersTab = screen.getByTestId("tab-characters");
    await user.click(charactersTab);

    expect(
      await screen.findByTestId("card-character-tracker")
    ).toBeInTheDocument();
  });

  it("renders a message when there are no scenes", () => {
    renderWithClient(<ProjectTabs scenes={[]} characters={mockCharacters} />);
    expect(screen.getByText(/لا توجد مشاهد بعد/)).toBeInTheDocument();
  });

  it("renders a message when there are no characters", async () => {
    const user = userEvent.setup();
    renderWithClient(<ProjectTabs scenes={mockScenes} characters={[]} />);

    const charactersTab = screen.getByTestId("tab-characters");
    await user.click(charactersTab);

    expect(await screen.findByText(/لا توجد شخصيات بعد/)).toBeInTheDocument();
  });
});
