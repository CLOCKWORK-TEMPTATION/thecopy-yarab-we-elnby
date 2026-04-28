/**
 * @module document-model/encoding
 * @description دوال الترميز والتشفير (Base64, FNV1a, HTML escaping)
 */

/** يهرب محارف HTML الخمسة الخطرة (`& < > " '`) لمنع حقن XSS */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** يحوّل سلسلة UTF-8 إلى Base64 عبر TextEncoder + btoa */
export const utf8ToBase64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

/** يحوّل سلسلة Base64 إلى UTF-8 عبر atob + TextDecoder */
export const base64ToUtf8 = (value: string): string => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
};

/**
 * يحسب بصمة FNV-1a (32-بت) لسلسلة نصية.
 * تُستخدم كبصمة تحقق سريعة وغير تشفيرية للحمولة.
 * @param input - السلسلة المراد حساب بصمتها
 * @returns سلسلة هيكساديسيمال مُبطَّنة بأصفار (8 محارف)
 */
export const fnv1a = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

/** يُطبّع نص كتلة: يحوّل المسافات غير القابلة للكسر إلى عادية ويزيل CR */
export const normalizeBlockText = (value: string): string =>
  (value ?? "").replace(/\u00A0/g, " ").replace(/\r/g, "");
