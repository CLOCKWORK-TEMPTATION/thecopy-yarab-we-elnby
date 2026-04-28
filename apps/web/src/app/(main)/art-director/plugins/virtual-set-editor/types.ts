// CineArchitect AI - Virtual Set Editor Types
// ???? ????????? ????????? ?? ??????

export interface VirtualSetElement {
  id: string;
  name: string;
  type:
    | "wall"
    | "floor"
    | "ceiling"
    | "furniture"
    | "prop"
    | "decoration"
    | "window"
    | "door"
    | "cgi-extension";
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  material: MaterialConfig;
  cgiAsset?: string;
  visibility: "visible" | "hidden" | "greenscreen";
  layer: "practical" | "virtual" | "hybrid";
}

export interface MaterialConfig {
  type: "solid" | "texture" | "procedural" | "reflective";
  color?: string;
  textureUrl?: string;
  roughness: number;
  metalness: number;
  opacity: number;
}

export interface LightingAdjustment {
  id: string;
  type: "key" | "fill" | "back" | "practical" | "ambient" | "cgi";
  color: string;
  intensity: number;
  temperature: number;
  position: Vector3D;
  softness: number;
  castShadows: boolean;
}

export interface VirtualSet {
  id: string;
  name: string;
  description: string;
  elements: VirtualSetElement[];
  lighting: LightingAdjustment[];
  cgiExtensions: CGIExtension[];
  collaborators: Collaborator[];
  realTimeRendering: boolean;
  lastSync: Date;
  createdAt: Date;
}

export interface CGIExtension {
  id: string;
  name: string;
  type:
    | "set-extension"
    | "sky-replacement"
    | "window-view"
    | "screen-content"
    | "backdrop";
  assetUrl: string;
  position: Vector3D;
  scale: Vector3D;
  blendMode: "additive" | "multiply" | "overlay" | "normal";
}

export interface Collaborator {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  lastAction: string;
  lastActionTime: Date;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}
