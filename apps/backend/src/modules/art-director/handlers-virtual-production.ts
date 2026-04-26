import { randomUUID } from "node:crypto";

import {
  success,
  failure,
  asString,
  asNumber,
  asBoolean,
  isRecord,
  uniqueById,
  extractNestedRecord,
} from "./handlers-shared";
import { runPlugin } from "./plugin-executor";
import { CinemaSkillsTrainer } from "./plugins/cinema-skills-trainer";
import { ImmersiveConceptArt } from "./plugins/immersive-concept-art";
import { MRPrevizStudio } from "./plugins/mr-previz-studio";
import { VirtualProductionEngine } from "./plugins/virtual-production-engine";
import { VirtualSetEditor } from "./plugins/virtual-set-editor";
import { updateStore, type RawEntity } from "./store";

import type { ArtDirectorHandlerResponse } from "./handlers-shared";

function filterEntitiesWithId(
  items: RawEntity[]
): (RawEntity & { id: string })[] {
  return items.filter(
    (item): item is RawEntity & { id: string } =>
      isRecord(item) && typeof item["id"] === "string"
  );
}

export async function handlePrevizCreateScene(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const name = asString(payload["name"]);
  const description = asString(payload["description"]);

  if (!name || !description) {
    return failure("اسم المشهد والوصف مطلوبان");
  }

  const result = await runPlugin(MRPrevizStudio, {
    type: "create-scene",
    data: {
      name,
      description,
      environment: asString(payload["environment"]) || "studio",
      dimensions: {
        width: Math.max(asNumber(payload["width"]), 1),
        height: Math.max(asNumber(payload["height"]), 1),
        depth: Math.max(asNumber(payload["depth"]), 1),
      },
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر إنشاء مشهد ما قبل التصوير");
  }

  const rawScene = extractNestedRecord(result, "scene");
  if (rawScene && typeof rawScene["id"] === "string") {
    const storedScene: RawEntity & { id: string } = {
      ...rawScene,
      id: rawScene["id"],
    };

    await updateStore((store) => {
      store.previzScenes = uniqueById<RawEntity & { id: string }>(
        filterEntitiesWithId(store.previzScenes),
        storedScene
      );
    });
  }

  return success({ data: result.data ?? {} });
}

export async function handleVirtualSetCreate(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const name = asString(payload["name"]);
  const description = asString(payload["description"]);

  if (!name || !description) {
    return failure("اسم الديكور والوصف مطلوبان");
  }

  const result = await runPlugin(VirtualSetEditor, {
    type: "create-set",
    data: {
      name,
      description,
      realTimeRendering: asBoolean(payload["realTimeRendering"], true),
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر إنشاء الديكور الافتراضي");
  }

  const rawSet = extractNestedRecord(result, "set");
  if (rawSet && typeof rawSet["id"] === "string") {
    const storedSet: RawEntity & { id: string } = {
      ...rawSet,
      id: rawSet["id"],
    };

    await updateStore((store) => {
      store.virtualSets = uniqueById<RawEntity & { id: string }>(
        filterEntitiesWithId(store.virtualSets),
        storedSet
      );
    });
  }

  return success({ data: result.data ?? {} });
}

export async function handleTrainingScenarios(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const category = asString(payload["category"]);
  const difficulty = asString(payload["difficulty"]);

  const result = await runPlugin(CinemaSkillsTrainer, {
    type: "list-scenarios",
    data: {
      category: category && category !== "all" ? category : undefined,
      difficulty:
        difficulty && difficulty !== "all" ? difficulty : undefined,
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر جلب سيناريوهات التدريب");
  }

  return success({ data: result.data ?? {} });
}

export async function handleConceptArtCreate(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const name = asString(payload["name"]);
  const description = asString(payload["description"]);
  const style = asString(payload["style"]) || "realistic";

  if (!name || !description) {
    return failure("اسم المشروع والوصف مطلوبان");
  }

  const result = await runPlugin(ImmersiveConceptArt, {
    type: "create-project",
    data: { name, description, style },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر إنشاء مشروع الفن المفاهيمي");
  }

  const rawProject = extractNestedRecord(result, "project");
  if (rawProject && typeof rawProject["id"] === "string") {
    const storedProject: RawEntity & { id: string } = {
      ...rawProject,
      id: rawProject["id"],
      targetPlatform: asString(payload["targetPlatform"]) || "desktop",
    };

    await updateStore((store) => {
      store.conceptProjects = uniqueById<RawEntity & { id: string }>(
        filterEntitiesWithId(store.conceptProjects),
        storedProject
      );
    });
  }

  return success({ data: result.data ?? {} });
}

async function runLedWallSetup(
  productionId: string,
  name: string,
  payload: Record<string, unknown>
) {
  return runPlugin(VirtualProductionEngine, {
    type: "setup-led-wall",
    data: {
      productionId,
      name: `${name} LED Wall`,
      dimensions: {
        width: Math.max(asNumber(payload["ledWallWidth"]), 1),
        height: Math.max(asNumber(payload["ledWallHeight"]), 1),
      },
      pixelPitch: 2.6,
    },
  });
}

async function runCameraConfig(
  productionId: string,
  name: string,
  payload: Record<string, unknown>
) {
  const isBroadcast =
    asString(payload["cameraType"]).toLowerCase() === "broadcast";
  return runPlugin(VirtualProductionEngine, {
    type: "configure-camera",
    data: {
      productionId,
      name: `${name} Camera`,
      type: "cinema",
      lens: { focalLength: isBroadcast ? 24 : 35 },
      trackingSystem: "inside-out",
    },
  });
}

export async function handleVirtualProductionCreate(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const name = asString(payload["name"]);
  const description = asString(payload["description"]);

  if (!name || !description) {
    return failure("اسم الإنتاج والوصف مطلوبان");
  }

  const createResult = await runPlugin(VirtualProductionEngine, {
    type: "create-production",
    data: { name, description },
  });

  if (!createResult.success) {
    return failure(createResult.error ?? "تعذر إنشاء الإنتاج الافتراضي");
  }

  const production = extractNestedRecord(createResult, "production");
  if (!production) {
    return failure("تعذر قراءة بيانات الإنتاج الافتراضي", 500);
  }

  const productionId = asString(production["id"]);
  const ledResult = await runLedWallSetup(productionId, name, payload);
  const cameraResult = await runCameraConfig(productionId, name, payload);

  const storedProduction: RawEntity & { id: string } = {
    ...production,
    id: productionId || randomUUID(),
    requestedSetup: { ledWallWidth: asNumber(payload["ledWallWidth"]), ledWallHeight: asNumber(payload["ledWallHeight"]), cameraType: asString(payload["cameraType"]) },
  };
  await updateStore((s) => {
    s.virtualProductions = uniqueById<RawEntity & { id: string }>(filterEntitiesWithId(s.virtualProductions), storedProduction);
  });

  return success({
    data: { production: createResult.data, ledWall: ledResult.success ? ledResult.data : undefined, camera: cameraResult.success ? cameraResult.data : undefined },
  });
}
