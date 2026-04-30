import { beforeEach, describe, expect, it, vi } from "vitest";

import { bootstrapBreakdownProject } from "../../infrastructure/platform-client";

describe("breakdown platform client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.cookie = "XSRF-TOKEN=test-token";
  });

  it("does not leak upstream HTML bodies when bootstrap fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<!DOCTYPE html><html><body>Cannot POST</body></html>", {
        status: 500,
        headers: { "content-type": "text/html" },
      })
    );

    let thrown: unknown;
    try {
      await bootstrapBreakdownProject("INT. غرفة - ليل\nشخصية تنتظر.");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    expect(message).toContain("تعذر تنفيذ طلب البريك دون");
    expect(message).not.toMatch(/<!doctype|<html|cannot post|syntaxerror/i);
  });

  it("sanitizes JSON errors that contain raw server output", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          success: false,
          error: "<!DOCTYPE html><html><body>Cannot POST</body></html>",
        },
        { status: 502 }
      )
    );

    let thrown: unknown;
    try {
      await bootstrapBreakdownProject("INT. مكتب - نهار\nحوار قصير.");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    expect(message).toContain("خدمة البريك دون غير متاحة الآن");
    expect(message).not.toMatch(/<!doctype|<html|cannot post|syntaxerror/i);
  });
});
