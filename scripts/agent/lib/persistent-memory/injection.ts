import type {
  InjectionZone,
  PersistentMemoryRecord,
  TrustLevel,
} from "./types";

const ALLOWED_ZONES = new Set<InjectionZone>([
  "memory_context",
  "evidence_context",
]);

export interface InjectionMemory {
  id: string;
  content: string;
  sourceRef: string;
  trustLevel: TrustLevel;
  modelVersionId: string;
  injectionProbability: number;
}

export interface InjectionEnvelopeInput {
  zone: InjectionZone;
  memories: InjectionMemory[];
}

export interface InjectionEnvelopePayload {
  zone: InjectionZone;
  items: Array<{
    id: string;
    content: string;
    sourceRef: string;
    trustLevel: TrustLevel;
    modelVersionId: string;
  }>;
}

function toInjectionMemory(memory: PersistentMemoryRecord): InjectionMemory {
  return {
    id: memory.id,
    content: memory.content,
    sourceRef: memory.sourceRef,
    trustLevel: memory.trustLevel,
    modelVersionId: memory.modelVersionId,
    injectionProbability: memory.injectionProbability,
  };
}

export class MemoryInjectionEnvelope {
  build(input: InjectionEnvelopeInput): InjectionEnvelopePayload {
    if (!ALLOWED_ZONES.has(input.zone)) {
      throw new Error(`Forbidden memory injection zone: ${input.zone}`);
    }

    const items = input.memories.map((memory) => {
      if (!memory.sourceRef) {
        throw new Error("Memory injection requires source_ref.");
      }
      if (!memory.trustLevel) {
        throw new Error("Memory injection requires trust_level.");
      }
      if (!memory.modelVersionId) {
        throw new Error("Memory injection requires model_version.");
      }
      if (memory.injectionProbability >= 0.7) {
        throw new Error("Memory injection rejected high risk memory.");
      }

      return {
        id: memory.id,
        content: memory.content,
        sourceRef: memory.sourceRef,
        trustLevel: memory.trustLevel,
        modelVersionId: memory.modelVersionId,
      };
    });

    return {
      zone: input.zone,
      items,
    };
  }

  fromPersistentMemories(
    zone: InjectionZone,
    memories: PersistentMemoryRecord[],
  ): InjectionEnvelopePayload {
    return this.build({
      zone,
      memories: memories.map(toInjectionMemory),
    });
  }
}

