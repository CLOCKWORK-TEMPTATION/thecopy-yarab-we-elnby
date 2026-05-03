// ============================================================================
// مساعدات الخادم: rate limiting، session scoping، auth guards
// ============================================================================
// الحد الأدنى المطلوب لإصلاحات P0:
// - rateLimitInMemory: حد طلبات لكل IP/session بدون اعتماد خارجي.
// - getOrCreateAnonymousSessionId: عزل بيانات المجهول عن غيره.
// - resolveActorIdentity: يحدّد user_id أو anonymous_session_id بثبات.
//
// ملاحظة: rate limiter داخلي يصلح كحماية افتراضية. عند توفر Redis يستبدل
// بمحوّل خارجي عبر نفس الواجهة.

import { ApiError } from "@the-copy/api-client";

/**
 * هوية الفاعل (مستخدم مصادق أو جلسة مجهول).
 */
export type ActorIdentity =
  | { kind: "user"; userId: string }
  | { kind: "anonymous"; anonymousSessionId: string };

/**
 * مفتاح الـ cookie لمعرّف جلسة المجهول.
 */
export const ANONYMOUS_SESSION_COOKIE = "tc_anon_sid";

/**
 * يولّد معرّف جلسة مجهول جديد آمن وعشوائي.
 */
export function generateAnonymousSessionId(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * مخزن rate limiting في الذاكرة. لكل instance، آمن للاستخدام داخل
 * Next.js route handler واحد. عند الحاجة لمشاركة بين instances،
 * تستبدل الواجهة بـ Redis أو ما يكافئه دون تغيير الواجهة العامة.
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_STORE: Map<string, RateLimitBucket> = (() => {
  const globalKey = "__the_copy_rate_limit_store__";
  const g = globalThis as unknown as Record<string, unknown>;
  const existing = g[globalKey];
  if (existing instanceof Map) {
    return existing as Map<string, RateLimitBucket>;
  }
  const store = new Map<string, RateLimitBucket>();
  g[globalKey] = store;
  return store;
})();

export interface RateLimitOptions {
  /** مفتاح فريد للحد (مثل "actorai-arabic:analyze:" + actorId). */
  key: string;
  /** الحد الأقصى للطلبات داخل النافذة. */
  limit: number;
  /** نافذة القياس بالميلي ثانية. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * فحص rate limit ذري. يرفع ApiError quota_exceeded عند التجاوز.
 */
export function rateLimitInMemory(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = RATE_LIMIT_STORE.get(options.key);

  if (existing === undefined || existing.resetAt <= now) {
    const bucket: RateLimitBucket = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    RATE_LIMIT_STORE.set(options.key, bucket);
    return { ok: true, remaining: Math.max(0, options.limit - 1), resetAt: bucket.resetAt };
  }

  if (existing.count >= options.limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * نسخة ترفع ApiError مباشرة عند التجاوز.
 */
export function enforceRateLimit(options: RateLimitOptions): RateLimitResult {
  const result = rateLimitInMemory(options);
  if (!result.ok) {
    throw new ApiError({
      code: "quota_exceeded",
      message: "تجاوزت حد الاستخدام المسموح. يرجى المحاولة لاحقاً.",
      details: { resetAt: result.resetAt },
    });
  }
  return result;
}

/**
 * استخراج معرّف الفاعل من Headers/Cookies.
 * إذا توفر userId من session مصادق، يُستخدم.
 * وإلا يُقرأ anonymous session id من cookie؛ إن غاب يولّده caller.
 */
export function readActorIdentity(input: {
  userId?: string | null;
  anonymousSessionId?: string | null;
}): ActorIdentity | null {
  if (typeof input.userId === "string" && input.userId.length > 0) {
    return { kind: "user", userId: input.userId };
  }
  if (typeof input.anonymousSessionId === "string" && input.anonymousSessionId.length > 0) {
    return { kind: "anonymous", anonymousSessionId: input.anonymousSessionId };
  }
  return null;
}

/**
 * يبني WHERE clause مفهوم لـ ORM/SQL لعزل بيانات الفاعل.
 * يُستخدم في كل قراءة/كتابة لمنع تسرّب البيانات بين المستخدمين.
 */
export function actorScopeFilter(actor: ActorIdentity): {
  userId: string | null;
  anonymousSessionId: string | null;
} {
  if (actor.kind === "user") {
    return { userId: actor.userId, anonymousSessionId: null };
  }
  return { userId: null, anonymousSessionId: actor.anonymousSessionId };
}

/**
 * مفتاح rate limit موحد لكل actor.
 */
export function rateLimitKeyFor(actor: ActorIdentity, action: string): string {
  if (actor.kind === "user") {
    return `${action}:user:${actor.userId}`;
  }
  return `${action}:anon:${actor.anonymousSessionId}`;
}

/**
 * يفرض وجود مستخدم مصادق وإلا يرفع auth_required.
 */
export function requireUser(actor: ActorIdentity | null): { userId: string } {
  if (actor === null || actor.kind !== "user") {
    throw new ApiError({
      code: "auth_required",
      message: "يلزم تسجيل الدخول لاستكمال هذا الإجراء.",
    });
  }
  return { userId: actor.userId };
}
