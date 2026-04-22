import { runConfiguredAgent } from "./runner";

export const runMakeupHairAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("makeup", sceneContent, apiKey);
