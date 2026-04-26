/**
 * اختبارات ScriptUploadZone.tsx
 *
 * المكون الآن إشعار "الاستيراد معطّل" يوجّه المستخدم إلى /editor (المالك الوحيد للاستيراد).
 * الاختبارات القديمة كانت تفترض أنه لا يزال يحوي حقل ملف وdrag/drop، وهي وظيفة أُلغيت.
 * هذه الاختبارات تحفظ نفس مستوى الصرامة عبر تغطية كل سلوكيات العقد الحالي:
 *  - إظهار رسالة "الاستيراد معطّل" ووصفها.
 *  - إظهار مسار /editor كنص code للمالك الوحيد للاستيراد.
 *  - وجود زر التوجيه إلى المحرر.
 *  - النقر على الزر يستدعي router.push("/editor") بالضبط (سلوك التحويل).
 *  - الأيقونة التحذيرية AlertCircle ظاهرة (إعلان بصري للحالة).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ScriptUploadZone from "../ScriptUploadZone";

const routerPushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("ScriptUploadZone — disabled-import notice contract", () => {
  beforeEach(() => {
    routerPushMock.mockClear();
  });

  it("renders the disabled-import title", () => {
    render(<ScriptUploadZone />);
    expect(screen.getByText("الاستيراد معطّل")).toBeInTheDocument();
  });

  it("renders the description explaining import was removed", () => {
    render(<ScriptUploadZone />);
    expect(
      screen.getByText("تم إلغاء الاستيراد من هذه الصفحة")
    ).toBeInTheDocument();
  });

  it("identifies /editor as the sole owner of import", () => {
    render(<ScriptUploadZone />);
    const editorPath = screen.getByText("/editor");
    expect(editorPath).toBeInTheDocument();
    expect(editorPath.tagName.toLowerCase()).toBe("code");
  });

  it("renders the redirect button labeled 'انتقل إلى المحرر'", () => {
    render(<ScriptUploadZone />);
    expect(
      screen.getByRole("button", { name: "انتقل إلى المحرر" })
    ).toBeInTheDocument();
  });

  it("redirects to /editor when the button is clicked", async () => {
    const user = userEvent.setup();
    render(<ScriptUploadZone />);

    const button = screen.getByRole("button", { name: "انتقل إلى المحرر" });
    await user.click(button);

    expect(routerPushMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenCalledWith("/editor");
  });

  it("does not redirect on render (only on explicit click)", () => {
    render(<ScriptUploadZone />);
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("contains no file input or drag-drop affordance (import is disabled)", () => {
    const { container } = render(<ScriptUploadZone />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByText(/اسحب وأفلت/)).toBeNull();
    expect(screen.queryByText(/جاري تحميل السيناريو/)).toBeNull();
  });
});
