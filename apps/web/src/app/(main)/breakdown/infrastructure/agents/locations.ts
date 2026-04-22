import { runConfiguredAgent } from "./runner";

export const runLocationsAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("locations", sceneContent, apiKey);
