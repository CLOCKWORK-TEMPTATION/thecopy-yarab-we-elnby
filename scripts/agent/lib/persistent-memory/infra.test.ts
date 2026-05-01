import { describe, expect, test } from "vitest";

import {
  buildPersistentMemoryInfraConfig,
  checkPersistentMemoryInfra,
  getPersistentMemoryInfraComponents,
} from "./infra";

describe("persistent memory infrastructure", () => {
  test("declares every required local service with stable endpoints", () => {
    expect(getPersistentMemoryInfraComponents().map((component) => component.id)).toEqual([
      "postgres",
      "redis",
      "bullmq",
      "weaviate",
      "qdrant",
    ]);

    expect(buildPersistentMemoryInfraConfig({})).toMatchObject({
      databaseUrl: "postgresql://thecopy:thecopy_dev@localhost:5433/thecopy_dev",
      redisUrl: "redis://localhost:6379",
      weaviateUrl: "http://localhost:8080",
      qdrantUrl: "http://localhost:6333",
    });
  });

  test("marks the stack ready only when every required service is reachable", async () => {
    const ready = await checkPersistentMemoryInfra(
      {},
      {
        postgres: async () => true,
        redis: async () => true,
        bullmq: async () => true,
        weaviate: async () => true,
        qdrant: async () => true,
      },
    );

    expect(ready.status).toBe("ready");
    expect(ready.components.every((component) => component.ready)).toBe(true);

    const degraded = await checkPersistentMemoryInfra(
      {},
      {
        postgres: async () => true,
        redis: async () => true,
        bullmq: async () => true,
        weaviate: async () => true,
        qdrant: async () => false,
      },
    );

    expect(degraded.status).toBe("degraded");
    expect(degraded.components.find((component) => component.id === "qdrant")).toMatchObject({
      ready: false,
      endpoint: "http://localhost:6333",
    });
  });
});
