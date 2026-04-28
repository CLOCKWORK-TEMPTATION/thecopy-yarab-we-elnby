// Types for AI Shot Library

export type ShotCategory =
  | "establishing"
  | "close-up"
  | "medium"
  | "wide"
  | "aerial"
  | "tracking"
  | "static"
  | "handheld"
  | "drone";

export type ShotMood =
  | "dramatic"
  | "intimate"
  | "suspenseful"
  | "peaceful"
  | "energetic"
  | "mysterious";

export type ShotTimeOfDay = "dawn" | "day" | "golden" | "blue" | "night";

export interface ShotReference {
  id: string;
  title: string;
  description: string;
  category: ShotCategory;
  mood: ShotMood;
  timeOfDay: ShotTimeOfDay;
  tags: string[];
  thumbnail: string;
  duration: number;
  aspectRatio: string;
  cameraMovement: string;
  lightingSetup: string;
  aiGenerated?: boolean;
  popularity?: number;
}

export type ViewMode = "grid" | "list" | "timeline";
export type SortOption = "popular" | "recent" | "alphabetical" | "duration";

export interface ShotFilters {
  categories: ShotCategory[];
  moods: ShotMood[];
  timesOfDay: ShotTimeOfDay[];
  searchQuery: string;
  durationRange: [number, number];
  aiGeneratedOnly: boolean;
}
