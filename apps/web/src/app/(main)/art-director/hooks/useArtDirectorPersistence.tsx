"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

export type ArtDirectorTabId =
  | "dashboard"
  | "tools"
  | "inspiration"
  | "locations"
  | "sets"
  | "productivity"
  | "documentation";

export type ArtDirectorFormData = Record<string, string>;

export interface ArtDirectorExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
}

export interface ArtDirectorInspirationState {
  sceneDescription: string;
  mood: string;
  era: string;
  result: unknown | null;
  palettes: unknown[];
}

export interface ArtDirectorLocationsState {
  searchQuery: string;
  showAddForm: boolean;
  formData: {
    name: string;
    nameAr: string;
    type: string;
    address: string;
    features: string;
  };
}

export interface ArtDirectorSetsState {
  showAddForm: boolean;
  formData: {
    name: string;
    nameAr: string;
    category: string;
    condition: string;
    dimensions: string;
  };
}

export interface ArtDirectorSavedState {
  version: 1;
  activeTab: ArtDirectorTabId;
  tools: {
    selectedTool: string | null;
    formsByTool: Record<string, ArtDirectorFormData>;
    resultsByTool: Record<string, ArtDirectorExecutionResult | null>;
  };
  inspiration: ArtDirectorInspirationState;
  locations: ArtDirectorLocationsState;
  sets: ArtDirectorSetsState;
  updatedAt: string;
}

interface ArtDirectorPersistenceContextValue {
  state: ArtDirectorSavedState;
  hydrated: boolean;
  setActiveTab: (tab: ArtDirectorTabId) => void;
  updateToolsState: (
    updater: (
      current: ArtDirectorSavedState["tools"]
    ) => ArtDirectorSavedState["tools"]
  ) => void;
  updateInspirationState: (patch: Partial<ArtDirectorInspirationState>) => void;
  updateLocationsState: (patch: Partial<ArtDirectorLocationsState>) => void;
  updateSetsState: (patch: Partial<ArtDirectorSetsState>) => void;
}

const STORAGE_KEY = "the-copy.art-director.state.v1";

const DEFAULT_STATE: ArtDirectorSavedState = {
  version: 1,
  activeTab: "dashboard",
  tools: {
    selectedTool: null,
    formsByTool: {},
    resultsByTool: {},
  },
  inspiration: {
    sceneDescription: "",
    mood: "",
    era: "",
    result: null,
    palettes: [],
  },
  locations: {
    searchQuery: "",
    showAddForm: false,
    formData: {
      name: "",
      nameAr: "",
      type: "interior",
      address: "",
      features: "",
    },
  },
  sets: {
    showAddForm: false,
    formData: {
      name: "",
      nameAr: "",
      category: "أثاث",
      condition: "excellent",
      dimensions: "",
    },
  },
  updatedAt: "",
};

const ArtDirectorPersistenceContext =
  createContext<ArtDirectorPersistenceContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTabId(value: unknown): value is ArtDirectorTabId {
  return (
    value === "dashboard" ||
    value === "tools" ||
    value === "inspiration" ||
    value === "locations" ||
    value === "sets" ||
    value === "productivity" ||
    value === "documentation"
  );
}

export function isArtDirectorTabId(
  value: string | null
): value is ArtDirectorTabId {
  return isTabId(value);
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toBooleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toFormData(value: unknown): ArtDirectorFormData {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
      .map(([key, nextValue]) => [key, nextValue])
  );
}

function toRecordMap<T>(
  value: unknown,
  mapper: (entry: unknown) => T
): Record<string, T> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, nextValue]) => [key, mapper(nextValue)])
  );
}

function toExecutionResult(value: unknown): ArtDirectorExecutionResult | null {
  if (!isRecord(value) || typeof value["success"] !== "boolean") {
    return null;
  }

  return value as ArtDirectorExecutionResult;
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normalizeState(value: unknown): ArtDirectorSavedState | null {
  if (!isRecord(value) || value["version"] !== 1) {
    return null;
  }

  const tools = isRecord(value["tools"]) ? value["tools"] : {};
  const inspiration = isRecord(value["inspiration"])
    ? value["inspiration"]
    : {};
  const locations = isRecord(value["locations"]) ? value["locations"] : {};
  const locationFormData = isRecord(locations["formData"])
    ? locations["formData"]
    : {};
  const sets = isRecord(value["sets"]) ? value["sets"] : {};
  const setFormData = isRecord(sets["formData"]) ? sets["formData"] : {};

  return {
    ...DEFAULT_STATE,
    activeTab: isTabId(value["activeTab"])
      ? value["activeTab"]
      : DEFAULT_STATE.activeTab,
    tools: {
      selectedTool:
        typeof tools["selectedTool"] === "string"
          ? tools["selectedTool"]
          : null,
      formsByTool: toRecordMap(tools["formsByTool"], toFormData),
      resultsByTool: toRecordMap(tools["resultsByTool"], toExecutionResult),
    },
    inspiration: {
      sceneDescription: toStringValue(inspiration["sceneDescription"]),
      mood: toStringValue(inspiration["mood"]),
      era: toStringValue(inspiration["era"]),
      result: isRecord(inspiration["result"]) ? inspiration["result"] : null,
      palettes: toRecordArray(inspiration["palettes"]),
    },
    locations: {
      searchQuery: toStringValue(locations["searchQuery"]),
      showAddForm: toBooleanValue(locations["showAddForm"]),
      formData: {
        name: toStringValue(locationFormData["name"]),
        nameAr: toStringValue(locationFormData["nameAr"]),
        type: toStringValue(locationFormData["type"], "interior"),
        address: toStringValue(locationFormData["address"]),
        features: toStringValue(locationFormData["features"]),
      },
    },
    sets: {
      showAddForm: toBooleanValue(sets["showAddForm"]),
      formData: {
        name: toStringValue(setFormData["name"]),
        nameAr: toStringValue(setFormData["nameAr"]),
        category: toStringValue(setFormData["category"], "أثاث"),
        condition: toStringValue(setFormData["condition"], "excellent"),
        dimensions: toStringValue(setFormData["dimensions"]),
      },
    },
    updatedAt: toStringValue(value["updatedAt"]),
    version: 1,
  };
}

function readLocalState(): ArtDirectorSavedState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeLocalState(state: ArtDirectorSavedState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // التخزين المحلي احتياطي فقط.
  }
}

function withTimestamp(state: ArtDirectorSavedState): ArtDirectorSavedState {
  return {
    ...state,
    updatedAt: new Date().toISOString(),
  };
}

export function ArtDirectorPersistenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<ArtDirectorSavedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      const localState = readLocalState();

      try {
        const remoteState =
          await loadRemoteAppState<ArtDirectorSavedState>("art-director");
        const normalizedRemote = normalizeState(remoteState);

        if (!cancelled) {
          setState(normalizedRemote ?? localState ?? DEFAULT_STATE);
        }
      } catch {
        if (!cancelled) {
          setState(localState ?? DEFAULT_STATE);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const nextState = withTimestamp(state);
    writeLocalState(nextState);

    const timeout = window.setTimeout(() => {
      void persistRemoteAppState<ArtDirectorSavedState>(
        "art-director",
        nextState
      ).catch(() => undefined);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [hydrated, state]);

  const setActiveTab = useCallback((tab: ArtDirectorTabId) => {
    setState((current) => {
      if (current.activeTab === tab) return current;

      return {
        ...current,
        activeTab: tab,
      };
    });
  }, []);

  const updateToolsState = useCallback(
    (
      updater: (
        current: ArtDirectorSavedState["tools"]
      ) => ArtDirectorSavedState["tools"]
    ) => {
      setState((current) => ({
        ...current,
        tools: updater(current.tools),
      }));
    },
    []
  );

  const updateInspirationState = useCallback(
    (patch: Partial<ArtDirectorInspirationState>) => {
      setState((current) => ({
        ...current,
        inspiration: {
          ...current.inspiration,
          ...patch,
        },
      }));
    },
    []
  );

  const updateLocationsState = useCallback(
    (patch: Partial<ArtDirectorLocationsState>) => {
      setState((current) => ({
        ...current,
        locations: {
          ...current.locations,
          ...patch,
          formData: patch.formData
            ? {
                ...current.locations.formData,
                ...patch.formData,
              }
            : current.locations.formData,
        },
      }));
    },
    []
  );

  const updateSetsState = useCallback(
    (patch: Partial<ArtDirectorSetsState>) => {
      setState((current) => ({
        ...current,
        sets: {
          ...current.sets,
          ...patch,
          formData: patch.formData
            ? {
                ...current.sets.formData,
                ...patch.formData,
              }
            : current.sets.formData,
        },
      }));
    },
    []
  );

  const value = useMemo<ArtDirectorPersistenceContextValue>(
    () => ({
      state,
      hydrated,
      setActiveTab,
      updateToolsState,
      updateInspirationState,
      updateLocationsState,
      updateSetsState,
    }),
    [
      hydrated,
      setActiveTab,
      state,
      updateInspirationState,
      updateLocationsState,
      updateSetsState,
      updateToolsState,
    ]
  );

  return (
    <ArtDirectorPersistenceContext.Provider value={value}>
      {children}
    </ArtDirectorPersistenceContext.Provider>
  );
}

export function useArtDirectorPersistence(): ArtDirectorPersistenceContextValue {
  const context = useContext(ArtDirectorPersistenceContext);

  if (!context) {
    throw new Error(
      "useArtDirectorPersistence must be used inside ArtDirectorPersistenceProvider"
    );
  }

  return context;
}
