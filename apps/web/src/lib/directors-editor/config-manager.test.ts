import { afterEach, describe, expect, it } from "vitest";

import { DirectorsEditorConfigManager } from "./config-manager";

const ORIGINAL_ENV = { ...process.env };

const restoreEnv = () => {
  process.env = { ...ORIGINAL_ENV };
  DirectorsEditorConfigManager.resetForTests();
};

afterEach(() => {
  restoreEnv();
});

describe("DirectorsEditorConfigManager", () => {
  it("يستخدم القيم الافتراضية عند غياب متغيرات البيئة", () => {
    delete process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_PROJECT_QUERY_PARAM"];
    delete process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_SOURCE_QUERY_PARAM"];
    delete process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_SOURCE_VALUE"];

    const config = DirectorsEditorConfigManager.getConfig();

    expect(config.projectQueryParam).toBe("projectId");
    expect(config.sourceQueryParam).toBe("source");
    expect(config.sourceValue).toBe("directors-studio");
  });

  it("يطبق الإعدادات القادمة من البيئة عند توفرها", () => {
    process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_PROJECT_QUERY_PARAM"] = "pid";
    process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_SOURCE_QUERY_PARAM"] = "origin";
    process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_SOURCE_VALUE"] = "studio";
    DirectorsEditorConfigManager.resetForTests();

    const config = DirectorsEditorConfigManager.getConfig();

    expect(config.projectQueryParam).toBe("pid");
    expect(config.sourceQueryParam).toBe("origin");
    expect(config.sourceValue).toBe("studio");
  });

  it("يبني رابط المحرر بعقد query ثابت", () => {
    const targetUrl = DirectorsEditorConfigManager.buildEditorUrl(
      "project-123",
      {
        importIntent: true,
      }
    );

    expect(targetUrl).toContain("/editor?");
    expect(targetUrl).toContain("projectId=project-123");
    expect(targetUrl).toContain("source=directors-studio");
    expect(targetUrl).toContain("intent=import");
  });
});
