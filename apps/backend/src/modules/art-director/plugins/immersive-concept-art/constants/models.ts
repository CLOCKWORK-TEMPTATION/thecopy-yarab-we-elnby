// Model Constants

export const meshVertices: Record<string, number> = {
  cube: 8,
  sphere: 482,
  cylinder: 64,
  plane: 4,
  custom: 100,
};

export const rigBones: Record<string, number> = {
  biped: 65,
  quadruped: 80,
  custom: 40,
};

export const defaultMaterial = {
  name: "Default Material",
  type: "pbr" as const,
  baseColor: "#808080",
  roughness: 0.5,
  metalness: 0,
};
