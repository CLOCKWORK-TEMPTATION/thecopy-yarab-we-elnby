import { runConfiguredAgent } from "./runner";

export const runVehiclesAgent = (sceneContent: string, apiKey?: string) =>
  runConfiguredAgent("vehicles", sceneContent, apiKey);
