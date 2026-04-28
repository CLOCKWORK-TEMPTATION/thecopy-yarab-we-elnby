// Utility functions for AI Shot Library

import type { ShotReference, ShotFilters, SortOption } from "./types";

export function filterShots(shots: ShotReference[], filters: ShotFilters): ShotReference[] {
  return shots.filter((shot) => {
    if (filters.categories.length > 0 && !filters.categories.includes(shot.category)) {
      return false;
    }
    if (filters.moods.length > 0 && !filters.moods.includes(shot.mood)) {
      return false;
    }
    if (filters.timesOfDay.length > 0 && !filters.timesOfDay.includes(shot.timeOfDay)) {
      return false;
    }
    if (filters.aiGeneratedOnly && !shot.aiGenerated) {
      return false;
    }
    if (
      shot.duration < filters.durationRange[0] ||
      shot.duration > filters.durationRange[1]
    ) {
      return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = `${shot.title} ${shot.description} ${shot.tags.join(" ")}`.toLowerCase();
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

export function sortShots(shots: ShotReference[], sortBy: SortOption): ShotReference[] {
  const sorted = [...shots];
  switch (sortBy) {
    case "popular":
      return sorted.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    case "recent":
      return sorted.reverse();
    case "alphabetical":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "duration":
      return sorted.sort((a, b) => a.duration - b.duration);
    default:
      return sorted;
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getAspectRatioLabel(ratio: string): string {
  const labels: Record<string, string> = {
    "16:9": "Widescreen (16:9)",
    "4:3": "Standard (4:3)",
    "2.39:1": "Cinemascope (2.39:1)",
    "1:1": "Square (1:1)",
    "9:16": "Vertical (9:16)",
  };
  return labels[ratio] ?? ratio;
}
