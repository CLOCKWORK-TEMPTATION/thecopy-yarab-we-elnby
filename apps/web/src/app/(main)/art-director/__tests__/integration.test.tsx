import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

import Inspiration from "../components/Inspiration";
import Locations from "../components/Locations";
import Sets from "../components/Sets";
import Tools from "../components/Tools";
import { ArtDirectorPersistenceProvider } from "../hooks/useArtDirectorPersistence";

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState: vi.fn(),
  persistRemoteAppState: vi.fn(),
  clearRemoteAppState: vi.fn(),
}));

vi.mock("../lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api-client")>();

  return {
    ...actual,
    fetchArtDirectorJson: vi.fn(),
  };
});

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";
import { artDirectorApiPath, fetchArtDirectorJson } from "../lib/api-client";

const mockFetchArtDirectorJson = vi.mocked(fetchArtDirectorJson);
const mockLoadRemoteAppState = vi.mocked(loadRemoteAppState);
const mockPersistRemoteAppState = vi.mocked(persistRemoteAppState);

function renderWithPersistence(ui: ReactElement) {
  return render(
    <ArtDirectorPersistenceProvider>{ui}</ArtDirectorPersistenceProvider>
  );
}

const visualAnalyzerPlugin = {
  id: "visual-analyzer",
  name: "AI Visual Consistency Analyzer",
  nameAr: "محلل الاتساق البصري الذكي",
  version: "1.0.0",
  category: "ai-analytics",
};

describe("Art Director Integration Tests", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockFetchArtDirectorJson.mockReset();
    mockLoadRemoteAppState.mockResolvedValue(null);
    mockPersistRemoteAppState.mockResolvedValue({});
  });

  it("يبني مسار الواجهة البرمجية الرسمي", () => {
    expect(artDirectorApiPath("/test")).toBe("/api/art-director/test");
    expect(artDirectorApiPath("test")).toBe("/api/art-director/test");
  });

  it("يعرض نتيجة محلل التناسق البصري بشكل مفهوم", async () => {
    const user = userEvent.setup();

    mockFetchArtDirectorJson.mockImplementation(async (path) => {
      if (path === "/plugins") {
        return {
          success: true,
          plugins: [visualAnalyzerPlugin],
        };
      }

      if (path === "/analyze/visual-consistency") {
        return {
          success: true,
          data: {
            consistent: false,
            score: 85,
            issues: [
              {
                type: "color",
                severity: "high",
                descriptionAr: "اختلاف كبير في لوحة الألوان",
                location: "Scenes scene-001-reference - scene-001",
                suggestion: "Review color grading",
              },
            ],
            suggestions: ["قم بإنشاء مرجع رئيسي للألوان لجميع المشاهد"],
          },
        };
      }

      return { success: true };
    });

    renderWithPersistence(<Tools />);

    await user.click(await screen.findByText("محلل الاتساق البصري الذكي"));
    await user.type(screen.getByLabelText("رقم المشهد"), "scene-001");
    await user.type(
      screen.getByLabelText("الألوان المرجعية"),
      "#FF5733, #3498DB"
    );
    await user.selectOptions(screen.getByLabelText("حالة الإضاءة"), "daylight");
    await user.click(screen.getByRole("button", { name: "تنفيذ" }));

    expect(await screen.findByText("درجة الاتساق")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("مشاكل مكتشفة")).toBeInTheDocument();
    expect(screen.getByText("اختلاف كبير في لوحة الألوان")).toBeInTheDocument();
  });

  it("يعرض فشل الأداة دون ترك منطقة النتيجة فارغة", async () => {
    const user = userEvent.setup();

    mockFetchArtDirectorJson.mockImplementation(async (path) => {
      if (path === "/plugins") {
        return {
          success: true,
          plugins: [visualAnalyzerPlugin],
        };
      }

      if (path === "/analyze/visual-consistency") {
        throw new Error("الخادم غير متاح");
      }

      return { success: true };
    });

    renderWithPersistence(<Tools />);

    await user.click(await screen.findByText("محلل الاتساق البصري الذكي"));
    await user.click(screen.getByRole("button", { name: "تنفيذ" }));

    expect(await screen.findByText("فشل التنفيذ")).toBeInTheDocument();
    expect(screen.getAllByText("الخادم غير متاح").length).toBeGreaterThan(0);
  });

  it("يستعيد مدخلات ونتائج الإلهام البصري من الحالة المحفوظة", async () => {
    mockLoadRemoteAppState.mockResolvedValueOnce({
      version: 1,
      activeTab: "inspiration",
      tools: {
        selectedTool: null,
        formsByTool: {},
        resultsByTool: {},
      },
      inspiration: {
        sceneDescription: "مشهد رومانسي في مقهى قديم",
        mood: "romantic",
        era: "1920s",
        result: {
          theme: "romantic",
          themeAr: "رومانسي",
          keywords: ["1920s", "Soft golden hour lighting"],
          suggestedPalette: {
            name: "romantic-palette",
            nameAr: "باليت رومانسي",
            colors: ["#D4A574", "#C9956B"],
          },
        },
        palettes: [],
      },
      locations: {
        searchQuery: "",
        showAddForm: false,
        formData: {
          name: "",
          nameAr: "",
          type: "interior",
          address: "",
          features: "",
        },
      },
      sets: {
        showAddForm: false,
        formData: {
          name: "",
          nameAr: "",
          category: "أثاث",
          condition: "excellent",
          dimensions: "",
        },
      },
      updatedAt: "2026-04-25T00:00:00.000Z",
    });

    renderWithPersistence(<Inspiration />);

    expect(
      await screen.findByDisplayValue("مشهد رومانسي في مقهى قديم")
    ).toBeInTheDocument();
    expect(screen.getByText("نتائج التحليل")).toBeInTheDocument();
    expect(screen.getByText(/باليت رومانسي/)).toBeInTheDocument();
  });

  it("يشغل الإلهام البصري ويحفظ النتيجة في حالة الصفحة", async () => {
    const user = userEvent.setup();

    mockFetchArtDirectorJson.mockResolvedValueOnce({
      success: true,
      data: {
        theme: "romantic",
        themeAr: "رومانسي",
        keywords: ["1920s", "Soft golden hour lighting"],
        suggestedPalette: {
          name: "romantic-palette",
          nameAr: "باليت رومانسي",
          colors: ["#D4A574", "#C9956B"],
        },
      },
    });

    renderWithPersistence(<Inspiration />);

    await user.type(
      screen.getByLabelText("وصف المشهد"),
      "مشهد رومانسي في مقهى قديم"
    );
    await user.selectOptions(screen.getByLabelText("المزاج العام"), "romantic");
    await user.selectOptions(screen.getByLabelText("الحقبة الزمنية"), "1920s");
    await user.click(screen.getByRole("button", { name: "تحليل المشهد" }));

    expect(await screen.findByText("نتائج التحليل")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockPersistRemoteAppState).toHaveBeenCalled();
    });
  });

  it("يضيف موقعا ويعيد عرضه بعد البحث", async () => {
    const user = userEvent.setup();

    mockFetchArtDirectorJson.mockImplementation(async (path) => {
      if (path === "/locations/add") {
        return { success: true };
      }

      if (path === "/locations/search") {
        return {
          success: true,
          data: {
            locations: [
              {
                id: "2",
                name: "New Location",
                nameAr: "موقع جديد",
                type: "exterior",
                address: "456 Cinema Ave",
                features: ["Parking"],
              },
            ],
          },
        };
      }

      return { success: true };
    });

    renderWithPersistence(<Locations />);

    await user.click(screen.getByRole("button", { name: "إضافة موقع جديد" }));
    await user.type(
      screen.getByLabelText("اسم الموقع (إنجليزي)"),
      "New Location"
    );
    await user.type(screen.getByLabelText("اسم الموقع (عربي)"), "موقع جديد");
    await user.type(screen.getByLabelText("العنوان"), "456 Cinema Ave");
    await user.click(screen.getByRole("button", { name: "إضافة" }));

    expect(await screen.findByText("موقع جديد")).toBeInTheDocument();
    expect(mockFetchArtDirectorJson).toHaveBeenCalledWith(
      "/locations/add",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("New Location"),
      })
    );
  });

  it("يضيف قطعة ديكور ويعرضها في المخزون", async () => {
    const user = userEvent.setup();

    mockFetchArtDirectorJson.mockImplementation(async (path) => {
      if (path === "/sets/add-piece") {
        return { success: true };
      }

      if (path === "/sets/inventory") {
        return {
          success: true,
          data: {
            pieces: [
              {
                id: "piece-1",
                name: "Classic Sofa",
                nameAr: "كنبة كلاسيكية",
                category: "furniture",
                condition: "excellent",
                reusabilityScore: 92,
              },
            ],
          },
        };
      }

      if (path === "/sets/sustainability-report") {
        return {
          success: true,
          data: {
            totalPieces: 1,
            reusablePercentage: 100,
            estimatedSavings: 450,
            environmentalImpact: "خفض النفايات الإنتاجية",
          },
        };
      }

      return { success: true };
    });

    renderWithPersistence(<Sets />);

    await user.click(screen.getByRole("button", { name: "إضافة قطعة" }));
    await user.type(screen.getByLabelText("الاسم (إنجليزي)"), "Classic Sofa");
    await user.type(screen.getByLabelText("الاسم (عربي)"), "كنبة كلاسيكية");
    await user.type(screen.getByLabelText("الأبعاد"), "200x80x90");

    const form = screen.getByText("إضافة قطعة ديكور").closest("div");
    expect(form).not.toBeNull();
    await user.click(
      within(form as HTMLElement).getByRole("button", { name: "إضافة" })
    );

    expect(await screen.findByText("كنبة كلاسيكية")).toBeInTheDocument();
    expect(screen.getByText("خفض النفايات الإنتاجية")).toBeInTheDocument();
  });
});
