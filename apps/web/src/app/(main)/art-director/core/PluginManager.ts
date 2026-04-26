// CineArchitect AI - Plugin Manager
// مدير الإضافات

import { Plugin, PluginInput, PluginOutput, PluginCategory } from "../types";

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private initialized = false;

  async registerPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID "${plugin.id}" is already registered`);
    }

    this.plugins.set(plugin.id, plugin);
    console.log(
      `[PluginManager] Registered plugin: ${plugin.name} (${plugin.nameAr})`
    );
  }

  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID "${pluginId}" not found`);
    }

    await plugin.shutdown();
    this.plugins.delete(pluginId);
    console.log(`[PluginManager] Unregistered plugin: ${plugin.name}`);
  }

  async initializeAll(): Promise<void> {
    console.log("[PluginManager] Initializing all plugins in parallel...");

    const initializationPromises = Array.from(this.plugins.values()).map(
      async (plugin) => {
        try {
          await plugin.initialize();
          console.log(`[PluginManager] Initialized: ${plugin.name}`);
        } catch (error) {
          console.error(
            `[PluginManager] Failed to initialize ${plugin.name}:`,
            error
          );
        }
      }
    );

    await Promise.all(initializationPromises);

    this.initialized = true;
    console.log(
      `[PluginManager] All plugins initialization attempted (${this.plugins.size} total)`
    );
  }

  async shutdownAll(): Promise<void> {
    console.log("[PluginManager] Shutting down all plugins in parallel...");

    const shutdownPromises = Array.from(this.plugins.values()).map(
      async (plugin) => {
        try {
          await plugin.shutdown();
          console.log(`[PluginManager] Shut down: ${plugin.name}`);
        } catch (error) {
          console.error(
            `[PluginManager] Failed to shut down ${plugin.name}:`,
            error
          );
        }
      }
    );

    await Promise.all(shutdownPromises);

    this.initialized = false;
    console.log(
      `[PluginManager] All plugins shutdown attempted (${this.plugins.size} total)`
    );
  }

  async executePlugin(
    pluginId: string,
    input: PluginInput
  ): Promise<PluginOutput> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return {
        success: false,
        error: `Plugin with ID "${pluginId}" not found`,
      };
    }

    try {
      return await plugin.execute(input);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByCategory(category: PluginCategory): Plugin[] {
    return this.getAllPlugins().filter((p) => p.category === category);
  }

  getPluginInfo(): {
    id: string;
    name: string;
    nameAr: string;
    version: string;
    category: PluginCategory;
  }[] {
    return this.getAllPlugins().map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      version: p.version,
      category: p.category,
    }));
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const pluginManager = new PluginManager();
