// Types for Immersive Concept Art Studio Plugin

export type ArtStyle =
  | "realistic"
  | "stylized"
  | "photorealistic"
  | "painterly"
  | "graphic"
  | "surreal";

export interface ConceptArtProject {
  id: string;
  name: string;
  description: string;
  style: ArtStyle;
  models3D: Model3D[];
  environments: Environment3D[];
  characters: Character3D[];
  moodboards: MoodBoard[];
  vrExperiences: VRExperience[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Model3D {
  id: string;
  name: string;
  type: "prop" | "vehicle" | "architecture" | "organic" | "mechanical";
  geometry: GeometryInfo;
  materials: Material3D[];
  textures: Texture[];
  lod: LODLevel[];
  animations?: Animation3D[];
  interactable: boolean;
}

export interface GeometryInfo {
  vertices: number;
  faces: number;
  format: "triangles" | "quads" | "mixed";
  dimensions: { width: number; height: number; depth: number };
}

export interface Material3D {
  id: string;
  name: string;
  type: "pbr" | "unlit" | "subsurface" | "glass" | "metal" | "fabric";
  baseColor: string;
  roughness: number;
  metalness: number;
  emission?: string;
  transparency?: number;
}

export interface Texture {
  id: string;
  type:
    | "diffuse"
    | "normal"
    | "roughness"
    | "metalness"
    | "ao"
    | "emission"
    | "displacement";
  resolution: string;
  format: "png" | "jpg" | "exr" | "tiff";
  url: string;
}

export interface LODLevel {
  level: number;
  vertices: number;
  distance: number;
}

export interface Animation3D {
  id: string;
  name: string;
  duration: number;
  type: "skeletal" | "morph" | "transform";
  loop: boolean;
}

export interface Environment3D {
  id: string;
  name: string;
  type: "interior" | "exterior" | "landscape" | "abstract";
  lighting: EnvironmentLighting;
  atmosphere: AtmosphereSettings;
  assets: string[];
  skybox?: string;
  hdri?: string;
}

export interface EnvironmentLighting {
  sunPosition: { azimuth: number; elevation: number };
  sunColor: string;
  sunIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  shadowSoftness: number;
}

export interface AtmosphereSettings {
  fog: boolean;
  fogColor?: string;
  fogDensity?: number;
  haze: number;
  particles?: string;
}

export interface Character3D {
  id: string;
  name: string;
  type: "human" | "creature" | "robot" | "stylized";
  rig: RigInfo;
  costumes: Costume[];
  expressions: Expression[];
}

export interface RigInfo {
  type: "biped" | "quadruped" | "custom";
  bones: number;
  ikHandles: string[];
  blendShapes: number;
}

export interface Costume {
  id: string;
  name: string;
  pieces: string[];
  materials: Material3D[];
}

export interface Expression {
  id: string;
  name: string;
  intensity: number;
  blendShapeWeights: Record<string, number>;
}

export interface MoodBoard {
  id: string;
  name: string;
  theme: string;
  colorPalette: string[];
  references: Reference[];
  notes: string;
}

export interface Reference {
  id: string;
  type: "image" | "video" | "model" | "sketch";
  url: string;
  tags: string[];
  description: string;
}

export interface VRExperience {
  id: string;
  name: string;
  type: "walkthrough" | "presentation" | "interactive" | "sculpting";
  scenes: string[];
  duration: number;
  interactions: string[];
}
