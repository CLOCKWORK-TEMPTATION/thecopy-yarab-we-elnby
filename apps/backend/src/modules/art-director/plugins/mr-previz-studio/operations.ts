import { v4 as uuidv4 } from "uuid";

import { definedProps } from "@/utils/defined-props";

import { PluginOutput } from "../../types";
import { scenes, supportedDevices } from "./store";
import type {
  AddObjectInput,
  CameraMovement,
  ConfigureLightingInput,
  CreateSceneInput,
  ExportSceneInput,
  GenerateArPreviewInput,
  GenerateVrWalkthroughInput,
  SetupCameraInput,
  SimulateCameraMovementInput,
  Vector3D,
  VirtualCamera,
  XRLighting,
  XRObject,
  XRScene,
} from "./types";

function sceneNotFound(): PluginOutput {
  return { success: false, error: "Scene not found" };
}

function cameraNotFound(): PluginOutput {
  return { success: false, error: "Camera not found" };
}

function getDistance(a: Vector3D, b: Vector3D): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
  );
}

function analyzeComposition(
  camera: VirtualCamera,
  scene: XRScene
): Record<string, unknown> {
  const objectsInFrame = scene.objects.filter((obj) => {
    const distance = Math.sqrt(
      Math.pow(obj.position.x - camera.position.x, 2) +
        Math.pow(obj.position.y - camera.position.y, 2) +
        Math.pow(obj.position.z - camera.position.z, 2)
    );
    return distance < 20;
  });

  return {
    ruleOfThirds: {
      applied: objectsInFrame.length > 0,
      suggestions:
        objectsInFrame.length === 0
          ? ["Add subjects to the scene"]
          : ["Consider positioning key elements at intersection points"],
    },
    depthLayers: {
      foreground: objectsInFrame.filter(
        (o) => getDistance(o.position, camera.position) < 3
      ).length,
      midground: objectsInFrame.filter((o) => {
        const d = getDistance(o.position, camera.position);
        return d >= 3 && d < 8;
      }).length,
      background: objectsInFrame.filter(
        (o) => getDistance(o.position, camera.position) >= 8
      ).length,
    },
    estimatedFps: 60,
    qualityLevel: "high",
  };
}

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case "ease-in":
      return t * t;
    case "ease-out":
      return t * (2 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t;
  }
}

function generateKeyframes(movement: CameraMovement): unknown[] {
  const frames = Math.round(movement.duration * 24);
  const keyframes = [];

  for (let i = 0; i <= frames; i += Math.max(1, Math.floor(frames / 10))) {
    const t = i / frames;
    const easedT = applyEasing(t, movement.easing);

    keyframes.push({
      frame: i,
      time: i / 24,
      position: {
        x:
          movement.startPosition.x +
          (movement.endPosition.x - movement.startPosition.x) * easedT,
        y:
          movement.startPosition.y +
          (movement.endPosition.y - movement.startPosition.y) * easedT,
        z:
          movement.startPosition.z +
          (movement.endPosition.z - movement.startPosition.z) * easedT,
      },
    });
  }

  return keyframes;
}

export async function createScene(data: CreateSceneInput): Promise<PluginOutput> {
  const scene: XRScene = {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    environment: data.environment,
    dimensions: data.dimensions,
    objects: [],
    cameras: [
      {
        id: uuidv4(),
        name: "Main Camera",
        type: "main",
        position: { x: 0, y: 1.7, z: 5 },
        target: { x: 0, y: 1, z: 0 },
        fov: 50,
        lensLength: 35,
        aspectRatio: "16:9",
      },
    ],
    lighting: {
      ambient: { color: "#ffffff", intensity: 0.3 },
      directional: [
        {
          id: uuidv4(),
          color: "#fff5e6",
          intensity: 1.0,
          position: { x: 10, y: 10, z: 5 },
          target: { x: 0, y: 0, z: 0 },
        },
      ],
      pointLights: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  scenes.set(scene.id, scene);

  return {
    success: true,
    data: {
      scene: scene as unknown as Record<string, unknown>,
      message: "XR scene created successfully",
      messageAr: "تم إنشاء مشهد الواقع الممتد بنجاح",
      capabilities: {
        vrSupported: true,
        arSupported: true,
        mrSupported: true,
        realTimeRendering: true,
        cameraSimulation: true,
      },
    },
  };
}

export async function addObject(data: AddObjectInput): Promise<PluginOutput> {
  const scene = scenes.get(data.sceneId);
  if (!scene) {
    return sceneNotFound();
  }

  const newObject: XRObject = {
    id: uuidv4(),
    name: data.object.name || "New Object",
    type: data.object.type || "prop",
    position: data.object.position || { x: 0, y: 0, z: 0 },
    rotation: data.object.rotation || { x: 0, y: 0, z: 0 },
    scale: data.object.scale || { x: 1, y: 1, z: 1 },
    isInteractive: data.object.isInteractive ?? false,
    ...definedProps({
      model3D: data.object.model3D,
      material: data.object.material,
    }),
  };

  scene.objects.push(newObject);
  scene.updatedAt = new Date();

  return {
    success: true,
    data: {
      object: newObject as unknown as Record<string, unknown>,
      sceneObjectCount: scene.objects.length,
      message: "Object added to XR scene",
      messageAr: "تم إضافة العنصر إلى مشهد الواقع الممتد",
    },
  };
}

export async function setupCamera(data: SetupCameraInput): Promise<PluginOutput> {
  const scene = scenes.get(data.sceneId);
  if (!scene) {
    return sceneNotFound();
  }

  const newCamera: VirtualCamera = {
    id: uuidv4(),
    name: data.camera.name || "Camera",
    type: data.camera.type || "main",
    position: data.camera.position || { x: 0, y: 1.7, z: 5 },
    target: data.camera.target || { x: 0, y: 1, z: 0 },
    fov: data.camera.fov || 50,
    lensLength: data.camera.lensLength || 35,
    aspectRatio: data.camera.aspectRatio || "16:9",
    ...definedProps({
      movement: data.camera.movement,
    }),
  };

  scene.cameras.push(newCamera);
  scene.updatedAt = new Date();
  const composition = analyzeComposition(newCamera, scene);

  return {
    success: true,
    data: {
      camera: newCamera as unknown as Record<string, unknown>,
      composition,
      previewUrl: `/xr/preview/${scene.id}/${newCamera.id}`,
      message: "Virtual camera configured",
      messageAr: "تم تكوين الكاميرا الافتراضية",
    },
  };
}

export async function simulateCameraMovement(
  data: SimulateCameraMovementInput
): Promise<PluginOutput> {
  const scene = scenes.get(data.sceneId);
  if (!scene) {
    return sceneNotFound();
  }

  const camera = scene.cameras.find((c) => c.id === data.cameraId);
  if (!camera) {
    return cameraNotFound();
  }

  camera.movement = data.movement;
  scene.updatedAt = new Date();
  const keyframes = generateKeyframes(data.movement);

  return {
    success: true,
    data: {
      movement: data.movement as unknown as Record<string, unknown>,
      keyframes,
      duration: data.movement.duration,
      frameCount: Math.round(data.movement.duration * 24),
      estimatedRenderTime: Math.round(data.movement.duration * 24 * 0.5),
      previewUrl: `/xr/animation/${scene.id}/${camera.id}`,
      message: "Camera movement simulated",
      messageAr: "تم محاكاة حركة الكاميرا",
    },
  };
}

export async function configureLighting(
  data: ConfigureLightingInput
): Promise<PluginOutput> {
  const scene = scenes.get(data.sceneId);
  if (!scene) {
    return sceneNotFound();
  }

  if (data.lighting.ambient) {
    scene.lighting.ambient = data.lighting.ambient;
  }
  if (data.lighting.directional) {
    scene.lighting.directional = data.lighting.directional;
  }
  if (data.lighting.pointLights) {
    scene.lighting.pointLights = data.lighting.pointLights;
  }
  if (data.lighting.hdriEnvironment) {
    scene.lighting.hdriEnvironment = data.lighting.hdriEnvironment;
  }

  scene.updatedAt = new Date();

  return {
    success: true,
    data: {
      lighting: scene.lighting as unknown as Record<string, unknown>,
      renderPreview: `/xr/lighting-preview/${scene.id}`,
      message: "XR lighting configured",
      messageAr: "تم تكوين إضاءة الواقع الممتد",
    },
  };
}

export async function exportScene(data: ExportSceneInput): Promise<PluginOutput> {
  const scene = scenes.get(data.sceneId);
  if (!scene) {
    return sceneNotFound();
  }

  const exportFormats: Record<string, { extension: string; description: string }> = {
    gltf: {
      extension: ".gltf",
      description: "GL Transmission Format - WebXR compatible",
    },
    usdz: {
      extension: ".usdz",
      description: "Universal Scene Description - iOS AR",
    },
    fbx: { extension: ".fbx", description: "Autodesk FBX - Game engines" },
    obj: { extension: ".obj", description: "Wavefront OBJ - Universal 3D" },
  };

  return {
    success: true,
    data: {
      sceneId: scene.id,
      sceneName: scene.name,
      format: data.format,
      formatInfo: exportFormats[data.format],
      target: data.target,
      exportUrl: `/xr/export/${scene.id}/${data.format}`,
      fileSize: "~" + Math.round(scene.objects.length * 2.5 + 5) + " MB",
      includes: {
        objects: scene.objects.length,
        cameras: scene.cameras.length,
        lights:
          scene.lighting.directional.length + scene.lighting.pointLights.length,
        animations: scene.cameras.filter((c) => c.movement).length,
      },
      message: `Scene exported as ${data.format.toUpperCase()}`,
      messageAr: `تم تصدير المشهد بتنسيق ${data.format.toUpperCase()}`,
    },
  };
}

export async function getSupportedDevices(): Promise<PluginOutput> {
  return {
    success: true,
    data: {
      devices: supportedDevices as unknown as Record<string, unknown>[],
      message: "Supported XR devices retrieved",
      messageAr: "تم استرجاع أجهزة الواقع الممتد المدعومة",
    },
  };
}

export async function generateARPreview(
  data: GenerateArPreviewInput
): Promise<PluginOutput> {
  const scene = scenes.get(data.sceneId);
  if (!scene) {
    return sceneNotFound();
  }

  return {
    success: true,
    data: {
      sceneId: scene.id,
      arPreviewUrl: `/ar/preview/${scene.id}`,
      qrCode:
        "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23000' width='100' height='100'/></svg>",
      targetDevice: data.targetDevice,
      instructions: {
        en: "Scan the QR code with your AR-enabled device to view the scene in augmented reality",
        ar: "امسح رمز QR بجهازك المزود بتقنية AR لعرض المشهد بالواقع المعزز",
      },
      features: [
        "real-world-placement",
        "scale-adjustment",
        "light-estimation",
        "occlusion",
      ],
      message: "AR preview generated",
      messageAr: "تم توليد معاينة الواقع المعزز",
    },
  };
}

export async function generateVRWalkthrough(
  data: GenerateVrWalkthroughInput
): Promise<PluginOutput> {
  const scene = scenes.get(data.sceneId);
  if (!scene) {
    return sceneNotFound();
  }

  const waypoints = data.waypoints || [
    { x: 0, y: 1.7, z: 5 },
    { x: 3, y: 1.7, z: 3 },
    { x: 0, y: 1.7, z: 0 },
    { x: -3, y: 1.7, z: 3 },
  ];

  return {
    success: true,
    data: {
      sceneId: scene.id,
      vrWalkthroughUrl: `/vr/walkthrough/${scene.id}`,
      waypoints,
      duration: waypoints.length * 5,
      interactionPoints: scene.objects
        .filter((o) => o.isInteractive)
        .map((o) => ({
          objectId: o.id,
          name: o.name,
          position: o.position,
        })),
      features: [
        "teleportation",
        "free-movement",
        "object-inspection",
        "annotations",
      ],
      message: "VR walkthrough generated",
      messageAr: "تم توليد جولة الواقع الافتراضي",
    },
  };
}

export async function listScenes(): Promise<PluginOutput> {
  const sceneList = Array.from(scenes.values()).map((s) => ({
    id: s.id,
    name: s.name,
    environment: s.environment,
    objectCount: s.objects.length,
    cameraCount: s.cameras.length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  return {
    success: true,
    data: {
      scenes: sceneList,
      totalScenes: sceneList.length,
      message: "XR scenes retrieved",
      messageAr: "تم استرجاع مشاهد الواقع الممتد",
    },
  };
}

export function clearScenes(): void {
  scenes.clear();
}
