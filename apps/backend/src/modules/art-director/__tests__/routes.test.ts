import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { artDirectorRouter } from "../routes";
import { resetStoreForTests } from "../store";

interface PluginsResponseBody {
  success: boolean;
  count: number;
  plugins: unknown[];
}

interface LocationSearchResponseBody {
  success: boolean;
  data: {
    locations: {
      nameAr?: string;
    }[];
  };
}

const storePath = path.join(
  tmpdir(),
  "the-copy-tests",
  "art-director-routes.test.json",
);

function createTestApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api/art-director", artDirectorRouter);
  return app;
}

beforeEach(async () => {
  process.env["ART_DIRECTOR_STORE_PATH"] = storePath;
  await rm(storePath, { force: true });
  await resetStoreForTests();
});

describe("productivity routes", () => {
  it("GET /productivity/summary يعيد بيانات الرسوم البيانية", async () => {
    const response = await request(createTestApp()).get(
      "/api/art-director/productivity/summary",
    );
    const body = response.body as unknown as {
      success: boolean;
      data: { chartData: unknown[]; pieData: unknown[] };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.chartData)).toBe(true);
    expect(Array.isArray(body.data.pieData)).toBe(true);
  });

  it("POST /analyze/productivity يعيد تحليل الإنتاجية", async () => {
    const response = await request(createTestApp())
      .post("/api/art-director/analyze/productivity")
      .send({ department: "design", period: "weekly" });
    const body = response.body as unknown as {
      success: boolean;
      data: { period: string };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.period).toBe("weekly");
  });

  it("POST /productivity/recommendations يعيد توصيات", async () => {
    const response = await request(createTestApp()).post(
      "/api/art-director/productivity/recommendations",
    );
    const body = response.body as unknown as {
      success: boolean;
      data: { recommendations: string[] };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.recommendations)).toBe(true);
    expect(body.data.recommendations.length).toBeGreaterThan(0);
  });

  it("POST /productivity/log-time يسجل وقتًا جديدًا", async () => {
    const response = await request(createTestApp())
      .post("/api/art-director/productivity/log-time")
      .send({ task: "تصميم لوحة إعلانية", hours: 3, category: "design" });
    const body = response.body as unknown as {
      success: boolean;
      data: { entry: { taskName: string } };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.entry.taskName).toBe("تصميم لوحة إعلانية");
  });

  it("POST /productivity/report-delay يسجل تأخيرًا جديدًا", async () => {
    const response = await request(createTestApp())
      .post("/api/art-director/productivity/report-delay")
      .send({ reason: "عطل تقني", hoursLost: 2, impact: "high" });
    const body = response.body as unknown as {
      success: boolean;
      data: { delay: { reason: string } };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.delay.reason).toBe("عطل تقني");
  });
});

describe("art-director routes", () => {
  it("يعيد قائمة الأدوات عبر المسار الرسمي للباك إند", async () => {
    const response = await request(createTestApp()).get(
      "/api/art-director/plugins",
    );
    const body = response.body as unknown as PluginsResponseBody;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(Array.isArray(body.plugins)).toBe(true);
  });

  it("يسجل موقعًا ويعيده عبر البحث من خلال router الرسمي", async () => {
    const app = createTestApp();

    const addResponse = await request(app)
      .post("/api/art-director/locations/add")
      .send({
        name: "Nile Studio",
        nameAr: "استوديو النيل",
        type: "studio",
        address: "Cairo",
        features: ["Parking", "Rigging"],
      });
    const addBody = addResponse.body as unknown as { success: boolean };

    expect(addResponse.status).toBe(200);
    expect(addBody.success).toBe(true);

    const searchResponse = await request(app)
      .post("/api/art-director/locations/search")
      .send({ query: "النيل" });
    const searchBody =
      searchResponse.body as unknown as LocationSearchResponseBody;

    expect(searchResponse.status).toBe(200);
    expect(searchBody.success).toBe(true);
    expect(searchBody.data.locations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameAr: "استوديو النيل",
        }),
      ]),
    );
  });
});
