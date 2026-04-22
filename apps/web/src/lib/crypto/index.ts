/**
 * ملف التصدير الرئيسي لمكتبة التشفير
 */

// Core encryption functions
export {
  CRYPTO_CONSTANTS,
  generateSalt,
  generateIV,
  generateDEK,
  deriveKEK,
  deriveAuthVerifier,
  buildAAD,
  encryptData,
  decryptData,
  wrapDEK,
  unwrapDEK,
  encryptDocument,
  decryptDocument,
  generateRecoveryKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "./core";

export type { EncryptionParams, EncryptedDocument, AADParams } from "./core";

// Key Manager
export { KeyManager, getKeyManager } from "./keyManager";

// BYO-API
export {
  saveAPIConfig,
  getAPIConfig,
  deleteAPIConfig,
  listAPIConfigs,
  testAPIConnection,
  clearAllAPIConfigs,
} from "./byoapi";

export type { APIProviderConfig } from "./byoapi";

// Document Service
export {
  saveEncryptedDocument,
  loadEncryptedDocument,
  listEncryptedDocuments,
  deleteEncryptedDocument,
} from "./documentService";

export type { SaveDocumentParams, LoadDocumentParams } from "./documentService";
