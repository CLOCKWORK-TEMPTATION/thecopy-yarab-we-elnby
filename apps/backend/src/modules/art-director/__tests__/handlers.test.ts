import { rm } from "node:fs/promises";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { handleArtDirectorRequest } from "../handlers";
import { resetStoreForTests } from "../store";

import type { ArtDirectorHandlerResponse } from "../handlers";

const storePath = path.join(
  process.cwd(),
  ".tmp-tests",
  "art-director-store.test.json",
);

async function request(params: {
  method: "GET" | "POST";
  path: string[];
  body?: unknown;
  searchParams?: URLSearchParams;
}): Promise<ArtDirectorHandlerResponse> {
  return handleArtDirectorRequest({
    searchParams: new URLSearchParams(),
    ...params,
  });
}

beforeEach(async () => {
  process.env["ART_DIRECTOR_STORE_PATH"] = storePath;
  await rm(path.dirname(storePath), { recursive: true, force: true });
  await resetStoreForTests();
});

describe("art-director handlers", () => {
  it("يسجل موقعًا جديدًا ثم يعيده في البحث", async () => {
    const addResult = await request({
      method: "POST",
      path: ["locations", "add"],
      body: {
        name: "Baron Palace",
        nameAr: "قصر البارون",
        type: "interior",
        address: "Heliopolis, Cairo",
        features: ["إضاءة طبيعية", "حديقة"],
      },
    });

    expect(addResult.status).toBe(200);
    expect(addResult.body.success).toBe(true);

    const searchResult = await request({
      method: "POST",
      path: ["locations", "search"],
      body: { query: "البارون" },
    });

    expect(searchResult.status).toBe(200);
    expect(searchResult.body.success).toBe(true);
    expect(searchResult.body.data).toMatchObject({
      count: 1,
      locations: [
        {
          nameAr: "قصر البارون",
          type: "interior",
        },
      ],
    });
  });

  it("يرفض تسجيل الوقت عندما تكون الساعات غير صالحة", async () => {
    const result = await request({
      method: "POST",
      path: ["productivity", "log-time"],
      body: {
        task: "مراجعة لوحة الألوان",
        hours: 0,
        category: "design",
      },
    });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      success: false,
      error: "عدد الساعات يجب أن يكون أكبر من صفر",
    });
  });

  it("يعيد نتيجة مرئية قابلة للعرض لتحليل التناسق البصري", async () => {
    const result = await request({
      method: "POST",
      path: ["analyze", "visual-consistency"],
      body: {
        sceneId: "scene-001",
        referenceColors: "#FF5733, #3498DB",
        lightingCondition: "daylight",
      },
    });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data).toMatchObject({
      consistent: false,
      score: expect.any(Number),
      issues: expect.any(Array),
      suggestions: expect.any(Array),
    });
    expect(
      (result.body.data as { issues: unknown[] }).issues.length,
    ).toBeGreaterThan(0);
  });

  it("ينشئ كتاب إنتاج ثم يصدّره بصيغة قابلة للتنزيل", async () => {
    const generateResult = await request({
      method: "POST",
      path: ["documentation", "generate"],
      body: {
        projectName: "Desert Echoes",
        projectNameAr: "أصداء الصحراء",
        director: "Lina Hassan",
        productionCompany: "The Copy Studios",
      },
    });

    expect(generateResult.status).toBe(200);
    expect(generateResult.body.success).toBe(true);

    const exportResult = await request({
      method: "POST",
      path: ["documentation", "export"],
      body: {
        format: "markdown",
      },
    });

    expect(exportResult.status).toBe(200);
    expect(exportResult.body.success).toBe(true);
    expect(exportResult.body.data).toMatchObject({
      format: "markdown",
      mimeType: "text/markdown;charset=utf-8",
    });
    expect(exportResult.body.data).toHaveProperty("filename");
    expect(exportResult.body.data).toHaveProperty("content");
    expect(
      String((exportResult.body.data as { content: string }).content),
    ).toContain("أصداء الصحراء");
  });

  it("يعيد 404 عند طلب مسار غير مدعوم", async () => {
    const result = await request({
      method: "GET",
      path: ["unknown", "route"],
    });

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({
      success: false,
      error: "المسار غير مدعوم: unknown/route",
    });
  });
});
