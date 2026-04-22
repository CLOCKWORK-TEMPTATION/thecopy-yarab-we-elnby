# Security Guide

This document describes every security control in the The Copy platform. It is intended for developers, security reviewers, and operators who need to understand, configure, or audit the security posture of the system.

For authentication and authorisation flows specifically, see [AUTH.md](./AUTH.md) (if available) or the relevant controllers under `apps/backend/src/controllers/auth.controller.ts` and `apps/backend/src/controllers/zkAuth.controller.ts`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication and Authorisation](#2-authentication-and-authorisation)
3. [Security Headers (Helmet)](#3-security-headers-helmet)
4. [Content Security Policy](#4-content-security-policy)
5. [Input Validation (Zod)](#5-input-validation-zod)
6. [CORS Configuration](#6-cors-configuration)
7. [CSRF Protection](#7-csrf-protection)
8. [Rate Limiting](#8-rate-limiting)
9. [Web Application Firewall (WAF)](#9-web-application-firewall-waf)
10. [Security Logging and IP Tracking](#10-security-logging-and-ip-tracking)
11. [PII Sanitization in Logs](#11-pii-sanitization-in-logs)
12. [Secret Management](#12-secret-management)
13. [File Upload Security](#13-file-upload-security)
14. [Zero-Knowledge Authentication](#14-zero-knowledge-authentication)
15. [Reporting Vulnerabilities](#15-reporting-vulnerabilities)

---

## 1. Overview

The backend is an Express 5 API protected by a layered defence-in-depth stack. The middleware chain is ordered deliberately — each layer is applied before the next can be bypassed:

```
Request
  └─ Sentry error/performance tracking
  └─ Prometheus metrics
  └─ SLO metrics
  └─ WAF (block/monitor mode, OWASP CRS patterns)
  └─ Security event logging (auth attempts, rate limit violations)
  └─ Cookie parser
  └─ CSRF protection (Double Submit Cookie + Origin/Referer validation)
  └─ General middleware (CORS, Helmet, compression, body parsing)
  └─ PII log sanitization
  └─ Rate limiting (general, auth, AI)
  └─ Route handlers
  └─ Sentry error handler
  └─ Generic error handler
```

All security-relevant events are written to the Winston logger and, for critical events, forwarded to Sentry.

---

## 2. Authentication and Authorisation

### Standard JWT Authentication

- Passwords are hashed with **bcrypt** at cost factor 10 (`SALT_ROUNDS = 10`).
- On login or signup, the server issues two tokens:
  - **Access token** — valid for 15 minutes, signed with `JWT_SECRET`.
  - **Refresh token** — valid for 7 days, stored in the database.
- The `authMiddleware` (`apps/backend/src/middleware/auth.middleware.ts`) accepts the access token from either:
  - The `Authorization: Bearer <token>` header.
  - The `accessToken` HTTP-only cookie.
- On verification failure the middleware returns `401` with a generic Arabic-language error message. Internal JWT library error messages are never forwarded to the client.

### Zero-Knowledge Authentication

A separate ZK flow (`/api/auth/zk-*` endpoints) allows clients to authenticate without ever transmitting a cleartext password:

- The client derives an `authVerifier` from the user's passphrase using a client-side KDF.
- Only `authVerifier` (and `kdfSalt`, used to re-derive encryption keys client-side) are sent to the server.
- The server hashes `authVerifier` with bcrypt and stores only the hash.
- The encryption Key Encryption Key (KEK) never leaves the browser.

### Protected vs Public Routes

All routes under `/api/` that modify state or return user data are protected by `authMiddleware`. The following endpoints are deliberately public:

| Endpoint | Reason |
|----------|--------|
| `POST /api/auth/login` | Establishes session |
| `POST /api/auth/signup` | Creates account |
| `POST /api/auth/refresh` | Renews access token |
| `POST /api/auth/zk-signup` | ZK account creation |
| `POST /api/auth/zk-login-init` | ZK login challenge |
| `POST /api/auth/zk-login-verify` | ZK login verification |
| `GET /health*` | Infrastructure probes |
| `GET /metrics` | Prometheus scraping |

---

## 3. Security Headers (Helmet)

Helmet 8 is applied via `setupMiddleware` in `apps/backend/src/middleware/index.ts`. The following headers are set on every response:

| Header | Value / Behaviour |
|--------|-------------------|
| `X-Content-Type-Options` | `nosniff` — prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` — prevents clickjacking in all frames |
| `X-XSS-Protection` | `1; mode=block` — legacy browser XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cross-Origin-Embedder-Policy` | Enabled |
| `Cross-Origin-Opener-Policy` | Enabled |
| `Cross-Origin-Resource-Policy` | `same-site` |
| `DNS-Prefetch-Control` | Disabled (`allow: false`) |
| `X-Powered-By` | Removed (`hidePoweredBy: true`) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` (production only) |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=()` |

---

## 4. Content Security Policy

CSP is configured in two places. Helmet applies a CSP header globally; a separate `cspMiddleware` in `apps/backend/src/middleware/csp.middleware.ts` generates per-request nonces.

### Helmet CSP Directives

| Directive | Development | Production |
|-----------|-------------|------------|
| `default-src` | `'self'` | `'self'` |
| `script-src` | `'self' 'unsafe-inline'` | `'self'` |
| `style-src` | `'self' 'unsafe-inline'` | `'self'` |
| `img-src` | `'self' data: https:` | `'self' data: https:` |
| `connect-src` | `'self'` + Sentry ingest + OTLP endpoint | same |
| `font-src` | `'self'` | `'self'` |
| `object-src` | `'none'` | `'none'` |
| `frame-src` | `'none'` | `'none'` |
| `upgrade-insecure-requests` | Not set | Enabled |

The `'unsafe-inline'` allowance for scripts and styles is present in development only to support hot module replacement.

### Per-Request Nonce

The `cspMiddleware` generates a cryptographically random base64url nonce for every request using `crypto.getRandomValues`. The nonce is available in `res.locals.cspNonce` for use in server-rendered HTML.

---

## 5. Input Validation (Zod)

All API request bodies, query strings, and route parameters are validated using [Zod](https://zod.dev/) schemas defined in `apps/backend/src/middleware/validation.middleware.ts`.

- `validateBody(schema)` — validates `req.body`, replaces it with the typed, parsed value.
- `validateQuery(schema)` — validates `req.query`.
- `validateParams(schema)` — validates `req.params`.

On failure, a `400` response is returned with a structured list of field-level error messages. Raw Zod error internals are not forwarded to the client in production.

### Attack Pattern Detection

The `detectAttacks` middleware runs additional checks on the combined body and query string before passing the request to route handlers. It detects:

- SQL injection attempts (`'`, `--`, `#`, `%27`, `%23`)
- XSS payloads (`<script`, `<iframe`, `<object`, `<embed`, event handler attributes, `javascript:` and `data:text/html` URIs)
- Path traversal sequences (`../`, `..\`, `%2e%2e%2f`, `/etc/passwd`)

On detection, the request is rejected with `400` and the event is forwarded to the security logger.

### Common Validation Schemas

| Schema | Constraints |
|--------|------------|
| `idParam` | UUID format |
| `paginationQuery` | `page` and `limit` as numeric strings; `sort` as `asc` or `desc` |
| `analysisRequest` | `text` between 50 and 50 000 characters |
| `createProject` | `title` 1–200 characters |
| `createScene` | `sceneNumber` positive integer; `characters` non-empty array |
| `createCharacter` | `name` 1–100 characters |

---

## 6. CORS Configuration

Source: `apps/backend/src/middleware/index.ts`

```
Allowed origins (production):   CORS_ORIGIN environment variable (comma-separated)
Allowed origins (development):  CORS_ORIGIN + localhost:3000, 5173, 5174 and 127.0.0.1 equivalents
Allowed methods:                GET, POST, PUT, DELETE, OPTIONS
Allowed headers:                Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN
Exposed headers:                X-RateLimit-Limit, X-RateLimit-Remaining
Credentials:                    true (required for cookie-based auth and CSRF tokens)
Preflight cache:                86400 seconds (24 hours)
```

Requests without an `Origin` header (server-to-server calls, health probes) are allowed unconditionally. Requests with an `Origin` that is not on the whitelist are rejected and logged as a `CORS_VIOLATION` security event.

To configure allowed origins, set `CORS_ORIGIN` in `apps/backend/.env`:

```
CORS_ORIGIN=https://app.your-domain.com,https://www.your-domain.com
```

---

## 7. CSRF Protection

Source: `apps/backend/src/middleware/csrf.middleware.ts`

The implementation uses the **Double Submit Cookie** pattern combined with **Origin/Referer header validation** for defence in depth.

### Token Flow

1. On any `GET`/`HEAD`/`OPTIONS` request, the server sets an `XSRF-TOKEN` cookie (non-`httpOnly`, so JavaScript can read it).
2. For `POST`/`PUT`/`PATCH`/`DELETE` requests, the client must echo the cookie value in the `X-XSRF-TOKEN` request header.
3. The server compares the two values using a **constant-time comparison** function to prevent timing-based token guessing attacks.

### Cookie Attributes

| Attribute | Value |
|-----------|-------|
| `httpOnly` | `false` (must be readable by JavaScript) |
| `secure` | `true` in production, `false` in development |
| `sameSite` | `strict` |
| `maxAge` | 86 400 000 ms (24 hours) |

### Exempt Paths

The following paths skip CSRF token validation (they are public endpoints that establish the session):

- `/api/auth/login`
- `/api/auth/signup`
- `/api/auth/refresh`
- `/health`, `/health/live`, `/health/ready`, `/health/startup`
- `/metrics`

### Origin/Referer Validation (Second Layer)

In addition to token validation, a second inline middleware checks the `Origin` and `Referer` headers on all state-changing requests. It rejects requests where:

- Neither `Origin` nor `Referer` is present on a request identified as a browser request (by `Content-Type` and `User-Agent` heuristics).
- `Origin` is present but not in the allowed list.
- `Referer` is present but its origin is not in the allowed list.

Error codes returned:

| Code | Meaning |
|------|---------|
| `CSRF_TOKEN_MISSING` | Cookie or header token absent |
| `CSRF_TOKEN_INVALID` | Tokens do not match |
| `CSRF_MISSING_ORIGIN` | No Origin/Referer on a browser request |
| `CSRF_ORIGIN_MISMATCH` | Origin not in allowed list |
| `CSRF_REFERER_MISMATCH` | Referer origin not in allowed list |
| `CSRF_INVALID_REFERER` | Referer header is not a valid URL |

---

## 8. Rate Limiting

Source: `apps/backend/src/middleware/index.ts`

Three rate limiting tiers are applied using `express-rate-limit` 8.

| Limiter | Applies To | Window | Maximum Requests |
|---------|-----------|--------|-----------------|
| General API | All `/api/` routes | 15 minutes (`RATE_LIMIT_WINDOW_MS`) | 100 (`RATE_LIMIT_MAX_REQUESTS`) |
| Auth (strict) | `/api/auth/login`, `/api/auth/signup` | 15 minutes | 5 |
| AI analysis | `/api/analysis/`, `/api/projects/:id/analyze` | 1 hour | 20 |

The general window and maximum are configurable via environment variables:

```
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes in ms
RATE_LIMIT_MAX_REQUESTS=100
```

Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) are exposed to the client. Legacy headers are disabled.

The WAF also implements its own rate limiting at 100 requests per 60-second window with a 5-minute block on violation.

**Note on distributed deployments:** The current implementation uses the default in-memory store. For deployments with multiple backend instances, install `rate-limit-redis` and configure a shared Redis store as documented in `apps/backend/src/middleware/index.ts`.

---

## 9. Web Application Firewall (WAF)

Source: `apps/backend/src/middleware/waf.middleware.ts`

The WAF implements OWASP Core Rule Set (CRS) pattern matching and runs before all other application middleware.

### Modes

| Mode | Behaviour | When Active |
|------|-----------|-------------|
| `block` | Matching requests are rejected with `403` | `NODE_ENV === 'production'` |
| `monitor` | Matching requests are logged but allowed through | All other environments |

### Detection Rules

All rules are based on pre-compiled `RegExp` objects (never string-based patterns) to prevent regex injection.

#### SQL Injection (OWASP CRS 942)

| Rule ID | Description | Severity |
|---------|-------------|----------|
| 942100 | SELECT/INSERT/UPDATE/DELETE/DROP/UNION patterns combined with FROM/WHERE/VALUES | Critical |
| 942110 | Time-delay functions: WAITFOR, BENCHMARK, SLEEP; CHAR(), CONCAT(), CONVERT() | Critical |
| 942120 | UNION SELECT, tautology operators, LIKE with wildcard prefix, BETWEEN...AND | High |
| 942130 | SQL tautologies: `' OR '`=`'`, `OR 1=1`, `AND 1=1` | High |
| 942140 | Database metadata access: INFORMATION_SCHEMA, pg_catalog, SHOW TABLES | Critical |

#### XSS (OWASP CRS 941)

| Rule ID | Description | Severity |
|---------|-------------|----------|
| 941100 | Script tag vectors, `javascript:`, `data:text/html` | Critical |
| 941110 | `<script>`, `</script>`, vbscript/livescript | Critical |
| 941120 | All HTML event handler attributes (`onclick`, `onload`, etc.) | High |
| 941130 | CSS expression(), url() and behavior: in style attributes | High |
| 941140 | `href`/`src`/`action` pointing to `javascript:` URI | High |
| 941150 | Dangerous HTML tags: `<iframe>`, `<frame>`, `<object>`, `<embed>`, `<applet>`, `<meta>`, `<form>` | Medium |

#### Command Injection (OWASP CRS 932)

| Rule ID | Description | Severity |
|---------|-------------|----------|
| 932100 | Unix shell metacharacters and common command names (`cat`, `wget`, `curl`, `chmod`, etc.) | Critical |
| 932110 | Windows command injection: `cmd.exe`, `powershell`, `net user`, `wmic`, `tasklist` | Critical |
| 932120 | Shell metacharacters: `;`, `\|`, `` ` ``, `$()`, `eval`, `exec`, `system` | Critical |

#### Path Traversal, Protocol Attacks, and Bot Detection

Additional rule sets cover `../` sequences, HTTP protocol attacks, and known scanner user agents (`sqlmap`, `nikto`, `nmap`, `masscan`, `zgrab`, `python-requests/2`).

### IP Blocking

The WAF maintains a block list. Admins can manage it via the authenticated endpoints:

```
GET  /api/waf/blocked-ips          — List blocked IPs
POST /api/waf/block-ip             — Block an IP  { ip, reason }
POST /api/waf/unblock-ip           — Unblock an IP  { ip }
```

### Whitelisted IPs and Paths

By default, `127.0.0.1` and `::1` (localhost) are whitelisted. The following paths are also whitelisted: `/health`, `/health/live`, `/health/ready`, `/metrics`.

### WAF Management Endpoints

All endpoints below require a valid access token.

```
GET /api/waf/stats        — Aggregate event counts by rule type
GET /api/waf/events       — Recent WAF events (query: ?limit=N)
GET /api/waf/config       — Current configuration
PUT /api/waf/config       — Update configuration (CSRF protected)
```

---

## 10. Security Logging and IP Tracking

Source: `apps/backend/src/middleware/security-logger.middleware.ts`

### Security Event Types

Every security-relevant action is classified into one of the following event types:

| Event Type | Trigger |
|------------|---------|
| `AUTH_FAILED` | Login or token verification failure |
| `AUTH_SUCCESS` | Successful authentication |
| `RATE_LIMIT_EXCEEDED` | Response with status 429 |
| `SUSPICIOUS_INPUT` | Input matching attack patterns |
| `CORS_VIOLATION` | Request from non-whitelisted origin |
| `INVALID_TOKEN` | JWT verification error |
| `SQL_INJECTION_ATTEMPT` | SQL injection pattern detected |
| `XSS_ATTEMPT` | XSS pattern detected |
| `PATH_TRAVERSAL_ATTEMPT` | Path traversal sequence detected |
| `UNAUTHORIZED_ACCESS` | Access to protected resource without credentials |

### IP Tracking

Suspicious IPs are tracked in Redis (with an in-memory fallback when Redis is unavailable). Each IP record stores:

- Total violation count
- First seen timestamp
- Last seen timestamp
- Last 20 security events

**Auto-ban threshold:** An IP that accumulates more than 10 violations within a 1-hour window is flagged for automatic blocking. A Sentry `error`-level message is emitted when this threshold is reached. The TTL for IP tracking records is 24 hours.

### Critical Event Forwarding to Sentry

The following events are forwarded to Sentry as `warning`-level messages in addition to being logged locally:

- `SQL_INJECTION_ATTEMPT`
- `XSS_ATTEMPT`
- `PATH_TRAVERSAL_ATTEMPT`
- IP auto-ban triggers

---

## 11. PII Sanitization in Logs

Source: `apps/backend/src/middleware/log-sanitization.middleware.ts`

The `sanitizeRequestLogs` middleware runs before request logging. It applies the following redactions to all log entries:

| Data Type | Pattern | Replacement |
|-----------|---------|-------------|
| Passwords | Any key containing `password`, `passwd`, `pwd`, `secret` | `[REDACTED]` |
| Email addresses | RFC-5321 email pattern | `[EMAIL_REDACTED]` |
| JWT tokens | `Bearer <header.payload.signature>` | `[JWT_REDACTED]` |
| API keys | Keys named `api_key`, `apikey`, `access_token`, `auth_token` | `[API_KEY_REDACTED]` |
| Credit card numbers | 13–19 digit sequences | `[CARD_REDACTED]` |
| SSNs | US SSN format `NNN-NN-NNNN` | `[SSN_REDACTED]` |
| Phone numbers | Various international formats | `[PHONE_REDACTED]` |
| Authorization headers | `authorization` header value | `[AUTH_REDACTED]` |
| Session IDs | Cookies/sessions 20+ characters | `[SESSION_REDACTED]` |

Request bodies are never logged by default. Only the sanitized URL, headers, and query string are attached to the log context.

---

## 12. Secret Management

### Required Secrets

| Variable | Minimum Requirement | Notes |
|----------|--------------------|----|
| `JWT_SECRET` | 32 characters minimum | Must not contain `dev-secret` or `CHANGE-THIS` in production |
| `DATABASE_URL` | Valid PostgreSQL connection string | Append `?sslmode=require` for Neon |
| `REDIS_URL` | Valid Redis connection URL | Required when `REDIS_ENABLED=true` |
| `GEMINI_API_KEY` | Valid Google AI Studio key | Primary AI provider |

### Rules

1. Never commit `.env` files. The `.gitignore` at the repo root excludes all `.env` variants.
2. Use `.env.example` as the only committed template — it contains no real values.
3. In production, inject secrets via your deployment platform's secret manager (Vercel environment variables, AWS Secrets Manager, etc.) rather than writing them to disk.
4. Rotate `JWT_SECRET` during the scheduled maintenance window; all existing tokens will be invalidated.
5. API keys for AI providers (Anthropic, OpenAI, Gemini, Mistral, etc.) should be scoped to the minimum required permissions and rotated regularly.

---

## 13. File Upload Security

The platform handles PDF and document files through the OCR pipeline and the file import server. Multer 2 is used for multipart form handling.

- Files are processed through a queue (BullMQ) rather than synchronously in the request handler to prevent resource exhaustion.
- PDF files are processed with Poppler (for rendering) and Mistral OCR (for text extraction). File size limits and timeouts are enforced:
  - `MISTRAL_HTTP_TIMEOUT_MS=120000` — per-request HTTP timeout
  - `PDF_OCR_AGENT_TIMEOUT_MS=600000` — total pipeline timeout
- Image enhancement uses `sharp` for sharpening and resizing; it is invoked as a dynamic import to limit memory impact during non-OCR requests.
- The file import sub-server (`FILE_IMPORT_HOST:FILE_IMPORT_PORT`) is bound to `127.0.0.1` by default and is not exposed to the public internet.
- Uploaded files should not be served back directly from the upload path without content-type validation to prevent stored XSS via file spoofing.

---

## 14. Zero-Knowledge Authentication

The ZK auth system separates authentication credentials from encryption keys. This means the server cannot decrypt user documents even if the database is fully compromised.

### Key Separation

| Component | Where it Lives | Server Can Access? |
|-----------|---------------|-------------------|
| `authVerifier` hash | Server database | Yes (bcrypt hash only) |
| `kdfSalt` | Server database | Yes |
| Key Encryption Key (KEK) | Browser memory only | No |
| Encrypted documents | Server database | Ciphertext only |

### Recovery

Clients may optionally store an encrypted recovery artifact on the server. The artifact is encrypted client-side before upload; the server stores only `encryptedRecoveryArtifact` and `iv`. Recovery requires the user's recovery passphrase to decrypt client-side.

---

## 15. Reporting Vulnerabilities

If you discover a security vulnerability in this project, please do not open a public GitHub issue.

**Contact:** Report vulnerabilities privately via the GitHub repository's Security Advisories feature at:

```
https://github.com/CLOCKWORK-TEMPTATION/yarab-we-elnby-thecopy/security/advisories/new
```

Please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce the issue.
- Any proof-of-concept code (if safe to include).
- The version or commit hash where the issue was found.

We aim to acknowledge reports within 72 hours and to release a fix within 30 days for critical issues.
