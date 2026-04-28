import { parseScreenplay } from "./parser";

import type { BreakdownReport, ParsedScene } from "./types";
import type { projects, scenes } from "@/db/schema";

export function findParsedScene(params: {
  sceneId: string;
  sceneRecord: typeof scenes.$inferSelect;
  project: typeof projects.$inferSelect;
  currentReport: BreakdownReport | null;
}): ParsedScene {
  const { sceneId, sceneRecord, project, currentReport } = params;
  const parsed = parseScreenplay(project.scriptContent ?? "", project.title);
  const matched =
    parsed.scenes.find(
      (scene) => scene.headerData.sceneNumber === sceneRecord.sceneNumber,
    ) ?? null;

  if (matched) {
    return matched;
  }

  if (currentReport) {
    const reportScene = currentReport.scenes.find(
      (scene) => scene.sceneId === sceneId,
    );
    if (reportScene) {
      return {
        header: reportScene.header,
        content: reportScene.content,
        headerData: reportScene.headerData,
        warnings: [],
      };
    }
  }

  throw new Error("تعذر إعادة بناء محتوى المشهد من المشروع");
}
