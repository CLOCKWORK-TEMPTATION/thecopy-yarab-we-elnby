import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SceneStudioPanel } from "./SceneStudioPanel";

const storageKey = "cinematography-studio.session.v2";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("SceneStudioPanel", () => {
  it("creates, edits, saves, and restores a cinematography scene", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SceneStudioPanel />);

    await user.clear(screen.getByLabelText("اسم المشهد"));
    await user.type(screen.getByLabelText("اسم المشهد"), "مشهد اختبار الإضاءة");
    await user.clear(screen.getByLabelText("وصف المشهد"));
    await user.type(
      screen.getByLabelText("وصف المشهد"),
      "لقطة داخلية بضوء رئيسي حاد وحافة خلفية دافئة."
    );
    await user.click(screen.getByRole("button", { name: "إضافة مصدر ضوء" }));
    await user.click(screen.getByRole("button", { name: "حفظ تصميم التصوير" }));

    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as {
      scene?: { name?: string; description?: string; lights?: unknown[] };
    };
    expect(stored.scene?.name).toBe("مشهد اختبار الإضاءة");
    expect(stored.scene?.description).toContain("لقطة داخلية");
    expect(stored.scene?.lights).toHaveLength(4);

    unmount();
    render(<SceneStudioPanel />);

    expect(screen.getByDisplayValue("مشهد اختبار الإضاءة")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/لقطة داخلية/)).toBeInTheDocument();
    expect(screen.getAllByTestId("cine-light-row")).toHaveLength(4);
  });

  it("updates the preview metrics when light, camera, and lens controls change", async () => {
    const user = userEvent.setup();
    render(<SceneStudioPanel />);

    const preview = screen.getByTestId("cine-scene-preview");
    expect(within(preview).getByText("إضاءة رئيسية 65%")).toBeInTheDocument();
    expect(within(preview).getByText("35mm")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("حزمة العدسة"), "anamorphic");
    fireEvent.change(screen.getByLabelText("شدة الضوء الرئيسي"), {
      target: { value: "82" },
    });
    fireEvent.change(screen.getByLabelText("البعد البؤري"), {
      target: { value: "65" },
    });

    expect(within(preview).getByText("إضاءة رئيسية 82%")).toBeInTheDocument();
    expect(within(preview).getByText("65mm")).toBeInTheDocument();
    expect(within(preview).getByText("Anamorphic")).toBeInTheDocument();
  });

  it("exports a JSON file and builds a share link from the saved scene", async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:cinematography-export");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<SceneStudioPanel />);
    await user.clear(screen.getByLabelText("اسم المشهد"));
    await user.type(screen.getByLabelText("اسم المشهد"), "Export Scene");
    await user.click(screen.getByRole("button", { name: "حفظ تصميم التصوير" }));
    await user.click(screen.getByRole("button", { name: "تصدير إعدادات التصوير" }));

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:cinematography-export");

    await user.click(screen.getByRole("button", { name: "إنشاء رابط مشاركة" }));

    const shareLink = screen.getByTestId("cine-share-link");
    expect(shareLink).toHaveTextContent("/cinematography-studio?share=");
    expect(localStorage.getItem(storageKey)).toContain("Export Scene");
  });

  it("shows a clear fallback when WebGL is not available", () => {
    render(<SceneStudioPanel forceWebGLUnavailable />);

    expect(
      screen.getByText("العرض ثلاثي الأبعاد غير متاح في هذه الجلسة")
    ).toBeInTheDocument();
    expect(screen.getByText("تستطيع متابعة تعديل الإضاءة والكاميرا والحفظ."))
      .toBeInTheDocument();
  });
});
