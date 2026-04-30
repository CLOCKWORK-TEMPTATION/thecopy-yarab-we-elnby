/**
 * اختبارات وحدة — Project Store [UTP-STORE]
 *
 * يتحقق من:
 * - إدارة المشاريع (set, add, update, delete)
 * - إدارة المشاهد (set, add, update, delete)
 * - إدارة الشخصيات (set, add, update, delete)
 * - إدارة اللقطات (set, add, update, delete)
 * - حالة واجهة المستخدم (loading, error, reset)
 * - المحددات (selectors) ودوال المساعدة (getById)
 * - الاستقلالية بين الاختبارات (تنظيف الحالة)
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import projectStoreHook, {
  selectProjects,
  selectCurrentProject,
  selectScenes,
  selectCharacters,
  selectShots,
  selectLoading,
  selectError,
  getProjectById,
  getSceneById,
  getCharacterById,
  getShotById,
} from "../stores/projectStore";

import type { Project, Scene, Character, Shot } from "@/types/api";

// ─── عيّنات بيانات ───

const sampleProject = (id: string): Project => ({
  id,
  title: `Project ${id}`,
  scriptContent: null,
  userId: "user-1",
  createdAt: "2026-04-29T00:00:00Z",
  updatedAt: "2026-04-29T00:00:00Z",
});

const sampleScene = (id: string, projectId: string): Scene => ({
  id,
  projectId,
  sceneNumber: 1,
  title: `Scene ${id}`,
  location: "Studio",
  timeOfDay: "Day",
  characters: ["Alice"],
  description: null,
  shotCount: 0,
  status: "draft",
});

const sampleCharacter = (id: string, projectId: string): Character => ({
  id,
  projectId,
  name: `Character ${id}`,
  appearances: 1,
  consistencyStatus: "consistent",
});

const sampleShot = (id: string, sceneId: string): Shot => ({
  id,
  sceneId,
  shotNumber: 1,
  shotType: "Wide",
  cameraAngle: "Eye Level",
  cameraMovement: "Static",
  lighting: "Natural",
  aiSuggestion: null,
});

// ─── مساعدة: الوصول إلى الـ store مباشرة ───

function useStoreActions() {
  return projectStoreHook((state) => ({
    setProjects: state.setProjects,
    setCurrentProject: state.setCurrentProject,
    addProject: state.addProject,
    updateProject: state.updateProject,
    deleteProject: state.deleteProject,
    setScenes: state.setScenes,
    addScene: state.addScene,
    updateScene: state.updateScene,
    deleteScene: state.deleteScene,
    setCharacters: state.setCharacters,
    addCharacter: state.addCharacter,
    updateCharacter: state.updateCharacter,
    deleteCharacter: state.deleteCharacter,
    setShots: state.setShots,
    addShot: state.addShot,
    updateShot: state.updateShot,
    deleteShot: state.deleteShot,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
    reset: state.reset,
    projects: state.projects,
    currentProject: state.currentProject,
    scenes: state.scenes,
    characters: state.characters,
    shots: state.shots,
    loading: state.loading,
    error: state.error,
  }));
}

// ─── Suite ───

describe("projectStore", () => {
  beforeEach(() => {
    // تنظيف الحالة المشتركة قبل كل اختبار
    const { result } = renderHook(() => useStoreActions());
    act(() => {
      result.current.reset();
    });
  });

  // ================================================================
  // 1) المشاريع
  // ================================================================
  describe("projects", () => {
    it("setProjects يستبدل قائمة المشاريع بالكامل", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");
      const p2 = sampleProject("p2");

      act(() => {
        result.current.setProjects([p1, p2]);
      });

      expect(result.current.projects).toEqual([p1, p2]);
    });

    it("addProject يُلحق مشروعًا جديدًا", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.addProject(p1);
      });

      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects[0]).toEqual(p1);
    });

    it("updateProject يعدل المشروع الموجود ويحافظ على الباقي", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");
      const p2 = sampleProject("p2");

      act(() => {
        result.current.setProjects([p1, p2]);
        result.current.updateProject("p1", { title: "Updated" });
      });

      expect(result.current.projects[0]!.title).toBe("Updated");
      expect(result.current.projects[1]).toEqual(p2);
    });

    it("updateProject يُحدّث currentProject إذا كان هو نفسه", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.setCurrentProject(p1);
        result.current.updateProject("p1", { title: "Updated" });
      });

      expect(result.current.currentProject?.title).toBe("Updated");
    });

    it("deleteProject يحذف المشروع ويُصفّر currentProject إذا كان هو", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.addProject(p1);
        result.current.setCurrentProject(p1);
        result.current.deleteProject("p1");
      });

      expect(result.current.projects).toHaveLength(0);
      expect(result.current.currentProject).toBeNull();
    });

    it("deleteProject يحذف المشروع فقط ويحافظ على currentProject إذا كان مختلفًا", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");
      const p2 = sampleProject("p2");

      act(() => {
        result.current.setProjects([p1, p2]);
        result.current.setCurrentProject(p2);
        result.current.deleteProject("p1");
      });

      expect(result.current.projects).toHaveLength(1);
      expect(result.current.currentProject).toEqual(p2);
    });

    it("setCurrentProject يُحدّد المشروع الحالي", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.setCurrentProject(p1);
      });

      expect(result.current.currentProject).toEqual(p1);
    });
  });

  // ================================================================
  // 2) المشاهد
  // ================================================================
  describe("scenes", () => {
    it("setScenes يستبدل قائمة المشاهد", () => {
      const { result } = renderHook(() => useStoreActions());
      const s1 = sampleScene("s1", "p1");

      act(() => {
        result.current.setScenes([s1]);
      });

      expect(result.current.scenes).toEqual([s1]);
    });

    it("addScene يُلحق مشهدًا جديدًا", () => {
      const { result } = renderHook(() => useStoreActions());
      const s1 = sampleScene("s1", "p1");

      act(() => {
        result.current.addScene(s1);
      });

      expect(result.current.scenes).toHaveLength(1);
    });

    it("updateScene يعدل المشهد الموجود", () => {
      const { result } = renderHook(() => useStoreActions());
      const s1 = sampleScene("s1", "p1");

      act(() => {
        result.current.setScenes([s1]);
        result.current.updateScene("s1", { title: "Updated Scene" });
      });

      expect(result.current.scenes[0]!.title).toBe("Updated Scene");
    });

    it("deleteScene يحذف المشهد فقط", () => {
      const { result } = renderHook(() => useStoreActions());
      const s1 = sampleScene("s1", "p1");
      const s2 = sampleScene("s2", "p1");

      act(() => {
        result.current.setScenes([s1, s2]);
        result.current.deleteScene("s1");
      });

      expect(result.current.scenes).toHaveLength(1);
      expect(result.current.scenes[0]!.id).toBe("s2");
    });
  });

  // ================================================================
  // 3) الشخصيات
  // ================================================================
  describe("characters", () => {
    it("setCharacters يستبدل قائمة الشخصيات", () => {
      const { result } = renderHook(() => useStoreActions());
      const c1 = sampleCharacter("c1", "p1");

      act(() => {
        result.current.setCharacters([c1]);
      });

      expect(result.current.characters).toEqual([c1]);
    });

    it("addCharacter يُلحق شخصية جديدة", () => {
      const { result } = renderHook(() => useStoreActions());
      const c1 = sampleCharacter("c1", "p1");

      act(() => {
        result.current.addCharacter(c1);
      });

      expect(result.current.characters).toHaveLength(1);
    });

    it("updateCharacter يعدل الشخصية الموجودة", () => {
      const { result } = renderHook(() => useStoreActions());
      const c1 = sampleCharacter("c1", "p1");

      act(() => {
        result.current.setCharacters([c1]);
        result.current.updateCharacter("c1", { name: "Updated Name" });
      });

      expect(result.current.characters[0]!.name).toBe("Updated Name");
    });

    it("deleteCharacter يحذف الشخصية فقط", () => {
      const { result } = renderHook(() => useStoreActions());
      const c1 = sampleCharacter("c1", "p1");
      const c2 = sampleCharacter("c2", "p1");

      act(() => {
        result.current.setCharacters([c1, c2]);
        result.current.deleteCharacter("c1");
      });

      expect(result.current.characters).toHaveLength(1);
      expect(result.current.characters[0]!.id).toBe("c2");
    });
  });

  // ================================================================
  // 4) اللقطات
  // ================================================================
  describe("shots", () => {
    it("setShots يستبدل قائمة اللقطات", () => {
      const { result } = renderHook(() => useStoreActions());
      const sh1 = sampleShot("sh1", "s1");

      act(() => {
        result.current.setShots([sh1]);
      });

      expect(result.current.shots).toEqual([sh1]);
    });

    it("addShot يُلحق لقطة جديدة", () => {
      const { result } = renderHook(() => useStoreActions());
      const sh1 = sampleShot("sh1", "s1");

      act(() => {
        result.current.addShot(sh1);
      });

      expect(result.current.shots).toHaveLength(1);
    });

    it("updateShot يعدل اللقطة الموجودة", () => {
      const { result } = renderHook(() => useStoreActions());
      const sh1 = sampleShot("sh1", "s1");

      act(() => {
        result.current.setShots([sh1]);
        result.current.updateShot("sh1", { shotType: "Close-up" });
      });

      expect(result.current.shots[0]!.shotType).toBe("Close-up");
    });

    it("deleteShot يحذف اللقطة فقط", () => {
      const { result } = renderHook(() => useStoreActions());
      const sh1 = sampleShot("sh1", "s1");
      const sh2 = sampleShot("sh2", "s1");

      act(() => {
        result.current.setShots([sh1, sh2]);
        result.current.deleteShot("sh1");
      });

      expect(result.current.shots).toHaveLength(1);
      expect(result.current.shots[0]!.id).toBe("sh2");
    });
  });

  // ================================================================
  // 5) حالة واجهة المستخدم
  // ================================================================
  describe("UI state", () => {
    it("setLoading يُحدّث حالة التحميل", () => {
      const { result } = renderHook(() => useStoreActions());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });

    it("setError يضبط رسالة الخطأ", () => {
      const { result } = renderHook(() => useStoreActions());

      act(() => {
        result.current.setError("Something went wrong");
      });

      expect(result.current.error).toBe("Something went wrong");
    });

    it("clearError يُصفّر رسالة الخطأ", () => {
      const { result } = renderHook(() => useStoreActions());

      act(() => {
        result.current.setError("Error");
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it("reset يعيد الحالة إلى القيم الابتدائية", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.addProject(p1);
        result.current.setCurrentProject(p1);
        result.current.setScenes([sampleScene("s1", "p1")]);
        result.current.setCharacters([sampleCharacter("c1", "p1")]);
        result.current.setShots([sampleShot("sh1", "s1")]);
        result.current.setLoading(true);
        result.current.setError("err");
        result.current.reset();
      });

      expect(result.current.projects).toHaveLength(0);
      expect(result.current.currentProject).toBeNull();
      expect(result.current.scenes).toHaveLength(0);
      expect(result.current.characters).toHaveLength(0);
      expect(result.current.shots).toHaveLength(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // ================================================================
  // 6) المحددات (Selectors)
  // ================================================================
  describe("selectors", () => {
    it("selectProjects يعيد المشاريع", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.addProject(p1);
      });

      const state = result.current;
      expect(selectProjects(state)).toEqual([p1]);
    });

    it("selectCurrentProject يعيد المشروع الحالي", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.setCurrentProject(p1);
      });

      const state = result.current;
      expect(selectCurrentProject(state)).toEqual(p1);
    });

    it("selectScenes يعيد المشاهد", () => {
      const { result } = renderHook(() => useStoreActions());
      const s1 = sampleScene("s1", "p1");

      act(() => {
        result.current.addScene(s1);
      });

      const state = result.current;
      expect(selectScenes(state)).toEqual([s1]);
    });

    it("selectCharacters يعيد الشخصيات", () => {
      const { result } = renderHook(() => useStoreActions());
      const c1 = sampleCharacter("c1", "p1");

      act(() => {
        result.current.addCharacter(c1);
      });

      const state = result.current;
      expect(selectCharacters(state)).toEqual([c1]);
    });

    it("selectShots يعيد اللقطات", () => {
      const { result } = renderHook(() => useStoreActions());
      const sh1 = sampleShot("sh1", "s1");

      act(() => {
        result.current.addShot(sh1);
      });

      const state = result.current;
      expect(selectShots(state)).toEqual([sh1]);
    });

    it("selectLoading يعيد حالة التحميل", () => {
      const { result } = renderHook(() => useStoreActions());

      act(() => {
        result.current.setLoading(true);
      });

      const state = result.current;
      expect(selectLoading(state)).toBe(true);
    });

    it("selectError يعيد الخطأ", () => {
      const { result } = renderHook(() => useStoreActions());

      act(() => {
        result.current.setError("fail");
      });

      const state = result.current;
      expect(selectError(state)).toBe("fail");
    });
  });

  // ================================================================
  // 7) دوال المساعدة (Helpers)
  // ================================================================
  describe("helpers", () => {
    it("getProjectById يعيد المشروع عند وجوده", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.addProject(p1);
      });

      expect(getProjectById("p1")).toEqual(p1);
    });

    it("getProjectById يعيد undefined عند غيابه", () => {
      expect(getProjectById("nonexistent")).toBeUndefined();
    });

    it("getSceneById يعيد المشهد عند وجوده", () => {
      const { result } = renderHook(() => useStoreActions());
      const s1 = sampleScene("s1", "p1");

      act(() => {
        result.current.addScene(s1);
      });

      expect(getSceneById("s1")).toEqual(s1);
    });

    it("getSceneById يعيد undefined عند غيابه", () => {
      expect(getSceneById("nonexistent")).toBeUndefined();
    });

    it("getCharacterById يعيد الشخصية عند وجودها", () => {
      const { result } = renderHook(() => useStoreActions());
      const c1 = sampleCharacter("c1", "p1");

      act(() => {
        result.current.addCharacter(c1);
      });

      expect(getCharacterById("c1")).toEqual(c1);
    });

    it("getCharacterById يعيد undefined عند غيابها", () => {
      expect(getCharacterById("nonexistent")).toBeUndefined();
    });

    it("getShotById يعيد اللقطة عند وجودها", () => {
      const { result } = renderHook(() => useStoreActions());
      const sh1 = sampleShot("sh1", "s1");

      act(() => {
        result.current.addShot(sh1);
      });

      expect(getShotById("sh1")).toEqual(sh1);
    });

    it("getShotById يعيد undefined عند غيابها", () => {
      expect(getShotById("nonexistent")).toBeUndefined();
    });
  });

  // ================================================================
  // 8) الحالات الحدية
  // ================================================================
  describe("edge cases", () => {
    it("updateProject على مشروع غير موجود لا يغير شيئًا", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.addProject(p1);
        result.current.updateProject("nonexistent", { title: "Ghost" });
      });

      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects[0]!.title).toBe("Project p1");
    });

    it("updateScene على مشهد غير موجود لا يغير شيئًا", () => {
      const { result } = renderHook(() => useStoreActions());
      const s1 = sampleScene("s1", "p1");

      act(() => {
        result.current.addScene(s1);
        result.current.updateScene("nonexistent", { title: "Ghost" });
      });

      expect(result.current.scenes).toHaveLength(1);
      expect(result.current.scenes[0]!.title).toBe("Scene s1");
    });

    it("deleteProject على مشروع غير موجود لا يغير شيئًا", () => {
      const { result } = renderHook(() => useStoreActions());
      const p1 = sampleProject("p1");

      act(() => {
        result.current.addProject(p1);
        result.current.deleteProject("nonexistent");
      });

      expect(result.current.projects).toHaveLength(1);
    });

    it("setProjects بمصفوفة فارغة تُفرّغ القائمة", () => {
      const { result } = renderHook(() => useStoreActions());

      act(() => {
        result.current.addProject(sampleProject("p1"));
        result.current.setProjects([]);
      });

      expect(result.current.projects).toHaveLength(0);
    });

    it("addProject يُلحق عند القائمة الفارغة", () => {
      const { result } = renderHook(() => useStoreActions());

      act(() => {
        result.current.reset();
        result.current.addProject(sampleProject("p1"));
      });

      expect(result.current.projects).toHaveLength(1);
    });
  });
});
