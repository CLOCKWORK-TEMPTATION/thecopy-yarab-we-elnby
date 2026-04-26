import { runInsertMenuAction } from "./insert-menu-controller";

import type { EditorArea } from "../components/editor";

const createArea = () => {
  const inserted: string[] = [];
  const selections: { from: number; to: number }[] = [];

  const chain = () => ({
    focus: vi.fn().mockReturnThis(),
    insertContent: vi.fn((value: string) => {
      inserted.push(value);
      return chainObject;
    }),
    setTextSelection: vi.fn((range: { from: number; to: number }) => {
      selections.push(range);
      return chainObject;
    }),
    run: vi.fn(() => true),
  });

  const chainObject = chain();
  const area = {
    setFormat: vi.fn(() => true),
    editor: {
      state: {
        selection: {
          from: 7,
          $from: {
            depth: 0,
          },
        },
      },
      chain: vi.fn(() => chainObject),
    },
  } as unknown as EditorArea;

  return { area, inserted, selections };
};

describe("insert menu controller", () => {
  it("inserts action template text and selects it for immediate editing", () => {
    const { area, inserted, selections } = createArea();
    const toast = vi.fn();

    runInsertMenuAction({
      actionId: "insert-template:action",
      area,
      toast,
      getNextPhotoMontageNumber: () => 1,
    });

    expect(area.setFormat).toHaveBeenCalledWith("action");
    expect(inserted).toEqual(["وصف الحدث..."]);
    expect(selections).toEqual([
      {
        from: 7,
        to: 7 + "وصف الحدث...".length,
      },
    ]);
    expect(toast).toHaveBeenCalledWith({
      title: "تم الإدراج",
      description: "تم إدراج قالب الوصف/الحركة.",
    });
  });
});
