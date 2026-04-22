import { runConfiguredAgent } from "./runner";

export const runStuntsAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("stunts", sceneContent, apiKey);
