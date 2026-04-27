/**
 * خدمة BYO-API
 * Bring Your Own API - إدارة مفاتيح API للمستخدم
 *
 * المبادئ:
 * 1. لا يتم تخزين مفاتيح API على السيرفر
 * 2. جميع المفاتيح تُخزن محلياً في IndexedDB (مشفرة)
 * 3. الاتصالات تتم مباشرة من المتصفح إلى مزود الخدمة
 */

import {
  encryptData,
  decryptData,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "./core";
import { getKeyManager } from "./keyManager";

/**
 * إعدادات مزود API
 */
export interface APIProviderConfig {
  id: string;
  providerName: string;
  endpointUrl: string;
  apiKey: string;
  metadata?: Record<string, string>;
}

/**
 * إعدادات مزود API مشفرة
 */
interface EncryptedAPIConfig {
  id: string;
  providerName: string;
  endpointUrl: string;
  encryptedApiKey: string;
  iv: string;
  createdAt: number;
  metadata?: Record<string, string>;
}

function withMetadata<T extends Record<string, unknown>>(
  value: T,
  metadata?: Record<string, string>
): T & { metadata?: Record<string, string> } {
  return metadata ? { ...value, metadata } : value;
}

const DB_NAME = "the-copy-byo-api";
const DB_VERSION = 1;
const STORE_NAME = "api-configs";

/**
 * فتح قاعدة البيانات المحلية
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open API config database"));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * حفظ إعدادات API (مشفرة)
 */
export async function saveAPIConfig(config: APIProviderConfig): Promise<void> {
  const keyManager = getKeyManager();
  const kek = keyManager.getKEK();

  if (!kek) {
    throw new Error(
      "لم يتم العثور على مفتاح التشفير. يرجى تسجيل الدخول أولاً."
    );
  }

  // بناء AAD فريد لهذا الإعداد
  const aad = new TextEncoder().encode(`api-config:${config.id}`);

  // تشفير مفتاح API
  const { ciphertext, iv } = await encryptData(config.apiKey, kek, aad);

  const encryptedConfig: EncryptedAPIConfig = withMetadata(
    {
      id: config.id,
      providerName: config.providerName,
      endpointUrl: config.endpointUrl,
      encryptedApiKey: arrayBufferToBase64(ciphertext),
      iv: uint8ArrayToBase64(iv),
      createdAt: Date.now(),
    },
    config.metadata
  );

  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  await new Promise<void>((resolve, reject) => {
    const request = store.put(encryptedConfig);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to save API config"));
  });
}

/**
 * جلب إعدادات API (وفك تشفيرها)
 */
export async function getAPIConfig(
  id: string
): Promise<APIProviderConfig | null> {
  const keyManager = getKeyManager();
  const kek = keyManager.getKEK();

  if (!kek) {
    throw new Error(
      "لم يتم العثور على مفتاح التشفير. يرجى تسجيل الدخول أولاً."
    );
  }

  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);

  const encryptedConfig = await new Promise<EncryptedAPIConfig | undefined>(
    (resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () =>
        resolve(request.result as EncryptedAPIConfig | undefined);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to read API config"));
    }
  );

  if (!encryptedConfig) {
    return null;
  }

  // فك تشفير مفتاح API
  const aad = new TextEncoder().encode(`api-config:${id}`);
  const ciphertext = base64ToArrayBuffer(encryptedConfig.encryptedApiKey);
  const iv = base64ToUint8Array(encryptedConfig.iv);

  const apiKey = await decryptData({ ciphertext, iv }, kek, aad);

  return withMetadata(
    {
      id: encryptedConfig.id,
      providerName: encryptedConfig.providerName,
      endpointUrl: encryptedConfig.endpointUrl,
      apiKey,
    },
    encryptedConfig.metadata
  );
}

/**
 * حذف إعدادات API
 */
export async function deleteAPIConfig(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to delete API config"));
  });
}

/**
 * الحصول على قائمة بجميع إعدادات API (بدون مفاتيح)
 */
export async function listAPIConfigs(): Promise<
  Omit<APIProviderConfig, "apiKey">[]
> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);

  const configs = await new Promise<EncryptedAPIConfig[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to list API configs"));
  });

  return configs.map((config) =>
    withMetadata(
      {
        id: config.id,
        providerName: config.providerName,
        endpointUrl: config.endpointUrl,
      },
      config.metadata
    )
  );
}

/**
 * اختبار اتصال API
 */
export async function testAPIConnection(
  config: APIProviderConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(config.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: "test",
        messages: [{ role: "user", content: "test" }],
      }),
    });

    if (response.ok || response.status === 401) {
      // 401 يعني أن الاتصال نجح لكن المفتاح قد يكون خاطئ
      return {
        success: true,
        message: "تم الاتصال بنجاح",
      };
    }

    return {
      success: false,
      message: `فشل الاتصال: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `خطأ في الاتصال: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
    };
  }
}

/**
 * مسح جميع إعدادات API
 */
export async function clearAllAPIConfigs(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to clear API configs"));
  });
}
