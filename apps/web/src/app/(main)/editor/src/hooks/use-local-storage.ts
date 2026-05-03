/**
 * أنماط مفاتيح ممنوعة منعاً باتاً من التخزين المحلي.
 *
 * إصلاح P0-1: يمنع تسرّب JWT/access/refresh tokens إلى localStorage.
 * أي محاولة كتابة مفتاح يطابق هذه الأنماط تُرفض في الكود نفسه،
 * وليست مجرد تحذير في وقت الفحص. هذه طبقة دفاع داخل المحرر،
 * تكمّل auditClientTokenStorage في @the-copy/security-middleware.
 */
const FORBIDDEN_KEY_PATTERNS: ReadonlyArray<RegExp> = [
  /\bjwt\b/i,
  /\baccess[_-]?token\b/i,
  /\brefresh[_-]?token\b/i,
  /\bid[_-]?token\b/i,
  /\bauth[_-]?token\b/i,
  /\bbearer\b/i,
  /\bsession[_-]?token\b/i,
  /^authorization$/i,
  /\bsecret\b/i,
];

const isForbiddenKey = (key: string): boolean =>
  FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));

const loadJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  if (isForbiddenKey(key)) {
    // لا نقرأ مفاتيح حساسة حتى لو وُجدت. نتجاهلها.
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const saveJson = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return;
  if (isForbiddenKey(key)) {
    // لا تكتب توكنات حساسة في التخزين المحلي.
    // هذا يخالف عقد الأمان: التوكنات تذهب إلى HttpOnly cookies فقط.
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.error(
        `[editor/use-local-storage] refused to write forbidden key: ${key}. ` +
          `Tokens must be stored in HttpOnly Secure SameSite cookies only.`,
      );
    }
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const timeoutMap = new Map<string, number>();

/**
 * @description تقوم بحفظ القيمة في `localStorage` تلقائياً بعد مرور فترة زمنية باستخدام مؤقت (Debounce).
 * تفيد في حالات الحفظ التلقائي للبيانات أثناء الكتابة.
 *
 * @param {string} key - مفتاح التخزين.
 * @param {T} value - القيمة المراد تخزينها.
 * @param {number} delay - فترة التأخير بالمللي ثانية (الافتراضي 3000).
 *
 * @complexity الزمنية: O(1) | المكانية: O(1)
 *
 * @sideEffects
 *   - تنشئ وتزيل مؤقتات (setTimeout/clearTimeout).
 *   - تكتب في المتصفح `localStorage`.
 *
 * @example
 * ```typescript
 * useAutoSave('doc-draft', currentData);
 * ```
 */
export const scheduleAutoSave = <T>(
  key: string,
  value: T,
  delay = 3000
): void => {
  if (typeof window === "undefined") return;

  const pending = timeoutMap.get(key);
  if (pending !== undefined) {
    window.clearTimeout(pending);
  }

  const timeoutId = window.setTimeout(() => {
    saveJson(key, value);
    timeoutMap.delete(key);
  }, delay);

  timeoutMap.set(key, timeoutId);
};

/**
 * @description دالة سريعة لاسترجاع قيمة مخزنة بصيغة JSON. تُرجع القيمة الافتراضية في حال الفشل أو عدم الوجود.
 *
 * @param {string} key - مفتاح التخزين.
 * @param {T} defaultValue - القيمة الافتراضية.
 *
 * @returns {T} القيمة المُسترجعة أو القيمة الافتراضية.
 */
export const loadFromStorage = <T>(key: string, defaultValue: T): T =>
  loadJson<T>(key, defaultValue);

/**
 * @description دالة مباشرة لحفظ القيمة في `localStorage` بصيغة JSON دون تأخير.
 *
 * @param {string} key - مفتاح التخزين.
 * @param {T} value - القيمة المراد حفظها.
 */
export const saveToStorage = <T>(key: string, value: T): void =>
  saveJson(key, value);
