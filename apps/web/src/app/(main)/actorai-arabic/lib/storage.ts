import {
  RecordingSchema,
  ScriptSchema,
  UserSchema,
  type Recording,
  type Script,
  type User,
  type ViewType,
} from "../types";

export const APP_STORAGE_KEY = "actorai-arabic.app-state";

export interface PersistedAppState {
  currentView?: ViewType;
  theme?: "light" | "dark";
  user?: User | null;
  scripts?: Script[];
  recordings?: Recording[];
}

const VALID_VIEWS: ViewType[] = [
  "home",
  "demo",
  "dashboard",
  "login",
  "register",
  "vocal",
  "voicecoach",
  "rhythm",
  "webcam",
  "ar",
  "memorization",
];

export function canUseBrowserStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined" &&
    typeof window.history !== "undefined"
  );
}

function isValidView(value: string | null | undefined): value is ViewType {
  return Boolean(value && VALID_VIEWS.includes(value as ViewType));
}

function hasNoValidParsedItems(
  rawItems: unknown,
  parsedItems: unknown[] | undefined
): boolean {
  return (
    Array.isArray(rawItems) &&
    rawItems.length > 0 &&
    (parsedItems?.length ?? 0) === 0
  );
}

function assignValidatedCollection<T>(
  target: PersistedAppState,
  key: "scripts" | "recordings",
  rawItems: unknown,
  parsedItems: T[] | undefined
): void {
  if (parsedItems && !hasNoValidParsedItems(rawItems, parsedItems)) {
    target[key] = parsedItems as PersistedAppState[typeof key];
  }
}

function parseStoredState(raw: string | null): PersistedAppState {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as PersistedAppState;
    const parsedScripts = Array.isArray(parsed.scripts)
      ? parsed.scripts
          .map((item) => ScriptSchema.safeParse(item).data)
          .filter((item): item is Script => Boolean(item))
      : undefined;
    const parsedRecordings = Array.isArray(parsed.recordings)
      ? parsed.recordings
          .map((item) => RecordingSchema.safeParse(item).data)
          .filter((item): item is Recording => Boolean(item))
      : undefined;

    const nextState: PersistedAppState = {};

    if (isValidView(parsed.currentView)) {
      nextState.currentView = parsed.currentView;
    }

    if (parsed.theme === "dark" || parsed.theme === "light") {
      nextState.theme = parsed.theme;
    }

    if (parsed.user) {
      nextState.user = UserSchema.safeParse(parsed.user).data ?? null;
    } else {
      nextState.user = null;
    }

    assignValidatedCollection(
      nextState,
      "scripts",
      parsed.scripts,
      parsedScripts
    );
    assignValidatedCollection(
      nextState,
      "recordings",
      parsed.recordings,
      parsedRecordings
    );

    return nextState;
  } catch {
    return {};
  }
}

export function readPersistedAppState(): PersistedAppState {
  if (!canUseBrowserStorage()) {
    return {};
  }

  return parseStoredState(window.localStorage.getItem(APP_STORAGE_KEY));
}

export function writePersistedAppState(state: PersistedAppState): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
}

export function resolveInitialView(fallback: ViewType): ViewType {
  if (typeof window === "undefined") {
    return fallback;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const viewFromUrl = searchParams.get("view");
  if (isValidView(viewFromUrl)) {
    return viewFromUrl;
  }

  const storedState = readPersistedAppState();
  return storedState.currentView && isValidView(storedState.currentView)
    ? storedState.currentView
    : fallback;
}

export function syncViewToUrl(view: ViewType): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  window.history.replaceState({}, "", url.toString());
}

export function syncThemeToDocument(theme: "light" | "dark"): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
}

export function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validatePassword(value: string): boolean {
  return value.trim().length >= 8;
}

export function deriveDisplayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "المستخدم";
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
