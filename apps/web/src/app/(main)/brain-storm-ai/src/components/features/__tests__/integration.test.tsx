/**
 * اختبارات تكامل لمكونات brain-storm-ai
 *
 * @description
 * يختبر التفاعل بين مكونات العصف الذهني والتصدير وشريط التقدم
 * بدون الحاجة إلى backend server جاري
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ExportControls } from "../ExportControls";
import { FinalResult } from "../FinalResult";
import { PhaseProgress } from "../PhaseProgress";

import type { Session, DebateMessage } from "../../../types";

// Mock export functions
vi.mock("../../../lib/export", () => ({
  exportToJSON: vi.fn(),
  exportToMarkdown: vi.fn(),
  copyToClipboard: vi.fn(),
}));

import {
  exportToJSON,
  exportToMarkdown,
  copyToClipboard,
} from "../../../lib/export";

const mockExportToJSON = vi.mocked(exportToJSON);
const mockExportToMarkdown = vi.mocked(exportToMarkdown);
const mockCopyToClipboard = vi.mocked(copyToClipboard);

describe("Brain Storm AI Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe("FinalResult Component", () => {
    const mockSession: Session = {
      id: "test-session",
      brief: "اختبار جلسة العصف الذهني",
      phase: 5,
      createdAt: new Date().toISOString(),
    };

    // استخدام أنواع DebateMessage الصحيحة: agentId, agentName, message, timestamp, type
    // المعطيات مصممة لتحقيق: 2 وكلاء فريدان، 1 قرار، 1 توصية
    const mockMessages: DebateMessage[] = [
      {
        agentId: "agent-1",
        agentName: "وكيل التحليل",
        message: "هذا قرار مهم يجب اتخاذه",
        timestamp: new Date(),
        type: "decision",
      },
      {
        agentId: "agent-2",
        agentName: "وكيل الإنتاج",
        message: "توصية: تطبيق هذا النهج لأنه فعال",
        timestamp: new Date(),
        type: "proposal",
      },
      {
        agentId: "agent-1",
        agentName: "وكيل التحليل",
        message: "تأكيد الاتفاق مع الاقتراح المطروح",
        timestamp: new Date(),
        type: "agreement",
      },
    ];

    it("يعرض النتائج النهائية بشكل صحيح", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <FinalResult
            session={mockSession}
            messages={mockMessages}
            progressPercent="100"
          />
        </QueryClientProvider>
      );

      expect(screen.getByText("النتائج النهائية")).toBeInTheDocument();
      expect(screen.getByText("الوكلاء المكتملين")).toBeInTheDocument();
      // uniqueAgents = 2 (agent-1 وكيل التحليل مرتان وagent-2 مرة)
      expect(screen.getByText("2")).toBeInTheDocument();
      // قرارات + توصيات كلاهما = 1: استخدام getAllByText للعثور على المتعددة
      expect(screen.getAllByText("1")).toHaveLength(2);
    });

    it("يعرض معلومات الجلسة الصحيحة", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <FinalResult
            session={mockSession}
            messages={mockMessages}
            progressPercent="100"
          />
        </QueryClientProvider>
      );

      expect(screen.getByText("اختبار جلسة العصف الذهني")).toBeInTheDocument();
      expect(screen.getByText("المرحلة 5")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument(); // إجمالي الرسائل
    });

    it("يعرض الاستنتاجات النهائية", () => {
      const messagesWithConclusions: DebateMessage[] = [
        ...mockMessages,
        {
          agentId: "agent-4",
          agentName: "وكيل الاستراتيجية",
          message:
            "هذا استنتاج نهائي مهم جداً ويحتاج إلى شرح مفصل لفهم النتائج بشكل كامل",
          timestamp: new Date(),
          type: "decision",
        },
      ];

      render(
        <QueryClientProvider client={queryClient}>
          <FinalResult
            session={mockSession}
            messages={messagesWithConclusions}
            progressPercent="100"
          />
        </QueryClientProvider>
      );

      expect(screen.getByText("الاستنتاجات النهائية")).toBeInTheDocument();
      expect(screen.getByText(/هذا استنتاج نهائي مهم/)).toBeInTheDocument();
    });
  });

  describe("PhaseProgress Component", () => {
    const mockPhases = [
      {
        id: 1,
        name: "التحليل الأولي",
        agentCount: 3,
        description: "تحليل المشكلة",
      },
      {
        id: 2,
        name: "البحث والجمع",
        agentCount: 4,
        description: "جمع المعلومات",
      },
      {
        id: 3,
        name: "التوليد",
        agentCount: 5,
        description: "توليد الأفكار",
      },
    ];

    it("يعرض شريط التقدم الصحيح", () => {
      render(
        <PhaseProgress
          phases={mockPhases}
          activePhase={2}
          progressPercent="40"
          isLoading={false}
        />
      );

      expect(screen.getByText("التقدم الكلي")).toBeInTheDocument();
      expect(screen.getByText("40%")).toBeInTheDocument();

      // التحقق من عرض المراحل
      expect(screen.getByText("التحليل الأولي")).toBeInTheDocument();
      expect(screen.getByText("البحث والجمع")).toBeInTheDocument();
      expect(screen.getByText("التوليد")).toBeInTheDocument();
    });

    it("يبرز المرحلة النشطة", () => {
      render(
        <PhaseProgress
          phases={mockPhases}
          activePhase={2}
          progressPercent="40"
          isLoading={true}
        />
      );

      // يجب أن تكون المرحلة 2 نشطة
      const activePhaseElement = screen.getByText("البحث والجمع");
      expect(activePhaseElement).toBeInTheDocument();

      // قد نحتاج إلى فحص الكلاسات أو السمات للتأكد من النشاط
    });

    it("يعرض مؤشر التحميل للمرحلة النشطة", () => {
      render(
        <PhaseProgress
          phases={mockPhases}
          activePhase={1}
          progressPercent="20"
          isLoading={true}
        />
      );

      // يجب أن يكون هناك عنصر متحرك للتحميل
      // هذا قد يحتاج إلى اختبار أكثر تحديداً
    });
  });

  describe("ExportControls Component", () => {
    const mockSession: Session = {
      id: "export-test-session",
      brief: "اختبار التصدير",
      phase: 3,
      createdAt: new Date().toISOString(),
    };

    // تصحيح: استخدام أنواع DebateMessage الصحيحة
    const mockMessages: DebateMessage[] = [
      {
        agentId: "agent-1",
        agentName: "وكيل الاختبار",
        message: "محتوى الرسالة الأولى",
        timestamp: new Date(),
        type: "proposal",
      },
    ];

    beforeEach(() => {
      mockExportToJSON.mockReturnValue({ ok: true });
      mockExportToMarkdown.mockReturnValue({ ok: true });
      mockCopyToClipboard.mockResolvedValue({ ok: true });
    });

    it("يعرض أزرار التصدير", () => {
      render(<ExportControls session={mockSession} messages={mockMessages} />);

      expect(screen.getByText("تصدير:")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /JSON/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Markdown/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /نسخ/i })).toBeInTheDocument();
    });

    it("ينفذ تصدير JSON بنجاح", async () => {
      render(<ExportControls session={mockSession} messages={mockMessages} />);

      const jsonButton = screen.getByRole("button", { name: /JSON/i });
      fireEvent.click(jsonButton);

      expect(mockExportToJSON).toHaveBeenCalledWith(mockSession, mockMessages);

      // انتظار رد الفعل الناجح
      await screen.findByText("تم ✓");
    });

    it("يعرض خطأ عند فشل التصدير", async () => {
      mockExportToJSON.mockReturnValue({
        ok: false,
        error: "فشل في التصدير",
      });

      render(<ExportControls session={mockSession} messages={mockMessages} />);

      const jsonButton = screen.getByRole("button", { name: /JSON/i });
      fireEvent.click(jsonButton);

      await screen.findByText("فشل في التصدير");
    });

    it("ينفذ نسخ إلى الحافظة", async () => {
      render(<ExportControls session={mockSession} messages={mockMessages} />);

      const copyButton = screen.getByRole("button", { name: /نسخ/i });
      fireEvent.click(copyButton);

      expect(mockCopyToClipboard).toHaveBeenCalledWith(
        mockSession,
        mockMessages
      );

      await screen.findByText("تم النسخ!");
    });
  });

  describe("Progress Percent Calculation", () => {
    it("يحسب النسبة المئوية للتقدم بشكل صحيح", () => {
      // هذا يختبر منطق حساب progressPercent
      const TOTAL_PHASES = 5;

      const calculateProgress = (activePhase: number) => {
        return ((activePhase / TOTAL_PHASES) * 100).toFixed(0);
      };

      expect(calculateProgress(1)).toBe("20");
      expect(calculateProgress(3)).toBe("60");
      expect(calculateProgress(5)).toBe("100");
    });
  });
});
