/**
 * ============================================================================
 * اختبارات تكامل — تدفّق refresh-token لـ @the-copy/breakapp
 * ============================================================================
 *
 * الفلسفة:
 *   - نختبر السلوك الحقيقي لـ interceptors مقابل axios adapter مخصّص
 *   - لا نستبدل منطق auth.ts بـ mocks — نوفر فقط backend وهمي (adapter)
 *   - كل سيناريو يمثّل حالة إنتاج حقيقية (401 عابر، فشل refresh، ...)
 *
 * ما يُغطّى:
 *   1. تخزين/استرجاع/حذف التوكن في الذاكرة
 *   2. `refreshAccessToken` يستدعي /auth/refresh ويُحدّث التوكن
 *   3. `refreshAccessToken` يُرجع null عند فشل الخادم بدون رمي استثناء
 *   4. response interceptor يُعيد الطلب الأصلي بعد 401 وrefresh ناجح
 *   5. interceptor يتوقف عن المحاولة إذا فشل refresh ويبثّ حدث auth-expired
 *   6. interceptor لا يدخل حلقة لانهائية على /auth/refresh نفسه
 *   7. `logout` يمسح التوكن حتى لو فشل استدعاء الخادم
 *   8. `getTokenExpiryMs` يُرجع الوقت من JWT صالح و null لغير صالح
 * ============================================================================
 */

import type {
  AxiosAdapter,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  api,
  storeToken,
  getToken,
  removeToken,
  refreshAccessToken,
  getTokenExpiryMs,
  logout,
} from "../../src/lib/auth";

/**
 * استجابة مبرمجة يمكن أن يكون status فيها في أي قيمة
 */
interface ProgrammedResponse {
  status: number;
  data?: unknown;
  /** إن true نرمي NetworkError بدل إرجاع الاستجابة */
  networkError?: boolean;
}

/**
 * مخطِّط URL+method → handler يعيد ProgrammedResponse
 */
type Handler = (config: AxiosRequestConfig) => ProgrammedResponse;

/**
 * بناء adapter مخصص يُستخدم كـ axios backend
 *
 * @description
 * axios يسمح باستبدال adapter بالكامل — نستغل هذا لاستعادة حالات محددة
 * دون الحاجة لمكتبة خارجية. النتيجة تمر عبر كل الـ interceptors الحقيقية.
 */
function buildAdapter(routes: Map<string, Handler>): AxiosAdapter {
  return async (config): Promise<AxiosResponse> => {
    const method = (config.method ?? "get").toLowerCase();
    const url = config.url ?? "";
    const key = `${method} ${url}`;

    const handler = routes.get(key);
    if (!handler) {
      throw new AxiosError(
        `No mock route for ${key}`,
        "ERR_MOCK_NOT_FOUND",
        config as InternalAxiosRequestConfig
      );
    }

    const programmed = handler(config);

    if (programmed.networkError) {
      throw new AxiosError(
        "Network Error",
        "ERR_NETWORK",
        config as InternalAxiosRequestConfig
      );
    }

    const response: AxiosResponse = {
      data: programmed.data,
      status: programmed.status,
      statusText: programmed.status >= 200 && programmed.status < 300 ? "OK" : "Error",
      headers: {},
      config: config as InternalAxiosRequestConfig,
    };

    if (programmed.status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${programmed.status}`,
        String(programmed.status),
        config as InternalAxiosRequestConfig,
        undefined,
        response
      );
    }

    return response;
  };
}

/**
 * بناء JWT وهمي صالح بنيوياً. الحمولة تحتوي الحقول المطلوبة من JWTPayloadSchema.
 * ليست موقعة — الحزمة لا تتحقق من التوقيع محلياً.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function makeValidJwt(
  overrides: Partial<{
    exp: number;
    iat: number;
    sub: string;
    projectId: string;
    role: string;
  }> = {}
): string {
  return makeJwt({
    sub: overrides.sub ?? "user_123",
    projectId: overrides.projectId ?? "project_abc",
    role: overrides.role ?? "crew",
    exp: overrides.exp ?? Math.floor(Date.now() / 1000) + 3600,
    iat: overrides.iat ?? Math.floor(Date.now() / 1000),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Suite
// ────────────────────────────────────────────────────────────────────────────

describe("breakapp auth — token memory", () => {
  beforeEach(() => {
    removeToken();
  });

  it("stores and retrieves token from memory", () => {
    expect(getToken()).toBeNull();
    storeToken("abc");
    expect(getToken()).toBe("abc");
  });

  it("clears token on removeToken", () => {
    storeToken("abc");
    removeToken();
    expect(getToken()).toBeNull();
  });

  it("extracts exp in ms from valid JWT", () => {
    const expSeconds = Math.floor(Date.now() / 1000) + 120;
    storeToken(makeValidJwt({ exp: expSeconds }));
    expect(getTokenExpiryMs()).toBe(expSeconds * 1000);
  });

  it("returns null from getTokenExpiryMs for missing or invalid token", () => {
    removeToken();
    expect(getTokenExpiryMs()).toBeNull();
    storeToken("not-a-jwt");
    expect(getTokenExpiryMs()).toBeNull();
  });
});

describe("breakapp auth — refreshAccessToken + interceptor", () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    removeToken();
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it("calls /auth/refresh and stores new token on success", async () => {
    const nextToken = makeValidJwt();
    const routes = new Map<string, Handler>([
      ["post /auth/refresh", () => ({ status: 200, data: { access_token: nextToken } })],
    ]);
    api.defaults.adapter = buildAdapter(routes);

    const result = await refreshAccessToken();

    expect(result).toBe(nextToken);
    expect(getToken()).toBe(nextToken);
  });

  it("returns null (no throw) when refresh endpoint fails", async () => {
    const routes = new Map<string, Handler>([
      ["post /auth/refresh", () => ({ status: 401, data: {} })],
    ]);
    api.defaults.adapter = buildAdapter(routes);

    const result = await refreshAccessToken();

    expect(result).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("retries original request once after 401 → refresh → success", async () => {
    const originalToken = makeValidJwt({ exp: Math.floor(Date.now() / 1000) + 5 });
    const refreshedToken = makeValidJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    storeToken(originalToken);

    let protectedCallCount = 0;
    const routes = new Map<string, Handler>([
      [
        "get /protected",
        () => {
          protectedCallCount += 1;
          if (protectedCallCount === 1) {
            return { status: 401, data: { error: "expired" } };
          }
          return { status: 200, data: { ok: true, call: protectedCallCount } };
        },
      ],
      [
        "post /auth/refresh",
        () => ({ status: 200, data: { access_token: refreshedToken } }),
      ],
    ]);
    api.defaults.adapter = buildAdapter(routes);

    const response = await api.get("/protected");

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true, call: 2 });
    expect(getToken()).toBe(refreshedToken);
    expect(protectedCallCount).toBe(2);
  });

  it("does NOT retry when refresh fails, emits auth-expired, clears token", async () => {
    storeToken(makeValidJwt());

    const routes = new Map<string, Handler>([
      ["get /protected", () => ({ status: 401, data: { error: "expired" } })],
      ["post /auth/refresh", () => ({ status: 401, data: { error: "no-cookie" } })],
    ]);
    api.defaults.adapter = buildAdapter(routes);

    const listener = vi.fn();
    window.addEventListener("breakapp:auth-expired", listener);

    await expect(api.get("/protected")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getToken()).toBeNull();

    window.removeEventListener("breakapp:auth-expired", listener);
  });

  it("does not loop when /auth/refresh itself returns 401", async () => {
    storeToken(makeValidJwt());

    let refreshCalls = 0;
    const routes = new Map<string, Handler>([
      [
        "post /auth/refresh",
        () => {
          refreshCalls += 1;
          return { status: 401, data: {} };
        },
      ],
    ]);
    api.defaults.adapter = buildAdapter(routes);

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(refreshCalls).toBe(1);
  });

  it("de-duplicates concurrent refresh calls into single in-flight request", async () => {
    const refreshedToken = makeValidJwt();
    let refreshCalls = 0;

    const routes = new Map<string, Handler>([
      [
        "post /auth/refresh",
        () => {
          refreshCalls += 1;
          return { status: 200, data: { access_token: refreshedToken } };
        },
      ],
    ]);
    api.defaults.adapter = buildAdapter(routes);

    const [a, b, c] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(a).toBe(refreshedToken);
    expect(b).toBe(refreshedToken);
    expect(c).toBe(refreshedToken);
    expect(refreshCalls).toBe(1);
  });
});

describe("breakapp auth — logout", () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    storeToken(makeValidJwt());
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("clears in-memory token on successful logout", async () => {
    const routes = new Map<string, Handler>([
      ["post /auth/logout", () => ({ status: 204, data: null })],
    ]);
    api.defaults.adapter = buildAdapter(routes);

    await logout();

    expect(getToken()).toBeNull();
  });

  it("clears in-memory token even when server logout fails", async () => {
    const routes = new Map<string, Handler>([
      ["post /auth/logout", () => ({ status: 0, networkError: true })],
    ]);
    api.defaults.adapter = buildAdapter(routes);

    await logout();

    expect(getToken()).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ضمان إبقاء AxiosHeaders مستورداً (ليمر NoUnusedLocals) حتى لو لم نستخدمه
// الآن — مفيد لاستكشاف headers في توسعات لاحقة.
// ────────────────────────────────────────────────────────────────────────────
void AxiosHeaders;
