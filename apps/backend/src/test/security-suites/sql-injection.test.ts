import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "../helpers/security-app";
import { responseBody, stringField } from "../helpers/security-utils";

describe("1️⃣ SQL Injection Protection", () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  it("should reject login payloads that contain SQL control fragments without server failure", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@example.com' OR '1'='1",
      password: "' OR '1'='1",
    });

    expect(response.status).toBe(401);
    const error = stringField(responseBody(response), "error") ?? "";
    expect(error.toLowerCase()).not.toContain("sql");
    expect(error.toLowerCase()).not.toContain("syntax");
  });

  it("should not elevate protected route access through injected query strings", async () => {
    const response = await request(app).get("/api/protected?id=1%20OR%201=1");

    expect(response.status).toBe(401);
    expect(responseBody(response)).toMatchObject({
      success: false,
      error: "Unauthorized",
    });
  });
});
