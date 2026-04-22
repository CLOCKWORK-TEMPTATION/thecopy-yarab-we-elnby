import type { Plugin, PluginInput, PluginOutput } from "./types";

type PluginConstructor<T extends Plugin> = new () => T;

export async function runPlugin<T extends Plugin>(
  PluginClass: PluginConstructor<T>,
  input: PluginInput
): Promise<PluginOutput> {
  const plugin = new PluginClass();
  await plugin.initialize();

  try {
    return await plugin.execute(input);
  } finally {
    await plugin.shutdown().catch(() => undefined);
  }
}
