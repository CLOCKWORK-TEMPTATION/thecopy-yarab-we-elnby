/**
 * @fileoverview ثوابت مخطط المشهد المكاني
 */

import { User, Box, Lightbulb, Camera } from "lucide-react";

export const CELL_SIZE = 40;

export const ObjectIcons = {
  character: User,
  prop: Box,
  light: Lightbulb,
  camera: Camera,
} as const;

export const CAMERA_PRESETS = [
  { name: "لقطة عريضة", focalLength: 24, position: { x: 0, y: 200, z: 500 } },
  {
    name: "لقطة متوسطة",
    focalLength: 50,
    position: { x: 0, y: 150, z: 300 },
  },
  { name: "لقطة قريبة", focalLength: 85, position: { x: 0, y: 100, z: 150 } },
  {
    name: "لقطة قريبة جداً",
    focalLength: 135,
    position: { x: 0, y: 80, z: 80 },
  },
  {
    name: "زاوية عالية",
    focalLength: 35,
    position: { x: 0, y: 400, z: 300 },
  },
  {
    name: "زاوية منخفضة",
    focalLength: 35,
    position: { x: 0, y: 50, z: 300 },
  },
] as const;
