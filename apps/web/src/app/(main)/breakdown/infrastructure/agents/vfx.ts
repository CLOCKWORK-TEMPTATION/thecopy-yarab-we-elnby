import { runConfiguredAgent } from "./runner";

export const runVfxAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("vfx", sceneContent, apiKey);
