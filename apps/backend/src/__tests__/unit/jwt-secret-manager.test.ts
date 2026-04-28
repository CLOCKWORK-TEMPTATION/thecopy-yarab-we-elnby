/**
 * اختبارات مدير أسرار JWT — دوران السر [UTP-020]
 *
 * يتحقق من:
 * - signJwt يستخدم السر النشط دائمًا
 * - verifyJwt يقبل الرموز الموقعة بالسر النشط
 * - verifyJwt يقبل الرموز الموقعة بسر سابق مذكور في JWT_SECRET_PREVIOUS
 * - verifyJwt يرفض الرموز الموقعة بسر غير مدرج
 * - دعم قائمة أسرار سابقة مفصولة بفواصل
 */

import jwt from "jsonwebtoken";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// لا نُدخل env قبل إعداد متغيرات البيئة في كل حالة اختبار
const ACTIVE_SECRET = "active-secret-at-least-32-characters-long-for-tests";
const PREVIOUS_SECRET_1 = "previous-secret-one-at-least-32-characters-length";
const PREVIOUS_SECRET_2 = "previous-secret-two-at-least-32-characters-length";

describe("jwt-secret-manager", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  async function loadManagerWith(
    envOverrides: Record<string, string | undefined>,
  ) {
    for (const [key, value] of Object.entries(envOverrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    // إعادة تحميل env ومدير الأسرار بعد تهيئة البيئة
    return import("@/utils/jwt-secret-manager");
  }

  it("signJwt يوقّع بالسر النشط ويمكن التحقق منه بنفس السر", async () => {
    const mod = await loadManagerWith({
      NODE_ENV: "test",
      JWT_SECRET: ACTIVE_SECRET,
      JWT_SECRET_PREVIOUS: undefined,
      DATABASE_URL: "postgres://u:p@localhost:5432/db",
    });

    const token = mod.signJwt({ sub: "user-1" });
    const decoded = jwt.verify(token, ACTIVE_SECRET) as { sub: string };
    expect(decoded.sub).toBe("user-1");
  });

  it("verifyJwt يقبل رمزًا موقّعًا بسر سابق واحد", async () => {
    const mod = await loadManagerWith({
      NODE_ENV: "test",
      JWT_SECRET: ACTIVE_SECRET,
      JWT_SECRET_PREVIOUS: PREVIOUS_SECRET_1,
      DATABASE_URL: "postgres://u:p@localhost:5432/db",
    });

    const legacyToken = jwt.sign({ sub: "legacy-user" }, PREVIOUS_SECRET_1);
    const decoded = mod.verifyJwt<{ sub: string }>(legacyToken);
    expect(decoded.sub).toBe("legacy-user");
  });

  it("verifyJwt يقبل أكثر من سر سابق مفصول بفواصل", async () => {
    const mod = await loadManagerWith({
      NODE_ENV: "test",
      JWT_SECRET: ACTIVE_SECRET,
      JWT_SECRET_PREVIOUS: `${PREVIOUS_SECRET_1},${PREVIOUS_SECRET_2}`,
      DATABASE_URL: "postgres://u:p@localhost:5432/db",
    });

    const tokenA = jwt.sign({ sub: "a" }, PREVIOUS_SECRET_1);
    const tokenB = jwt.sign({ sub: "b" }, PREVIOUS_SECRET_2);

    expect(mod.verifyJwt<{ sub: string }>(tokenA).sub).toBe("a");
    expect(mod.verifyJwt<{ sub: string }>(tokenB).sub).toBe("b");
  });

  it("verifyJwt يرفض رمزًا موقّعًا بسر غير مدرج ويرمي خطأ السر النشط", async () => {
    const mod = await loadManagerWith({
      NODE_ENV: "test",
      JWT_SECRET: ACTIVE_SECRET,
      JWT_SECRET_PREVIOUS: PREVIOUS_SECRET_1,
      DATABASE_URL: "postgres://u:p@localhost:5432/db",
    });

    const foreignToken = jwt.sign(
      { sub: "intruder" },
      "some-unknown-secret-not-registered-anywhere",
    );
    expect(() => mod.verifyJwt(foreignToken)).toThrow();
  });

  it("verifyJwt بدون JWT_SECRET_PREVIOUS لا يقبل رموزًا غير موقّعة بالسر النشط", async () => {
    const mod = await loadManagerWith({
      NODE_ENV: "test",
      JWT_SECRET: ACTIVE_SECRET,
      JWT_SECRET_PREVIOUS: undefined,
      DATABASE_URL: "postgres://u:p@localhost:5432/db",
    });

    const otherToken = jwt.sign(
      { sub: "x" },
      "another-secret-32-characters-aaaa",
    );
    expect(() => mod.verifyJwt(otherToken)).toThrow();
  });
});
