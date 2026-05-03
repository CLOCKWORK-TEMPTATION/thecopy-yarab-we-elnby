// ============================================================================
// طبقة الحفظ والاستعادة الموحدة
// ============================================================================
// تفرض namespace ثابت لكل تطبيق ومشروع، وتمنع كتابة التوكنات الحساسة،
// وتُلزم كل snapshot بـ schemaVersion و savedAt.
//
// قواعد الـ namespacing:
//   مفتاح localStorage = the-copy.{appId}.{schemaVersion}.{projectId}.{kind}
//
// kind: "draft" | "snapshot" | "preferences"

import { auditClientTokenStorage } from "@the-copy/security-middleware";

const NAMESPACE_PREFIX = "the-copy";

/**
 * أنواع البيانات المحفوظة.
 */
export type DraftKind = "draft" | "snapshot" | "preferences";

/**
 * شكل الغلاف الإلزامي حول كل قيمة محفوظة.
 */
export interface PersistedEnvelope<TData> {
  /** هوية التطبيق (مثلاً "actorai-arabic"). */
  appId: string;
  /** هوية المشروع داخل التطبيق. "default" مقبول. */
  projectId: string;
  /** نسخة المخطط — تُستخدم في migrations. */
  schemaVersion: number;
  /** تاريخ آخر حفظ بصيغة ISO. */
  savedAt: string;
  /** المحتوى الفعلي. */
  data: TData;
}

/**
 * خيارات إنشاء storage adapter لتطبيق محدد.
 */
export interface AppStorageConfig {
  appId: string;
  schemaVersion: number;
}

/**
 * يبني المفتاح الكامل وفق namespace.
 */
function buildKey(
  appId: string,
  schemaVersion: number,
  projectId: string,
  kind: DraftKind,
): string {
  return `${NAMESPACE_PREFIX}.${appId}.v${schemaVersion}.${projectId}.${kind}`;
}

/**
 * فحص أن المفتاح ليس من المفاتيح الحساسة المحظورة.
 * طبقة دفاع إضافية فوق security-middleware.
 */
function assertNotSensitive(key: string): void {
  const lower = key.toLowerCase();
  const blocked = ["jwt", "access_token", "refresh_token", "bearer", "secret"];
  for (const word of blocked) {
    if (lower.includes(word)) {
      throw new Error(
        `[persistence] refused to write key matching sensitive pattern: ${word}`,
      );
    }
  }
}

/**
 * يفحص توفر localStorage بأمان.
 */
function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * يبني storage adapter لتطبيق واحد.
 */
export function createAppStorage(config: AppStorageConfig): {
  saveDraft<TData>(projectId: string, data: TData): boolean;
  loadDraft<TData>(projectId: string): PersistedEnvelope<TData> | null;
  clearDraft(projectId: string): void;
  saveSnapshot<TData>(projectId: string, data: TData): boolean;
  loadSnapshot<TData>(projectId: string): PersistedEnvelope<TData> | null;
  savePreferences<TData>(data: TData): boolean;
  loadPreferences<TData>(): PersistedEnvelope<TData> | null;
  listKeys(): string[];
  purgeAppKeys(): number;
} {
  const { appId, schemaVersion } = config;

  function saveValue<TData>(projectId: string, kind: DraftKind, data: TData): boolean {
    const storage = getLocalStorage();
    if (storage === null) {
      return false;
    }
    const key = buildKey(appId, schemaVersion, projectId, kind);
    assertNotSensitive(key);
    const envelope: PersistedEnvelope<TData> = {
      appId,
      projectId,
      schemaVersion,
      savedAt: new Date().toISOString(),
      data,
    };
    try {
      const serialized = JSON.stringify(envelope);
      storage.setItem(key, serialized);
      return true;
    } catch {
      // QuotaExceeded أو غيره — نفشل بصمت ولا نكسر التطبيق.
      return false;
    }
  }

  function loadValue<TData>(
    projectId: string,
    kind: DraftKind,
  ): PersistedEnvelope<TData> | null {
    const storage = getLocalStorage();
    if (storage === null) {
      return null;
    }
    const key = buildKey(appId, schemaVersion, projectId, kind);
    const raw = storage.getItem(key);
    if (raw === null) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as PersistedEnvelope<TData>;
      // تحقّق سطحي من شكل الغلاف.
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        parsed.appId === appId &&
        parsed.schemaVersion === schemaVersion &&
        typeof parsed.savedAt === "string" &&
        "data" in parsed
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  function clearValue(projectId: string, kind: DraftKind): void {
    const storage = getLocalStorage();
    if (storage === null) {
      return;
    }
    const key = buildKey(appId, schemaVersion, projectId, kind);
    storage.removeItem(key);
  }

  return {
    saveDraft<TData>(projectId: string, data: TData): boolean {
      return saveValue(projectId, "draft", data);
    },
    loadDraft<TData>(projectId: string): PersistedEnvelope<TData> | null {
      return loadValue<TData>(projectId, "draft");
    },
    clearDraft(projectId: string): void {
      clearValue(projectId, "draft");
    },
    saveSnapshot<TData>(projectId: string, data: TData): boolean {
      return saveValue(projectId, "snapshot", data);
    },
    loadSnapshot<TData>(projectId: string): PersistedEnvelope<TData> | null {
      return loadValue<TData>(projectId, "snapshot");
    },
    savePreferences<TData>(data: TData): boolean {
      return saveValue("__app__", "preferences", data);
    },
    loadPreferences<TData>(): PersistedEnvelope<TData> | null {
      return loadValue<TData>("__app__", "preferences");
    },
    listKeys(): string[] {
      const storage = getLocalStorage();
      if (storage === null) {
        return [];
      }
      const prefix = `${NAMESPACE_PREFIX}.${appId}.`;
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const k = storage.key(i);
        if (k !== null && k.startsWith(prefix)) {
          keys.push(k);
        }
      }
      return keys;
    },
    purgeAppKeys(): number {
      const storage = getLocalStorage();
      if (storage === null) {
        return 0;
      }
      const prefix = `${NAMESPACE_PREFIX}.${appId}.`;
      const toDelete: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const k = storage.key(i);
        if (k !== null && k.startsWith(prefix)) {
          toDelete.push(k);
        }
      }
      for (const k of toDelete) {
        storage.removeItem(k);
      }
      return toDelete.length;
    },
  };
}

/**
 * يفحص حالة التخزين العامة ويُعيد إحصاء.
 * يُستخدم في bootstrap التطبيق ليُمسح أي توكن قبل القراءة.
 */
export function bootstrapPersistenceLayer(): {
  cleanedTokens: number;
  scannedKeys: number;
} {
  const audit = auditClientTokenStorage({ clear: true });
  return { cleanedTokens: audit.cleared, scannedKeys: audit.scannedKeys };
}
