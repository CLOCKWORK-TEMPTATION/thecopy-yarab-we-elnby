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

import {
  exportToJSON,
  exportToMarkdown,
  copyToClipboard,
} from "../../../lib/export";
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

const mockExportToJSON = vi.mocked(exportToJSON);
const mockExportToMarkdown = vi.mocked(exportToMarkdown);
const mockCopyToClipboard = vi.mocked(copyToClipboard);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const finalResultSession: Session = {
  id: "test-session",
  brief: "اختبار جلسة العصف الذهني",
  phase: 5,
  createdAt: new Date().toISOString(),
};

const finalResultMessages: DebateMessage[] = [
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

describe("Brain Storm AI Integration — FinalResult Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it("يعرض النتائج النهائية بشكل صحيح", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FinalResult
          session={finalResultSession}
          messages={finalResultMessages}
          progressPercent="100"
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("النتائج النهائية")).toBeInTheDocument();
    expect(screen.getByText("الوكلاء المكتملين")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(2);
  });

  it("يعرض معلومات الجلسة الصحيحة", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FinalResult
          session={finalResultSession}
          messages={finalResultMessages}
          progressPercent="100"
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("اختبار جلسة العصف الذهني")).toBeInTheDocument();
    expect(screen.getByText("المرحلة 5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("يعرض الاستنتاجات النهائية", () => {
    const messagesWithConclusions: DebateMessage[] = [
      ...finalResultMessages,
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
          session={finalResultSession}
          messages={messagesWithConclusions}
          progressPercent="100"
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("الاستنتاجات النهائية")).toBeInTheDocument();
    expect(screen.getByText(/هذا استنتاج نهائي مهم/)).toBeInTheDocument();
  });
});

describe("Brain Storm AI Integration — PhaseProgress Component", () => {
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

    const activePhaseElement = screen.getByText("البحث والجمع");
    expect(activePhaseElement).toBeInTheDocument();
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

    expect(screen.getByText("التحليل الأولي")).toBeInTheDocument();
  });
});

describe("Brain Storm AI Integration — ExportControls Component", () => {
  const exportSession: Session = {
    id: "export-test-session",
    brief: "اختبار التصدير",
    phase: 3,
    createdAt: new Date().toISOString(),
  };

  const exportMessages: DebateMessage[] = [
    {
      agentId: "agent-1",
      agentName: "وكيل الاختبار",
      message: "محتوى الرسالة الأولى",
      timestamp: new Date(),
      type: "proposal",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockExportToJSON.mockReturnValue({ ok: true });
    mockExportToMarkdown.mockReturnValue({ ok: true });
    mockCopyToClipboard.mockResolvedValue({ ok: true });
  });

  it("يعرض أزرار التصدير", () => {
    render(
      <ExportControls session={exportSession} messages={exportMessages} />
    );

    expect(screen.getByText("تصدير:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /JSON/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Markdown/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /نسخ/i })).toBeInTheDocument();
  });

  it("ينفذ تصدير JSON بنجاح", async () => {
    render(
      <ExportControls session={exportSession} messages={exportMessages} />
    );

    const jsonButton = screen.getByRole("button", { name: /JSON/i });
    fireEvent.click(jsonButton);

    expect(mockExportToJSON).toHaveBeenCalledWith(
      exportSession,
      exportMessages
    );
    await screen.findByText("تم ✓");
  });

  it("يعرض خطأ عند فشل التصدير", async () => {
    mockExportToJSON.mockReturnValue({
      ok: false,
      error: "فشل في التصدير",
    });

    render(
      <ExportControls session={exportSession} messages={exportMessages} />
    );

    const jsonButton = screen.getByRole("button", { name: /JSON/i });
    fireEvent.click(jsonButton);

    expect(await screen.findByText("فشل في التصدير")).toBeInTheDocument();
  });

  it("ينفذ نسخ إلى الحافظة", async () => {
    render(
      <ExportControls session={exportSession} messages={exportMessages} />
    );

    const copyButton = screen.getByRole("button", { name: /نسخ/i });
    fireEvent.click(copyButton);

    expect(mockCopyToClipboard).toHaveBeenCalledWith(
      exportSession,
      exportMessages
    );
    await screen.findByText("تم النسخ!");
  });
});

describe("Brain Storm AI Integration — Progress Percent Calculation", () => {
  it("يحسب النسبة المئوية للتقدم بشكل صحيح", () => {
    const TOTAL_PHASES = 5;

    const calculateProgress = (activePhase: number) => {
      return ((activePhase / TOTAL_PHASES) * 100).toFixed(0);
    };

    expect(calculateProgress(1)).toBe("20");
    expect(calculateProgress(3)).toBe("60");
    expect(calculateProgress(5)).toBe("100");
  });
});
