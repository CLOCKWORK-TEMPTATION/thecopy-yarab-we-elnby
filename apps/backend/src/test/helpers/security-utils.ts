import { expect } from "vitest";

import type { Response } from "supertest";

export function responseBody(response: Response): Record<string, unknown> {
  return response.body && typeof response.body === "object"
    ? (response.body as Record<string, unknown>)
    : {};
}

export function stringField(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

export function headerValue(
  response: Response,
  key: string,
): string | undefined {
  const value = response.headers[key.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

export function assertServerHeaderDoesNotExposeExpress(
  serverHeader: string | undefined,
): void {
  expect(serverHeader?.toLowerCase() ?? "").not.toContain("express");
}

export function assertSessionCookieSecurity(
  cookies: string[] | string | undefined,
): void {
  const cookieLines = Array.isArray(cookies)
    ? cookies
    : cookies
      ? [cookies]
      : [];
  const sessionCookie = cookieLines.find((cookie) =>
    cookie.startsWith("session="),
  );

  expect(sessionCookie).toBeDefined();
  expect(sessionCookie).toContain("HttpOnly");
  expect(sessionCookie).toContain("Secure");
  expect(sessionCookie?.toLowerCase()).toContain("samesite=strict");
}

export function assertJwtPayloadIsSanitized(response: Response): void {
  const serialized = JSON.stringify(responseBody(response)).toLowerCase();

  expect(serialized).not.toContain("passwordhash");
  expect(serialized).not.toContain("password");
  expect(serialized).not.toContain("secret");
}

export function assertCorsAllowedMethods(methods: string | undefined): void {
  expect(methods).toBeDefined();
  const normalized =
    methods?.split(",").map((method) => method.trim().toUpperCase()) ?? [];

  expect(normalized).toContain("GET");
  expect(normalized).toContain("POST");
  expect(normalized).not.toContain("TRACE");
}
