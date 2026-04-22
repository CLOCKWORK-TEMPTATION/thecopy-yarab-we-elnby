export const STORAGE_KEYS = {
  appState: "actorai-arabic.app-state.v1",
  demoRecordings: "actorai-arabic.demo-recordings.v1",
  webcamSessions: "actorai-arabic.webcam-sessions.v1",
  selfTapeTakes: "actorai-arabic.self-tape-takes.v1",
  selfTapeScript: "actorai-arabic.self-tape-script.v1",
} as const;

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // نتجاهل أخطاء التخزين ونبقي التطبيق قابلاً للاستخدام
  }
}
