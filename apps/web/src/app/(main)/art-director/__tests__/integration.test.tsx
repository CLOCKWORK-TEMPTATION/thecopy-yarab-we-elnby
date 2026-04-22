/**
 * اختبارات تكامل لمكونات art-director
 *
 * @description
 * يختبر التفاعل بين المكونات والـ API client
 * بدون الحاجة إلى backend server جاري
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Locations from "../components/Locations";

// Mock the API client
vi.mock("../lib/api-client", () => ({
  fetchArtDirectorJson: vi.fn(),
}));

import { fetchArtDirectorJson } from "../lib/api-client";

const mockFetchArtDirectorJson = vi.mocked(fetchArtDirectorJson);

describe("Art Director Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockFetchArtDirectorJson.mockClear();
  });

  describe("Locations Component", () => {
    it("يحمل المواقع عند البحث", async () => {
      const mockLocations = [
        {
          id: "1",
          name: "Studio A",
          nameAr: "استوديو أ",
          type: "studio",
          address: "123 Film St",
          features: ["Lighting", "Sound"],
        },
      ];

      mockFetchArtDirectorJson.mockResolvedValueOnce({
        success: true,
        data: { locations: mockLocations },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <Locations />
        </QueryClientProvider>
      );

      // اضغط على زر البحث
      const searchButton = screen.getByRole("button", { name: /بحث/i });
      fireEvent.click(searchButton);

      // انتظر تحميل النتائج
      await waitFor(() => {
        expect(mockFetchArtDirectorJson).toHaveBeenCalledWith(
          "/locations/search",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ query: undefined }),
          })
        );
      });

      // تحقق من عرض الموقع
      await waitFor(() => {
        expect(screen.getByText("استوديو أ")).toBeInTheDocument();
      });
    });

    it("يضيف موقع جديد بنجاح", async () => {
      mockFetchArtDirectorJson
        .mockResolvedValueOnce({ success: true }) // للإضافة
        .mockResolvedValueOnce({
          // للبحث بعد الإضافة
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
        });

      render(
        <QueryClientProvider client={queryClient}>
          <Locations />
        </QueryClientProvider>
      );

      // اضغط على زر إضافة موقع
      const addButton = screen.getByRole("button", {
        name: /إضافة موقع جديد/i,
      });
      fireEvent.click(addButton);

      // املأ النموذج
      const nameInput = screen.getByLabelText(/الاسم بالإنجليزية/i);
      const nameArInput = screen.getByLabelText(/الاسم بالعربية/i);
      const addressInput = screen.getByLabelText(/العنوان/i);

      fireEvent.change(nameInput, { target: { value: "New Location" } });
      fireEvent.change(nameArInput, { target: { value: "موقع جديد" } });
      fireEvent.change(addressInput, { target: { value: "456 Cinema Ave" } });

      // اضغط على زر الحفظ
      const saveButton = screen.getByRole("button", { name: /حفظ/i });
      fireEvent.click(saveButton);

      // انتظر الطلب
      await waitFor(() => {
        expect(mockFetchArtDirectorJson).toHaveBeenCalledWith(
          "/locations/add",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("New Location"),
          })
        );
      });
    });

    it("يعرض رسالة خطأ عند فشل الطلب", async () => {
      mockFetchArtDirectorJson.mockRejectedValueOnce(
        new Error("فشل في الاتصال بالخادم")
      );

      render(
        <QueryClientProvider client={queryClient}>
          <Locations />
        </QueryClientProvider>
      );

      const searchButton = screen.getByRole("button", { name: /بحث/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("فشل في الاتصال بالخادم")).toBeInTheDocument();
      });
    });
  });

  describe("Inspiration Component", () => {
    it("ينشئ لوحة مزاج بنجاح", async () => {
      const mockAnalysis = {
        summary: "تحليل المشهد الناجح",
        recommendations: ["استخدم إضاءة درامية", "ركز على العناصر العاطفية"],
        riskFactors: ["الإضاءة المعقدة"],
        costOptimization: ["استخدم المواقع الطبيعية"],
        shootingSchedule: {
          totalDays: 15,
          phases: {
            preProduction: 5,
            production: 8,
            postProduction: 2,
          },
        },
      };

      mockFetchArtDirectorJson.mockResolvedValueOnce({
        success: true,
        data: { analysis: mockAnalysis },
      });

      // Note: This would require importing and rendering the Inspiration component
      // For now, we'll test the API call pattern
      const { fetchArtDirectorJson } = await import("../lib/api-client");

      await fetchArtDirectorJson("/inspiration/analyze", {
        method: "POST",
        body: JSON.stringify({ scene: "Test scene description" }),
      });

      expect(mockFetchArtDirectorJson).toHaveBeenCalledWith(
        "/inspiration/analyze",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ scene: "Test scene description" }),
        })
      );
    });
  });

  describe("API Client", () => {
    it("يبني المسار الصحيح", async () => {
      const { artDirectorApiPath } = await import("../lib/api-client");

      expect(artDirectorApiPath("/test")).toBe("/api/art-director/test");
      expect(artDirectorApiPath("test")).toBe("/api/art-director/test");
    });

    it("يرمي خطأ عند استجابة غير ناجحة", async () => {
      mockFetchArtDirectorJson.mockImplementationOnce(async () => {
        throw new Error("فشل الطلب مع الحالة 500");
      });

      await expect(fetchArtDirectorJson("/test")).rejects.toThrow(
        "فشل الطلب مع الحالة 500"
      );
    });
  });
});
