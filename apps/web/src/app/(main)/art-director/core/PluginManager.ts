// CineArchitect AI - Plugin Manager
// مدير الإضافات

import { logger } from "@/lib/logger";

import { Plugin, PluginInput, PluginOutput, PluginCategory } from "../types";

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private initialized = false;

  async registerPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID "${plugin.id}" is already registered`);
    }

    this.plugins.set(plugin.id, plugin);
    logger.info(
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
    logger.info(`[PluginManager] Unregistered plugin: ${plugin.name}`);
  }

  async initializeAll(): Promise<void> {
    logger.info("[PluginManager] Initializing all plugins in parallel");

    const initializationPromises = Array.from(this.plugins.values()).map(
      async (plugin) => {
        try {
          await plugin.initialize();
          logger.info(`[PluginManager] Initialized: ${plugin.name}`);
        } catch (error) {
          logger.error(
            { error, plugin: plugin.name },
            "[PluginManager] Failed to initialize plugin"
          );
        }
      }
    );

    await Promise.all(initializationPromises);

    this.initialized = true;
    logger.info(
      `[PluginManager] All plugins initialization attempted (${this.plugins.size} total)`
    );
  }

  async shutdownAll(): Promise<void> {
    logger.info("[PluginManager] Shutting down all plugins in parallel");

    const shutdownPromises = Array.from(this.plugins.values()).map(
      async (plugin) => {
        try {
          await plugin.shutdown();
          logger.info(`[PluginManager] Shut down: ${plugin.name}`);
        } catch (error) {
          logger.error(
            { error, plugin: plugin.name },
            "[PluginManager] Failed to shut down plugin"
          );
        }
      }
    );

    await Promise.all(shutdownPromises);

    this.initialized = false;
    logger.info(
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
