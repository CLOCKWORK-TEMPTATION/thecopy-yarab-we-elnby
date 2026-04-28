/** مدير ذاكرة سياق خفيف لجلسة تصنيف واحدة داخل المحرر. */
import { loadFromStorage, saveToStorage } from "../hooks/use-local-storage";
import { logger } from "../utils/logger";

import { analyzeContextMemoryBlock } from "./context-memory-block-analysis";
import {
  seedInlineCharacterEvidence,
  seedStandaloneCharacterEvidence,
} from "./context-memory-seeding";
import { buildContextMemorySnapshot } from "./context-memory-snapshot";
import {
  MAX_RECENT_TYPES,
  MAX_RUNTIME_RECORDS,
  RUNTIME_SESSION_ID,
  createEmptyEvidence,
  detectLocalRepeatedPattern,
  isEvidenceConfirmed,
  isValidMemoryCharacterName,
} from "./context-memory-utils";
import { pipelineRecorder } from "./pipeline-recorder";
import { normalizeCharacterName } from "./text-utils";

import type { ClassifiedDraft } from "./classification-types";
import type {
  BlockAnalysis,
  CharacterEvidence,
  ClassificationRecord,
  ContextMemory,
  ContextMemorySnapshot,
  Correction,
  EnhancedContextMemory,
  LineRelation,
} from "./context-memory-types";

export type {
  BlockAnalysis,
  CharacterEvidence,
  ClassificationRecord,
  ContextMemory,
  ContextMemorySnapshot,
  Correction,
  DialogueBlock,
  EnhancedContextMemory,
  LineRelation,
} from "./context-memory-types";

export class ContextMemoryManager {
  private storage = new Map<string, EnhancedContextMemory>();
  private runtimeRecords: ClassifiedDraft[] = [];
  private _confirmedCharacters = new Set<string>();
  private _characterEvidence = new Map<string, CharacterEvidence>();

  constructor() {
    logger.info("ContextMemoryManager initialized (enhanced).", {
      scope: "MemoryManager",
    });
  }

  loadContext(sessionId: string): EnhancedContextMemory | null {
    if (this.storage.has(sessionId)) {
      logger.info(`Loading context for session: ${sessionId}`, {
        scope: "MemoryManager",
      });
      return JSON.parse(
        JSON.stringify(this.storage.get(sessionId)!)
      ) as EnhancedContextMemory;
    }

    const loaded = this.loadFromLocalStorage(sessionId);
    if (loaded) {
      this.storage.set(sessionId, loaded);
      return loaded;
    }

    logger.debug(
      `No context found for session: ${sessionId} (سيتم إنشاء سياق جديد)`,
      {
        scope: "MemoryManager",
      }
    );
    return null;
  }

  saveContext(
    sessionId: string,
    memory: EnhancedContextMemory | ContextMemory
  ): void {
    logger.info(`Saving context for session: ${sessionId}`, {
      scope: "MemoryManager",
    });

    const enhanced = this.ensureEnhanced(memory);
    this.storage.set(
      sessionId,
      JSON.parse(JSON.stringify(enhanced)) as EnhancedContextMemory
    );
    this.saveToLocalStorage(sessionId);
  }

  updateMemory(
    sessionId: string,
    classifications: ClassificationRecord[]
  ): void {
    logger.info(
      `Updating memory for session ${sessionId} with ${classifications.length} records.`,
      { scope: "MemoryManager" }
    );

    const existing = this.loadContext(sessionId);
    const memory: EnhancedContextMemory =
      existing ?? this.createDefaultMemory(sessionId);

    memory.lastModified = Date.now();
    memory.data.lastClassifications = classifications
      .map((record) => record.classification)
      .concat(memory.data.lastClassifications)
      .slice(0, MAX_RECENT_TYPES);

    classifications.forEach((record) => {
      if (record.classification !== "character") return;
      const characterName = normalizeCharacterName(record.line);
      if (!isValidMemoryCharacterName(characterName)) return;

      if (!memory.data.commonCharacters.includes(characterName)) {
        memory.data.commonCharacters.push(characterName);
      }

      memory.data.characterDialogueMap[characterName] =
        (memory.data.characterDialogueMap[characterName] ?? 0) + 1;
    });

    this.saveContext(sessionId, memory);
  }

  saveToLocalStorage(sessionId: string): void {
    const memory = this.storage.get(sessionId);
    if (!memory) return;
    const key = `screenplay-memory-${sessionId}`;
    saveToStorage(key, memory);
  }

  loadFromLocalStorage(sessionId: string): EnhancedContextMemory | null {
    const key = `screenplay-memory-${sessionId}`;
    const parsed = loadFromStorage<EnhancedContextMemory | null>(key, null);
    if (!parsed) return null;
    return this.ensureEnhanced(parsed);
  }

  trackDialogueBlock(
    sessionId: string,
    character: string,
    startLine: number,
    endLine: number
  ): void {
    const memory = this.storage.get(sessionId);
    if (!memory) return;

    memory.data.dialogueBlocks.push({
      character,
      startLine,
      endLine,
      lineCount: endLine - startLine + 1,
    });

    if (memory.data.dialogueBlocks.length > 50) {
      memory.data.dialogueBlocks = memory.data.dialogueBlocks.slice(-50);
    }

    this.saveToLocalStorage(sessionId);
  }

  addLineRelation(sessionId: string, relation: LineRelation): void {
    const memory = this.storage.get(sessionId);
    if (!memory) return;

    memory.data.lineRelationships.push(relation);
    if (memory.data.lineRelationships.length > 200) {
      memory.data.lineRelationships = memory.data.lineRelationships.slice(-200);
    }

    this.saveToLocalStorage(sessionId);
  }

  detectPattern(sessionId: string): string | null {
    let memory = this.storage.get(sessionId);
    if (!memory) {
      const loaded = this.loadFromLocalStorage(sessionId);
      if (loaded) {
        this.storage.set(sessionId, loaded);
        memory = loaded;
      }
    }
    if (!memory) return null;

    return detectLocalRepeatedPattern(memory.data.lastClassifications);
  }

  addUserCorrection(sessionId: string, correction: Correction): void {
    const memory = this.storage.get(sessionId);
    if (!memory) return;

    memory.data.userCorrections.push(correction);
    if (memory.data.userCorrections.length > 200) {
      memory.data.userCorrections = memory.data.userCorrections.slice(-200);
    }

    this.saveToLocalStorage(sessionId);
  }

  getUserCorrections(sessionId: string): Correction[] {
    const memory = this.storage.get(sessionId);
    return memory ? [...memory.data.userCorrections] : [];
  }

  updateConfidence(sessionId: string, line: string, confidence: number): void {
    const memory = this.storage.get(sessionId);
    if (!memory) return;

    memory.data.confidenceMap[line] = confidence;
    this.saveToLocalStorage(sessionId);
  }

  record(entry: ClassifiedDraft): void {
    pipelineRecorder.trackFile("context-memory-manager.ts");
    this.runtimeRecords.push(entry);
    if (this.runtimeRecords.length > MAX_RUNTIME_RECORDS) {
      this.runtimeRecords = this.runtimeRecords.slice(-MAX_RUNTIME_RECORDS);
    }

    const memory = this.getOrCreateRuntimeMemory();
    memory.lastModified = Date.now();
    this.applyRuntimeRecord(entry, memory);
  }

  replaceLast(entry: ClassifiedDraft): void {
    if (this.runtimeRecords.length === 0) {
      this.record(entry);
      return;
    }

    this.runtimeRecords[this.runtimeRecords.length - 1] = entry;
    this.rebuildRuntimeAggregates();
  }

  /**
   * بذر الـ registry من inline patterns (regex-based) — يتنادى مرة واحدة قبل الـ loop.
   * بيعمل scan بـ `parseInlineCharacterDialogue` ويضيف الأسماء المؤكدة فقط.
   * بيغذّي الـ evidence map بـ inlinePairCount.
   */
  seedFromInlinePatterns(lines: string[]): void {
    seedInlineCharacterEvidence(lines, {
      confirmedCharacters: this._confirmedCharacters,
      characterEvidence: this._characterEvidence,
    });
  }

  /**
   * بذر الـ registry من standalone patterns (اسم: على سطر + حوار على سطر تالي).
   * يتنادى مرة واحدة بعد seedFromInlinePatterns وقبل الـ loop.
   *
   * شروط صارمة:
   * 1. السطر ينتهي بـ `:` أو `：`
   * 2. بعد إزالة الـ colon: ≤3 tokens + يعدّي isCandidateCharacterName
   * 3. السطر التالي مش colon line (مش character تاني)
   * 4. السطر التالي dialogue-leaning هيكلياً
   * 5. النمط يتكرر ≥2 مرات لنفس الاسم
   * 6. الاسم ليس فعل (مش action verb)
   */
  seedFromStandalonePatterns(lines: string[]): void {
    seedStandaloneCharacterEvidence(lines, {
      confirmedCharacters: this._confirmedCharacters,
      characterEvidence: this._characterEvidence,
    });
  }

  /**
   * الأسماء المؤكدة من المسح الأولي فقط (قبل التصنيف).
   * يُستخدم في التصحيح الرجعي للتمييز بين الأسماء المُؤكدة والمُكتشفة أثناء التصنيف.
   */
  getPreSeededCharacters(): ReadonlySet<string> {
    return this._confirmedCharacters;
  }

  /**
   * هل الاسم ده مؤكد كشخصية؟
   * القرار مبني على evidence policy — مش مجرد وجود في Set.
   */
  isConfirmedCharacter(name: string): boolean {
    const normalized = normalizeCharacterName(name);
    if (!normalized) return false;
    // مؤكد من الـ seed الأولي (inline أو standalone)
    if (this._confirmedCharacters.has(normalized)) return true;
    // مؤكد من evidence مجمّعة أثناء الـ runtime
    const ev = this._characterEvidence.get(normalized);
    if (ev && isEvidenceConfirmed(ev)) return true;
    return false;
  }

  /**
   * جلب أدلة شخصية معينة — null لو مفيش أدلة.
   */
  getCharacterEvidence(name: string): CharacterEvidence | null {
    const normalized = normalizeCharacterName(name);
    if (!normalized) return null;
    return this._characterEvidence.get(normalized) ?? null;
  }

  getSnapshot(): ContextMemorySnapshot {
    const memory = this.getOrCreateRuntimeMemory();
    return buildContextMemorySnapshot({
      memory,
      runtimeRecords: this.runtimeRecords,
      confirmedCharacters: this._confirmedCharacters,
      characterEvidence: this._characterEvidence,
    });
  }

  /**
   * تصحيح رجعي لسجل واحد في runtimeRecords عند index محدد.
   * يُحدّث السجل ويُعيد بناء كل الإحصائيات من ذلك الـ index حتى النهاية.
   *
   * @param index - موقع السجل المراد تصحيحه
   * @param newEntry - السجل المُصحّح الجديد
   */
  retroCorrect(index: number, newEntry: ClassifiedDraft): void {
    if (index < 0 || index >= this.runtimeRecords.length) return;
    this.runtimeRecords[index] = newEntry;
    this.rebuildRuntimeAggregates();
  }

  /**
   * تحليل هيكلي لكتلة أسطر بين startIdx و endIdx.
   * يُرجع إحصائيات بنيوية بدون أي قوائم كلمات ثابتة.
   *
   * @param startIdx - بداية الكتلة (0-indexed)
   * @param endIdx - نهاية الكتلة (inclusive)
   * @returns تحليل هيكلي للكتلة
   */
  getBlockAnalysis(startIdx: number, endIdx: number): BlockAnalysis {
    return analyzeContextMemoryBlock(this.runtimeRecords, startIdx, endIdx);
  }

  /**
   * إعادة بناء كاملة من مصفوفة drafts مُصحّحة.
   * يُستدعى من retroactiveCorrectionPass بعد تعديل التصنيفات.
   *
   * @param correctedDrafts - المصفوفة الكاملة بعد التصحيح الرجعي
   */
  rebuildFromCorrectedDrafts(
    correctedDrafts: readonly ClassifiedDraft[]
  ): void {
    this.runtimeRecords = correctedDrafts.map((d) => ({ ...d }));
    if (this.runtimeRecords.length > MAX_RUNTIME_RECORDS) {
      this.runtimeRecords = this.runtimeRecords.slice(-MAX_RUNTIME_RECORDS);
    }
    this.rebuildRuntimeAggregates();
  }

  /**
   * إعادة تعيين ذاكرة السياق — جلسة محددة أو جميع الجلسات.
   */
  reset(sessionId?: string): void {
    if (sessionId) {
      this.storage.delete(sessionId);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(`screenplay-memory-${sessionId}`);
        } catch {
          // ignore storage failures in reset
        }
      }
      return;
    }

    this.storage.clear();
    this.runtimeRecords = [];

    if (typeof window !== "undefined") {
      try {
        const keys = Object.keys(window.localStorage);
        for (const key of keys) {
          if (key.startsWith("screenplay-memory-")) {
            window.localStorage.removeItem(key);
          }
        }
      } catch {
        // ignore storage failures in reset
      }
    }
  }

  private applyRuntimeRecord(
    entry: ClassifiedDraft,
    memory: EnhancedContextMemory
  ): void {
    memory.data.lastClassifications = [
      ...memory.data.lastClassifications,
      entry.type,
    ].slice(-MAX_RECENT_TYPES);

    if (entry.type !== "character") return;
    const characterName = normalizeCharacterName(entry.text);
    if (!isValidMemoryCharacterName(characterName)) return;

    if (!memory.data.commonCharacters.includes(characterName)) {
      memory.data.commonCharacters.push(characterName);
    }

    memory.data.characterDialogueMap[characterName] =
      (memory.data.characterDialogueMap[characterName] ?? 0) + 1;

    // تحديث evidence map — confidence عالية (regex path) تزيد inlinePairCount
    // confidence منخفضة (context/hybrid) تزيد repeatCount فقط (anti-contamination)
    const ev =
      this._characterEvidence.get(characterName) ?? createEmptyEvidence();
    ev.repeatCount++;
    if (entry.confidence >= 88) {
      ev.inlinePairCount++;
    }
    this._characterEvidence.set(characterName, ev);
  }

  private rebuildRuntimeAggregates(): void {
    const memory = this.getOrCreateRuntimeMemory();
    memory.lastModified = Date.now();
    memory.data.lastClassifications = this.runtimeRecords
      .slice(-MAX_RECENT_TYPES)
      .map((record) => record.type);
    memory.data.characterDialogueMap = {};
    memory.data.commonCharacters = [];

    this.runtimeRecords.forEach((record) => {
      if (record.type !== "character") return;
      const characterName = normalizeCharacterName(record.text);
      if (!isValidMemoryCharacterName(characterName)) return;

      if (!memory.data.commonCharacters.includes(characterName)) {
        memory.data.commonCharacters.push(characterName);
      }

      memory.data.characterDialogueMap[characterName] =
        (memory.data.characterDialogueMap[characterName] ?? 0) + 1;
    });
  }

  private getOrCreateRuntimeMemory(): EnhancedContextMemory {
    const existing = this.storage.get(RUNTIME_SESSION_ID);
    if (existing) return existing;

    const created = this.createDefaultMemory(RUNTIME_SESSION_ID);
    this.storage.set(RUNTIME_SESSION_ID, created);
    return created;
  }

  private createDefaultMemory(sessionId: string): EnhancedContextMemory {
    return {
      sessionId,
      lastModified: Date.now(),
      data: {
        commonCharacters: [],
        commonLocations: [],
        lastClassifications: [],
        characterDialogueMap: {},
        dialogueBlocks: [],
        lineRelationships: [],
        userCorrections: [],
        confidenceMap: {},
      },
    };
  }

  private ensureEnhanced(
    memory: ContextMemory | EnhancedContextMemory
  ): EnhancedContextMemory {
    const data = memory.data as EnhancedContextMemory["data"];
    return {
      ...memory,
      data: {
        ...memory.data,
        dialogueBlocks: data.dialogueBlocks || [],
        lineRelationships: data.lineRelationships || [],
        userCorrections: data.userCorrections || [],
        confidenceMap: data.confidenceMap || {},
      },
    };
  }
}
