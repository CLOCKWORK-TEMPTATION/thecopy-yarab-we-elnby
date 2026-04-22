import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectContent } from "./ProjectContent";
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

describe("ProjectContent", () => {
  it("renders ProjectStats and ProjectTabs", () => {
    renderWithClient(
      <ProjectContent scenes={mockScenes} characters={mockCharacters} />
    );
    expect(screen.getByTestId("project-stats")).toBeInTheDocument();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
