/**
 * @module extensions/paste-classifier/utils/hash
 *
 * تجزئة بسيطة سريعة للنصوص (DJB2 variant).
 * تُستخدم لبصمة المحتوى داخل deduplication ولفهرسة العينات.
 */

/**
 * تجزئة DJB2 سريعة منخفضة التصادم — تُرجع base36.
 */
export const simpleHash = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
};
