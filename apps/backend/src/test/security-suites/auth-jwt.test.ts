import express from "express";
import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";

import { createTestApp } from "../helpers/security-app";
import {
  MOCK_INVALID_TOKEN,
  MOCK_MALFORMED_TOKEN,
  MOCK_EXPIRED_TOKEN,
  MOCK_TAMPERED_TOKEN,
  MOCK_MANIPULATED_TOKEN,
  UUID_WITH_PREFIX,
} from "../helpers/security-tokens";
import {
  responseBody,
  assertSessionCookieSecurity,
  assertJwtPayloadIsSanitized,
} from "../helpers/security-utils";

const TEST_PASSWORD = "Password123!";

describe("4️⃣ JWT & Authentication Security", () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  it("should reject requests with invalid JWT tokens", async () => {
    const invalidTokens = [
      MOCK_INVALID_TOKEN,
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
      MOCK_MALFORMED_TOKEN,
      "",
      "null",
      "undefined",
    ];
    for (const token of invalidTokens) {
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(401);
      expect(responseBody(response)["success"]).toBe(false);
    }
  });

  it("should reject expired JWT tokens", async () => {
    const response = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${MOCK_EXPIRED_TOKEN}`);
    expect(response.status).toBe(401);
  });

  it("should validate JWT signature", async () => {
    const response = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${MOCK_TAMPERED_TOKEN}`);
    expect(response.status).toBe(401);
  });

  it("should reject tokens with manipulated payload", async () => {
    const response = await request(app)
      .get("/api/protected")
      .set("Authorization", MOCK_MANIPULATED_TOKEN);
    expect(response.status).toBe(401);
  });

  it("should use httpOnly cookies for session tokens", async () => {
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send({
        email: "user@example.com",
        password: TEST_PASSWORD,
        firstName: "Test",
        lastName: "User",
      });
    expect(signupResponse.status).toBeLessThan(500);
    const cookies = signupResponse.headers["set-cookie"];
    assertSessionCookieSecurity(cookies);
  });

  it("should properly validate UUIDs", async () => {
    const invalidUUIDs = [
      "not-a-uuid",
      "12345",
      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "00000000-0000-0000-0000-000000000000",
      "../../../etc/passwd",
      '<script>alert("XSS")</script>',
    ];
    for (const uuid of invalidUUIDs) {
      const response = await request(app)
        .get(`/api/protected`)
        .set("Authorization", `Bearer ${UUID_WITH_PREFIX}${uuid}`);
      expect(response.status).toBe(401);
    }
  });

  it("should not expose sensitive information in JWT tokens", async () => {
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send({
        email: "user@example.com",
        password: TEST_PASSWORD,
        firstName: "JWT",
        lastName: "Test",
      });
    expect(signupResponse.status).toBeLessThan(500);
    assertJwtPayloadIsSanitized(signupResponse);
  });
});
