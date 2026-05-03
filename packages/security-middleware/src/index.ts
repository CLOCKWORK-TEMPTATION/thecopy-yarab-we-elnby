// واجهة عامة لحزمة @the-copy/security-middleware

export {
  assertNoClientTokenStorage,
  auditClientTokenStorage,
  bootstrapClientStorageGuard,
  type ClientTokenAuditFinding,
  type ClientTokenAuditReport,
} from "./client.js";

export {
  ANONYMOUS_SESSION_COOKIE,
  actorScopeFilter,
  enforceRateLimit,
  generateAnonymousSessionId,
  rateLimitInMemory,
  rateLimitKeyFor,
  readActorIdentity,
  requireUser,
  type ActorIdentity,
  type RateLimitOptions,
  type RateLimitResult,
} from "./server.js";
