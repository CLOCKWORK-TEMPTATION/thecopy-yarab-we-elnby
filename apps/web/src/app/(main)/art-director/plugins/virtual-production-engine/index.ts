// CineArchitect AI - Virtual Production Engine & Pre-visualization
// محرك الإنتاج الافتراضي والتصور المسبق

import { v4 as uuidv4 } from "uuid";

import { definedProps } from "@/lib/defined-props";
import { logger } from "@/lib/logger";

import { Plugin, PluginInput, PluginOutput } from "../../types";

interface VirtualProduction {
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

interface VPScene {
  id: string;
  name: string;
  environment: string;
  hdriBackground: string;
  ledContent: string;
  realTimeRendering: boolean;
  frustumCulling: boolean;
  parallaxCorrection: boolean;
}

interface VPCamera {
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

interface LensInfo {
  focalLength: number;
  aperture: number;
  sensorSize: { width: number; height: number };
  distortionModel?: string;
  calibrated: boolean;
}

interface FrustumInfo {
  nearPlane: number;
  farPlane: number;
  fov: number;
  aspectRatio: number;
}

interface LEDWall {
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

interface TrackingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  cameraId: string;
  fps: number;
  latency: number;
  accuracy: number;
  dataPoints: number;
}

interface VisualEffect {
  id: string;
  name: string;
  type:
    | "particle"
    | "fluid"
    | "destruction"
    | "weather"
    | "creature"
    | "environment";
  realTime: boolean;
  gpuAccelerated: boolean;
  parameters: Record<string, unknown>;
}

interface OpticalIllusion {
  id: string;
  name: string;
  type:
    | "forced-perspective"
    | "matte-painting"
    | "miniature"
    | "projection"
    | "practical-effect";
  description: string;
  setup: IllusionSetup;
  cameraRequirements: CameraRequirement[];
}

interface IllusionSetup {
  scaleRatio?: number;
  distanceFromCamera?: number;
  lightingMatch: boolean;
  focusPlane?: number;
  specialEquipment: string[];
}

interface CameraRequirement {
  parameter: string;
  value: string;
  critical: boolean;
}

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

const productions = new Map<string, VirtualProduction>();

const illusionLibrary: OpticalIllusion[] = [
  {
    id: "fp-001",
    name: "Forced Perspective - Giant",
    type: "forced-perspective",
    description: "Make subject appear larger by positioning closer to camera",
    setup: {
      scaleRatio: 2.5,
      distanceFromCamera: 1.5,
      lightingMatch: true,
      focusPlane: 2.5,
      specialEquipment: ["Wide-angle lens", "Deep focus setup"],
    },
    cameraRequirements: [
      { parameter: "aperture", value: "f/11-f/16", critical: true },
      { parameter: "focal-length", value: "24-35mm", critical: true },
      { parameter: "focus", value: "hyperfocal", critical: false },
    ],
  },
  {
    id: "mp-001",
    name: "Digital Matte Painting Integration",
    type: "matte-painting",
    description: "Seamlessly blend live action with digital backgrounds",
    setup: {
      lightingMatch: true,
      specialEquipment: [
        "Green screen",
        "Motion control rig",
        "Reference markers",
      ],
    },
    cameraRequirements: [
      {
        parameter: "tracking-markers",
        value: "minimum 8 visible",
        critical: true,
      },
      {
        parameter: "exposure",
        value: "match painted elements",
        critical: true,
      },
    ],
  },
  {
    id: "min-001",
    name: "Miniature Set Extension",
    type: "miniature",
    description: "Use scaled models to extend practical sets",
    setup: {
      scaleRatio: 0.125,
      distanceFromCamera: 0.5,
      lightingMatch: true,
      specialEquipment: ["High-speed camera", "Micro-lighting", "Scale models"],
    },
    cameraRequirements: [
      {
        parameter: "frame-rate",
        value: "96-120fps for 1:8 scale",
        critical: true,
      },
      {
        parameter: "depth-of-field",
        value: "scaled proportionally",
        critical: true,
      },
    ],
  },
];

export class VirtualProductionEngine implements Plugin {
  id = "virtual-production-engine";
  name = "Virtual Production Engine & Pre-visualization";
  nameAr = "محرك الإنتاج الافتراضي والتصور المسبق";
  version = "1.0.0";
  description =
    "Interactive visual tool with virtual camera and optical illusion calculator";
  descriptionAr = "أداة بصرية تفاعلية مع كاميرا افتراضية وحاسبة الخداع البصري";
  category = "xr-immersive" as const;

  initialize(): void {
    logger.info(
      `[${this.name}] Initialized with LED wall and camera tracking support`
    );
  }

  execute(input: PluginInput): PluginOutput {
    const data = input.data as unknown;
    switch (input.type) {
      case "create-production":
        return this.createProduction(
          data as Parameters<VirtualProductionEngine["createProduction"]>[0]
        );
      case "setup-led-wall":
        return this.setupLEDWall(
          data as Parameters<VirtualProductionEngine["setupLEDWall"]>[0]
        );
      case "configure-camera":
        return this.configureCamera(
          data as Parameters<VirtualProductionEngine["configureCamera"]>[0]
        );
      case "start-tracking":
        return this.startTracking(
          data as Parameters<VirtualProductionEngine["startTracking"]>[0]
        );
      case "calculate-frustum":
        return this.calculateFrustum(
          data as Parameters<VirtualProductionEngine["calculateFrustum"]>[0]
        );
      case "setup-scene":
        return this.setupScene(
          data as Parameters<VirtualProductionEngine["setupScene"]>[0]
        );
      case "calculate-illusion":
        return this.calculateOpticalIllusion(
          data as Parameters<
            VirtualProductionEngine["calculateOpticalIllusion"]
          >[0]
        );
      case "list-illusions":
        return this.listIllusions();
      case "add-vfx":
        return this.addVisualEffect(
          data as Parameters<VirtualProductionEngine["addVisualEffect"]>[0]
        );
      case "calibrate-system":
        return this.calibrateSystem(
          data as Parameters<VirtualProductionEngine["calibrateSystem"]>[0]
        );
      case "real-time-composite":
        return this.realTimeComposite(
          data as Parameters<VirtualProductionEngine["realTimeComposite"]>[0]
        );
      case "export-previz":
        return this.exportPreviz(
          data as Parameters<VirtualProductionEngine["exportPreviz"]>[0]
        );
      case "list-productions":
        return this.listProductions();
      default:
        return { success: false, error: `Unknown operation: ${input.type}` };
    }
  }

  private createProduction(data: {
    name: string;
    description: string;
  }): PluginOutput {
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

    return {
      success: true,
      data: {
        production: {
          id: production.id,
          name: production.name,
          createdAt: production.createdAt,
        },
        studioUrl: `/vp/studio/${production.id}`,
        capabilities: {
          ledWallSupport: true,
          realTimeRendering: true,
          cameraTracking: true,
          frustumCulling: true,
          opticalIllusions: true,
        },
        message: "Virtual production created",
        messageAr: "تم إنشاء الإنتاج الافتراضي",
      },
    };
  }

  private setupLEDWall(data: {
    productionId: string;
    name: string;
    dimensions: { width: number; height: number };
    pixelPitch: number;
    curvature?: number;
    colorSpace?: "rec709" | "rec2020" | "dci-p3";
  }): PluginOutput {
    const production = productions.get(data.productionId);
    if (!production) {
      return { success: false, error: "Production not found" };
    }

    const resolutionWidth = Math.round(
      (data.dimensions.width * 1000) / data.pixelPitch
    );
    const resolutionHeight = Math.round(
      (data.dimensions.height * 1000) / data.pixelPitch
    );
    const panelCount = Math.ceil(
      (data.dimensions.width * data.dimensions.height) / 0.25
    );

    const ledWall: LEDWall = {
      id: uuidv4(),
      name: data.name,
      dimensions: data.dimensions,
      pixelPitch: data.pixelPitch,
      resolution: { width: resolutionWidth, height: resolutionHeight },
      curvature: data.curvature ?? 0,
      panels: panelCount,
      brightness: 1500,
      colorSpace: data.colorSpace ?? "rec709",
    };

    production.ledWalls.push(ledWall);
    production.updatedAt = new Date();

    return {
      success: true,
      data: {
        ledWall: ledWall as unknown as Record<string, unknown>,
        specifications: {
          totalPixels: resolutionWidth * resolutionHeight,
          totalPanels: panelCount,
          recommendedDistance: data.pixelPitch * 1.5,
          powerConsumption: `~${Math.round(panelCount * 150)}W`,
          dataRate: `${Math.round((resolutionWidth * resolutionHeight * 24 * 60) / 1000000)}Mbps`,
        },
        calibrationUrl: `/vp/calibrate/${production.id}/${ledWall.id}`,
        message: "LED wall configured",
        messageAr: "تم تكوين جدار LED",
      },
    };
  }

  private configureCamera(data: {
    productionId: string;
    name: string;
    type: VPCamera["type"];
    lens: Partial<LensInfo>;
    trackingSystem?: VPCamera["trackingSystem"];
  }): PluginOutput {
    const production = productions.get(data.productionId);
    if (!production) {
      return { success: false, error: "Production not found" };
    }

    const sensorSize = data.lens.sensorSize ?? { width: 36, height: 24 };
    const focalLength = data.lens.focalLength ?? 35;
    const fov =
      2 * Math.atan(sensorSize.width / (2 * focalLength)) * (180 / Math.PI);

    const camera: VPCamera = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      tracked: data.type !== "virtual" && !!data.trackingSystem,
      trackingSystem: data.trackingSystem ?? "inside-out",
      lens: {
        focalLength,
        aperture: data.lens.aperture ?? 2.8,
        sensorSize,
        calibrated: false,
        ...definedProps({
          distortionModel: data.lens.distortionModel,
        }),
      },
      position: { x: 0, y: 1.5, z: 5 },
      rotation: { x: 0, y: 0, z: 0 },
      frustum: {
        nearPlane: 0.1,
        farPlane: 1000,
        fov,
        aspectRatio: sensorSize.width / sensorSize.height,
      },
    };

    production.cameras.push(camera);
    production.updatedAt = new Date();

    return {
      success: true,
      data: {
        camera: camera as unknown as Record<string, unknown>,
        frustumVisualization: {
          fov: Math.round(fov * 10) / 10,
          coverageAtDistance: {
            "3m": {
              width: 2 * 3 * Math.tan(((fov / 2) * Math.PI) / 180),
              height:
                (2 * 3 * Math.tan(((fov / 2) * Math.PI) / 180)) /
                (sensorSize.width / sensorSize.height),
            },
            "5m": {
              width: 2 * 5 * Math.tan(((fov / 2) * Math.PI) / 180),
              height:
                (2 * 5 * Math.tan(((fov / 2) * Math.PI) / 180)) /
                (sensorSize.width / sensorSize.height),
            },
            "10m": {
              width: 2 * 10 * Math.tan(((fov / 2) * Math.PI) / 180),
              height:
                (2 * 10 * Math.tan(((fov / 2) * Math.PI) / 180)) /
                (sensorSize.width / sensorSize.height),
            },
          },
        },
        calibrationRequired: !camera.lens.calibrated,
        message: "Camera configured for virtual production",
        messageAr: "تم تكوين الكاميرا للإنتاج الافتراضي",
      },
    };
  }

  private startTracking(data: {
    productionId: string;
    cameraId: string;
    targetFps?: number;
  }): PluginOutput {
    const production = productions.get(data.productionId);
    if (!production) {
      return { success: false, error: "Production not found" };
    }

    const camera = production.cameras.find((c) => c.id === data.cameraId);
    if (!camera) {
      return { success: false, error: "Camera not found" };
    }

    const session: TrackingSession = {
      id: uuidv4(),
      startTime: new Date(),
      cameraId: camera.id,
      fps: data.targetFps ?? 120,
      latency:
        camera.trackingSystem === "mocap"
          ? 8
          : camera.trackingSystem === "lidar"
            ? 15
            : 20,
      accuracy:
        camera.trackingSystem === "mocap"
          ? 0.5
          : camera.trackingSystem === "lidar"
            ? 1
            : 2,
      dataPoints: 0,
    };

    production.trackingData.push(session);
    production.updatedAt = new Date();

    return {
      success: true,
      data: {
        session: session as unknown as Record<string, unknown>,
        trackingInfo: {
          system: camera.trackingSystem,
          expectedLatency: `${session.latency}ms`,
          accuracy: `±${session.accuracy}mm`,
          fps: session.fps,
        },
        streamUrl: `/vp/tracking/${production.id}/${session.id}/stream`,
        monitorUrl: `/vp/tracking/${production.id}/${session.id}/monitor`,
        message: "Camera tracking started",
        messageAr: "بدأ تتبع الكاميرا",
      },
    };
  }

  private calculateFrustum(data: {
    focalLength: number;
    sensorWidth: number;
    sensorHeight: number;
    subjectDistance: number;
    ledWallDistance?: number;
  }): PluginOutput {
    const fovH =
      2 *
      Math.atan(data.sensorWidth / (2 * data.focalLength)) *
      (180 / Math.PI);
    const fovV =
      2 *
      Math.atan(data.sensorHeight / (2 * data.focalLength)) *
      (180 / Math.PI);

    const coverageWidth =
      2 * data.subjectDistance * Math.tan(((fovH / 2) * Math.PI) / 180);
    const coverageHeight =
      2 * data.subjectDistance * Math.tan(((fovV / 2) * Math.PI) / 180);

    let ledWallCoverage = null;
    if (data.ledWallDistance) {
      ledWallCoverage = {
        width:
          2 * data.ledWallDistance * Math.tan(((fovH / 2) * Math.PI) / 180),
        height:
          2 * data.ledWallDistance * Math.tan(((fovV / 2) * Math.PI) / 180),
      };
    }

    return {
      success: true,
      data: {
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
        message: "Frustum calculated",
        messageAr: "تم حساب مخروط الرؤية",
      },
    };
  }

  private setupScene(data: {
    productionId: string;
    name: string;
    environment: string;
    hdriBackground: string;
  }): PluginOutput {
    const production = productions.get(data.productionId);
    if (!production) {
      return { success: false, error: "Production not found" };
    }

    const scene: VPScene = {
      id: uuidv4(),
      name: data.name,
      environment: data.environment,
      hdriBackground: data.hdriBackground,
      ledContent: `/content/scenes/${data.environment}.exr`,
      realTimeRendering: true,
      frustumCulling: true,
      parallaxCorrection: true,
    };

    production.scenes.push(scene);
    production.updatedAt = new Date();

    return {
      success: true,
      data: {
        scene: scene as unknown as Record<string, unknown>,
        renderSettings: {
          engine: "Unreal Engine 5",
          raytracing: true,
          nDisplay: true,
          innerFrustum: "camera-linked",
        },
        previewUrl: `/vp/scene/${production.id}/${scene.id}`,
        message: "Virtual production scene configured",
        messageAr: "تم تكوين مشهد الإنتاج الافتراضي",
      },
    };
  }

  private calculateOpticalIllusion(data: {
    illusionType: OpticalIllusion["type"];
    parameters: {
      subjectSize?: { width: number; height: number };
      desiredApparentSize?: { width: number; height: number };
      cameraDistance?: number;
      focalLength?: number;
      miniatureScale?: number;
    };
  }): PluginOutput {
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
      success: true,
      data: {
        illusionType: data.illusionType,
        calculation,
        relatedIllusions: illusionLibrary
          .filter((i) => i.type !== data.illusionType)
          .slice(0, 3)
          .map((i) => ({ id: i.id, name: i.name, type: i.type })),
        message: "Optical illusion calculated",
        messageAr: "تم حساب الخداع البصري",
      },
    };
  }

  private listIllusions(): PluginOutput {
    return {
      success: true,
      data: {
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
        message: "Optical illusion library retrieved",
        messageAr: "تم استرجاع مكتبة الخداع البصري",
      },
    };
  }

  private addVisualEffect(data: {
    productionId: string;
    name: string;
    type: VisualEffect["type"];
    realTime: boolean;
    parameters?: Record<string, unknown>;
  }): PluginOutput {
    const production = productions.get(data.productionId);
    if (!production) {
      return { success: false, error: "Production not found" };
    }

    const effect: VisualEffect = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      realTime: data.realTime,
      gpuAccelerated: true,
      parameters: data.parameters ?? this.getDefaultVFXParameters(data.type),
    };

    production.visualEffects.push(effect);
    production.updatedAt = new Date();

    return {
      success: true,
      data: {
        effect: effect as unknown as Record<string, unknown>,
        performance: {
          realTimeCapable: effect.realTime,
          estimatedGpuUsage: effect.realTime ? "40-60%" : "80-100%",
          recommendedHardware: "RTX 4090 or better for real-time",
        },
        previewUrl: `/vp/vfx/${production.id}/${effect.id}`,
        message: "Visual effect added",
        messageAr: "تم إضافة التأثير البصري",
      },
    };
  }

  private getDefaultVFXParameters(
    type: VisualEffect["type"]
  ): Record<string, unknown> {
    const defaults: Record<string, Record<string, unknown>> = {
      particle: { count: 10000, lifetime: 5, size: 0.1, gravity: -9.8 },
      fluid: { resolution: 256, viscosity: 0.1, density: 1.0 },
      destruction: { pieces: 500, force: 100, debris: true },
      weather: { type: "rain", intensity: 0.5, wind: { x: 1, y: 0, z: 0 } },
      creature: { rig: "biped", muscles: true, skin: "subsurface" },
      environment: { type: "foliage", density: 100, wind: 0.3 },
    };

    return defaults[type] ?? {};
  }

  private calibrateSystem(data: {
    productionId: string;
    components: ("camera" | "led-wall" | "tracking")[];
  }): PluginOutput {
    const production = productions.get(data.productionId);
    if (!production) {
      return { success: false, error: "Production not found" };
    }

    const calibrationSteps: Record<
      "camera" | "led-wall" | "tracking",
      string[]
    > = {
      camera: [
        "Capture lens distortion chart",
        "Calculate distortion coefficients",
        "Store lens profile",
        "Verify with test pattern",
      ],
      "led-wall": [
        "Display color calibration pattern",
        "Measure color accuracy",
        "Adjust per-panel brightness",
        "Set color space mapping",
      ],
      tracking: [
        "Place calibration markers",
        "Capture reference positions",
        "Calculate transformation matrix",
        "Verify tracking accuracy",
      ],
    };

    const selectedSteps: Partial<
      Record<"camera" | "led-wall" | "tracking", string[]>
    > = {};
    data.components.forEach((c) => {
      selectedSteps[c] = calibrationSteps[c];
    });

    return {
      success: true,
      data: {
        calibrationPlan: selectedSteps,
        estimatedTime: `${data.components.length * 15} minutes`,
        calibrationUrl: `/vp/calibrate/${production.id}`,
        requirements: {
          camera: "Lens calibration chart",
          "led-wall": "Color meter, Pattern generator",
          tracking: "Reference markers",
        },
        message: "Calibration plan generated",
        messageAr: "تم توليد خطة المعايرة",
      },
    };
  }

  private realTimeComposite(data: {
    productionId: string;
    sceneId: string;
    cameraId: string;
    outputFormat: "4k" | "8k" | "hd";
  }): PluginOutput {
    const production = productions.get(data.productionId);
    if (!production) {
      return { success: false, error: "Production not found" };
    }

    const scene = production.scenes.find((s) => s.id === data.sceneId);
    const camera = production.cameras.find((c) => c.id === data.cameraId);

    if (!scene || !camera) {
      return { success: false, error: "Scene or camera not found" };
    }

    const resolutions = {
      hd: { width: 1920, height: 1080, bandwidth: "3Gbps" },
      "4k": { width: 3840, height: 2160, bandwidth: "12Gbps" },
      "8k": { width: 7680, height: 4320, bandwidth: "48Gbps" },
    };

    return {
      success: true,
      data: {
        compositing: {
          scene: scene.name,
          camera: camera.name,
          resolution: resolutions[data.outputFormat],
          latency: camera.tracked
            ? `${camera.trackingSystem === "mocap" ? "8" : "15"}ms`
            : "N/A",
          colorSpace: production.ledWalls[0]?.colorSpace ?? "rec709",
        },
        streamUrl: `/vp/composite/${production.id}/live`,
        recordUrl: `/vp/composite/${production.id}/record`,
        monitorUrl: `/vp/composite/${production.id}/monitor`,
        message: "Real-time composite started",
        messageAr: "بدأ الدمج في الوقت الفعلي",
      },
    };
  }

  private exportPreviz(data: {
    productionId: string;
    format: "mp4" | "prores" | "exr-sequence" | "usd";
    includeMetadata: boolean;
  }): PluginOutput {
    const production = productions.get(data.productionId);
    if (!production) {
      return { success: false, error: "Production not found" };
    }

    const formatInfo = {
      mp4: { codec: "H.264", container: "MP4", use: "Review and sharing" },
      prores: { codec: "ProRes 4444", container: "MOV", use: "Editorial" },
      "exr-sequence": {
        codec: "OpenEXR",
        container: "Image sequence",
        use: "VFX and grading",
      },
      usd: {
        codec: "USD/USDZ",
        container: "Scene description",
        use: "Pipeline integration",
      },
    };

    return {
      success: true,
      data: {
        export: {
          productionId: production.id,
          format: data.format,
          formatDetails: formatInfo[data.format],
          includesMetadata: data.includeMetadata,
        },
        contents: {
          scenes: production.scenes.length,
          cameras: production.cameras.length,
          vfx: production.visualEffects.length,
          trackingData: production.trackingData.length,
        },
        exportUrl: `/vp/export/${production.id}/${data.format}`,
        message: "Pre-visualization exported",
        messageAr: "تم تصدير التصور المسبق",
      },
    };
  }

  private listProductions(): PluginOutput {
    const productionList = Array.from(productions.values()).map((p) => ({
      id: p.id,
      name: p.name,
      scenes: p.scenes.length,
      cameras: p.cameras.length,
      ledWalls: p.ledWalls.length,
      vfx: p.visualEffects.length,
      updatedAt: p.updatedAt,
    }));

    return {
      success: true,
      data: {
        productions: productionList,
        totalProductions: productionList.length,
        message: "Virtual productions retrieved",
        messageAr: "تم استرجاع الإنتاجات الافتراضية",
      },
    };
  }

  shutdown(): void {
    productions.clear();
    logger.info(`[${this.name}] Shut down`);
  }
}

export const virtualProductionEngine = new VirtualProductionEngine();
