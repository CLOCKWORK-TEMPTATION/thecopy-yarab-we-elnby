/**
 * @fileoverview أنواع بيانات مخطط المشهد المكاني
 */

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Rotation3D {
  pitch: number; // X rotation
  yaw: number; // Y rotation
  roll: number; // Z rotation
}

export interface SceneObject {
  id: string;
  type: "character" | "prop" | "light" | "camera";
  name: string;
  position: Position3D;
  rotation: Rotation3D;
  scale: number;
  color?: string;
  visible: boolean;
}

export interface CameraSettings {
  focalLength: number;
  aperture: number;
  position: Position3D;
  lookAt: Position3D;
  rotation: Rotation3D;
}

export interface ShotKeyframe {
  id: string;
  time: number;
  camera: CameraSettings;
  label: string;
}

export interface SpatialScenePlannerProps {
  sceneId?: string;
  sceneName?: string;
  onSave?: (data: {
    objects: SceneObject[];
    shots: ShotKeyframe[];
    camera: CameraSettings;
  }) => void;
  className?: string;
}
