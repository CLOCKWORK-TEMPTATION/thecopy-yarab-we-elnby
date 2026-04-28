 
// Virtual Production Engine Types
// أنواع محرك الإنتاج الافتراضي

export interface VirtualProduction {
  id: string;
  name: string;
  description: string;
  scenes: VPScene[];
  cameras: VPCamera[];
  ledWalls: LEDWall[];
  trackingData: TrackingSession[];
  visualEffects: VisualEffect[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VPScene {
  id: string;
  name: string;
  environment: string;
  hdriBackground: string;
  ledContent: string;
  realTimeRendering: boolean;
  frustumCulling: boolean;
  parallaxCorrection: boolean;
}

export interface VPCamera {
  id: string;
  name: string;
  type: "main" | "witness" | "virtual";
  tracked: boolean;
  trackingSystem: "mocap" | "inside-out" | "outside-in" | "lidar";
  lens: LensInfo;
  position: Vector3D;
  rotation: Vector3D;
  frustum: FrustumInfo;
}

export interface LensInfo {
  focalLength: number;
  aperture: number;
  sensorSize: { width: number; height: number };
  distortionModel?: string;
  calibrated: boolean;
}

export interface FrustumInfo {
  nearPlane: number;
  farPlane: number;
  fov: number;
  aspectRatio: number;
}

export interface LEDWall {
  id: string;
  name: string;
  dimensions: { width: number; height: number };
  pixelPitch: number;
  resolution: { width: number; height: number };
  curvature: number;
  panels: number;
  brightness: number;
  colorSpace: "rec709" | "rec2020" | "dci-p3";
}

export interface TrackingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  cameraId: string;
  fps: number;
  latency: number;
  accuracy: number;
  dataPoints: number;
}

export interface VisualEffect {
  id: string;
  name: string;
  type: "particle" | "fluid" | "destruction" | "weather" | "creature" | "environment";
  realTime: boolean;
  gpuAccelerated: boolean;
  parameters: Record<string, unknown>;
}

export interface OpticalIllusion {
  id: string;
  name: string;
  type: "forced-perspective" | "matte-painting" | "miniature" | "projection" | "practical-effect";
  description: string;
  setup: IllusionSetup;
  cameraRequirements: CameraRequirement[];
}

export interface IllusionSetup {
  scaleRatio?: number;
  distanceFromCamera?: number;
  lightingMatch: boolean;
  focusPlane?: number;
  specialEquipment: string[];
}

export interface CameraRequirement {
  parameter: string;
  value: string;
  critical: boolean;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type IllusionType = OpticalIllusion["type"];
export type VFXType = VisualEffect["type"];
export type CameraType = VPCamera["type"];
export type TrackingSystem = VPCamera["trackingSystem"];
export type ColorSpace = LEDWall["colorSpace"];
