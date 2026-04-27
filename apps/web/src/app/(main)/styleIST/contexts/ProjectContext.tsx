"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// ==========================================
// إدارة حالة المشروع (State Management)
// بنستخدم Context عشان نربط الـ Director بالـ Designer
// ==========================================

type Role = "Director" | "Costume Designer" | "Producer";

const DEFAULT_PROJECT_ID = "styleist-demo";

interface ProjectState {
  projectId: string;
  projectName: string;
  currentRole: Role;
  activeScene: string;
  notifications: string[];
}

interface ProjectContextType extends ProjectState {
  setRole: (role: Role) => void;
  addNotification: (msg: string) => void;
  updateScene: (scene: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
  projectId?: string;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({
  children,
  projectId: externalProjectId,
}) => {
  const [state, setState] = useState<ProjectState>({
    projectId: externalProjectId ?? DEFAULT_PROJECT_ID,
    projectName: "The Last Shadow - Season 1",
    currentRole: "Costume Designer",
    activeScene: "INT. HANGAR - NIGHT",
    notifications: [
      "تم اعتماد الميزانية للمشهد 4",
      "تنبيه: تغيير في إضاءة موقع التصوير",
    ],
  });

  useEffect(() => {
    if (!externalProjectId) return;
    // تحديث الـ projectId لو اتغير من بره
    setTimeout(() => {}, 0);
  }, [externalProjectId]);

  const setRole = (role: Role) =>
    setState((prev) => ({ ...prev, currentRole: role }));
  const addNotification = useCallback(
    (msg: string) =>
      setState((prev) => ({
        ...prev,
        notifications: [msg, ...prev.notifications],
      })),
    []
  );
  const updateScene = (scene: string) =>
    setState((prev) => ({ ...prev, activeScene: scene }));

  return (
    <ProjectContext.Provider
      value={{ ...state, setRole, addNotification, updateScene }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context)
    throw new Error("useProject must be used within a ProjectProvider");
  return context;
};
