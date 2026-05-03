// ============================================================================
// حماية التخزين المحلي من التوكنات الحساسة
// ============================================================================
// يطبَّق على كل تطبيق في apps/web. يفحص localStorage و sessionStorage
// ضد قائمة أنماط مفاتيح أو قيم تشير إلى JWT/access/refresh tokens.
// عند الكشف، يمسح المفتاح ويسجّل تنبيهاً (دون كشف القيمة).

/**
 * أنماط أسماء المفاتيح التي يُمنع وجودها في التخزين المحلي.
 */
const BLOCKED_KEY_PATTERNS: ReadonlyArray<RegExp> = [
  /\bjwt\b/i,
  /\baccess[_-]?token\b/i,
  /\brefresh[_-]?token\b/i,
  /\bid[_-]?token\b/i,
  /\bauth[_-]?token\b/i,
  /\bbearer\b/i,
  /\bsession[_-]?token\b/i,
  /^authorization$/i,
  /\bapi[_-]?key\b/i,
  /\bsecret\b/i,
  /\bclient[_-]?secret\b/i,
];

/**
 * أنماط قيم التخزين التي تشير إلى JWT (header.payload.signature).
 */
const JWT_VALUE_PATTERN = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * أنماط قيم بادئة Bearer.
 */
const BEARER_VALUE_PATTERN = /^Bearer\s+[A-Za-z0-9._-]+/i;

/**
 * استثناءات صريحة: مفاتيح يُسمح بها رغم تطابقها مع نمط (مثل XSRF cookie token).
 */
const EXEMPT_KEYS: ReadonlySet<string> = new Set(["XSRF-TOKEN", "csrf-token", "__csrf"]);

/**
 * نتيجة فحص واحدة.
 */
export interface ClientTokenAuditFinding {
  storage: "localStorage" | "sessionStorage";
  key: string;
  reason: "key_pattern" | "value_pattern_jwt" | "value_pattern_bearer";
}

export interface ClientTokenAuditReport {
  findings: ClientTokenAuditFinding[];
  cleared: number;
  scannedKeys: number;
}

/**
 * يفحص storage محدد ويمسح المفاتيح المخالفة.
 * يستخدم safe-by-default: يمسح بدلاً من تركها.
 */
function auditStorage(
  storage: Storage,
  storageName: "localStorage" | "sessionStorage",
  options: { clear: boolean },
): { findings: ClientTokenAuditFinding[]; cleared: number; scannedKeys: number } {
  const findings: ClientTokenAuditFinding[] = [];
  let cleared = 0;
  const keysSnapshot: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key !== null) {
      keysSnapshot.push(key);
    }
  }

  for (const key of keysSnapshot) {
    if (EXEMPT_KEYS.has(key)) {
      continue;
    }

    let matched: ClientTokenAuditFinding["reason"] | undefined;

    if (BLOCKED_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      matched = "key_pattern";
    } else {
      const value = storage.getItem(key);
      if (typeof value === "string" && value.length > 0) {
        if (JWT_VALUE_PATTERN.test(value.trim())) {
          matched = "value_pattern_jwt";
        } else if (BEARER_VALUE_PATTERN.test(value.trim())) {
          matched = "value_pattern_bearer";
        }
      }
    }

    if (matched !== undefined) {
      findings.push({ storage: storageName, key, reason: matched });
      if (options.clear) {
        try {
          storage.removeItem(key);
          cleared += 1;
        } catch {
          // إن فشل الحذف (مثلاً storage مقفل)، نسجّل النتيجة دون رفع الخطأ.
        }
      }
    }
  }

  return { findings, cleared, scannedKeys: keysSnapshot.length };
}

/**
 * يفحص localStorage و sessionStorage معاً.
 * ينفّذ في المتصفح فقط. آمن للاستدعاء من SSR (يرجّع تقريراً فارغاً).
 *
 * @param options.clear إذا true يمسح المفاتيح المخالفة (الافتراضي true).
 */
export function auditClientTokenStorage(options: { clear?: boolean } = {}): ClientTokenAuditReport {
  const clear = options.clear ?? true;

  if (typeof window === "undefined") {
    return { findings: [], cleared: 0, scannedKeys: 0 };
  }

  const aggregate: ClientTokenAuditReport = {
    findings: [],
    cleared: 0,
    scannedKeys: 0,
  };

  try {
    if (typeof window.localStorage !== "undefined") {
      const local = auditStorage(window.localStorage, "localStorage", { clear });
      aggregate.findings.push(...local.findings);
      aggregate.cleared += local.cleared;
      aggregate.scannedKeys += local.scannedKeys;
    }
  } catch {
    // localStorage قد يكون محظوراً (privacy mode).
  }

  try {
    if (typeof window.sessionStorage !== "undefined") {
      const session = auditStorage(window.sessionStorage, "sessionStorage", { clear });
      aggregate.findings.push(...session.findings);
      aggregate.cleared += session.cleared;
      aggregate.scannedKeys += session.scannedKeys;
    }
  } catch {
    // كذلك للجلسة.
  }

  return aggregate;
}

/**
 * تأكيد سلوكي صارم للاختبارات: يرفع خطأ إن وُجد توكن في التخزين.
 * يُستخدم في E2E بعد تسجيل الدخول.
 */
export function assertNoClientTokenStorage(): void {
  const report = auditClientTokenStorage({ clear: false });
  if (report.findings.length > 0) {
    const summary = report.findings
      .map((f) => `${f.storage}:${f.key}(${f.reason})`)
      .join(", ");
    throw new Error(
      `[security] sensitive token detected in client storage: ${summary}. ` +
        `Tokens must be stored in HttpOnly Secure SameSite cookies only.`,
    );
  }
}

/**
 * يُسجّل تحذيراً في console عند العثور على توكن.
 * يُستخدم في bootstrap للتطبيق ليُمسح أي بقايا قبل أن يقرأها كود قديم.
 */
export function bootstrapClientStorageGuard(): ClientTokenAuditReport {
  const report = auditClientTokenStorage({ clear: true });
  if (report.findings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[security-middleware] cleared ${report.cleared} sensitive token(s) from client storage. ` +
        `Reason: legacy token storage is forbidden — sessions must use HttpOnly cookies.`,
    );
  }
  return report;
}
