"use client";

import { Grid3X3, List, Clock, ArrowUpDown } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

import { sortOptions } from "./constants";
import { FilterPanel } from "./FilterPanel";
import { SearchBar } from "./SearchBar";

import type { ViewMode, SortOption , ShotFilters } from "./types";

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filters: ShotFilters;
  onFiltersChange: (filters: ShotFilters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalShots: number;
  filteredCount: number;
}

export function Toolbar({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
  totalShots,
  filteredCount,
}: ToolbarProps) {
  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-4 p-4 border-b bg-background">
      {/* Top row: Search and View Toggle */}
      <div className="flex items-center gap-4">
        <SearchBar value={searchQuery} onChange={onSearchChange} />

        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
            aria-label="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom row: Filters, Sort, and Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FilterPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
            isOpen={filterPanelOpen}
            onClose={() => setFilterPanelOpen(false)}
          />

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            {filteredCount} of {totalShots} shots
          </span>
        </div>
      </div>
    </div>
  );
}
