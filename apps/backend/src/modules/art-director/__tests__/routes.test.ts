import { rm } from "node:fs/promises";
import path from "node:path";

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { artDirectorRouter } from "../routes";
import { resetStoreForTests } from "../store";

const storePath = path.join(
  process.cwd(),
  ".tmp-tests",
  "art-director-routes.test.json"
);

function createTestApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api/art-director", artDirectorRouter);
  return app;
}

beforeEach(async () => {
  process.env['ART_DIRECTOR_STORE_PATH'] = storePath;
  await rm(path.dirname(storePath), { recursive: true, force: true });
  await resetStoreForTests();
});

describe("art-director routes", () => {
  it("يعيد قائمة الأدوات عبر المسار الرسمي للباك إند", async () => {
    const response = await request(createTestApp()).get("/api/art-director/plugins");

    expect(response["status"]).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBeGreaterThan(0);
    expect(Array.isArray(response.body.plugins)).toBe(true);
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

    expect(addResponse["status"]).toBe(200);
    expect(addResponse.body.success).toBe(true);

    const searchResponse = await request(app)
      .post("/api/art-director/locations/search")
      .send({ query: "النيل" });

    expect(searchResponse["status"]).toBe(200);
    expect(searchResponse.body.success).toBe(true);
    expect(searchResponse.body.data.locations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameAr: "استوديو النيل",
        }),
      ])
    );
  });
});
