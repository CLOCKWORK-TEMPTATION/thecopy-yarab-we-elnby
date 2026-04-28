// Export Format Utilities

export function getFormatCompatibility(format: string): string[] {
  const compatibility: Record<string, string[]> = {
    gltf: ["Three.js", "Babylon.js", "Unity", "Unreal", "Blender"],
    fbx: ["Maya", "3ds Max", "Cinema 4D", "Unity", "Unreal"],
    obj: ["Universal - most 3D software"],
    usdz: ["iOS AR", "Reality Composer", "Pixar tools"],
    blend: ["Blender"],
  };

  return compatibility[format] ?? [];
}

export const qualitySettings = {
  draft: { samples: 16, resolution: "720p", time: "~5 seconds" },
  preview: { samples: 64, resolution: "1080p", time: "~30 seconds" },
  production: { samples: 256, resolution: "4K", time: "~5 minutes" },
};

export type QualityLevel = keyof typeof qualitySettings;
