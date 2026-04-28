"use client";

import { X, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  allCategories,
  allMoods,
  allTimesOfDay,
  categoryLabels,
  moodLabels,
  timeLabels,
} from "./constants";

import type {
  ShotFilters,
  ShotCategory,
  ShotMood,
  ShotTimeOfDay,
} from "./types";

interface FilterPanelProps {
  filters: ShotFilters;
  onFiltersChange: (filters: ShotFilters) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  isOpen,
  onOpen,
  onClose,
}: FilterPanelProps) {
  const toggleCategory = (category: ShotCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleMood = (mood: ShotMood) => {
    const newMoods = filters.moods.includes(mood)
      ? filters.moods.filter((m) => m !== mood)
      : [...filters.moods, mood];
    onFiltersChange({ ...filters, moods: newMoods });
  };

  const toggleTimeOfDay = (time: ShotTimeOfDay) => {
    const newTimes = filters.timesOfDay.includes(time)
      ? filters.timesOfDay.filter((t) => t !== time)
      : [...filters.timesOfDay, time];
    onFiltersChange({ ...filters, timesOfDay: newTimes });
  };

  const activeFiltersCount =
    filters.categories.length +
    filters.moods.length +
    filters.timesOfDay.length +
    (filters.aiGeneratedOnly ? 1 : 0);

  if (!isOpen) {
    return (
      <button
        onClick={onOpen}
        className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background border-l shadow-lg z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Filters</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          aria-label="Close filters"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-72px)]">
        {/* Categories */}
        <div>
          <h4 className="text-sm font-medium mb-3">Categories</h4>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full transition-colors",
                  filters.categories.includes(category)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>
        </div>

        {/* Moods */}
        <div>
          <h4 className="text-sm font-medium mb-3">Mood</h4>
          <div className="flex flex-wrap gap-2">
            {allMoods.map((mood) => (
              <button
                key={mood}
                onClick={() => toggleMood(mood)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full transition-colors",
                  filters.moods.includes(mood)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {moodLabels[mood]}
              </button>
            ))}
          </div>
        </div>

        {/* Time of Day */}
        <div>
          <h4 className="text-sm font-medium mb-3">Time of Day</h4>
          <div className="flex flex-wrap gap-2">
            {allTimesOfDay.map((time) => (
              <button
                key={time}
                onClick={() => toggleTimeOfDay(time)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full transition-colors",
                  filters.timesOfDay.includes(time)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {timeLabels[time]}
              </button>
            ))}
          </div>
        </div>

        {/* AI Generated */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.aiGeneratedOnly}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  aiGeneratedOnly: e.target.checked,
                })
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm">AI Generated Only</span>
          </label>
        </div>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <button
            onClick={() =>
              onFiltersChange({
                categories: [],
                moods: [],
                timesOfDay: [],
                searchQuery: "",
                durationRange: [0, 300],
                aiGeneratedOnly: false,
              })
            }
            className="w-full py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
}
