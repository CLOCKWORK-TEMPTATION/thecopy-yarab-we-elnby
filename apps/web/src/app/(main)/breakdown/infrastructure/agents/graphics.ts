import { runConfiguredAgent } from "./runner";

export const runGraphicsAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("graphics", sceneContent, apiKey);
