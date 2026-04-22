import { runConfiguredAgent } from "./runner";

export const runCostumeAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("costumes", sceneContent, apiKey);
