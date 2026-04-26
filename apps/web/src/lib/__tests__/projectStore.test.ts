import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import {
  getCurrentProject,
  setCurrentProject,
  clearCurrentProject,
} from "../projectStore";

import type { Project } from "../projectStore";

describe("projectStore", () => {
  const mockProject: Project = {
    id: "test-123",
    name: "Test Project",
    description: "A test project",
  };

  beforeEach(() => {
    // Clear storage before each test
    sessionStorage.clear();
    // Clear memory store by calling clearCurrentProject
    clearCurrentProject();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCurrentProject", () => {
    it("should return null initially", () => {
      expect(getCurrentProject()).toBeNull();
    });

    it("should return project from sessionStorage if available", () => {
      sessionStorage.setItem("currentProject", JSON.stringify(mockProject));

      const project = getCurrentProject();
      expect(project).toEqual(mockProject);
    });

    it("should return project from memory if sessionStorage is empty but project was set", () => {
      // Temporarily mock window to be undefined to only set memory
      const originalWindow = global.window;
      // @ts-expect-error Mocking window to test memory store
      delete global.window;

      setCurrentProject(mockProject);

      // Restore window
      global.window = originalWindow;

      // Now getCurrentProject should return from memory because sessionStorage is empty
      expect(getCurrentProject()).toEqual(mockProject);
    });

    it("should fall back to memory when window is undefined", () => {
      setCurrentProject(mockProject);

      const originalWindow = global.window;
      // @ts-expect-error Mocking window to test undefined behavior
      delete global.window;

      expect(getCurrentProject()).toEqual(mockProject);

      global.window = originalWindow;
    });
  });

  describe("setCurrentProject", () => {
    it("should set project in memory and sessionStorage", () => {
      setCurrentProject(mockProject);

      expect(getCurrentProject()).toEqual(mockProject);
      expect(JSON.parse(sessionStorage.getItem("currentProject")!)).toEqual(
        mockProject
      );
    });

    it("should only set in memory when window is undefined", () => {
      const originalWindow = global.window;
      // @ts-expect-error Mocking window to test undefined behavior
      delete global.window;

      setCurrentProject(mockProject);

      expect(getCurrentProject()).toEqual(mockProject);

      global.window = originalWindow;

      // sessionStorage should still be empty since window was undefined during set
      expect(sessionStorage.getItem("currentProject")).toBeNull();
    });
  });

  describe("clearCurrentProject", () => {
    it("should clear project from memory and sessionStorage", () => {
      setCurrentProject(mockProject);
      clearCurrentProject();

      expect(getCurrentProject()).toBeNull();
      expect(sessionStorage.getItem("currentProject")).toBeNull();
    });

    it("should only clear from memory when window is undefined", () => {
      setCurrentProject(mockProject);

      const originalWindow = global.window;
      // @ts-expect-error Mocking window to test undefined behavior
      delete global.window;

      clearCurrentProject();

      expect(getCurrentProject()).toBeNull();

      global.window = originalWindow;

      // sessionStorage should still have the item since window was undefined during clear
      expect(JSON.parse(sessionStorage.getItem("currentProject")!)).toEqual(
        mockProject
      );
    });
  });
});
