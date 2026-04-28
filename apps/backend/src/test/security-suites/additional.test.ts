import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { createTestApp } from "../helpers/security-app";
import {
  responseBody,
  stringField,
  headerValue,
  assertServerHeaderDoesNotExposeExpress,
} from "../helpers/security-utils";

const WRONG_PASSWORD = "wrong";

describe("6️⃣ Additional Security Measures", () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  it("should have proper security headers set", async () => {
    const response = await request(app).get("/api/health");
    expect(response.headers["x-frame-options"]).toBeDefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["strict-transport-security"]).toBeDefined();
    expect(response.headers["x-download-options"]).toBeDefined();
  });

  it("should not expose server information", async () => {
    const response = await request(app).get("/api/health");
    expect(response.headers["x-powered-by"]).toBeUndefined();
    assertServerHeaderDoesNotExposeExpress(headerValue(response, "server"));
  });

  it("should handle malformed JSON gracefully", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": invalid json}');
    expect(response.status).toBeLessThan(500);
  });

  it("should sanitize error messages to prevent information disclosure", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: WRONG_PASSWORD });
    const error = stringField(responseBody(response), "error") ?? "";
    expect(error).not.toContain("password");
    expect(error).not.toContain("username");
    expect(error).not.toContain("does not exist");
  });

  it("should prevent path traversal attacks", async () => {
    const pathTraversalAttempts = [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32",
      "./../../config/env",
      "%2e%2e%2f%2e%2e%2f",
    ];
    for (const attempt of pathTraversalAttempts) {
      const response = await request(app).get(`/api/${attempt}`);
      expect([404, 400, 429]).toContain(response.status);
    }
  });
});
