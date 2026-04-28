// CineArchitect AI - Mixed Reality Pre-visualization Studio Types
// أنواع البيانات لاستوديو التصور المسبق بالواقع المختلط

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface XRObject {
  id: string;
  name: string;
  type: "prop" | "set-piece" | "character" | "vehicle" | "environment";
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  model3D?: string;
  material?: string;
  isInteractive: boolean;
}

export interface CameraMovement {
  type:
    | "static"
    | "pan"
    | "tilt"
    | "dolly"
    | "track"
    | "crane"
    | "orbit"
    | "follow";
  startPosition: Vector3D;
  endPosition: Vector3D;
  duration: number;
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

export interface VirtualCamera {
  id: string;
  name: string;
  type: "main" | "secondary" | "tracking" | "crane" | "steadicam" | "drone";
  position: Vector3D;
  target: Vector3D;
  fov: number;
  lensLength: number;
  aspectRatio: string;
  movement?: CameraMovement;
}

export interface XRLighting {
  ambient: { color: string; intensity: number };
  directional: {
    id: string;
    color: string;
    intensity: number;
    position: Vector3D;
    target: Vector3D;
  }[];
  pointLights: {
    id: string;
    color: string;
    intensity: number;
    position: Vector3D;
    radius: number;
  }[];
  hdriEnvironment?: string;
}

export interface XRScene {
  id: string;
  name: string;
  description: string;
  environment: "indoor" | "outdoor" | "studio" | "virtual";
  dimensions: { width: number; height: number; depth: number };
  objects: XRObject[];
  cameras: VirtualCamera[];
  lighting: XRLighting;
  createdAt: Date;
  updatedAt: Date;
}

export interface XRDevice {
  type: "vr-headset" | "ar-glasses" | "mr-headset" | "mobile-ar" | "desktop";
  name: string;
  capabilities: string[];
  resolution: { width: number; height: number };
  trackingType: "3dof" | "6dof" | "inside-out" | "outside-in";
}
