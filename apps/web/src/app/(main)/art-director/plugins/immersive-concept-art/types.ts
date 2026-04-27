/* eslint-disable */
// Immersive Concept Art Studio Types
// أنواع استوديو الفن التصوري الغامر

export interface ConceptArtProject {
  id: string;
  name: string;
  description: string;
  artStyle: ArtStyle;
  models3D: Model3D[];
  environments: Environment3D[];
  vrExperiences: VRExperience[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtStyle {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  visualCharacteristics: string[];
  recommendedTechniques: string[];
  exampleReferences: string[];
}

export interface Model3D {
  id: string;
  name: string;
  geometry: GeometryInfo;
  materials: Material3D[];
  animations: Animation3D[];
  lodLevels: LODLevel[];
}

export interface GeometryInfo {
  vertices: number;
  faces: number;
  uvs: boolean;
  normals: boolean;
  boundingBox: { min: Vector3D; max: Vector3D };
}

export interface Material3D {
  id: string;
  name: string;
  type: "pbr" | "toon" | "glass" | "emissive" | "subsurface";
  baseColor: string;
  roughness: number;
  metalness: number;
  emission?: string;
  transparency?: number;
  textures: Texture[];
}

export interface Texture {
  id: string;
  type: "diffuse" | "normal" | "roughness" | "metallic" | "emissive" | "ao";
  url: string;
  resolution: { width: number; height: number };
}

export interface Animation3D {
  id: string;
  name: string;
  duration: number;
  loop: boolean;
  keyframes: number;
}

export interface LODLevel {
  level: number;
  triangleCount: number;
  distance: number;
}

export interface Environment3D {
  id: string;
  name: string;
  type: "interior" | "exterior" | "studio" | "natural";
  lighting: LightingSetup;
  atmosphere: AtmosphereSettings;
}

export interface LightingSetup {
  mainLight: LightInfo;
  fillLights: LightInfo[];
  ambientIntensity: number;
  hdriEnvironment?: string;
}

export interface LightInfo {
  type: "directional" | "point" | "spot" | "area";
  intensity: number;
  color: string;
  position?: Vector3D;
}

export interface AtmosphereSettings {
  fogEnabled: boolean;
  fogDensity: number;
  fogColor: string;
  timeOfDay: "dawn" | "noon" | "sunset" | "night";
}

export interface VRExperience {
  id: string;
  name: string;
  type: "walkthrough" | "interactive" | "presentation" | "sculpting";
  scenes: string[];
  duration: number;
  interactions: string[];
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type VRExperienceType = VRExperience["type"];
export type MaterialType = Material3D["type"];
export type EnvironmentType = Environment3D["type"];
