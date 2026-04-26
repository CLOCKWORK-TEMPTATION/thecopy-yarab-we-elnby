/**
 * Project Store - State management for projects
 */

import React, { useState, useCallback } from "react";

import type { Project, Scene, Character, Shot } from "@/types/api";

// Simple state management without zustand
type SetState<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>)
) => void;
type GetState<T> = () => T;

export interface ProjectStore {
  // State
  projects: Project[];
  currentProject: Project | null;
  scenes: Scene[];
  characters: Character[];
  shots: Shot[];
  loading: boolean;
  error: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  setScenes: (scenes: Scene[]) => void;
  addScene: (scene: Scene) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  deleteScene: (id: string) => void;

  setCharacters: (characters: Character[]) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;

  setShots: (shots: Shot[]) => void;
  addShot: (shot: Shot) => void;
  updateShot: (id: string, updates: Partial<Shot>) => void;
  deleteShot: (id: string) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  projects: [],
  currentProject: null,
  scenes: [],
  characters: [],
  shots: [],
  loading: false,
  error: null,
};

// Create a simple store implementation
function createStore<T extends Record<string, any>>(
  initializer: (set: SetState<T>, get: GetState<T>) => T
) {
  let state: T;
  const listeners = new Set<() => void>();

  const set: SetState<T> = (partial) => {
    const nextState =
      typeof partial === "function"
        ? (partial)(state)
        : partial;
    state = { ...state, ...nextState };
    listeners.forEach((listener) => listener());
  };

  const get: GetState<T> = () => state;

  state = initializer(set, get);

  return {
    getState: get,
    setState: set,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const projectStore = createStore<ProjectStore>(
  (set): ProjectStore => ({
    ...initialState,

    // Project actions
    setProjects: (projects: Project[]) => set({ projects }),

    setCurrentProject: (project: Project | null) =>
      set({ currentProject: project }),

    addProject: (project: Project) =>
      set((state) => ({
        projects: [...state.projects, project],
      })),

    updateProject: (id: string, updates: Partial<Project>) =>
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === id ? { ...project, ...updates } : project
        ),
        currentProject:
          state.currentProject?.id === id
            ? { ...state.currentProject, ...updates }
            : state.currentProject,
      })),

    deleteProject: (id: string) =>
      set((state) => ({
        projects: state.projects.filter((project) => project.id !== id),
        currentProject:
          state.currentProject?.id === id ? null : state.currentProject,
      })),

    // Scene actions
    setScenes: (scenes: Scene[]) => set({ scenes }),

    addScene: (scene: Scene) =>
      set((state) => ({
        scenes: [...state.scenes, scene],
      })),

    updateScene: (id: string, updates: Partial<Scene>) =>
      set((state) => ({
        scenes: state.scenes.map((scene) =>
          scene.id === id ? { ...scene, ...updates } : scene
        ),
      })),

    deleteScene: (id: string) =>
      set((state) => ({
        scenes: state.scenes.filter((scene) => scene.id !== id),
      })),

    // Character actions
    setCharacters: (characters: Character[]) => set({ characters }),

    addCharacter: (character: Character) =>
      set((state) => ({
        characters: [...state.characters, character],
      })),

    updateCharacter: (id: string, updates: Partial<Character>) =>
      set((state) => ({
        characters: state.characters.map((character) =>
          character.id === id ? { ...character, ...updates } : character
        ),
      })),

    deleteCharacter: (id: string) =>
      set((state) => ({
        characters: state.characters.filter((character) => character.id !== id),
      })),

    // Shot actions
    setShots: (shots: Shot[]) => set({ shots }),

    addShot: (shot: Shot) =>
      set((state) => ({
        shots: [...state.shots, shot],
      })),

    updateShot: (id: string, updates: Partial<Shot>) =>
      set((state) => ({
        shots: state.shots.map((shot) =>
          shot.id === id ? { ...shot, ...updates } : shot
        ),
      })),

    deleteShot: (id: string) =>
      set((state) => ({
        shots: state.shots.filter((shot) => shot.id !== id),
      })),

    // UI state actions
    setLoading: (loading: boolean) => set({ loading }),

    setError: (error: string | null) => set({ error }),

    clearError: () => set({ error: null }),

    reset: () => set(initialState),
  })
);

// Hook to use the store
export function useProjectStore<T>(
  selector?: (state: ProjectStore) => T
): T extends undefined ? ProjectStore : T {
  const [, forceUpdate] = useState({});

  const rerender = useCallback(() => {
    forceUpdate({});
  }, []);

  // Subscribe to changes
  React.useEffect(() => {
    return projectStore.subscribe(rerender);
  }, [rerender]);

  const state = projectStore.getState();
  return (selector ? selector(state) : state) as T extends undefined
    ? ProjectStore
    : T;
}

// Selectors
export const selectProjects = (state: ProjectStore) => state.projects;
export const selectCurrentProject = (state: ProjectStore) =>
  state.currentProject;
export const selectScenes = (state: ProjectStore) => state.scenes;
export const selectCharacters = (state: ProjectStore) => state.characters;
export const selectShots = (state: ProjectStore) => state.shots;
export const selectLoading = (state: ProjectStore) => state.loading;
export const selectError = (state: ProjectStore) => state.error;

// Helper functions
export function getProjectById(id: string): Project | undefined {
  return projectStore
    .getState()
    .projects.find((project: Project) => project.id === id);
}

export function getSceneById(id: string): Scene | undefined {
  return projectStore.getState().scenes.find((scene: Scene) => scene.id === id);
}

export function getCharacterById(id: string): Character | undefined {
  return projectStore
    .getState()
    .characters.find((character: Character) => character.id === id);
}

export function getShotById(id: string): Shot | undefined {
  return projectStore.getState().shots.find((shot: Shot) => shot.id === id);
}

// Default export
export default useProjectStore;
