import { pickImportFile } from "./file-picker";

describe("pickImportFile", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  });

  it("يعيد null عند إلغاء نافذة اختيار الملف", async () => {
    let createdInput: any = null;
    const listeners = new Map<string, Function>();

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
          addEventListener: (event: string, cb: Function) => {
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

    const focusListeners = new Map<string, Function>();
    const fakeWindow = {
      addEventListener: (event: string, cb: Function) => {
        focusListeners.set(event, cb);
      },
      removeEventListener: (event: string) => {
        focusListeners.delete(event);
      },
      setTimeout: (cb: Function) => {
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
    focusHandler?.();

    await expect(pending).resolves.toBeNull();
  });
});
