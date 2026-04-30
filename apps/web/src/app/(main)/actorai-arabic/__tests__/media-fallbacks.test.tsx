// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VoiceCoach } from "../components/VoiceCoach";
import { WebcamAnalysisView } from "../features/webcam";
import { fireEvent, renderWithApp, screen, waitFor } from "../test-utils";

describe("بدائل الوسائط في تطبيق الممثل العربي", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/actorai-arabic?view=webcam");
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
  });

  it("يعرض بديلاً صوتياً عملياً عند غياب دعم الميكروفون", async () => {
    renderWithApp(<VoiceCoach />);

    expect(
      screen.getByRole("button", { name: /استخدام عينة صوتية/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/رفع ملف صوتي بديل/i)).toBeInTheDocument();
  });

  it("يعرض بديلاً بصرياً عملياً عند فشل تفعيل الكاميرا", async () => {
    renderWithApp(<WebcamAnalysisView />);

    fireEvent.click(screen.getByRole("button", { name: /تفعيل الكاميرا/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /استخدام عينة تدريب/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/رفع ملف مرجعي/i)).toBeInTheDocument();
  });
});
