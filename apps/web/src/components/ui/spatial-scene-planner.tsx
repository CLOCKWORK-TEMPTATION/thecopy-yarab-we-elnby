"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Video,
  Camera,
  Move3D,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Eye,
  EyeOff,
  Save,
  Download,
  Play,
  Pause,
  SkipForward,
  Box,
  User,
  Lightbulb,
  Sun,
  Moon,
  Sparkles,
  Plus,
  Trash2,
  Settings2,
  Maximize2,
} from "lucide-react";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Spatial Scene Planner Component for Directors Studio
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - 3D scene visualization with grid
 * - Camera position and angle control
 * - Object placement (characters, props, lights)
 * - Shot preview simulation
 * - Timeline for shot sequencing
 * - Light placement and preview
 */

interface Position3D {
  x: number;
  y: number;
  z: number;
}

interface Rotation3D {
  pitch: number; // X rotation
  yaw: number; // Y rotation
  roll: number; // Z rotation
}

interface SceneObject {
  id: string;
  type: "character" | "prop" | "light" | "camera";
  name: string;
  position: Position3D;
  rotation: Rotation3D;
  scale: number;
  color?: string;
  visible: boolean;
}

interface CameraSettings {
  focalLength: number;
  aperture: number;
  position: Position3D;
  lookAt: Position3D;
  rotation: Rotation3D;
}

interface ShotKeyframe {
  id: string;
  time: number;
  camera: CameraSettings;
  label: string;
}

interface SpatialScenePlannerProps {
  sceneId?: string;
  sceneName?: string;
  onSave?: (data: {
    objects: SceneObject[];
    shots: ShotKeyframe[];
    camera: CameraSettings;
  }) => void;
  className?: string;
}

const CELL_SIZE = 40;

// Object type icons
const ObjectIcons = {
  character: User,
  prop: Box,
  light: Lightbulb,
  camera: Camera,
};

// Camera presets
const CAMERA_PRESETS = [
  { name: "لقطة عريضة", focalLength: 24, position: { x: 0, y: 200, z: 500 } },
  { name: "لقطة متوسطة", focalLength: 50, position: { x: 0, y: 150, z: 300 } },
  { name: "لقطة قريبة", focalLength: 85, position: { x: 0, y: 100, z: 150 } },
  {
    name: "لقطة قريبة جداً",
    focalLength: 135,
    position: { x: 0, y: 80, z: 80 },
  },
  { name: "زاوية عالية", focalLength: 35, position: { x: 0, y: 400, z: 300 } },
  { name: "زاوية منخفضة", focalLength: 35, position: { x: 0, y: 50, z: 300 } },
];

export function SpatialScenePlanner({
  sceneName = "مشهد جديد",
  onSave,
  className,
}: SpatialScenePlannerProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Scene state
  const [objects, setObjects] = React.useState<SceneObject[]>([
    {
      id: "char-1",
      type: "character",
      name: "الشخصية 1",
      position: { x: 0, y: 0, z: 0 },
      rotation: { pitch: 0, yaw: 0, roll: 0 },
      scale: 1,
      color: "oklch(0.7 0.15 200)",
      visible: true,
    },
  ]);

  const [camera, setCamera] = React.useState<CameraSettings>({
    focalLength: 50,
    aperture: 2.8,
    position: { x: 0, y: 150, z: 300 },
    lookAt: { x: 0, y: 0, z: 0 },
    rotation: { pitch: -15, yaw: 0, roll: 0 },
  });

  const [shots, setShots] = React.useState<ShotKeyframe[]>([]);
  const [selectedObject, setSelectedObject] = React.useState<string | null>(
    null
  );
  const [selectedShot, setSelectedShot] = React.useState<string | null>(null);
  const [tool, setTool] = React.useState<
    "select" | "move" | "rotate" | "camera"
  >("select");
  const [viewMode, setViewMode] = React.useState<
    "top" | "side" | "front" | "perspective"
  >("perspective");
  const [showGrid, setShowGrid] = React.useState(true);
  const [showLightPreview, setShowLightPreview] = React.useState(true);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [timeOfDay, setTimeOfDay] = React.useState<"day" | "night" | "sunset">(
    "day"
  );

  // Viewport drag state
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [viewOffset, setViewOffset] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);

  // Add object
  const addObject = (type: SceneObject["type"]) => {
    const newObject: SceneObject = {
      id: `${type}-${Date.now()}`,
      type,
      name:
        type === "character"
          ? `شخصية ${objects.filter((o) => o.type === "character").length + 1}`
          : type === "prop"
            ? `عنصر ${objects.filter((o) => o.type === "prop").length + 1}`
            : type === "light"
              ? `إضاءة ${objects.filter((o) => o.type === "light").length + 1}`
              : `كاميرا ${objects.filter((o) => o.type === "camera").length + 1}`,
      position: {
        x: Math.random() * 200 - 100,
        y: 0,
        z: Math.random() * 200 - 100,
      },
      rotation: { pitch: 0, yaw: 0, roll: 0 },
      scale: 1,
      color:
        type === "light"
          ? "oklch(0.9 0.15 80)"
          : `oklch(0.6 0.15 ${Math.random() * 360})`,
      visible: true,
    };
    setObjects([...objects, newObject]);
    setSelectedObject(newObject.id);
  };

  // Delete selected object
  const deleteObject = (id: string) => {
    setObjects(objects.filter((o) => o.id !== id));
    if (selectedObject === id) setSelectedObject(null);
  };

  // Update object
  const updateObject = (id: string, updates: Partial<SceneObject>) => {
    setObjects(objects.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  // Add shot keyframe
  const addShot = () => {
    const newShot: ShotKeyframe = {
      id: `shot-${Date.now()}`,
      time: shots.length * 2,
      camera: { ...camera },
      label: `لقطة ${shots.length + 1}`,
    };
    setShots([...shots, newShot]);
    setSelectedShot(newShot.id);
  };

  // Apply camera preset
  const applyCameraPreset = (preset: (typeof CAMERA_PRESETS)[0]) => {
    setCamera((prev) => ({
      ...prev,
      focalLength: preset.focalLength,
      position: { ...preset.position },
    }));
  };

  // Go to shot
  const goToShot = (shot: ShotKeyframe) => {
    setCamera(shot.camera);
    setSelectedShot(shot.id);
    setCurrentTime(shot.time);
  };

  // Handle save
  const handleSave = () => {
    onSave?.({ objects, shots, camera });
  };

  // Calculate viewport transform for object
  const getObjectViewportPosition = (pos: Position3D) => {
    // Simplified perspective projection
    const scale =
      zoom *
      (viewMode === "perspective"
        ? 500 / (500 - pos.z + camera.position.z)
        : 1);
    let x = 0,
      y = 0;

    switch (viewMode) {
      case "top":
        x = pos.x * zoom + viewOffset.x;
        y = pos.z * zoom + viewOffset.y;
        break;
      case "side":
        x = pos.z * zoom + viewOffset.x;
        y = -pos.y * zoom + viewOffset.y;
        break;
      case "front":
        x = pos.x * zoom + viewOffset.x;
        y = -pos.y * zoom + viewOffset.y;
        break;
      case "perspective":
      default:
        x = pos.x * scale + viewOffset.x;
        y = (-pos.y + pos.z * 0.3) * scale + viewOffset.y;
        break;
    }

    return { x, y, scale };
  };

  // Get time of day lighting
  const getTimeOfDayStyle = () => {
    switch (timeOfDay) {
      case "night":
        return "from-slate-900 via-slate-800 to-slate-900";
      case "sunset":
        return "from-orange-300/20 via-amber-200/10 to-blue-300/20";
      default:
        return "from-blue-100/30 via-white/5 to-blue-100/30";
    }
  };

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
            <Badge variant="outline">{shots.length} لقطات</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
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
          {/* Left Sidebar - Objects & Tools */}
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
                        <p className="text-sm font-medium truncate">
                          {obj.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {obj.position.x.toFixed(0)},{" "}
                          {obj.position.y.toFixed(0)},{" "}
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

          {/* Main Viewport */}
          <div className="flex-1 flex flex-col">
            {/* Viewport Toolbar */}
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Select
                  value={viewMode}
                  onValueChange={(v) => setViewMode(v as typeof viewMode)}
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

              <div className="flex items-center gap-2">
                {/* Time of Day */}
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

                {/* Zoom Controls */}
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
            </div>

            {/* 3D Viewport */}
            <div
              ref={canvasRef}
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
                if (isDragging) {
                  setViewOffset({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y,
                  });
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              {/* Grid */}
              {showGrid && (
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
              )}

              {/* Center crosshair */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-px bg-muted-foreground/30" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-px h-8 bg-muted-foreground/30" />
              </div>

              {/* Objects */}
              {objects
                .filter((o) => o.visible)
                .map((obj) => {
                  const { x, y, scale } = getObjectViewportPosition(
                    obj.position
                  );
                  const Icon = ObjectIcons[obj.type];
                  const isSelected = selectedObject === obj.id;
                  const size = 40 * scale * obj.scale;

                  return (
                    <div
                      key={obj.id}
                      className={cn(
                        "absolute cursor-pointer transition-all duration-200",
                        isSelected && "z-10"
                      )}
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        transform: "translate(-50%, -50%)",
                      }}
                      onClick={() => setSelectedObject(obj.id)}
                    >
                      {/* Light glow effect */}
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
                          isSelected &&
                            "ring-2 ring-brand ring-offset-2 ring-offset-background"
                        )}
                        style={{
                          width: size,
                          height: size,
                          backgroundColor: obj.color,
                        }}
                      >
                        <Icon
                          className="text-white"
                          style={{ width: size * 0.5, height: size * 0.5 }}
                        />
                      </div>

                      {/* Name label */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-card/80 backdrop-blur-sm px-2 py-0.5 rounded">
                        {obj.name}
                      </div>
                    </div>
                  );
                })}

              {/* Camera preview frustum */}
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

              {/* View Mode Label */}
              <div className="absolute top-4 left-4">
                <Badge
                  variant="outline"
                  className="bg-card/80 backdrop-blur-sm"
                >
                  {viewMode === "perspective"
                    ? "منظور"
                    : viewMode === "top"
                      ? "من أعلى"
                      : viewMode === "front"
                        ? "من الأمام"
                        : "من الجانب"}
                </Badge>
              </div>
            </div>

            {/* Timeline */}
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
                  <span className="text-sm font-mono">
                    {currentTime.toFixed(1)}s
                  </span>
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
                        <span className="text-sm font-medium">
                          {shot.label}
                        </span>
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
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-72 border-r bg-card/50 overflow-y-auto">
            {/* Camera Properties */}
            <div className="p-4 border-b">
              <h3 className="font-medium flex items-center gap-2 mb-4">
                <Video className="h-4 w-4 text-brand" />
                إعدادات الكاميرا
              </h3>

              {/* Camera Presets */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">
                  قوالب جاهزة
                </p>
                <Select
                  onValueChange={(v) => {
                    const preset = CAMERA_PRESETS[parseInt(v)];
                    if (preset) applyCameraPreset(preset);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر قالب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMERA_PRESETS.map((preset, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {preset.name} ({preset.focalLength}mm)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Focal Length */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm">البعد البؤري</label>
                  <span className="text-sm font-mono">
                    {camera.focalLength}mm
                  </span>
                </div>
                <Slider
                  value={[camera.focalLength]}
                  min={14}
                  max={200}
                  step={1}
                  onValueChange={([v]) => {
                    if (v === undefined) return;
                    setCamera((prev) => ({ ...prev, focalLength: v }));
                  }}
                />
              </div>

              {/* Aperture */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm">فتحة العدسة</label>
                  <span className="text-sm font-mono">f/{camera.aperture}</span>
                </div>
                <Slider
                  value={[camera.aperture]}
                  min={1.4}
                  max={22}
                  step={0.1}
                  onValueChange={([v]) => {
                    if (v === undefined) return;
                    setCamera((prev) => ({ ...prev, aperture: v }));
                  }}
                />
              </div>

              {/* Camera Position */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">موقع الكاميرا</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["x", "y", "z"] as const).map((axis) => (
                    <div key={axis} className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase">
                        {axis}
                      </label>
                      <input
                        type="number"
                        value={camera.position[axis]}
                        onChange={(e) =>
                          setCamera((prev) => ({
                            ...prev,
                            position: {
                              ...prev.position,
                              [axis]: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full px-2 py-1 text-sm border rounded-md bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Object Properties */}
            {selectedObject && (
              <div className="p-4">
                <h3 className="font-medium flex items-center gap-2 mb-4">
                  <Settings2 className="h-4 w-4 text-brand" />
                  خصائص العنصر
                </h3>

                {(() => {
                  const obj = objects.find((o) => o.id === selectedObject);
                  if (!obj) return null;

                  return (
                    <div className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          الاسم
                        </label>
                        <input
                          type="text"
                          value={obj.name}
                          onChange={(e) =>
                            updateObject(obj.id, { name: e.target.value })
                          }
                          className="w-full px-2 py-1 text-sm border rounded-md bg-background"
                          dir="rtl"
                        />
                      </div>

                      {/* Position */}
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">الموقع</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(["x", "y", "z"] as const).map((axis) => (
                            <div key={axis} className="space-y-1">
                              <label className="text-xs text-muted-foreground uppercase">
                                {axis}
                              </label>
                              <input
                                type="number"
                                value={obj.position[axis]}
                                onChange={(e) =>
                                  updateObject(obj.id, {
                                    position: {
                                      ...obj.position,
                                      [axis]: parseFloat(e.target.value) || 0,
                                    },
                                  })
                                }
                                className="w-full px-2 py-1 text-sm border rounded-md bg-background"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scale */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm">الحجم</label>
                          <span className="text-sm font-mono">
                            {obj.scale.toFixed(1)}x
                          </span>
                        </div>
                        <Slider
                          value={[obj.scale]}
                          min={0.5}
                          max={3}
                          step={0.1}
                          onValueChange={([v]) => {
                            if (v === undefined) return;
                            updateObject(obj.id, { scale: v });
                          }}
                        />
                      </div>

                      {/* Color */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          اللون
                        </label>
                        <div className="flex gap-2">
                          {[
                            "oklch(0.7 0.15 200)",
                            "oklch(0.6 0.15 30)",
                            "oklch(0.7 0.15 140)",
                            "oklch(0.65 0.15 280)",
                            "oklch(0.8 0.15 80)",
                          ].map((color) => (
                            <button
                              key={color}
                              className={cn(
                                "w-8 h-8 rounded-full transition-all",
                                obj.color === color &&
                                  "ring-2 ring-brand ring-offset-2"
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => updateObject(obj.id, { color })}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default SpatialScenePlanner;
