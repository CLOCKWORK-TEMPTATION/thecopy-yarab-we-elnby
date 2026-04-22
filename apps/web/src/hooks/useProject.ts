import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import * as api from "@/lib/api";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateCharacterRequest,
  UpdateCharacterRequest,
  CreateSceneRequest,
  UpdateSceneRequest,
  CreateShotRequest,
  UpdateShotRequest,
} from "@/types/api";

export function useProjects() {
  return useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await api.getProjects();
      return response.data;
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["/api/projects", id],
    queryFn: async () => {
      const response = await api.getProject(id!);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useProjectScenes(projectId: string | undefined) {
  return useQuery({
    queryKey: ["/api/projects", projectId, "scenes"],
    queryFn: async () => {
      const response = await api.getProjectScenes(projectId!);
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useProjectCharacters(projectId: string | undefined) {
  return useQuery({
    queryKey: ["/api/projects", projectId, "characters"],
    queryFn: async () => {
      const response = await api.getProjectCharacters(projectId!);
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateCharacter() {
  return useMutation({
    mutationFn: (data: { projectId: string } & CreateCharacterRequest) =>
      api.createCharacter(data.projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", variables.projectId, "characters"],
      });
    },
  });
}

export function useUpdateCharacter() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCharacterRequest }) =>
      api.updateCharacter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "/api/projects" &&
          query.queryKey[2] === "characters",
      });
    },
  });
}

export function useDeleteCharacter() {
  return useMutation({
    mutationFn: (id: string) => api.deleteCharacter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "/api/projects" &&
          query.queryKey[2] === "characters",
      });
    },
  });
}

export function useCreateProject() {
  return useMutation({
    mutationFn: (data: CreateProjectRequest) => api.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useUpdateProject() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      api.updateProject(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", variables.id],
      });
    },
  });
}

export function useDeleteProject() {
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useAnalyzeScript() {
  return useMutation({
    mutationFn: ({
      projectId,
      script,
    }: {
      projectId: string;
      script: string;
    }) => api.analyzeScript(projectId, script),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", variables.projectId, "scenes"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", variables.projectId, "characters"],
      });
    },
  });
}

export function useCreateScene() {
  return useMutation({
    mutationFn: async (data: { projectId: string } & CreateSceneRequest) => {
      const res = await fetch(`/api/projects/${data.projectId}/scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", variables.projectId, "scenes"],
      });
    },
  });
}

export function useUpdateScene() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSceneRequest;
    }) => {
      const res = await fetch(`/api/scenes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "/api/projects" &&
          query.queryKey[2] === "scenes",
      });
    },
  });
}

export function useDeleteScene() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/scenes/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "/api/projects" &&
          query.queryKey[2] === "scenes",
      });
    },
  });
}

export function useSceneShots(sceneId: string | undefined) {
  return useQuery({
    queryKey: ["/api/scenes", sceneId, "shots"],
    queryFn: async () => {
      const response = await api.getSceneShots(sceneId!);
      return response.data;
    },
    enabled: !!sceneId,
  });
}

export function useCreateShot() {
  return useMutation({
    mutationFn: async (data: { sceneId: string } & CreateShotRequest) => {
      const res = await fetch(`/api/scenes/${data.sceneId}/shots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/scenes", variables.sceneId, "shots"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useUpdateShot() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateShotRequest;
    }) => {
      const res = await fetch(`/api/shots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "/api/scenes" && query.queryKey[2] === "shots",
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "/api/projects" &&
          query.queryKey[2] === "scenes",
      });
    },
  });
}

export function useDeleteShot() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shots/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "/api/scenes" && query.queryKey[2] === "shots",
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "/api/projects" &&
          query.queryKey[2] === "scenes",
      });
    },
  });
}
