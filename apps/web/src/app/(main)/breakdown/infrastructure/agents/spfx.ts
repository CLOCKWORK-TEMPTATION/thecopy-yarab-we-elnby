import { runConfiguredAgent } from "./runner";

export const runSpfxAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("spfx", sceneContent, apiKey);
