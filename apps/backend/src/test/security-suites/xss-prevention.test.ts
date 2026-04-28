import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "../helpers/security-app";
import { responseBody, stringField } from "../helpers/security-utils";

describe("2️⃣ XSS Prevention", () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  it("should not reflect script tags in authentication errors", async () => {
    const payload = "<script>alert('xss')</script>";
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: payload, password: payload });

    expect(response.status).toBe(401);
    const serialized = JSON.stringify(responseBody(response)).toLowerCase();
    expect(serialized).not.toContain("<script");
    expect(serialized).not.toContain("alert(");
  });

  it("should preserve browser hardening headers on public responses", async () => {
    const response = await request(app).get("/api/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBeDefined();
    expect(stringField(responseBody(response), "status")).toBe("ok");
  });
});
