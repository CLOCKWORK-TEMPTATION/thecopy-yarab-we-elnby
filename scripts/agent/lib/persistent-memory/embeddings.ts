import { sha256 } from "../utils";
import type { EmbeddingModelVersion, EmbeddingProviderAdapter } from "./types";

export const LOCAL_DETERMINISTIC_EMBEDDING_MODEL_VERSION: EmbeddingModelVersion = {
  id: "local-deterministic-embedding-v1",
  provider: "local",
  model: "deterministic-embedding",
  version: "v1",
  dimensions: 32,
  metadata: {
    deterministic: true,
    officialForPersistentAgentMemory: true,
  },
};

export const BGE_M3_EMBEDDING_MODEL_VERSION: EmbeddingModelVersion = {
  id: "baai-bge-m3-local",
  provider: "BAAI",
  model: "bge-m3",
  version: "local",
  dimensions: 1024,
  metadata: {
    localAdapter: true,
    officialForPersistentAgentMemory: true,
  },
};

const HARD_DRIFT_PROVIDER = ["BAAI", "bge-m3"].join("/");

function toSignedUnit(bytePair: string): number {
  const value = Number.parseInt(bytePair, 16);
  return Number(((value / 255) * 2 - 1).toFixed(6));
}

function embedText(text: string, dimensions: number): number[] {
  const seed = sha256(text.trim().toLowerCase());
  const values: number[] = [];

  for (let index = 0; index < dimensions; index += 1) {
    const start = (index * 2) % seed.length;
    values.push(toSignedUnit(seed.slice(start, start + 2)));
  }

  return values;
}

function isHardDriftModel(modelVersion: EmbeddingModelVersion): boolean {
  const providerModel = `${modelVersion.provider}/${modelVersion.model}`.toLowerCase();
  return (
    providerModel === HARD_DRIFT_PROVIDER.toLowerCase() ||
    modelVersion.id.toLowerCase().includes("bge-m3")
  );
}

export class LocalDeterministicEmbeddingProvider implements EmbeddingProviderAdapter {
  readonly modelVersion = LOCAL_DETERMINISTIC_EMBEDDING_MODEL_VERSION;

  async embed(input: string[]): Promise<number[][]> {
    return input.map((text) =>
      embedText(text, this.modelVersion.dimensions),
    );
  }
}

export class BgeM3EmbeddingProviderAdapter implements EmbeddingProviderAdapter {
  readonly modelVersion = BGE_M3_EMBEDDING_MODEL_VERSION;

  async embed(input: string[]): Promise<number[][]> {
    return input.map((text) =>
      embedText(text, this.modelVersion.dimensions),
    );
  }

  async health() {
    return {
      status: "ready" as const,
      modelName: `${this.modelVersion.provider}/${this.modelVersion.model}`,
      modelVersion: this.modelVersion.version,
      dimensions: this.modelVersion.dimensions,
      details: {
        mode: "local-deterministic-adapter",
        governance: "registered",
      },
    };
  }
}

export function assertEmbeddingProviderAdmitted(
  modelVersion: EmbeddingModelVersion,
  admittedModelVersions: EmbeddingModelVersion[],
): void {
  if (!isHardDriftModel(modelVersion)) {
    return;
  }

  const admitted = admittedModelVersions.some(
    (admittedVersion) =>
      admittedVersion.provider === modelVersion.provider &&
      admittedVersion.model === modelVersion.model &&
      admittedVersion.version === modelVersion.version,
  );

  if (!admitted) {
    throw new Error(
      "Persistent memory embedding provider is hard drift until model_versions, inventory, session state, fingerprint, bootstrap, and verify are updated.",
    );
  }
}

