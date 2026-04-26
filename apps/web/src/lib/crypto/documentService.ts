import { logger } from "@/lib/ai/utils/logger";

/**
 * Encrypted Document Service
 * خدمة المستندات المشفرة
 *
 * هذه الخدمة تدير حفظ وتحميل المستندات المشفرة
 */

import {
  encryptDocument,
  decryptDocument,
  getKeyManager,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  uint8ArrayToBase64,
  base64ToUint8Array,
  type EncryptedDocument,
  type AADParams,
} from "@/lib/crypto";

export interface SaveDocumentParams {
  content: string;
  userId: string;
  docId?: string;
}

export interface LoadDocumentParams {
  docId: string;
  userId: string;
}

/**
 * حفظ مستند مشفر
 */
export async function saveEncryptedDocument(
  params: SaveDocumentParams
): Promise<{ success: boolean; docId?: string; error?: string }> {
  try {
    const keyManager = getKeyManager();
    const kek = keyManager.getKEK();

    if (!kek) {
      return {
        success: false,
        error: "لم يتم العثور على مفتاح التشفير. يرجى تسجيل الدخول أولاً.",
      };
    }

    // تحديد docId (جديد أو تحديث)
    const docId = params.docId ?? generateDocId();
    const version = params.docId ? await getNextVersion(params.docId) : 1;

    // تشفير المحتوى
    const aadParams: AADParams = {
      userId: params.userId,
      docId,
      version,
    };

    const encryptedDoc = await encryptDocument(params.content, kek, aadParams);

    // تحويل إلى Base64 للإرسال
    const payload = {
      ciphertext: arrayBufferToBase64(encryptedDoc.ciphertext),
      iv: uint8ArrayToBase64(encryptedDoc.iv),
      wrappedDEK: arrayBufferToBase64(encryptedDoc.wrappedDEK),
      wrappedDEKiv: uint8ArrayToBase64(encryptedDoc.wrappedDEKiv),
      version: encryptedDoc.version,
    };

    // إرسال إلى السيرفر
    const endpoint = params.docId ? `/api/docs/${params.docId}` : "/api/docs";
    const method = params.docId ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error ?? "فشل في حفظ المستند",
      };
    }

    return {
      success: true,
      docId: data.data.id ?? docId,
    };
  } catch (error) {
    logger.error("خطأ في حفظ المستند المشفر:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "خطأ غير معروف",
    };
  }
}

/**
 * تحميل مستند مشفر
 */
export async function loadEncryptedDocument(
  params: LoadDocumentParams
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const keyManager = getKeyManager();
    const kek = keyManager.getKEK();

    if (!kek) {
      return {
        success: false,
        error: "لم يتم العثور على مفتاح التشفير. يرجى تسجيل الدخول أولاً.",
      };
    }

    // جلب المستند من السيرفر
    const response = await fetch(`/api/docs/${params.docId}`, {
      credentials: "include",
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error ?? "فشل في تحميل المستند",
      };
    }

    const encryptedDoc = data.data;

    // تحويل من Base64
    const docToDecrypt: EncryptedDocument = {
      ciphertext: base64ToArrayBuffer(encryptedDoc.ciphertext),
      iv: base64ToUint8Array(encryptedDoc.iv),
      wrappedDEK: base64ToArrayBuffer(encryptedDoc.wrappedDEK),
      wrappedDEKiv: base64ToUint8Array(encryptedDoc.wrappedDEKiv),
      version: encryptedDoc.version,
      aad: "", // سيتم بناؤه في decryptDocument
    };

    // فك التشفير
    const aadParams: AADParams = {
      userId: params.userId,
      docId: params.docId,
      version: encryptedDoc.version,
    };

    const content = await decryptDocument(docToDecrypt, kek, aadParams);

    return {
      success: true,
      content,
    };
  } catch (error) {
    logger.error("خطأ في تحميل المستند المشفر:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "خطأ غير معروف",
    };
  }
}

/**
 * قائمة المستندات
 */
export async function listEncryptedDocuments(): Promise<{
  success: boolean;
  documents?: {
    id: string;
    version: number;
    ciphertextSize: number;
    createdAt: string;
    lastModified: string;
  }[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/docs", {
      credentials: "include",
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error ?? "فشل في جلب قائمة المستندات",
      };
    }

    return {
      success: true,
      documents: data.data,
    };
  } catch (error) {
    logger.error("خطأ في جلب قائمة المستندات:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "خطأ غير معروف",
    };
  }
}

/**
 * حذف مستند
 */
export async function deleteEncryptedDocument(
  docId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/docs/${docId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error ?? "فشل في حذف المستند",
      };
    }

    return { success: true };
  } catch (error) {
    logger.error("خطأ في حذف المستند:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "خطأ غير معروف",
    };
  }
}

/**
 * توليد معرف مستند
 */
function generateDocId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * الحصول على رقم الإصدار التالي
 */
async function getNextVersion(docId: string): Promise<number> {
  try {
    const response = await fetch(`/api/docs/${docId}`, {
      credentials: "include",
    });

    const data = await response.json();

    if (data.success && data.data.version) {
      return data.data.version + 1;
    }

    return 1;
  } catch {
    return 1;
  }
}
