"use client";

import React from "react";
import { Play, Clock, Heart, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShotReference, ViewMode } from "./types";
import { formatDuration, getAspectRatioLabel } from "./utils";
import { categoryLabels, moodLabels, timeLabels } from "./constants";

interface ShotCardProps {
  shot: ShotReference;
  viewMode: ViewMode;
  isSelected: boolean;
  onSelect: (shot: ShotReference) => void;
  onPreview: (shot: ShotReference) => void;
}

export function ShotCard({
  shot,
  viewMode,
  isSelected,
  onSelect,
  onPreview,
}: ShotCardProps) {
  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors",
          isSelected
            ? "bg-primary/5 border-primary"
            : "bg-background border-border hover:bg-muted/50"
        )}
        onClick={() => onSelect(shot)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onSelect(shot);
          }
        }}
      >
        <div className="relative w-24 h-16 rounded overflow-hidden flex-shrink-0">
          <img
            src={shot.thumbnail}
            alt={shot.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <Play className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{shot.title}</h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{categoryLabels[shot.category]}</span>
            <span>•</span>
            <span>{moodLabels[shot.mood]}</span>
            <span>•</span>
            <span>{formatDuration(shot.duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 hover:bg-muted rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(shot);
            }}
            aria-label={`Preview ${shot.title}`}
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg border overflow-hidden cursor-pointer transition-all",
        isSelected
          ? "ring-2 ring-primary border-primary"
          : "border-border hover:border-primary/50"
      )}
      onClick={() => onSelect(shot)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect(shot);
        }
      }}
    >
      <div className="relative aspect-video">
        <img
          src={shot.thumbnail}
          alt={shot.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(shot);
            }}
            aria-label={`Preview ${shot.title}`}
          >
            <Play className="w-5 h-5 ml-0.5" />
          </button>
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          {shot.aiGenerated && (
            <span className="px-2 py-1 text-xs bg-primary/90 text-primary-foreground rounded-full">
              AI
            </span>
          )}
          <button
            className="p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            aria-label="Add to favorites"
          >
            <Heart className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-2 text-white text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDuration(shot.duration)}</span>
            <span className="text-white/70">•</span>
            <span className="text-white/70">{getAspectRatioLabel(shot.aspectRatio)}</span>
          </div>
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-medium text-sm truncate">{shot.title}</h4>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="px-2 py-0.5 text-xs bg-muted rounded-full">
            {categoryLabels[shot.category]}
          </span>
          <span className="px-2 py-0.5 text-xs bg-muted rounded-full">
            {moodLabels[shot.mood]}
          </span>
          <span className="px-2 py-0.5 text-xs bg-muted rounded-full">
            {timeLabels[shot.timeOfDay]}
          </span>
        </div>
      </div>
    </div>
  );
}
