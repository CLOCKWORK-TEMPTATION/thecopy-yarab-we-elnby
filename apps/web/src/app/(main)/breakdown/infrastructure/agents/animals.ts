import { runConfiguredAgent } from "./runner";

export const runAnimalsAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("animals", sceneContent, apiKey);
