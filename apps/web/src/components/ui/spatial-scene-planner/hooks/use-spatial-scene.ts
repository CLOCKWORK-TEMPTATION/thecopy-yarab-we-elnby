"use client";

/**
 * @fileoverview Hook لإدارة حالة مخطط المشهد المكاني
 */

import * as React from "react";

import { CAMERA_PRESETS } from "../constants";

import type {
  SceneObject,
  CameraSettings,
  ShotKeyframe,
  Position3D,
} from "../types";

export interface SpatialSceneState {
  objects: SceneObject[];
  camera: CameraSettings;
  shots: ShotKeyframe[];
  selectedObject: string | null;
  selectedShot: string | null;
  tool: "select" | "move" | "rotate" | "camera";
  viewMode: "top" | "side" | "front" | "perspective";
  showGrid: boolean;
  showLightPreview: boolean;
  isPlaying: boolean;
  currentTime: number;
  timeOfDay: "day" | "night" | "sunset";
  isDragging: boolean;
  dragStart: { x: number; y: number };
  viewOffset: { x: number; y: number };
  zoom: number;
}

export interface SpatialSceneActions {
  setObjects: React.Dispatch<React.SetStateAction<SceneObject[]>>;
  setCamera: React.Dispatch<React.SetStateAction<CameraSettings>>;
  setShots: React.Dispatch<React.SetStateAction<ShotKeyframe[]>>;
  setSelectedObject: (id: string | null) => void;
  setSelectedShot: (id: string | null) => void;
  setTool: (tool: SpatialSceneState["tool"]) => void;
  setViewMode: (mode: SpatialSceneState["viewMode"]) => void;
  setShowGrid: (v: boolean) => void;
  setShowLightPreview: (v: boolean) => void;
  setIsPlaying: (v: boolean) => void;
  setCurrentTime: (v: number) => void;
  setTimeOfDay: (v: SpatialSceneState["timeOfDay"]) => void;
  setIsDragging: (v: boolean) => void;
  setDragStart: (v: { x: number; y: number }) => void;
  setViewOffset: (v: { x: number; y: number }) => void;
  setZoom: (v: number) => void;
  addObject: (type: SceneObject["type"]) => void;
  deleteObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  addShot: () => void;
  applyCameraPreset: (preset: (typeof CAMERA_PRESETS)[number]) => void;
  goToShot: (shot: ShotKeyframe) => void;
  handleSave: () => void;
  getObjectViewportPosition: (pos: Position3D) => {
    x: number;
    y: number;
    scale: number;
  };
  getTimeOfDayStyle: () => string;
}

export function useSpatialScene(
  onSave?: (data: {
    objects: SceneObject[];
    shots: ShotKeyframe[];
    camera: CameraSettings;
  }) => void
): SpatialSceneState & SpatialSceneActions {
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
  const [tool, setTool] = React.useState<SpatialSceneState["tool"]>("select");
  const [viewMode, setViewMode] =
    React.useState<SpatialSceneState["viewMode"]>("perspective");
  const [showGrid, setShowGrid] = React.useState(true);
  const [showLightPreview, setShowLightPreview] = React.useState(true);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [timeOfDay, setTimeOfDay] =
    React.useState<SpatialSceneState["timeOfDay"]>("day");
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [viewOffset, setViewOffset] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);

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
    setObjects((prev) => [...prev, newObject]);
    setSelectedObject(newObject.id);
  };

  const deleteObject = (id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (selectedObject === id) setSelectedObject(null);
  };

  const updateObject = (id: string, updates: Partial<SceneObject>) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const addShot = () => {
    const newShot: ShotKeyframe = {
      id: `shot-${Date.now()}`,
      time: shots.length * 2,
      camera: { ...camera },
      label: `لقطة ${shots.length + 1}`,
    };
    setShots((prev) => [...prev, newShot]);
    setSelectedShot(newShot.id);
  };

  const applyCameraPreset = (preset: (typeof CAMERA_PRESETS)[number]) => {
    setCamera((prev) => ({
      ...prev,
      focalLength: preset.focalLength,
      position: { ...preset.position },
    }));
  };

  const goToShot = (shot: ShotKeyframe) => {
    setCamera(shot.camera);
    setSelectedShot(shot.id);
    setCurrentTime(shot.time);
  };

  const handleSave = () => {
    onSave?.({ objects, shots, camera });
  };

  const getObjectViewportPosition = (pos: Position3D) => {
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

  return {
    objects,
    camera,
    shots,
    selectedObject,
    selectedShot,
    tool,
    viewMode,
    showGrid,
    showLightPreview,
    isPlaying,
    currentTime,
    timeOfDay,
    isDragging,
    dragStart,
    viewOffset,
    zoom,
    setObjects,
    setCamera,
    setShots,
    setSelectedObject,
    setSelectedShot,
    setTool,
    setViewMode,
    setShowGrid,
    setShowLightPreview,
    setIsPlaying,
    setCurrentTime,
    setTimeOfDay,
    setIsDragging,
    setDragStart,
    setViewOffset,
    setZoom,
    addObject,
    deleteObject,
    updateObject,
    addShot,
    applyCameraPreset,
    goToShot,
    handleSave,
    getObjectViewportPosition,
    getTimeOfDayStyle,
  };
}
