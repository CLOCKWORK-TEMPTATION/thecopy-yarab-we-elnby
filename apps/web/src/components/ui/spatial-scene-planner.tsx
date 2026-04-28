"use client";

import { Move3D, Save, Download } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { SceneObjectsPanel } from "./spatial-scene-planner/components/SceneObjectsPanel";
import { SceneRightSidebar } from "./spatial-scene-planner/components/SceneRightSidebar";
import { SceneTimeline } from "./spatial-scene-planner/components/SceneTimeline";
import { SceneViewport } from "./spatial-scene-planner/components/SceneViewport";
import { useSpatialScene } from "./spatial-scene-planner/hooks/use-spatial-scene";

import type { SpatialScenePlannerProps } from "./spatial-scene-planner/types";

export type { SpatialScenePlannerProps };

export function SpatialScenePlanner({
  sceneName = "مشهد جديد",
  onSave,
  className,
}: SpatialScenePlannerProps) {
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const scene = useSpatialScene(onSave);

  return (
    <TooltipProvider>
      <div
        className={cn("spatial-scene-planner flex flex-col h-full", className)}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Move3D className="h-5 w-5 text-brand" />
                {sceneName}
              </h2>
              <p className="text-sm text-muted-foreground">
                مخطط المشهد المكاني
              </p>
            </div>
            <Badge variant="outline">{scene.shots.length} لقطات</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={scene.handleSave}>
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <SceneObjectsPanel
            objects={scene.objects}
            selectedObject={scene.selectedObject}
            tool={scene.tool}
            setTool={scene.setTool}
            setSelectedObject={scene.setSelectedObject}
            addObject={scene.addObject}
            updateObject={scene.updateObject}
            deleteObject={scene.deleteObject}
          />

          {/* Main Viewport + Timeline */}
          <div className="flex-1 flex flex-col">
            <SceneViewport
              objects={scene.objects}
              camera={scene.camera}
              selectedObject={scene.selectedObject}
              tool={scene.tool}
              viewMode={scene.viewMode}
              showGrid={scene.showGrid}
              showLightPreview={scene.showLightPreview}
              timeOfDay={scene.timeOfDay}
              isDragging={scene.isDragging}
              dragStart={scene.dragStart}
              viewOffset={scene.viewOffset}
              zoom={scene.zoom}
              getObjectViewportPosition={scene.getObjectViewportPosition}
              getTimeOfDayStyle={scene.getTimeOfDayStyle}
              setViewMode={scene.setViewMode}
              setShowGrid={scene.setShowGrid}
              setShowLightPreview={scene.setShowLightPreview}
              setTimeOfDay={scene.setTimeOfDay}
              setZoom={scene.setZoom}
              setViewOffset={scene.setViewOffset}
              setIsDragging={scene.setIsDragging}
              setDragStart={scene.setDragStart}
              setSelectedObject={scene.setSelectedObject}
              canvasRef={canvasRef}
            />

            <SceneTimeline
              shots={scene.shots}
              selectedShot={scene.selectedShot}
              isPlaying={scene.isPlaying}
              currentTime={scene.currentTime}
              setIsPlaying={scene.setIsPlaying}
              addShot={scene.addShot}
              goToShot={scene.goToShot}
            />
          </div>

          {/* Right Sidebar */}
          <SceneRightSidebar
            camera={scene.camera}
            objects={scene.objects}
            selectedObject={scene.selectedObject}
            setCamera={scene.setCamera}
            updateObject={scene.updateObject}
            applyCameraPreset={scene.applyCameraPreset}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default SpatialScenePlanner;
