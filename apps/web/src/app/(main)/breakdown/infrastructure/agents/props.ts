import { runConfiguredAgent } from "./runner";

export const runPropsAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("props", sceneContent, apiKey);
