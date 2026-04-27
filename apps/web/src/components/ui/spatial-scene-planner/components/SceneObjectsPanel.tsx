"use client";

/**
 * @fileoverview اللوحة الجانبية اليسرى - الأدوات وقائمة عناصر المشهد
 */

import {
  Camera,
  Move3D,
  RotateCcw,
  Video,
  User,
  Box,
  Lightbulb,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { ObjectIcons } from "../constants";
import type { SceneObject } from "../types";

interface SceneObjectsPanelProps {
  objects: SceneObject[];
  selectedObject: string | null;
  tool: "select" | "move" | "rotate" | "camera";
  setTool: (tool: "select" | "move" | "rotate" | "camera") => void;
  setSelectedObject: (id: string | null) => void;
  addObject: (type: SceneObject["type"]) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  deleteObject: (id: string) => void;
}

export function SceneObjectsPanel({
  objects,
  selectedObject,
  tool,
  setTool,
  setSelectedObject,
  addObject,
  updateObject,
  deleteObject,
}: SceneObjectsPanelProps) {
  return (
    <div className="w-64 border-l bg-card/50 flex flex-col">
      {/* Tool Selection */}
      <div className="p-3 border-b">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          الأدوات
        </p>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === "select" ? "default" : "ghost"}
                size="icon"
                onClick={() => setTool("select")}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تحديد</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === "move" ? "default" : "ghost"}
                size="icon"
                onClick={() => setTool("move")}
              >
                <Move3D className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تحريك</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === "rotate" ? "default" : "ghost"}
                size="icon"
                onClick={() => setTool("rotate")}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تدوير</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === "camera" ? "default" : "ghost"}
                size="icon"
                onClick={() => setTool("camera")}
              >
                <Video className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>كاميرا</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Add Objects */}
      <div className="p-3 border-b">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          إضافة عناصر
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addObject("character")}
          >
            <User className="h-4 w-4 ml-2" />
            شخصية
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addObject("prop")}
          >
            <Box className="h-4 w-4 ml-2" />
            عنصر
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addObject("light")}
          >
            <Lightbulb className="h-4 w-4 ml-2" />
            إضاءة
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addObject("camera")}
          >
            <Camera className="h-4 w-4 ml-2" />
            كاميرا
          </Button>
        </div>
      </div>

      {/* Objects List */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          عناصر المشهد ({objects.length})
        </p>
        <div className="space-y-1">
          {objects.map((obj) => {
            const Icon = ObjectIcons[obj.type];
            return (
              <div
                key={obj.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                  selectedObject === obj.id
                    ? "bg-brand/10 border border-brand/30"
                    : "hover:bg-muted"
                )}
                onClick={() => setSelectedObject(obj.id)}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: obj.color }}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{obj.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {obj.position.x.toFixed(0)}, {obj.position.y.toFixed(0)},{" "}
                    {obj.position.z.toFixed(0)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateObject(obj.id, { visible: !obj.visible });
                    }}
                  >
                    {obj.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteObject(obj.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
