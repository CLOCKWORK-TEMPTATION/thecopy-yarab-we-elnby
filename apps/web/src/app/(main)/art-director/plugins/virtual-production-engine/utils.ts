import { v4 as uuidv4 } from "uuid";

import { illusionLibrary } from "./constants";
import { productions } from "./state";

import type { OpticalIllusion, VirtualProduction } from "./types";

export function calculateFrustum(data: {
  focalLength: number;
  sensorWidth: number;
  sensorHeight: number;
  subjectDistance: number;
  ledWallDistance?: number;
}) {
  const fovH =
    2 * Math.atan(data.sensorWidth / (2 * data.focalLength)) * (180 / Math.PI);
  const fovV =
    2 * Math.atan(data.sensorHeight / (2 * data.focalLength)) * (180 / Math.PI);

  const coverageWidth =
    2 * data.subjectDistance * Math.tan(((fovH / 2) * Math.PI) / 180);
  const coverageHeight =
    2 * data.subjectDistance * Math.tan(((fovV / 2) * Math.PI) / 180);

  let ledWallCoverage = null;
  if (data.ledWallDistance) {
    ledWallCoverage = {
      width: 2 * data.ledWallDistance * Math.tan(((fovH / 2) * Math.PI) / 180),
      height: 2 * data.ledWallDistance * Math.tan(((fovV / 2) * Math.PI) / 180),
    };
  }

  return {
    frustum: {
      horizontalFOV: Math.round(fovH * 10) / 10,
      verticalFOV: Math.round(fovV * 10) / 10,
      aspectRatio:
        Math.round((data.sensorWidth / data.sensorHeight) * 100) / 100,
    },
    coverageAtSubject: {
      distance: data.subjectDistance,
      width: Math.round(coverageWidth * 100) / 100,
      height: Math.round(coverageHeight * 100) / 100,
    },
    ledWallCoverage: ledWallCoverage
      ? {
          distance: data.ledWallDistance,
          width: Math.round(ledWallCoverage.width * 100) / 100,
          height: Math.round(ledWallCoverage.height * 100) / 100,
          recommendation:
            ledWallCoverage.width > 10
              ? "Consider curved wall"
              : "Flat wall suitable",
        }
      : null,
  };
}

export function getIllusionList() {
  return {
    illusions: illusionLibrary.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      description: i.description,
    })),
    totalIllusions: illusionLibrary.length,
    categories: [
      "forced-perspective",
      "matte-painting",
      "miniature",
      "projection",
      "practical-effect",
    ],
  };
}

export function calculateOpticalIllusion(data: {
  illusionType: OpticalIllusion["type"];
  parameters: {
    subjectSize?: { width: number; height: number };
    desiredApparentSize?: { width: number; height: number };
    cameraDistance?: number;
    focalLength?: number;
    miniatureScale?: number;
  };
}) {
  let calculation: Record<string, unknown> = {};

  switch (data.illusionType) {
    case "forced-perspective":
      if (
        data.parameters.subjectSize &&
        data.parameters.desiredApparentSize &&
        data.parameters.cameraDistance
      ) {
        const scaleRatio =
          data.parameters.desiredApparentSize.height /
          data.parameters.subjectSize.height;
        const subjectDistance = data.parameters.cameraDistance / scaleRatio;

        calculation = {
          type: "forced-perspective",
          originalSize: data.parameters.subjectSize,
          apparentSize: data.parameters.desiredApparentSize,
          subjectPlacement: {
            distanceFromCamera: Math.round(subjectDistance * 100) / 100,
            scaleEffect: `${Math.round(scaleRatio * 100) / 100}x`,
          },
          requirements: {
            depthOfField: "Maximum (f/11-f/22)",
            focalLength: "Wide angle (24-35mm)",
            focusPoint: "Hyperfocal distance",
          },
          tips: [
            "Match lighting on both subjects",
            "Keep both subjects in focus plane",
            "Avoid revealing shadows",
          ],
        };
      }
      break;

    case "miniature":
      if (data.parameters.miniatureScale) {
        const scale = data.parameters.miniatureScale;
        const frameRateMultiplier = Math.sqrt(1 / scale);
        const recommendedFps = Math.round(24 * frameRateMultiplier);

        calculation = {
          type: "miniature",
          scale: `1:${Math.round(1 / scale)}`,
          filming: {
            recommendedFrameRate: recommendedFps,
            playbackRate: 24,
            slowdownFactor: Math.round((recommendedFps / 24) * 10) / 10,
          },
          physics: {
            waterDropScale: Math.round(scale * 100) / 100,
            fireScale: Math.round(Math.pow(scale, 0.5) * 100) / 100,
            smokeScale: Math.round(Math.pow(scale, 0.75) * 100) / 100,
          },
          tips: [
            "Use high-speed camera for realistic physics",
            "Scale lighting to match miniature proportions",
            "Consider wind and atmosphere scaling",
          ],
        };
      }
      break;

    case "matte-painting":
      calculation = {
        type: "matte-painting",
        workflow: [
          "Capture clean plate with tracking markers",
          "Create 3D camera match",
          "Paint 2.5D environment layers",
          "Project onto geometry",
          "Composite with live action",
        ],
        requirements: {
          minimumTrackingMarkers: 8,
          recommendedResolution: "4K or higher",
          colorManagement: "ACES recommended",
        },
        tips: [
          "Match lighting direction and color",
          "Add atmospheric perspective for depth",
          "Include subtle movement for realism",
        ],
      };
      break;

    default: {
      const illusion = illusionLibrary.find(
        (i) => i.type === data.illusionType
      );
      if (illusion) {
        calculation = {
          ...illusion.setup,
          cameraRequirements: illusion.cameraRequirements,
        };
      }
    }
  }

  return {
    illusionType: data.illusionType,
    calculation,
    relatedIllusions: illusionLibrary
      .filter((i) => i.type !== data.illusionType)
      .slice(0, 3)
      .map((i) => ({ id: i.id, name: i.name, type: i.type })),
  };
}

export function createProduction(data: {
  name: string;
  description: string;
}): VirtualProduction {
  const production: VirtualProduction = {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    scenes: [],
    cameras: [],
    ledWalls: [],
    trackingData: [],
    visualEffects: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  productions.set(production.id, production);

  return production;
}

export function updateProductionTimestamp(productionId: string): void {
  const production = productions.get(productionId);
  if (production) {
    production.updatedAt = new Date();
  }
}

export function getProductionList() {
  return Array.from(productions.values()).map((p) => ({
    id: p.id,
    name: p.name,
    scenes: p.scenes.length,
    cameras: p.cameras.length,
    ledWalls: p.ledWalls.length,
    vfx: p.visualEffects.length,
    updatedAt: p.updatedAt,
  }));
}
