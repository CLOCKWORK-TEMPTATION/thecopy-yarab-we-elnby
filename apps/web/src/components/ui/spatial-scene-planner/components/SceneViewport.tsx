"use client";

/**
 * @fileoverview منفذ العرض ثلاثي الأبعاد وشريط أدواته
 */

import {
  Grid3X3,
  Lightbulb,
  Sun,
  Sparkles,
  Moon,
  ZoomOut,
  ZoomIn,
  Maximize2,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { CELL_SIZE, ObjectIcons } from "../constants";

import type { SceneObject, CameraSettings, Position3D } from "../types";

interface SceneViewportProps {
  objects: SceneObject[];
  camera: CameraSettings;
  selectedObject: string | null;
  tool: "select" | "move" | "rotate" | "camera";
  viewMode: "top" | "side" | "front" | "perspective";
  showGrid: boolean;
  showLightPreview: boolean;
  timeOfDay: "day" | "night" | "sunset";
  isDragging: boolean;
  dragStart: { x: number; y: number };
  viewOffset: { x: number; y: number };
  zoom: number;
  getObjectViewportPosition: (pos: Position3D) => {
    x: number;
    y: number;
    scale: number;
  };
  getTimeOfDayStyle: () => string;
  setViewMode: (mode: "top" | "side" | "front" | "perspective") => void;
  setShowGrid: (v: boolean) => void;
  setShowLightPreview: (v: boolean) => void;
  setTimeOfDay: (v: "day" | "night" | "sunset") => void;
  setZoom: (v: number) => void;
  setViewOffset: (v: { x: number; y: number }) => void;
  setIsDragging: (v: boolean) => void;
  setDragStart: (v: { x: number; y: number }) => void;
  setSelectedObject: (id: string | null) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

function ViewportToolbarLeft({
  viewMode,
  showGrid,
  showLightPreview,
  setViewMode,
  setShowGrid,
  setShowLightPreview,
}: {
  viewMode: SceneViewportProps["viewMode"];
  showGrid: boolean;
  showLightPreview: boolean;
  setViewMode: SceneViewportProps["setViewMode"];
  setShowGrid: (v: boolean) => void;
  setShowLightPreview: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={viewMode}
        onValueChange={(v) => setViewMode(v as SceneViewportProps["viewMode"])}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="perspective">منظور</SelectItem>
          <SelectItem value="top">من أعلى</SelectItem>
          <SelectItem value="front">من الأمام</SelectItem>
          <SelectItem value="side">من الجانب</SelectItem>
        </SelectContent>
      </Select>
      <div className="h-6 w-px bg-border mx-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showGrid ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>الشبكة</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showLightPreview ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowLightPreview(!showLightPreview)}
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>معاينة الإضاءة</TooltipContent>
      </Tooltip>
    </div>
  );
}

function ViewportToolbarRight({
  timeOfDay,
  zoom,
  setTimeOfDay,
  setZoom,
  setViewOffset,
}: {
  timeOfDay: SceneViewportProps["timeOfDay"];
  zoom: number;
  setTimeOfDay: SceneViewportProps["setTimeOfDay"];
  setZoom: (v: number) => void;
  setViewOffset: (v: { x: number; y: number }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        <Button
          variant={timeOfDay === "day" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setTimeOfDay("day")}
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          variant={timeOfDay === "sunset" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setTimeOfDay("sunset")}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        <Button
          variant={timeOfDay === "night" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setTimeOfDay("night")}
        >
          <Moon className="h-4 w-4" />
        </Button>
      </div>
      <div className="h-6 w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs font-mono w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setZoom(Math.min(4, zoom + 0.25))}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setZoom(1);
          setViewOffset({ x: 0, y: 0 });
        }}
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ViewportGrid({
  zoom,
  viewOffset,
}: {
  zoom: number;
  viewOffset: { x: number; y: number };
}) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
      <defs>
        <pattern
          id="grid"
          width={CELL_SIZE * zoom}
          height={CELL_SIZE * zoom}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${viewOffset.x % (CELL_SIZE * zoom)} ${viewOffset.y % (CELL_SIZE * zoom)})`}
        >
          <path
            d={`M ${CELL_SIZE * zoom} 0 L 0 0 0 ${CELL_SIZE * zoom}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function ViewportObject({
  obj,
  isSelected,
  showLightPreview,
  getObjectViewportPosition,
  setSelectedObject,
}: {
  obj: SceneObject;
  isSelected: boolean;
  showLightPreview: boolean;
  getObjectViewportPosition: SceneViewportProps["getObjectViewportPosition"];
  setSelectedObject: (id: string | null) => void;
}) {
  const { x, y, scale } = getObjectViewportPosition(obj.position);
  const Icon = ObjectIcons[obj.type];
  const size = 40 * scale * obj.scale;

  return (
    <button
      type="button"
      className={cn(
        "absolute cursor-pointer transition-all duration-200 border-0 bg-transparent p-0",
        isSelected && "z-10"
      )}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: "translate(-50%, -50%)",
      }}
      onClick={() => setSelectedObject(obj.id)}
    >
      {obj.type === "light" && showLightPreview && (
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-50"
          style={{
            backgroundColor: obj.color,
            width: size * 4,
            height: size * 4,
            left: -(size * 1.5),
            top: -(size * 1.5),
          }}
        />
      )}
      <div
        className={cn(
          "rounded-full flex items-center justify-center shadow-lg transition-all",
          isSelected && "ring-2 ring-brand ring-offset-2 ring-offset-background"
        )}
        style={{ width: size, height: size, backgroundColor: obj.color }}
      >
        <Icon
          className="text-white"
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
      </div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-card/80 backdrop-blur-sm px-2 py-0.5 rounded">
        {obj.name}
      </div>
    </button>
  );
}

export function SceneViewport({
  objects,
  camera,
  selectedObject,
  tool,
  viewMode,
  showGrid,
  showLightPreview,
  timeOfDay,
  isDragging,
  dragStart,
  viewOffset,
  zoom,
  getObjectViewportPosition,
  getTimeOfDayStyle,
  setViewMode,
  setShowGrid,
  setShowLightPreview,
  setTimeOfDay,
  setZoom,
  setViewOffset,
  setIsDragging,
  setDragStart,
  setSelectedObject,
  canvasRef,
}: SceneViewportProps) {
  const viewModeLabel =
    viewMode === "perspective"
      ? "منظور"
      : viewMode === "top"
        ? "من أعلى"
        : viewMode === "front"
          ? "من الأمام"
          : "من الجانب";

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <ViewportToolbarLeft
          viewMode={viewMode}
          showGrid={showGrid}
          showLightPreview={showLightPreview}
          setViewMode={setViewMode}
          setShowGrid={setShowGrid}
          setShowLightPreview={setShowLightPreview}
        />
        <ViewportToolbarRight
          timeOfDay={timeOfDay}
          zoom={zoom}
          setTimeOfDay={setTimeOfDay}
          setZoom={setZoom}
          setViewOffset={setViewOffset}
        />
      </div>

      <div
        ref={canvasRef}
        role="button"
        aria-label="منفذ عرض المشهد"
        tabIndex={0}
        className={cn(
          "flex-1 relative overflow-hidden",
          `bg-gradient-to-br ${getTimeOfDayStyle()}`
        )}
        onMouseDown={(e) => {
          if (e.button === 1 || e.shiftKey) {
            setIsDragging(true);
            setDragStart({
              x: e.clientX - viewOffset.x,
              y: e.clientY - viewOffset.y,
            });
          }
        }}
        onMouseMove={(e) => {
          if (isDragging)
            setViewOffset({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y,
            });
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {showGrid && <ViewportGrid zoom={zoom} viewOffset={viewOffset} />}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-px bg-muted-foreground/30" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-px h-8 bg-muted-foreground/30" />
        </div>

        {objects
          .filter((o) => o.visible)
          .map((obj) => (
            <ViewportObject
              key={obj.id}
              obj={obj}
              isSelected={selectedObject === obj.id}
              showLightPreview={showLightPreview}
              getObjectViewportPosition={getObjectViewportPosition}
              setSelectedObject={setSelectedObject}
            />
          ))}

        {tool === "camera" && (
          <div
            className="absolute border-2 border-brand/50 border-dashed bg-brand/5"
            style={{
              left: `calc(50% + ${viewOffset.x}px - 100px)`,
              top: `calc(50% + ${viewOffset.y}px - 75px)`,
              width: 200 * zoom,
              height: 150 * zoom,
              transform: `perspective(500px) rotateX(${camera.rotation.pitch}deg)`,
            }}
          >
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                {camera.focalLength}mm
              </Badge>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4">
          <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
            {viewModeLabel}
          </Badge>
        </div>
      </div>
    </div>
  );
}
