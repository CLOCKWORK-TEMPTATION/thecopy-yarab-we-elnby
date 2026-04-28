"use client";

import Image from "next/image";
import { useState, useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { defaultFilters } from "./constants";
import { ShotCard } from "./ShotCard";
import { Toolbar } from "./Toolbar";
import { filterShots, sortShots, formatDuration } from "./utils";

import type { ShotReference, ViewMode, SortOption, ShotFilters } from "./types";

export type { ShotReference, ViewMode, SortOption, ShotFilters } from "./types";

interface AIShotLibraryProps {
  shots: ShotReference[];
  className?: string;
  onShotSelect?: (shot: ShotReference) => void;
}

export function AIShotLibrary({
  shots,
  className,
  onShotSelect,
}: AIShotLibraryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [filters, setFilters] = useState<ShotFilters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShot, setSelectedShot] = useState<ShotReference | null>(null);
  const [previewShot, setPreviewShot] = useState<ShotReference | null>(null);

  const filteredShots = useMemo(() => {
    const withSearch = { ...filters, searchQuery };
    return sortShots(filterShots(shots, withSearch), sortBy);
  }, [shots, filters, searchQuery, sortBy]);

  const handleShotSelect = (shot: ShotReference) => {
    setSelectedShot(shot);
    onShotSelect?.(shot);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background rounded-lg border",
        className
      )}
    >
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filters={filters}
        onFiltersChange={setFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalShots={shots.length}
        filteredCount={filteredShots.length}
      />

      <ScrollArea className="flex-1 p-4">
        {filteredShots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No shots found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "flex flex-col gap-2"
            )}
          >
            {filteredShots.map((shot) => (
              <ShotCard
                key={shot.id}
                shot={shot}
                viewMode={viewMode}
                isSelected={selectedShot?.id === shot.id}
                onSelect={handleShotSelect}
                onPreview={setPreviewShot}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Preview Dialog */}
      <Dialog open={!!previewShot} onOpenChange={() => setPreviewShot(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewShot?.title}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {previewShot && (
              <Image
                src={previewShot.thumbnail}
                alt={previewShot.title}
                fill
                sizes="896px"
                unoptimized
                className="object-cover"
              />
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Duration:{" "}
              {previewShot ? formatDuration(previewShot.duration) : "0:00"}
            </span>
            <span>Aspect: {previewShot?.aspectRatio}</span>
            <span>Category: {previewShot?.category}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
