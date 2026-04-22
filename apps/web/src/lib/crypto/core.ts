/**
 * مكتبة التشفير الأساسية (Crypto Core)
 * Zero-Knowledge Encryption Library
 *
 * المبادئ الأساسية:
 * 1. جميع عمليات التشفير تتم على جانب العميل
 * 2. لا يتم إرسال أي مفاتيح تشفير إلى السيرفر
 * 3. KEK مشتق من كلمة المرور ولا يغادر المتصفح
 * 4. DEK عشوائي لكل مستند ويُلف بواسطة KEK
 */

// نوع مساعد لتوافق Uint8Array مع Web Crypto API في TypeScript 5.7+
type CryptoBuffer = Uint8Array<ArrayBuffer>;

// ثوابت التشفير
export const CRYPTO_CONSTANTS = {
  // KDF (Key Derivation Function)
  KDF_ITERATIONS: 600000, // عدد دورات PBKDF2
  KDF_HASH: "SHA-256",
  KDF_KEY_LENGTH: 32, // 256 بت
  SALT_LENGTH: 16, // 128 بت

  // AES-GCM
  AES_KEY_LENGTH: 256,
  AES_IV_LENGTH: 12, // 96 بت (موصى به لـ GCM)
  AES_TAG_LENGTH: 128, // 128 بت

  // Key Wrapping
  WRAP_IV_LENGTH: 12,
} as const;

/**
 * معلمات التشفير
 */
export interface EncryptionParams {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  authTag?: Uint8Array;
}

/**
 * حزمة المستند المشفر
 */
export interface EncryptedDocument {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  wrappedDEK: ArrayBuffer;
  wrappedDEKiv: Uint8Array;
  version: number;
  aad: string; // Additional Authenticated Data
}

/**
 * معلمات AAD (Additional Authenticated Data)
 */
export interface AADParams {
  userId: string;
  docId: string;
  version: number;
}

/**
 * توليد ملح عشوائي
 */
export function generateSalt(): CryptoBuffer {
  return crypto.getRandomValues(
    new Uint8Array(CRYPTO_CONSTANTS.SALT_LENGTH)
  ) as CryptoBuffer;
}

/**
 * توليد IV عشوائي
 */
export function generateIV(): CryptoBuffer {
  return crypto.getRandomValues(
    new Uint8Array(CRYPTO_CONSTANTS.AES_IV_LENGTH)
  ) as CryptoBuffer;
}

/**
 * توليد DEK عشوائي
 */
export async function generateDEK(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: CRYPTO_CONSTANTS.AES_KEY_LENGTH,
    },
    true, // extractable (قابل للاستخراج للتغليف)
    ["encrypt", "decrypt"]
  );
}

/**
 * اشتقاق KEK من كلمة المرور باستخدام PBKDF2
 */
export async function deriveKEK(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // تحويل كلمة المرور إلى مفتاح
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // اشتقاق KEK
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as CryptoBuffer,
      iterations: CRYPTO_CONSTANTS.KDF_ITERATIONS,
      hash: CRYPTO_CONSTANTS.KDF_HASH,
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: CRYPTO_CONSTANTS.AES_KEY_LENGTH,
    },
    false, // non-extractable (لا يمكن استخراجه)
    ["wrapKey", "unwrapKey"]
  );
}

/**
 * اشتقاق authVerifier من كلمة المرور (للمصادقة فقط)
 */
export async function deriveAuthVerifier(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const verifierBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as CryptoBuffer,
      iterations: CRYPTO_CONSTANTS.KDF_ITERATIONS,
      hash: CRYPTO_CONSTANTS.KDF_HASH,
    },
    passwordKey,
    256 // 256 بت
  );

  return new Uint8Array(verifierBits) as CryptoBuffer;
}

/**
 * بناء AAD من المعلمات
 */
export function buildAAD(params: AADParams): CryptoBuffer {
  const encoder = new TextEncoder();
  const aadString = `${params.userId}:${params.docId}:${params.version}`;
  return encoder.encode(aadString) as CryptoBuffer;
}

/**
 * تشفير البيانات باستخدام DEK
 */
export async function encryptData(
  data: string,
  dek: CryptoKey,
  aad: Uint8Array
): Promise<EncryptionParams> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const iv = generateIV();

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as CryptoBuffer,
      additionalData: aad as CryptoBuffer,
      tagLength: CRYPTO_CONSTANTS.AES_TAG_LENGTH,
    },
    dek,
    dataBuffer
  );

  return {
    ciphertext,
    iv,
  };
}

/**
 * فك تشفير البيانات باستخدام DEK
 */
export async function decryptData(
  params: EncryptionParams,
  dek: CryptoKey,
  aad: Uint8Array
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: params.iv as CryptoBuffer,
      additionalData: aad as CryptoBuffer,
      tagLength: CRYPTO_CONSTANTS.AES_TAG_LENGTH,
    },
    dek,
    params.ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * تغليف DEK باستخدام KEK
 */
export async function wrapDEK(
  dek: CryptoKey,
  kek: CryptoKey
): Promise<{ wrappedKey: ArrayBuffer; iv: Uint8Array }> {
  const iv = generateIV();

  const wrappedKey = await crypto.subtle.wrapKey("raw", dek, kek, {
    name: "AES-GCM",
    iv: iv as CryptoBuffer,
    tagLength: CRYPTO_CONSTANTS.AES_TAG_LENGTH,
  });

  return { wrappedKey, iv };
}

/**
 * فك تغليف DEK باستخدام KEK
 */
export async function unwrapDEK(
  wrappedKey: ArrayBuffer,
  iv: Uint8Array,
  kek: CryptoKey
): Promise<CryptoKey> {
  return await crypto.subtle.unwrapKey(
    "raw",
    wrappedKey,
    kek,
    {
      name: "AES-GCM",
      iv: iv as CryptoBuffer,
      tagLength: CRYPTO_CONSTANTS.AES_TAG_LENGTH,
    },
    {
      name: "AES-GCM",
      length: CRYPTO_CONSTANTS.AES_KEY_LENGTH,
    },
    true, // extractable (للتشفير/فك التشفير)
    ["encrypt", "decrypt"]
  );
}

/**
 * تشفير مستند كامل (عملية شاملة)
 */
export async function encryptDocument(
  content: string,
  kek: CryptoKey,
  aadParams: AADParams
): Promise<EncryptedDocument> {
  // 1. توليد DEK عشوائي
  const dek = await generateDEK();

  // 2. بناء AAD
  const aad = buildAAD(aadParams);

  // 3. تشفير المحتوى
  const { ciphertext, iv } = await encryptData(content, dek, aad);

  // 4. تغليف DEK
  const { wrappedKey: wrappedDEK, iv: wrappedDEKiv } = await wrapDEK(dek, kek);

  return {
    ciphertext,
    iv,
    wrappedDEK,
    wrappedDEKiv,
    version: aadParams.version,
    aad: `${aadParams.userId}:${aadParams.docId}:${aadParams.version}`,
  };
}

/**
 * فك تشفير مستند كامل (عملية شاملة)
 */
export async function decryptDocument(
  encryptedDoc: EncryptedDocument,
  kek: CryptoKey,
  aadParams: AADParams
): Promise<string> {
  // 1. فك تغليف DEK
  const dek = await unwrapDEK(
    encryptedDoc.wrappedDEK,
    encryptedDoc.wrappedDEKiv,
    kek
  );

  // 2. بناء AAD
  const aad = buildAAD(aadParams);

  // 3. فك تشفير المحتوى
  return await decryptData(
    {
      ciphertext: encryptedDoc.ciphertext,
      iv: encryptedDoc.iv,
    },
    dek,
    aad
  );
}

/**
 * توليد Recovery Key
 */
export function generateRecoveryKey(): string {
  const recoveryBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(recoveryBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .match(/.{1,4}/g)!
    .join("-")
    .toUpperCase();
}

/**
 * تحويل ArrayBuffer إلى Base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

/**
 * تحويل Base64 إلى ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/**
 * تحويل Uint8Array إلى Base64
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  return arrayBufferToBase64(array.buffer as ArrayBuffer);
}

/**
 * تحويل Base64 إلى Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}
