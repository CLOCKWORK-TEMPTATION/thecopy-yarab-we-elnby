import { pickImportFile } from "./file-picker";

describe("pickImportFile", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  });

  it("يعيد null عند إلغاء نافذة اختيار الملف", async () => {
    interface FakeInput {
      type: string;
      name: string;
      accept: string;
      tabIndex: number;
      style: Record<string, string>;
      files: File[];
      setAttribute: () => undefined;
      addEventListener: (event: string, cb: EventListener) => void;
      removeEventListener: (event: string) => void;
      remove: () => undefined;
      click: () => undefined;
    }
    let createdInput: FakeInput | null = null;
    const listeners = new Map<string, EventListener>();

    const fakeDocument = {
      body: {
        appendChild: (node: unknown) => node,
      },
      documentElement: {
        appendChild: (node: unknown) => node,
      },
      createElement: () => {
        createdInput = {
          type: "",
          name: "",
          accept: "",
          tabIndex: -1,
          style: {},
          files: [],
          setAttribute: () => undefined,
          addEventListener: (event: string, cb: EventListener) => {
            listeners.set(event, cb);
          },
          removeEventListener: (event: string) => {
            listeners.delete(event);
          },
          remove: () => undefined,
          click: () => undefined,
        };
        return createdInput;
      },
    } as unknown as Document;

    const focusListeners = new Map<string, EventListener>();
    const fakeWindow = {
      addEventListener: (event: string, cb: EventListener) => {
        focusListeners.set(event, cb);
      },
      removeEventListener: (event: string) => {
        focusListeners.delete(event);
      },
      setTimeout: (cb: () => void) => {
        cb();
        return 1;
      },
      clearTimeout: () => undefined,
    } as unknown as Window & typeof globalThis;

    globalThis.document = fakeDocument;
    globalThis.window = fakeWindow;

    const pending = pickImportFile();
    expect(createdInput).not.toBeNull();
    const focusHandler = focusListeners.get("focus");
    expect(focusHandler).toBeTypeOf("function");
    focusHandler?.(new Event("focus"));

    await expect(pending).resolves.toBeNull();
  });
});
