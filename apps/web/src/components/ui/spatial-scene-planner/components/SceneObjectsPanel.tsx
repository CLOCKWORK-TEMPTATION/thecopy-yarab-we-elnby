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

function ToolsBar({
  tool,
  setTool,
}: {
  tool: SceneObjectsPanelProps["tool"];
  setTool: SceneObjectsPanelProps["setTool"];
}) {
  const tools: {
    key: SceneObjectsPanelProps["tool"];
    Icon: React.ComponentType<{ className?: string }>;
    label: string;
  }[] = [
    { key: "select", Icon: Camera, label: "تحديد" },
    { key: "move", Icon: Move3D, label: "تحريك" },
    { key: "rotate", Icon: RotateCcw, label: "تدوير" },
    { key: "camera", Icon: Video, label: "كاميرا" },
  ];

  return (
    <div className="p-3 border-b">
      <p className="text-xs font-medium text-muted-foreground mb-2">الأدوات</p>
      <div className="flex gap-1">
        {tools.map(({ key, Icon, label }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Button
                variant={tool === key ? "default" : "ghost"}
                size="icon"
                onClick={() => setTool(key)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function AddObjectsBar({
  addObject,
}: {
  addObject: (type: SceneObject["type"]) => void;
}) {
  const items: {
    type: SceneObject["type"];
    Icon: React.ComponentType<{ className?: string }>;
    label: string;
  }[] = [
    { type: "character", Icon: User, label: "شخصية" },
    { type: "prop", Icon: Box, label: "عنصر" },
    { type: "light", Icon: Lightbulb, label: "إضاءة" },
    { type: "camera", Icon: Camera, label: "كاميرا" },
  ];

  return (
    <div className="p-3 border-b">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        إضافة عناصر
      </p>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ type, Icon, label }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addObject(type)}
          >
            <Icon className="h-4 w-4 ml-2" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ObjectListItem({
  obj,
  isSelected,
  onSelect,
  onToggleVisible,
  onDelete,
}: {
  obj: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
}) {
  const Icon = ObjectIcons[obj.type];
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
        isSelected ? "bg-brand/10 border border-brand/30" : "hover:bg-muted"
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      }}
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
            onToggleVisible();
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
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
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
      <ToolsBar tool={tool} setTool={setTool} />
      <AddObjectsBar addObject={addObject} />
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          عناصر المشهد ({objects.length})
        </p>
        <div className="space-y-1">
          {objects.map((obj) => (
            <ObjectListItem
              key={obj.id}
              obj={obj}
              isSelected={selectedObject === obj.id}
              onSelect={() => setSelectedObject(obj.id)}
              onToggleVisible={() =>
                updateObject(obj.id, { visible: !obj.visible })
              }
              onDelete={() => deleteObject(obj.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
