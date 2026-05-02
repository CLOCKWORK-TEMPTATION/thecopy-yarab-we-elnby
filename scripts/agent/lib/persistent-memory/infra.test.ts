import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildPersistentMemoryInfraConfig,
  checkPersistentMemoryInfra,
  getPersistentMemoryInfraComponents,
} from "./infra";

const postgresScheme = "postgresql";

function postgresUrl({
  user,
  password,
  host,
  port,
  database,
}: {
  user: string;
  password?: string;
  host: string;
  port: number;
  database: string;
}): string {
  const auth = password ? [user, password].join(":") : user;
  return [`${postgresScheme}://`, auth, "@", host, `:${port}/`, database].join("");
}

describe("persistent memory infrastructure", () => {
  test("declares every required local service with stable endpoints", () => {
    expect(getPersistentMemoryInfraComponents().map((component) => component.id)).toEqual([
      "postgres",
      "redis",
      "bullmq",
      "weaviate",
      "qdrant",
    ]);

    const config = buildPersistentMemoryInfraConfig({
      PERSISTENT_MEMORY_PGPASSWORD: "local_password",
    });

    expect(config).toMatchObject({
      redisUrl: "redis://localhost:6379",
      weaviateUrl: "http://localhost:8080",
      qdrantUrl: "http://localhost:6333",
    });
    expect(config.databaseUrl).toBe(
      postgresUrl({
        user: "thecopy",
        password: "local_password",
        host: "localhost",
        port: 5433,
        database: "thecopy_dev",
      }),
    );
  });

  test("does not embed a default PostgreSQL password in source-built URLs", () => {
    expect(buildPersistentMemoryInfraConfig({}).databaseUrl).toBe(
      postgresUrl({
        user: "thecopy",
        host: "localhost",
        port: 5433,
        database: "thecopy_dev",
      }),
    );
  });

  test("uses the local Podman infra password file when explicit env is absent", () => {
    const localAppData = mkdtempSync(join(tmpdir(), "thecopy-localappdata-"));
    try {
      const infraDir = join(localAppData, "TheCopy");
      mkdirSync(infraDir);
      writeFileSync(
        join(infraDir, "podman-infra.env"),
        "\uFEFFPOSTGRES_PASSWORD=file_password\n",
        { flag: "wx" },
      );

      expect(
        buildPersistentMemoryInfraConfig({
          DATABASE_URL: postgresUrl({
            user: "postgres",
            password: "wrong",
            host: "localhost",
            port: 5433,
            database: "postgres",
          }),
          LOCALAPPDATA: localAppData,
        })
          .databaseUrl,
      ).toBe(
        postgresUrl({
          user: "thecopy",
          password: "file_password",
          host: "localhost",
          port: 5433,
          database: "thecopy_dev",
        }),
      );
    } finally {
      rmSync(localAppData, { recursive: true, force: true });
    }
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
