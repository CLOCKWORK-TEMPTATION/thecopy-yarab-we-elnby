// Cache Management Service for Drama Analyst App
// Handles cache operations, offline functionality, and background sync

import { encodeRecord, decodeRecord, unflatten } from "../../utils/kv-utils";

import { log } from "./loggerService";

export interface CacheConfig {
  name: string;
  maxAge: number;
  maxEntries: number;
  strategy: "cacheFirst" | "networkFirst" | "staleWhileRevalidate";
}

export interface CacheStats {
  name: string;
  size: number;
  entries: number;
  lastUpdated: Date;
  hitRate: number;
}

class CacheService {
  private cacheConfigs = new Map<string, CacheConfig>();
  private isServiceWorkerSupported = false;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initializeCacheConfigs();
    this.setupEventListeners();
    this.checkServiceWorkerSupport();
  }

  private initializeCacheConfigs(): void {
    this.cacheConfigs.set("static", {
      name: "drama-analyst-static-v1.0.0",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxEntries: 100,
      strategy: "cacheFirst",
    });

    this.cacheConfigs.set("dynamic", {
      name: "drama-analyst-dynamic-v1.0.0",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 50,
      strategy: "staleWhileRevalidate",
    });

    this.cacheConfigs.set("api", {
      name: "drama-analyst-api-v1.0.0",
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxEntries: 20,
      strategy: "networkFirst",
    });

    this.cacheConfigs.set("images", {
      name: "drama-analyst-images-v1.0.0",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxEntries: 30,
      strategy: "cacheFirst",
    });

    this.cacheConfigs.set("fonts", {
      name: "drama-analyst-fonts-v1.0.0",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      maxEntries: 10,
      strategy: "cacheFirst",
    });
  }

  private setupEventListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      log.info("🌐 Network is online", null, "CacheService");
      this.handleOnlineStatus();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      log.warn("📴 Network is offline", null, "CacheService");
      this.handleOfflineStatus();
    });

    // Listen for storage events (cache updates)
    window.addEventListener("storage", (event) => {
      if (event.key?.startsWith("cache-")) {
        log.debug(
          "🗄️ Cache storage updated",
          { key: event.key },
          "CacheService"
        );
      }
    });
  }

  private checkServiceWorkerSupport(): void {
    this.isServiceWorkerSupported = "serviceWorker" in navigator;

    if (this.isServiceWorkerSupported) {
      log.info("✅ Service Worker is supported", null, "CacheService");
      this.registerServiceWorker();
    } else {
      log.warn("⚠️ Service Worker is not supported", null, "CacheService");
    }
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      log.info(
        "🔧 Service Worker registered successfully",
        {
          scope: registration.scope,
          active: registration.active?.state,
          waiting: registration.waiting?.state,
          installing: registration.installing?.state,
        },
        "CacheService"
      );

      // Listen for service worker updates
      registration.addEventListener("updatefound", () => {
        log.info("🔄 Service Worker update found", null, "CacheService");

        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              log.info("✅ New Service Worker installed", null, "CacheService");
              this.notifyUserOfUpdate();
            }
          });
        }
      });
    } catch (error) {
      log.error("❌ Service Worker registration failed", error, "CacheService");
    }
  }

  private notifyUserOfUpdate(): void {
    // Show a notification to the user about the update
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("تحديث متاح", {
        body: "يوجد تحديث جديد للتطبيق. انقر هنا لإعادة تحميل الصفحة.",
        icon: "/icon-192x192.png",
        tag: "app-update",
      });
    } else {
      // Fallback to browser notification
      if (confirm("يوجد تحديث جديد للتطبيق. هل تريد إعادة تحميل الصفحة؟")) {
        window.location.reload();
      }
    }
  }

  private handleOnlineStatus(): void {
    // Sync any pending offline actions
    this.syncPendingActions();

    // Preload critical resources
    this.preloadCriticalResources();
  }

  private handleOfflineStatus(): void {
    // Show offline indicator
    this.showOfflineIndicator();

    // Disable features that require network
    this.disableNetworkDependentFeatures();
  }

  private showOfflineIndicator(): void {
    // Create or update offline indicator
    let indicator = document.getElementById("offline-indicator");

    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "offline-indicator";
      indicator.className =
        "fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50";
      indicator.textContent = "أنت غير متصل بالإنترنت";
      document.body.appendChild(indicator);
    }

    indicator.style.display = "block";
  }

  private disableNetworkDependentFeatures(): void {
    // Disable features that require network connection
    const networkFeatures = document.querySelectorAll(
      "[data-requires-network]"
    );
    networkFeatures.forEach((feature) => {
      (feature as HTMLElement).style.opacity = "0.5";
      (feature as HTMLElement).style.pointerEvents = "none";
    });
  }

  private async syncPendingActions(): Promise<void> {
    try {
      // Get pending actions from IndexedDB or localStorage
      const pendingActions = await this.getPendingActions();

      if (pendingActions.length > 0) {
        log.info(
          `🔄 Syncing ${pendingActions.length} pending actions`,
          null,
          "CacheService"
        );

        for (const action of pendingActions) {
          try {
            await this.executeAction(action);
            await this.removePendingAction(action.id);
          } catch (error) {
            log.error(
              `❌ Failed to sync action ${action.id}`,
              error,
              "CacheService"
            );
          }
        }
      }
    } catch (error) {
      log.error("❌ Failed to sync pending actions", error, "CacheService");
    }
  }

  private async preloadCriticalResources(): Promise<void> {
    const criticalResources = [
      "/",
      "/manifest.webmanifest",
      // Add other critical resources
    ];

    for (const resource of criticalResources) {
      try {
        await fetch(resource, { cache: "force-cache" });
        log.debug(
          `✅ Preloaded critical resource: ${resource}`,
          null,
          "CacheService"
        );
      } catch (error) {
        log.warn(
          `⚠️ Failed to preload resource: ${resource}`,
          error,
          "CacheService"
        );
      }
    }
  }

  // Public methods
  public async getCacheStats(): Promise<CacheStats[]> {
    if (!this.isServiceWorkerSupported) {
      return [];
    }

    const stats: CacheStats[] = [];

    for (const [key, config] of this.cacheConfigs) {
      try {
        const cache = await caches.open(config.name);
        const keys = await cache.keys();

        stats.push({
          name: key,
          size: await this.calculateCacheSize(cache),
          entries: keys.length,
          lastUpdated: new Date(),
          hitRate: await this.getCacheHitRate(config.name),
        });
      } catch (error) {
        log.error(
          `❌ Failed to get stats for cache ${key}`,
          error,
          "CacheService"
        );
      }
    }

    return stats;
  }

  private async calculateCacheSize(cache: Cache): Promise<number> {
    let totalSize = 0;

    try {
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    } catch (error) {
      log.error("❌ Failed to calculate cache size", error, "CacheService");
    }

    return totalSize;
  }

  private async getCacheHitRate(_cacheName: string): Promise<number> {
    // This would require tracking cache hits/misses
    // For now, return a placeholder value
    return 0.85; // 85% hit rate
  }

  public async clearCache(cacheName?: string): Promise<void> {
    try {
      if (cacheName) {
        const config = this.cacheConfigs.get(cacheName);
        if (config) {
          await caches.delete(config.name);
          log.info(`🗑️ Cleared cache: ${cacheName}`, null, "CacheService");
        }
      } else {
        // Clear all caches
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        log.info("🗑️ Cleared all caches", null, "CacheService");
      }
    } catch (error) {
      log.error("❌ Failed to clear cache", error, "CacheService");
    }
  }

  public async isResourceCached(url: string): Promise<boolean> {
    try {
      const response = await caches.match(url);
      return !!response;
    } catch (error) {
      log.error(
        `❌ Failed to check if resource is cached: ${url}`,
        error,
        "CacheService"
      );
      return false;
    }
  }

  public async cacheResource(
    url: string,
    cacheName = "dynamic"
  ): Promise<boolean> {
    try {
      const config = this.cacheConfigs.get(cacheName);
      if (!config) {
        log.warn(`⚠️ Unknown cache name: ${cacheName}`, null, "CacheService");
        return false;
      }

      const response = await fetch(url);
      if (response.ok) {
        const cache = await caches.open(config.name);
        await cache.put(url, response.clone());
        log.debug(`✅ Cached resource: ${url}`, null, "CacheService");
        return true;
      }

      return false;
    } catch (error) {
      log.error(`❌ Failed to cache resource: ${url}`, error, "CacheService");
      return false;
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public isServiceWorkerAvailable(): boolean {
    return this.isServiceWorkerSupported;
  }

  // Offline action management
  private async getPendingActions(): Promise<unknown[]> {
    try {
      const actionsText = localStorage.getItem("pending-actions");
      if (!actionsText) return [];
      const actionTexts = actionsText.split("\n\n");
      return actionTexts.map((text) => {
        const flat = decodeRecord(text);
        return unflatten(flat);
      });
    } catch (error) {
      log.error("❌ Failed to get pending actions", error, "CacheService");
      return [];
    }
  }

  private async removePendingAction(actionId: string): Promise<void> {
    try {
      const actions = await this.getPendingActions();
      const filteredActions = actions.filter(
        (action) => {
          const actionObj = action as { id?: string };
          return actionObj.id !== actionId;
        }
      );
      const filteredTexts = filteredActions.map((action) =>
        encodeRecord(action)
      );
      localStorage.setItem("pending-actions", filteredTexts.join("\n\n"));
    } catch (error) {
      log.error("❌ Failed to remove pending action", error, "CacheService");
    }
  }

  private async executeAction(action: unknown): Promise<void> {
    // Implement action execution logic
    const actionObj = action as { type?: string };
    log.info(
      `🔄 Executing pending action: ${actionObj.type ?? "unknown"}`,
      action,
      "CacheService"
    );
  }

  // Request caching
  public async cacheRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const optionsRecord: Record<string, unknown> = { ...options };
    const optionsText = encodeRecord(optionsRecord);
    const cacheKey = `${url}?${optionsText}`;

    // Check if we're offline
    if (!this.isOnline) {
      const cachedResponse = await caches.match(cacheKey);
      if (cachedResponse) {
        log.debug(`📦 Serving cached request: ${url}`, null, "CacheService");
        return cachedResponse;
      } else {
        throw new Error("Request not available offline");
      }
    }

    try {
      // Try network first
      const response = await fetch(url, options);

      if (response.ok) {
        // Cache the response
        const cache = await caches.open(this.cacheConfigs.get("api")!.name);
        await cache.put(cacheKey, response.clone());
        log.debug(`✅ Cached request: ${url}`, null, "CacheService");
      }

      return response;
    } catch (error) {
      // Fallback to cache
      const cachedResponse = await caches.match(cacheKey);
      if (cachedResponse) {
        log.debug(
          `📦 Fallback to cached request: ${url}`,
          null,
          "CacheService"
        );
        return cachedResponse;
      }

      throw error;
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

export { cacheService };
