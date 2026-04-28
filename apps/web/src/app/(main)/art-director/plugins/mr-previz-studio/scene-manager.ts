// CineArchitect AI - Mixed Reality Pre-visualization Studio Scene Manager
// إدارة مشاهد الواقع الممتد

import { v4 as uuidv4 } from "uuid";
import type { XRScene } from "./types";
import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_TARGET,
  DEFAULT_CAMERA_FOV,
  DEFAULT_CAMERA_LENS_LENGTH,
  DEFAULT_CAMERA_ASPECT_RATIO,
  DEFAULT_AMBIENT_COLOR,
  DEFAULT_AMBIENT_INTENSITY,
  DEFAULT_DIRECTIONAL_COLOR,
  DEFAULT_DIRECTIONAL_INTENSITY,
  DEFAULT_DIRECTIONAL_POSITION,
} from "./constants";

const scenes = new Map<string, XRScene>();

/**
 * إنشاء مشهد جديد
 */
export function createScene(data: {
  name: string;
  description: string;
  environment: "indoor" | "outdoor" | "studio" | "virtual";
  dimensions: { width: number; height: number; depth: number };
}): XRScene {
  const scene: XRScene = {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    environment: data.environment,
    dimensions: data.dimensions,
    objects: [],
    cameras: [
      {
        id: uuidv4(),
        name: "Main Camera",
        type: "main",
        position: DEFAULT_CAMERA_POSITION,
        target: DEFAULT_CAMERA_TARGET,
        fov: DEFAULT_CAMERA_FOV,
        lensLength: DEFAULT_CAMERA_LENS_LENGTH,
        aspectRatio: DEFAULT_CAMERA_ASPECT_RATIO,
      },
    ],
    lighting: {
      ambient: { color: DEFAULT_AMBIENT_COLOR, intensity: DEFAULT_AMBIENT_INTENSITY },
      directional: [
        {
          id: uuidv4(),
          color: DEFAULT_DIRECTIONAL_COLOR,
          intensity: DEFAULT_DIRECTIONAL_INTENSITY,
          position: DEFAULT_DIRECTIONAL_POSITION,
          target: { x: 0, y: 0, z: 0 },
        },
      ],
      pointLights: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  scenes.set(scene.id, scene);
  return scene;
}

/**
 * الحصول على مشهد بالمعرف
 */
export function getScene(sceneId: string): XRScene | undefined {
  return scenes.get(sceneId);
}

/**
 * إضافة كائن إلى مشهد
 */
export function addObjectToScene(sceneId: string, object: any): boolean {
  const scene = scenes.get(sceneId);
  if (!scene) {
    return false;
  }

  scene.objects.push(object);
  scene.updatedAt = new Date();
  return true;
}

/**
 * إضافة كاميرا إلى مشهد
 */
export function addCameraToScene(sceneId: string, camera: any): boolean {
  const scene = scenes.get(sceneId);
  if (!scene) {
    return false;
  }

  scene.cameras.push(camera);
  scene.updatedAt = new Date();
  return true;
}

/**
 * تحديث إضاءة مشهد
 */
export function updateSceneLighting(
  sceneId: string,
  lighting: Partial<any>
): boolean {
  const scene = scenes.get(sceneId);
  if (!scene) {
    return false;
  }

  if (lighting.ambient) {
    scene.lighting.ambient = lighting.ambient;
  }
  if (lighting.directional) {
    scene.lighting.directional = lighting.directional;
  }
  if (lighting.pointLights) {
    scene.lighting.pointLights = lighting.pointLights;
  }
  if (lighting.hdriEnvironment) {
    scene.lighting.hdriEnvironment = lighting.hdriEnvironment;
  }

  scene.updatedAt = new Date();
  return true;
}

/**
 * تحديث حركة كاميرا في مشهد
 */
export function updateCameraMovement(sceneId: string, cameraId: string, movement: any): boolean {
  const scene = scenes.get(sceneId);
  if (!scene) {
    return false;
  }

  const camera = scene.cameras.find((c) => c.id === cameraId);
  if (!camera) {
    return false;
  }

  camera.movement = movement;
  scene.updatedAt = new Date();
  return true;
}

/**
 * الحصول على قائمة كل المشاهد
 */
export function listAllScenes(): Array<{
  id: string;
  name: string;
  environment: string;
  objectCount: number;
  cameraCount: number;
  createdAt: Date;
  updatedAt: Date;
}> {
  return Array.from(scenes.values()).map((s) => ({
    id: s.id,
    name: s.name,
    environment: s.environment,
    objectCount: s.objects.length,
    cameraCount: s.cameras.length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

/**
 * مسح جميع المشاهد
 */
export function clearAllScenes(): void {
  scenes.clear();
}
