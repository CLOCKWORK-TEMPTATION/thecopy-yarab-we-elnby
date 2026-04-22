/**
 * اختبارات مكتبة التشفير Zero-Knowledge
 * Crypto Core Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSalt,
  generateIV,
  generateDEK,
  deriveKEK,
  deriveAuthVerifier,
  buildAAD,
  encryptData,
  decryptData,
  encryptDocument,
  decryptDocument,
  generateRecoveryKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  uint8ArrayToBase64,
  base64ToUint8Array,
  CRYPTO_CONSTANTS,
} from "../core";

describe("Crypto Core - Key Generation", () => {
  it("should generate random salt of correct length", () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(CRYPTO_CONSTANTS.SALT_LENGTH);
  });

  it("should generate different salts each time", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toEqual(salt2);
  });

  it("should generate random IV of correct length", () => {
    const iv = generateIV();
    expect(iv).toBeInstanceOf(Uint8Array);
    expect(iv.length).toBe(CRYPTO_CONSTANTS.AES_IV_LENGTH);
  });

  it("should generate recovery key in correct format", () => {
    const recoveryKey = generateRecoveryKey();
    // 32 بايت = 64 حرف hex → مقسمة إلى 16 مجموعة من 4 أحرف مع 15 شرطة = 79 حرف
    expect(typeof recoveryKey).toBe("string");
    expect(recoveryKey.length).toBe(79); // 64 hex chars + 15 hyphens
    expect(recoveryKey).toMatch(/^[A-F0-9-]+$/);
    const groups = recoveryKey.split("-");
    expect(groups.length).toBe(16);
    groups.forEach((group) => {
      expect(group.length).toBe(4);
    });
  });
});

describe("Crypto Core - Key Derivation", () => {
  const testPassword = "TestPassword123!@#";
  let testSalt: Uint8Array;

  beforeEach(() => {
    testSalt = generateSalt();
  });

  it("should derive KEK from password", async () => {
    const kek = await deriveKEK(testPassword, testSalt);
    expect(kek).toBeDefined();
    expect(kek.type).toBe("secret");
  });

  it("should derive authVerifier from password", async () => {
    const authVerifier = await deriveAuthVerifier(testPassword, testSalt);
    expect(authVerifier).toBeInstanceOf(Uint8Array);
    expect(authVerifier.length).toBe(32); // 256 bits
  });

  it("should derive same authVerifier from same password and salt", async () => {
    const av1 = await deriveAuthVerifier(testPassword, testSalt);
    const av2 = await deriveAuthVerifier(testPassword, testSalt);
    expect(av1).toEqual(av2);
  });
});

describe("Crypto Core - Encryption/Decryption", () => {
  const testContent = "مشهد خارجي - نهار\n\nشخصية تدخل الغرفة...";
  let testDEK: CryptoKey;
  let testAAD: Uint8Array;

  beforeEach(async () => {
    testDEK = await generateDEK();
    testAAD = buildAAD({
      userId: "user123",
      docId: "doc456",
      version: 1,
    });
  });

  it("should encrypt data", async () => {
    const encrypted = await encryptData(testContent, testDEK, testAAD);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.ciphertext.byteLength).toBeGreaterThan(0);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.iv).toBeInstanceOf(Uint8Array);
    expect(encrypted.iv.length).toBe(CRYPTO_CONSTANTS.AES_IV_LENGTH);
    // Ciphertext should not equal plaintext when encoded
    const encoder = new TextEncoder();
    const plainBuffer = encoder.encode(testContent);
    expect(new Uint8Array(encrypted.ciphertext)).not.toEqual(
      new Uint8Array(plainBuffer.buffer)
    );
  });

  it("should decrypt data correctly", async () => {
    const { ciphertext, iv } = await encryptData(testContent, testDEK, testAAD);
    const decrypted = await decryptData({ ciphertext, iv }, testDEK, testAAD);

    expect(decrypted).toBe(testContent);
  });

  it("should fail to decrypt with wrong AAD", async () => {
    const { ciphertext, iv } = await encryptData(testContent, testDEK, testAAD);

    const wrongAAD = buildAAD({
      userId: "user999",
      docId: "doc456",
      version: 1,
    });

    await expect(
      decryptData({ ciphertext, iv }, testDEK, wrongAAD)
    ).rejects.toThrow();
  });
});

describe("Crypto Core - Document Encryption/Decryption", () => {
  const testContent = "مشهد داخلي - ليل\n\nشخصية: مرحباً بك في المنصة المشفرة.";
  const testPassword = "SecurePassword123!@#";
  let testKEK: CryptoKey;
  const aadParams = {
    userId: "user123",
    docId: "doc456",
    version: 1,
  };

  beforeEach(async () => {
    const salt = generateSalt();
    testKEK = await deriveKEK(testPassword, salt);
  });

  it("should encrypt document completely", async () => {
    const encryptedDoc = await encryptDocument(testContent, testKEK, aadParams);
    expect(encryptedDoc).toBeDefined();
    expect(encryptedDoc.ciphertext).toBeDefined();
    expect(encryptedDoc.ciphertext.byteLength).toBeGreaterThan(0);
    expect(encryptedDoc.iv).toBeInstanceOf(Uint8Array);
    expect(encryptedDoc.wrappedDEK).toBeDefined();
    expect(encryptedDoc.wrappedDEK.byteLength).toBeGreaterThan(0);
    expect(encryptedDoc.wrappedDEKiv).toBeInstanceOf(Uint8Array);
    expect(encryptedDoc.version).toBe(aadParams.version);
    expect(encryptedDoc.aad).toBe("user123:doc456:1");
  });

  it("should decrypt document correctly", async () => {
    const encryptedDoc = await encryptDocument(testContent, testKEK, aadParams);
    const decrypted = await decryptDocument(encryptedDoc, testKEK, aadParams);

    expect(decrypted).toBe(testContent);
  });

  it("should handle Arabic text correctly", async () => {
    const arabicContent =
      "هذا نص عربي طويل يحتوي على كلمات كثيرة للتأكد من أن التشفير يعمل بشكل صحيح";
    const encryptedDoc = await encryptDocument(
      arabicContent,
      testKEK,
      aadParams
    );
    const decrypted = await decryptDocument(encryptedDoc, testKEK, aadParams);

    expect(decrypted).toBe(arabicContent);
  });
});

describe("Crypto Core - Base64 Encoding", () => {
  it("should convert ArrayBuffer to Base64 and back", () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const base64 = arrayBufferToBase64(original);
    const restored = base64ToArrayBuffer(base64);

    expect(new Uint8Array(restored)).toEqual(new Uint8Array(original));
  });

  it("should convert Uint8Array to Base64 and back", () => {
    const original = new Uint8Array([10, 20, 30, 40, 50]);
    const base64 = uint8ArrayToBase64(original);
    const restored = base64ToUint8Array(base64);

    expect(restored).toEqual(original);
  });
});

describe("Crypto Core - AAD Building", () => {
  it("should build AAD correctly", () => {
    const aad = buildAAD({ userId: "user1", docId: "doc1", version: 1 });
    // التحقق من أنه مصفوفة بايتات (تجنب instanceof عبر الحدود)
    expect(aad.length).toBeGreaterThan(0);
    expect(aad.constructor.name).toBe("Uint8Array");
    // Verify the format matches expected pattern
    const decoder = new TextDecoder();
    const aadString = decoder.decode(aad);
    expect(aadString).toBe("user1:doc1:1");
  });

  it("should create different AAD for different params", () => {
    const aad1 = buildAAD({ userId: "user1", docId: "doc1", version: 1 });
    const aad2 = buildAAD({ userId: "user2", docId: "doc1", version: 1 });

    expect(aad1).not.toEqual(aad2);
  });
});
