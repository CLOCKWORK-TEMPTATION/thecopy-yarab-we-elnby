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
    setContent: (_content: string) => {
      void _content;
    },
    setFormattedLines: (_lines: FormattedLine[]) => {
      void _lines;
    },
    setCursorPosition: (_position: number) => {
      void _position;
    },
    setSelection: (_selection: SelectionRange | null) => {
      void _selection;
    },
    saveDocument: () => Promise.resolve(),
    loadDocument: (_id: string) => {
      void _id;
      return Promise.resolve();
    },
    exportDocument: (_format?: string) => {
      void _format;
      return Promise.resolve("");
    },
    markDirty: () => {
      void defaultState.isDirty;
    },
    markClean: () => {
      void defaultState.isDirty;
    },
    calculateStats: () => {
      void defaultState.stats;
    },
    setCurrentFormat: (_format: string) => {
      void _format;
    },
    updateSettings: (_settings: Partial<ScreenplaySettings>) => {
      void _settings;
    },
    setFontSize: (_size: number) => {
      void _size;
    },
    setFontFamily: (_family: string) => {
      void _family;
    },
    toggleTheme: () => {
      void defaultState.settings.theme;
    },
  };
}

export const screenplayActions = {};

export default { useScreenplayStore, screenplayActions };
