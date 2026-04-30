import { describe, expect, it } from "vitest";

import {
  buildCineShareUrl,
  createDefaultCineScene,
  serializeCineSceneExport,
  sanitizeCineSceneSession,
} from "./scene-session";

describe("scene-session", () => {
  it("sanitizes restored scene data and strips heavy or unsafe fields", () => {
    const restored = sanitizeCineSceneSession({
      scene: {
        id: "scene-test",
        name: "<script>alert(1)</script>",
        description: "A".repeat(60_000),
        previewDataUrl: "data:image/png;base64,unsafe",
        lights: [
          {
            id: "key",
            label: "إضاءة رئيسية",
            kind: "key",
            intensity: 999,
            color: "#ffffff",
            position: [0, 2, 4],
          },
        ],
      },
      savedAt: "2026-04-30T00:00:00.000Z",
    });

    expect(restored.scene.name).toBe("<script>alert(1)</script>");
    expect(restored.scene.description.length).toBeLessThanOrEqual(5000);
    expect("previewDataUrl" in restored.scene).toBe(false);
    expect(restored.scene.lights[0]?.intensity).toBe(100);
  });

  it("exports a stable payload without browser-only artifacts", () => {
    const scene = createDefaultCineScene();
    const json = serializeCineSceneExport(scene, "2026-04-30T00:00:00.000Z");
    const parsed = JSON.parse(json) as {
      exportedAt: string;
      scene: { name: string; lights: unknown[] };
    };

    expect(parsed.exportedAt).toBe("2026-04-30T00:00:00.000Z");
    expect(parsed.scene.name).toBe(scene.name);
    expect(parsed.scene.lights).toHaveLength(3);
    expect(json).not.toContain("previewDataUrl");
  });

  it("builds a share url that can carry the current scene snapshot", () => {
    const url = buildCineShareUrl(createDefaultCineScene(), {
      origin: "https://www.thecopy.app",
      path: "/cinematography-studio",
    });

    expect(url).toMatch(
      /^https:\/\/www\.thecopy\.app\/cinematography-studio\?share=/
    );
  });
});
