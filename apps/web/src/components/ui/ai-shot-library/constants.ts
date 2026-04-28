// Constants for AI Shot Library

import type { ShotCategory, ShotMood, ShotTimeOfDay, SortOption } from "./types";

export const allCategories: ShotCategory[] = [
  "establishing",
  "close-up",
  "medium",
  "wide",
  "aerial",
  "tracking",
  "static",
  "handheld",
  "drone",
];

export const allMoods: ShotMood[] = [
  "dramatic",
  "intimate",
  "suspenseful",
  "peaceful",
  "energetic",
  "mysterious",
];

export const allTimesOfDay: ShotTimeOfDay[] = ["dawn", "day", "golden", "blue", "night"];

export const sortOptions: { value: SortOption; label: string }[] = [
  { value: "popular", label: "Most Popular" },
  { value: "recent", label: "Recently Added" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "duration", label: "Duration" },
];

export const categoryLabels: Record<ShotCategory, string> = {
  establishing: "Establishing Shot",
  "close-up": "Close Up",
  medium: "Medium Shot",
  wide: "Wide Shot",
  aerial: "Aerial",
  tracking: "Tracking",
  static: "Static",
  handheld: "Handheld",
  drone: "Drone",
};

export const moodLabels: Record<ShotMood, string> = {
  dramatic: "Dramatic",
  intimate: "Intimate",
  suspenseful: "Suspenseful",
  peaceful: "Peaceful",
  energetic: "Energetic",
  mysterious: "Mysterious",
};

export const timeLabels: Record<ShotTimeOfDay, string> = {
  dawn: "Dawn",
  day: "Day",
  golden: "Golden Hour",
  blue: "Blue Hour",
  night: "Night",
};

export const defaultFilters = {
  categories: [] as ShotCategory[],
  moods: [] as ShotMood[],
  timesOfDay: [] as ShotTimeOfDay[],
  searchQuery: "",
  durationRange: [0, 300] as [number, number],
  aiGeneratedOnly: false,
};
