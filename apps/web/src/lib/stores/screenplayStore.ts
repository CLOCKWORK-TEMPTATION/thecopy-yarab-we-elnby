export interface SelectionRange {
  start: number;
  end: number;
}

export interface FormattedLine {
  id: string;
  text: string;
  type: string;
  number: number;
}

export interface ScreenplayStats {
  totalLines: number;
  wordCount: number;
}

export interface ScreenplaySettings {
  autoSaveInterval: number;
  fontSize?: number;
  fontFamily?: string;
  theme?: "light" | "dark";
}

const defaultState = {
  content: "",
  formattedLines: [] as FormattedLine[],
  cursorPosition: 0,
  selection: null as SelectionRange | null,
  isDirty: false,
  stats: { totalLines: 0, wordCount: 0 },
  settings: { autoSaveInterval: 10000 } as ScreenplaySettings,
  isSaving: false,
  isLoading: false,
  currentFormat: "action",
};

export function useScreenplayStore() {
  return {
    ...defaultState,
    setContent: (_content: string) => {},
    setFormattedLines: (_lines: FormattedLine[]) => {},
    setCursorPosition: (_position: number) => {},
    setSelection: (_selection: SelectionRange | null) => {},
    saveDocument: async () => {},
    loadDocument: async (_id: string) => {},
    exportDocument: async (_format?: string) => "",
    markDirty: () => {},
    markClean: () => {},
    calculateStats: () => {},
    setCurrentFormat: (_format: string) => {},
    updateSettings: (_settings: Partial<ScreenplaySettings>) => {},
    setFontSize: (_size: number) => {},
    setFontFamily: (_family: string) => {},
    toggleTheme: () => {},
  };
}

export const screenplayActions = {};

export default { useScreenplayStore, screenplayActions };
