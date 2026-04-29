"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import {
  readPersistedAppState,
  resolveInitialView,
  syncThemeToDocument,
  syncViewToUrl,
  validateEmail,
  validatePassword,
  writePersistedAppState,
  type PersistedAppState,
} from "../lib/storage";

import type { ViewType, User, Script, Recording } from "../types";

interface AppContextValue {
  currentView: ViewType;
  user: User | null;
  theme: "light" | "dark";
  notification: { type: "success" | "error" | "info"; message: string } | null;
  scripts: Script[];
  recordings: Recording[];
  navigate: (view: ViewType) => void;
  toggleTheme: () => void;
  showNotification: (
    type: "success" | "error" | "info",
    message: string
  ) => void;
  handleLogin: (email: string, password: string) => void;
  handleRegister: (name: string, email: string, password: string) => void;
  handleLogout: () => void;
  addScript: (script: Script) => void;
  addRecording: (recording: Recording) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_SCRIPTS: Script[] = [
  {
    id: "1",
    title: "روميو وجولييت - مشهد الشرفة",
    author: "شكسبير",
    content: "",
    uploadDate: "2025-10-28",
    status: "analyzed",
  },
  {
    id: "2",
    title: "هاملت - أكون أو لا أكون",
    author: "شكسبير",
    content: "...",
    uploadDate: "2025-10-26",
    status: "analyzed",
  },
  {
    id: "3",
    title: "عربة اسمها الرغبة - المشهد 3",
    author: "تينيسي ويليامز",
    content: "...",
    uploadDate: "2025-10-25",
    status: "processing",
  },
];

const DEFAULT_RECORDINGS: Recording[] = [
  {
    id: "1",
    title: "مشهد الحديقة - التجربة 3",
    duration: "3:42",
    date: "2025-10-30",
    score: 82,
  },
  {
    id: "2",
    title: "مشهد اللقاء - التجربة 1",
    duration: "4:15",
    date: "2025-10-29",
    score: 76,
  },
];

interface StateSetters {
  setCurrentView: (v: ViewType) => void;
  setTheme: (v: "light" | "dark") => void;
  setUser: (v: User | null) => void;
  setScripts: (v: Script[]) => void;
  setRecordings: (v: Recording[]) => void;
}

function applyRemoteSnapshot(
  snapshot: PersistedAppState,
  setters: StateSetters
) {
  if (snapshot.currentView) setters.setCurrentView(snapshot.currentView);
  if (snapshot.theme) setters.setTheme(snapshot.theme);
  if (snapshot.user !== undefined) setters.setUser(snapshot.user ?? null);
  if (snapshot.scripts) setters.setScripts(snapshot.scripts);
  if (snapshot.recordings) setters.setRecordings(snapshot.recordings);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const persistedState = readPersistedAppState();

  const [currentView, setCurrentView] = useState<ViewType>(() =>
    resolveInitialView("home")
  );
  const [user, setUser] = useState<User | null>(
    () => persistedState.user ?? null
  );
  const [theme, setTheme] = useState<"light" | "dark">(
    () => persistedState.theme ?? "light"
  );
  const [notification, setNotification] =
    useState<AppContextValue["notification"]>(null);
  const [isRemoteStateReady, setIsRemoteStateReady] = useState(false);
  const [scripts, setScripts] = useState<Script[]>(
    () => persistedState.scripts ?? DEFAULT_SCRIPTS
  );
  const [recordings, setRecordings] = useState<Recording[]>(
    () => persistedState.recordings ?? DEFAULT_RECORDINGS
  );

  useEffect(() => {
    syncThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    void loadRemoteAppState<PersistedAppState>("actorai-arabic")
      .then((snapshot) => {
        if (cancelled || !snapshot) return;
        applyRemoteSnapshot(snapshot, {
          setCurrentView,
          setTheme,
          setUser,
          setScripts,
          setRecordings,
        });
      })
      .catch(() => {
        /* empty */
      })
      .finally(() => {
        if (!cancelled) setIsRemoteStateReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    syncViewToUrl(currentView);
    writePersistedAppState({ currentView, theme, user, scripts, recordings });
  }, [currentView, theme, user, scripts, recordings]);

  useEffect(() => {
    if (!isRemoteStateReady) return;

    const timeoutId = window.setTimeout(() => {
      void persistRemoteAppState<PersistedAppState>("actorai-arabic", {
        currentView,
        theme,
        user,
        scripts,
        recordings,
      }).catch(() => {
        /* empty */
      });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentView, isRemoteStateReady, recordings, scripts, theme, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      setCurrentView(resolveInitialView("home"));
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const showNotification = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 5000);
    },
    []
  );

  const navigate = useCallback((view: ViewType) => {
    setCurrentView(view);
    if (
      typeof window !== "undefined" &&
      typeof window.scrollTo === "function"
    ) {
      window.scrollTo(0, 0);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  const handleLogin = useCallback(
    (email: string, password: string) => {
      if (!validateEmail(email)) {
        showNotification("error", "البريد الإلكتروني غير صالح");
        return;
      }
      if (!password.trim()) {
        showNotification("error", "يرجى إدخال كلمة المرور");
        return;
      }
      if (email && password) {
        setUser({
          id: user?.id ?? "1",
          name: user?.email === email ? user.name : (user?.name ?? "أحمد محمد"),
          email,
        });
        showNotification("success", "تم تسجيل الدخول بنجاح!");
        navigate("dashboard");
        return;
      }
      showNotification("error", "يرجى إدخال البيانات الصحيحة");
    },
    [navigate, showNotification, user]
  );

  const handleRegister = useCallback(
    (name: string, email: string, password: string) => {
      if (name.trim().length < 2) {
        showNotification("error", "الاسم يجب أن يحتوي على حرفين على الأقل");
        return;
      }
      if (!validateEmail(email)) {
        showNotification("error", "البريد الإلكتروني غير صالح");
        return;
      }
      if (!validatePassword(password)) {
        showNotification("error", "كلمة المرور يجب أن تكون 8 أحرف على الأقل");
        return;
      }
      if (name && email && password) {
        setUser({ id: "1", name, email });
        showNotification("success", "تم إنشاء الحساب بنجاح!");
        navigate("dashboard");
        return;
      }
      showNotification("error", "يرجى ملء جميع الحقول");
    },
    [navigate, showNotification]
  );

  const handleLogout = useCallback(() => {
    setUser(null);
    showNotification("info", "تم تسجيل الخروج");
    navigate("home");
  }, [navigate, showNotification]);

  const addScript = useCallback((script: Script) => {
    setScripts((prev) => [script, ...prev]);
  }, []);

  const addRecording = useCallback((recording: Recording) => {
    setRecordings((prev) => [recording, ...prev]);
  }, []);

  const value = useMemo(
    () => ({
      currentView,
      user,
      theme,
      notification,
      scripts,
      recordings,
      navigate,
      toggleTheme,
      showNotification,
      handleLogin,
      handleRegister,
      handleLogout,
      addScript,
      addRecording,
    }),
    [
      currentView,
      user,
      theme,
      notification,
      scripts,
      recordings,
      navigate,
      toggleTheme,
      showNotification,
      handleLogin,
      handleRegister,
      handleLogout,
      addScript,
      addRecording,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
