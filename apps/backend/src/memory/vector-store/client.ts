/**
 * Weaviate Vector Store Client
 * عميل قاعدة بيانات المتجهات Weaviate
 */

import weaviate, { type Properties, WeaviateClient } from "weaviate-client";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { definedProps } from "@/utils/defined-props";

type WeaviateCollectionSchema = unknown;

interface WeaviateCollectionListItem {
  name?: string;
}

export type WeaviateState =
  | "disabled"
  | "connecting"
  | "connected"
  | "degraded"
  | "failed";

export interface WeaviateRuntimeStatus {
  enabled: boolean;
  required: boolean;
  state: WeaviateState;
  host?: string;
  lastCheckedAt?: string;
  lastConnectedAt?: string;
  lastError?: string;
}

export class WeaviateMemoryStore {
  private client: WeaviateClient | null = null;
  private readonly host: string;
  private readonly apiKey: string | undefined;
  private readonly enabled: boolean;
  private readonly required: boolean;
  private runtimeStatus: WeaviateRuntimeStatus;

  constructor() {
    this.enabled = env.MEMORY_SYSTEM_ENABLED;
    this.required = env.WEAVIATE_REQUIRED;
    this.host = env.WEAVIATE_URL ?? "http://localhost:8080";
    this.apiKey = env.WEAVIATE_API_KEY;
    this.runtimeStatus = {
      enabled: this.enabled,
      required: this.required,
      state: this.enabled ? "connecting" : "disabled",
      host: this.host,
    };
  }

  getStatus(): WeaviateRuntimeStatus {
    return { ...this.runtimeStatus };
  }

  private mark(patch: {
    [K in keyof WeaviateRuntimeStatus]?: WeaviateRuntimeStatus[K] | undefined;
  }): void {
    const nextStatus: WeaviateRuntimeStatus = {
      ...this.runtimeStatus,
      lastCheckedAt: new Date().toISOString(),
    };
    const nextStatusRecord = nextStatus as unknown as Record<string, unknown>;

    for (const key of Object.keys(patch) as (keyof WeaviateRuntimeStatus)[]) {
      const value = patch[key];
      if (value === undefined) {
        delete nextStatusRecord[key];
        continue;
      }
      nextStatusRecord[key] = value;
    }

    this.runtimeStatus = nextStatus;
  }

  async bootstrap(): Promise<void> {
    if (!this.enabled) {
      this.mark({ state: "disabled", lastError: undefined });
      return;
    }

    this.mark({ state: "connecting" });

    try {
      await Promise.race([
        this.connect(),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Weaviate startup timeout after ${env.WEAVIATE_STARTUP_TIMEOUT_MS}ms`,
                ),
              ),
            env.WEAVIATE_STARTUP_TIMEOUT_MS,
          ),
        ),
      ]);

      this.mark({
        state: "connected",
        lastConnectedAt: new Date().toISOString(),
        lastError: undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.client = null;
      this.mark({
        state: this.required ? "failed" : "degraded",
        lastError: message,
      });

      if (this.required) {
        throw new Error(`Weaviate is required but unavailable: ${message}`);
      }
    }
  }

  async connect(): Promise<WeaviateClient> {
    if (!this.enabled) {
      throw new Error("Weaviate is disabled in this environment.");
    }

    if (this.client) {
      return this.client;
    }

    const config: Record<string, unknown> = {
      host: this.host,
      ...definedProps({
        apiKey: this.apiKey ? { apiKey: this.apiKey } : undefined,
      }),
    };

    this.client = await weaviate.connectToCustom(config);
    await this.client.getMeta();
    this.mark({
      state: "connected",
      lastConnectedAt: new Date().toISOString(),
      lastError: undefined,
    });

    return this.client;
  }

  disconnect(): Promise<void> {
    this.client = null;
    this.mark({
      state: this.enabled ? "degraded" : "disabled",
    });
    return Promise.resolve();
  }

  getClient(): WeaviateClient {
    if (!this.client) {
      throw new Error("Weaviate client not connected. Call connect() first.");
    }
    return this.client;
  }

  getCollection<T extends Properties | undefined = Properties>(name: string) {
    const client = this.getClient();
    return client.collections.get<T>(name);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      this.mark({ state: "disabled", lastError: undefined });
      return true;
    }

    try {
      const client = await this.connect();
      await client.getMeta();
      this.mark({
        state: "connected",
        lastConnectedAt: new Date().toISOString(),
        lastError: undefined,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.client = null;
      this.mark({
        state: this.required ? "failed" : "degraded",
        lastError: message,
      });
      return false;
    }
  }

  /**
   * Create a collection if it doesn't exist
   */
  async ensureCollection(
    name: string,
    schema: WeaviateCollectionSchema,
  ): Promise<void> {
    const client = await this.connect();

    try {
      // Check if collection exists
      const collection = client.collections.get(name);
      await collection.length(); // This will throw if collection doesn't exist
      logger.info(`Collection ${name} already exists`);
    } catch {
      // Collection doesn't exist, create it
      logger.info(`Creating collection ${name}`);
      await client.collections.create(
        schema as Parameters<WeaviateClient["collections"]["create"]>[0],
      );
      logger.info(`Collection ${name} created`);
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<void> {
    const client = await this.connect();
    try {
      await client.collections.delete(name);
      logger.info(`Deleted collection ${name}`);
    } catch (error) {
      logger.warn(`Failed to delete collection ${name}`, { error });
    }
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    const client = await this.connect();
    const collections = await client.collections.listAll();
    return (collections as WeaviateCollectionListItem[])
      .map((collection) => collection.name)
      .filter((name): name is string => typeof name === "string");
  }

  /**
   * Get document count for a collection
   */
  async getCollectionCount(name: string): Promise<number> {
    const client = await this.connect();
    const collection = client.collections.get(name);
    return await collection.length();
  }

  async insertMany<T extends Properties | undefined = Properties>(
    name: string,
    objects: Record<string, unknown>[],
  ) {
    if (objects.length === 0) {
      return { hasErrors: false, errors: {} };
    }

    const collection = this.getCollection<T>(name);
    return collection.data.insertMany(objects);
  }

  async deleteMany(name: string, filter: unknown, verbose = false) {
    const collection = this.getCollection(name);
    return collection.data.deleteMany(filter as never, { verbose });
  }
}

export const weaviateStore = new WeaviateMemoryStore();
