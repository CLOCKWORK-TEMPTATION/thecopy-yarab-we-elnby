"use client";

/**
 * @fileoverview شريط الجدول الزمني للقطات
 */

import { Play, Pause, SkipForward, Plus, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ShotKeyframe } from "../types";

interface SceneTimelineProps {
  shots: ShotKeyframe[];
  selectedShot: string | null;
  isPlaying: boolean;
  currentTime: number;
  setIsPlaying: (v: boolean) => void;
  addShot: () => void;
  goToShot: (shot: ShotKeyframe) => void;
}

export function SceneTimeline({
  shots,
  selectedShot,
  isPlaying,
  currentTime,
  setIsPlaying,
  addShot,
  goToShot,
}: SceneTimelineProps) {
  return (
    <div className="h-32 border-t bg-card/50">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <SkipForward className="h-4 w-4" />
          </Button>
          <span className="text-sm font-mono">{currentTime.toFixed(1)}s</span>
        </div>

        <Button variant="outline" size="sm" onClick={addShot}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة لقطة
        </Button>
      </div>

      <div className="flex gap-2 p-2 overflow-x-auto">
        {shots.map((shot) => (
          <Card
            key={shot.id}
            className={cn(
              "min-w-32 cursor-pointer transition-all",
              selectedShot === shot.id && "ring-2 ring-brand"
            )}
            onClick={() => goToShot(shot)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-brand" />
                <span className="text-sm font-medium">{shot.label}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {shot.camera.focalLength}mm | {shot.time}s
              </div>
            </CardContent>
          </Card>
        ))}

        {shots.length === 0 && (
          <div className="flex items-center justify-center w-full text-sm text-muted-foreground">
            أضف لقطات لبناء تسلسل المشهد
          </div>
        )}
      </div>
    </div>
  );
}
