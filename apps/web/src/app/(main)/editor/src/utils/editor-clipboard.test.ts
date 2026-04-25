import type { Editor } from "@tiptap/core";
import {
  copyToClipboard,
  cutToClipboard,
  pasteFromClipboard,
} from "./editor-clipboard";

const setClipboard = (clipboard: Partial<Clipboard>): void => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });
};

const createEditor = (options?: {
  emptySelection?: boolean;
  text?: string;
  selectedText?: string;
  deleteResult?: boolean;
}): Editor => {
  const emptySelection = options?.emptySelection ?? false;
  const selectedText = options?.selectedText ?? "كلمة محددة";
  const deleteResult = options?.deleteResult ?? true;

  return {
    state: {
      selection: {
        empty: emptySelection,
        from: 1,
        to: 1 + selectedText.length,
      },
      doc: {
        textBetween: vi.fn(() => selectedText),
      },
    },
    getText: vi.fn(() => options?.text ?? "نص كامل"),
    getHTML: vi.fn(() => "<div data-type=\"action\">نص كامل</div>"),
    chain: vi.fn(() => ({
      focus: vi.fn().mockReturnThis(),
      deleteSelection: vi.fn().mockReturnThis(),
      run: vi.fn(() => deleteResult),
    })),
  } as unknown as Editor;
};

describe("editor clipboard helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });

  it("copies the selected text with a detailed success result", async () => {
    const writeText = vi.fn(async () => undefined);
    setClipboard({ writeText } as Partial<Clipboard>);

    const result = await copyToClipboard(createEditor(), true);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
    expect(result.textLength).toBe("كلمة محددة".length);
    expect(writeText).toHaveBeenCalledWith("كلمة محددة");
  });

  it("cuts the selected text only after a successful copy", async () => {
    const writeText = vi.fn(async () => undefined);
    const editor = createEditor();
    setClipboard({ writeText } as Partial<Clipboard>);

    const result = await cutToClipboard(editor);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
    expect(editor.chain).toHaveBeenCalled();
  });

  it("pastes plain text through the import callback", async () => {
    const readText = vi.fn(async () => "نص منسوخ");
    const importText = vi.fn(async () => undefined);
    const importBlocks = vi.fn(async () => undefined);
    setClipboard({ readText } as Partial<Clipboard>);

    const result = await pasteFromClipboard("menu", importText, importBlocks);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
    expect(importText).toHaveBeenCalledWith("نص منسوخ", "insert", {
      classificationProfile: "paste",
    });
    expect(importBlocks).not.toHaveBeenCalled();
  });

  it("returns a permission error when clipboard writing is denied", async () => {
    setClipboard({
      writeText: vi.fn(async () => {
        throw new DOMException("denied", "NotAllowedError");
      }),
    } as Partial<Clipboard>);

    const result = await copyToClipboard(createEditor(), true);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("permission-denied");
  });
});
