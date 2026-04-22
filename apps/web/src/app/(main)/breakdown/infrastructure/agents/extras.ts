import { runConfiguredAgent } from "./runner";

export const runExtrasAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("extras", sceneContent, apiKey);
