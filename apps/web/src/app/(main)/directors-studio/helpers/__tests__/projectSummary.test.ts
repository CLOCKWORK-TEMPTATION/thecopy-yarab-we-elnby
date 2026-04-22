import { describe, expect, it } from "vitest";
import {
  calculateProjectStats,
  hasActiveProject,
  prepareCharacterList,
  type CharacterTrackerProps,
  type ProjectCharacterInput,
  type SceneCardProps,
} from "@/app/(main)/directors-studio/helpers/projectSummary";

const baseScene: SceneCardProps = {
  id: "scene-1",
  sceneNumber: 1,
  title: "مشهد افتتاحي",
  location: "المدينة",
  timeOfDay: "صباح",
  characters: ["سارة"],
  status: "planned",
  shotCount: 3,
};

const baseCharacter: CharacterTrackerProps["characters"][number] = {
  id: "character-1",
  name: "سارة",
  appearances: 2,
  consistencyStatus: "good",
  lastSeen: "اليوم",
};

describe("prepareCharacterList", () => {
  it("returns an empty array when no characters are provided", () => {
    expect(prepareCharacterList(undefined)).toEqual([]);
  });

  it("fills in default status and last seen values", () => {
    const input: ProjectCharacterInput = [
      {
        id: "character-2",
        name: "ليلى",
        appearances: 4,
        consistencyStatus: null,
        lastSeen: null,
      },
    ];

    const result = prepareCharacterList(input);

    expect(result).toEqual([
      {
        id: "character-2",
        name: "ليلى",
        appearances: 4,
        consistencyStatus: "good",
        lastSeen: "غير محدد",
      },
    ]);
  });

  it("preserves provided status and last seen values", () => {
    const result = prepareCharacterList([baseCharacter]);

    expect(result).toEqual([baseCharacter]);
  });
});

describe("hasActiveProject", () => {
  it("returns false when project id is missing", () => {
    expect(hasActiveProject(null)).toBe(false);
  });

  it("returns true when project exists even before scenes are created", () => {
    expect(hasActiveProject("project-1")).toBe(true);
  });
});

describe("calculateProjectStats", () => {
  it("computes aggregates for scenes and characters", () => {
    const scenes: SceneCardProps[] = [
      baseScene,
      { ...baseScene, id: "scene-2", status: "completed", shotCount: 5 },
    ];
    const characters: CharacterTrackerProps["characters"] = [
      baseCharacter,
      { ...baseCharacter, id: "character-2" },
    ];

    expect(calculateProjectStats(scenes, characters)).toEqual({
      totalScenes: 2,
      totalCharacters: 2,
      totalShots: 8,
      completedScenes: 1,
    });
  });
});
