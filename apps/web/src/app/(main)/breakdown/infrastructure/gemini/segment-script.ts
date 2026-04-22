import type { ScriptSegmentResponse } from "../../domain/models";
import { bootstrapBreakdownProject } from "../platform-client";
import { segmentScriptLocally } from "../screenplay/local-segmenter";

export const segmentScript = async (
  scriptText: string
): Promise<ScriptSegmentResponse> => {
  try {
    const result = await bootstrapBreakdownProject(scriptText);
    if (result.parsed.scenes.length > 0) {
      return result.parsed;
    }

    return segmentScriptLocally(scriptText);
  } catch {
    return segmentScriptLocally(scriptText);
  }
};
