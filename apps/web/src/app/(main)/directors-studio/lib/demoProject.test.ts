import { describe, expect, it } from "vitest";

import {
  DIRECTORS_STUDIO_DEMO_PROJECT_ID,
  DIRECTORS_STUDIO_DEMO_USER_ID,
  createDirectorsStudioDemoCharacters,
  createDirectorsStudioDemoProject,
  createDirectorsStudioDemoScenes,
  isDirectorsStudioDemoProject,
  isDirectorsStudioDemoProjectId,
  seedDirectorsStudioDemoEditorDraft,
} from "./demoProject";

describe("directors-studio demo project", () => {
  it("ينشئ مشروعاً تجريبياً محلياً قابلاً للفتح دون حساب", () => {
    const project = createDirectorsStudioDemoProject(" تجربة ");

    expect(project).toMatchObject({
      id: DIRECTORS_STUDIO_DEMO_PROJECT_ID,
      title: "تجربة",
      userId: DIRECTORS_STUDIO_DEMO_USER_ID,
    });
    expect(project.scriptContent).toContain("غرفة مونتاج");
    expect(isDirectorsStudioDemoProject(project)).toBe(true);
    expect(isDirectorsStudioDemoProjectId(project.id)).toBe(true);
  });

  it("يوفر بيانات مشاهد وشخصيات تكفي لعرض الاستوديو", () => {
    const scenes = createDirectorsStudioDemoScenes();
    const characters = createDirectorsStudioDemoCharacters();

    expect(scenes).toHaveLength(2);
    expect(characters).toHaveLength(2);
    expect(scenes.reduce((sum, scene) => sum + scene.shotCount, 0)).toBe(15);
    expect(characters.every((character) => character.projectId)).toBe(true);
  });

  it("يبذر مسودة المحرر للمشروع التجريبي فقط", () => {
    const project = createDirectorsStudioDemoProject();
    seedDirectorsStudioDemoEditorDraft(project);

    const stored = window.localStorage.getItem(
      "filmlane.autosave.document-text.v1"
    );

    expect(stored).toContain("غرفة مونتاج");
    expect(stored).toContain('"version":2');
    expect(stored).toContain("screenplay-action");

    window.localStorage.setItem(
      "filmlane.autosave.document-text.v1",
      JSON.stringify({ text: "مسودة قائمة" })
    );
    seedDirectorsStudioDemoEditorDraft(project, false);

    expect(
      window.localStorage.getItem("filmlane.autosave.document-text.v1")
    ).toContain("مسودة قائمة");

    window.localStorage.removeItem("filmlane.autosave.document-text.v1");
    seedDirectorsStudioDemoEditorDraft({
      ...project,
      id: "remote-project",
      userId: "remote-user",
    });

    expect(
      window.localStorage.getItem("filmlane.autosave.document-text.v1")
    ).toBeNull();
  });
});
