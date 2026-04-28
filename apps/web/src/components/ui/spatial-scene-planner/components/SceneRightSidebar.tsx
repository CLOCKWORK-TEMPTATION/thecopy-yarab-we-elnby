"use client";

/**
 * @fileoverview اللوحة الجانبية اليمنى - خصائص الكاميرا والعناصر
 */

import { Video, Settings2 } from "lucide-react";
import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import { CAMERA_PRESETS } from "../constants";

import type { CameraSettings, SceneObject } from "../types";

const OBJECT_COLORS = [
  "oklch(0.7 0.15 200)",
  "oklch(0.6 0.15 30)",
  "oklch(0.7 0.15 140)",
  "oklch(0.65 0.15 280)",
  "oklch(0.8 0.15 80)",
] as const;

interface SceneRightSidebarProps {
  camera: CameraSettings;
  objects: SceneObject[];
  selectedObject: string | null;
  setCamera: React.Dispatch<React.SetStateAction<CameraSettings>>;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  applyCameraPreset: (preset: (typeof CAMERA_PRESETS)[number]) => void;
}

export function SceneRightSidebar({
  camera,
  objects,
  selectedObject,
  setCamera,
  updateObject,
  applyCameraPreset,
}: SceneRightSidebarProps) {
  const selectedObj = objects.find((o) => o.id === selectedObject);

  return (
    <div className="w-72 border-r bg-card/50 overflow-y-auto">
      {/* Camera Properties */}
      <div className="p-4 border-b">
        <h3 className="font-medium flex items-center gap-2 mb-4">
          <Video className="h-4 w-4 text-brand" />
          إعدادات الكاميرا
        </h3>

        {/* Camera Presets */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">قوالب جاهزة</p>
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
            <label htmlFor="scene-camera-focal-length" className="text-sm">
              البعد البؤري
            </label>
            <span className="text-sm font-mono">{camera.focalLength}mm</span>
          </div>
          <Slider
            id="scene-camera-focal-length"
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
            <label htmlFor="scene-camera-aperture" className="text-sm">
              فتحة العدسة
            </label>
            <span className="text-sm font-mono">f/{camera.aperture}</span>
          </div>
          <Slider
            id="scene-camera-aperture"
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
                <label
                  htmlFor={`scene-camera-position-${axis}`}
                  className="text-xs text-muted-foreground uppercase"
                >
                  {axis}
                </label>
                <input
                  id={`scene-camera-position-${axis}`}
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
      {selectedObj && (
        <div className="p-4">
          <h3 className="font-medium flex items-center gap-2 mb-4">
            <Settings2 className="h-4 w-4 text-brand" />
            خصائص العنصر
          </h3>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <label
                htmlFor="field-scenerightsidebar-1"
                className="text-xs text-muted-foreground"
              >
                الاسم
              </label>
              <input
                id="field-scenerightsidebar-1"
                type="text"
                value={selectedObj.name}
                onChange={(e) =>
                  updateObject(selectedObj.id, { name: e.target.value })
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
                    <label
                      htmlFor={`scene-object-position-${axis}`}
                      className="text-xs text-muted-foreground uppercase"
                    >
                      {axis}
                    </label>
                    <input
                      id={`scene-object-position-${axis}`}
                      type="number"
                      value={selectedObj.position[axis]}
                      onChange={(e) =>
                        updateObject(selectedObj.id, {
                          position: {
                            ...selectedObj.position,
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
                <label htmlFor="scene-object-scale" className="text-sm">
                  الحجم
                </label>
                <span className="text-sm font-mono">
                  {selectedObj.scale.toFixed(1)}x
                </span>
              </div>
              <Slider
                id="scene-object-scale"
                value={[selectedObj.scale]}
                min={0.5}
                max={3}
                step={0.1}
                onValueChange={([v]) => {
                  if (v === undefined) return;
                  updateObject(selectedObj.id, { scale: v });
                }}
              />
            </div>

            {/* Color */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">اللون</div>
              <div className="flex gap-2">
                {OBJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full transition-all ${selectedObj.color === color ? "ring-2 ring-brand ring-offset-2" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateObject(selectedObj.id, { color })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
