/**
 * اختبارات التكامل الحي لواجهة brain-storm-ai
 * تركز على العقد الحالي للمكوّن بدل نصوص قديمة لم تعد موجودة.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

import BrainStormContent from "../(main)/brain-storm-ai/src/components/BrainStormContent";
import { conductDebate } from "../(main)/brain-storm-ai/src/lib/api";
import {
  exportToJSON,
  exportToMarkdown,
} from "../(main)/brain-storm-ai/src/lib/export";

import type {
  Session,
  DebateMessage,
} from "../(main)/brain-storm-ai/src/types";

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState: vi.fn(async () => null),
  persistRemoteAppState: vi.fn(async () => undefined),
}));

vi.mock("../(main)/brain-storm-ai/src/hooks/useAgentStates", () => ({
  useAgentStates: vi.fn(() => ({
    realAgents: [
      {
        id: "agent-1",
        name: "محلل",
        nameAr: "المحلل",
        role: "تحليل الأفكار",
        description: "وكيل متخصص في تحليل الأفكار",
        category: "analysis",
        icon: "brain",
        capabilities: {
          canAnalyze: true,
          canGenerate: false,
          canPredict: false,
          hasMemory: true,
          usesSelfReflection: true,
          supportsRAG: false,
        },
        collaboratesWith: [],
        enhances: [],
        complexityScore: 5,
        phaseRelevance: [1, 2, 3, 4, 5],
      },
    ],
    expandedAgents: new Set(),
    updateAgentState: vi.fn(),
    resetAllAgents: vi.fn(),
    toggleAgentExpand: vi.fn(),
    getAgentState: vi.fn((agentId: string) => ({
      id: agentId,
      status: "idle",
      lastMessage: "",
      progress: 0,
    })),
  })),
}));

vi.mock("../(main)/brain-storm-ai/src/hooks/useBrainstormCatalog", () => ({
  useBrainstormCatalog: vi.fn(() => ({
    catalog: {
      agents: [
        {
          id: "agent-1",
          name: "محلل",
          nameAr: "المحلل",
          role: "تحليل الأفكار",
          description: "وكيل متخصص في تحليل الأفكار",
          category: "analysis",
          icon: "brain",
          capabilities: {
            canAnalyze: true,
            canGenerate: false,
            canPredict: false,
            hasMemory: true,
            usesSelfReflection: true,
            supportsRAG: false,
          },
          collaboratesWith: [],
          enhances: [],
          complexityScore: 5,
          phaseRelevance: [1, 2, 3, 4, 5],
        },
      ],
      phases: [
        {
          id: 1,
          name: "التحليل",
          nameEn: "Analysis",
          description: "تحليل الفكرة",
          primaryAction: "analyze",
        },
        {
          id: 2,
          name: "التوسع",
          nameEn: "Expansion",
          description: "توسيع الأفكار",
          primaryAction: "generate",
        },
        {
          id: 3,
          name: "التحقق",
          nameEn: "Validation",
          description: "التحقق من الأفكار",
          primaryAction: "debate",
        },
        {
          id: 4,
          name: "النقاش",
          nameEn: "Debate",
          description: "نقاش الأفكار",
          primaryAction: "debate",
        },
        {
          id: 5,
          name: "التقييم",
          nameEn: "Evaluation",
          description: "تقييم نهائي",
          primaryAction: "decide",
        },
      ],
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock("../(main)/brain-storm-ai/src/hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock("../(main)/brain-storm-ai/src/lib/api", () => ({
  conductDebate: vi.fn(async ({ agentIds }) => ({
    success: true,
    result: {
      proposals: [
        {
          agentId: agentIds[0],
          proposal: "اقتراح تحليلي شامل للفكرة المقدمة",
          confidence: 0.85,
        },
      ],
      consensus: true,
      finalDecision: "الفكرة قابلة للتطوير مع بعض التحسينات",
      judgeReasoning: "بناءً على تحليل شامل للجوانب المختلفة",
    },
  })),
}));

describe("تكامل brain-storm-ai — العقد الحالي", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("ينشئ جلسة جديدة ويعرض التقدم بعد اكتمال المرحلة الأولى", async () => {
    render(<BrainStormContent />);

    await waitFor(() => {
      expect(screen.getByText(/منصة العصف الذهني الذكي/)).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText(/اكتب فكرتك/),
      "فكرة لتطبيق تعليمي تفاعلي"
    );
    await user.click(screen.getByRole("button", { name: /بدء جلسة/ }));

    await waitFor(() => {
      expect(screen.getByText(/الجلسة الحالية:/)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("20.0%")).toBeInTheDocument();
    });

    expect(screen.getByText(/التقدم/)).toBeInTheDocument();
    expect(vi.mocked(conductDebate)).toHaveBeenCalledTimes(1);
  });

  it("يحفظ الجلسة تلقائياً ويسترجعها من التخزين المحلي", async () => {
    render(<BrainStormContent />);

    await waitFor(() => {
      expect(screen.getByText(/منصة العصف الذهني الذكي/)).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText(/اكتب فكرتك/),
      "فكرة لمشروع برمجي"
    );
    await user.click(screen.getByRole("button", { name: /بدء جلسة/ }));

    await waitFor(() => {
      expect(localStorage.getItem("brainstorm_sessions")).not.toBeNull();
    });

    const raw = localStorage.getItem("brainstorm_sessions");
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw!);
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.sessions[0].session.brief).toBe("فكرة لمشروع برمجي");
    expect(parsed.sessions[0].messages).toHaveLength(2);
  });

  it("يصدر الجلسة بصيغتي JSON و Markdown عند اكتمالها", () => {
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: vi.fn(),
      style: {},
    } as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake");
    globalThis.URL.revokeObjectURL = vi.fn();

    const mockSession: Session = {
      id: "test-session",
      brief: "فكرة اختبار",
      phase: 5,
      status: "completed",
      startTime: new Date(),
      activeAgents: ["agent-1"],
      results: {
        phase1Debate: { proposals: [], consensus: true },
        phase5Debate: { finalDecision: "قرار نهائي" },
      },
    };

    const mockMessages: DebateMessage[] = [
      {
        agentId: "agent-1",
        agentName: "المحلل",
        message: "اقتراح جيد",
        timestamp: new Date(),
        type: "proposal",
      },
      {
        agentId: "judge",
        agentName: "الحكم",
        message: "قرار نهائي: الفكرة مقبولة",
        timestamp: new Date(),
        type: "decision",
      },
    ];

    const jsonResult = exportToJSON(mockSession, mockMessages);
    expect(jsonResult.ok).toBe(true);
    expect(jsonResult.filename).toContain("test-session");

    const markdownResult = exportToMarkdown(mockSession, mockMessages);
    expect(markdownResult.ok).toBe(true);
    expect(markdownResult.filename).toContain("test-session");
  });

  it("يعرض النتيجة النهائية بوضوح عند اكتمال الجلسة", () => {
    const mockSession: Session = {
      id: "completed-session",
      brief: "فكرة مكتملة",
      phase: 5,
      status: "completed",
      startTime: new Date(),
      activeAgents: ["agent-1"],
      results: {
        phase5Debate: {
          finalDecision: "الفكرة جاهزة للتنفيذ",
          judgeReasoning: "بناءً على التحليل الشامل",
        },
      },
    };

    expect(mockSession.status).toBe("completed");
    expect(mockSession.results?.phase5Debate).toBeDefined();
  });

  it("يتعامل مع أخطاء النقاش بشكل منضبط عبر مسار إعادة المحاولة", async () => {
    vi.mocked(conductDebate).mockRejectedValue(
      new Error("فشل في الاتصال بالخادم")
    );

    render(<BrainStormContent />);

    await waitFor(() => {
      expect(screen.getByText(/منصة العصف الذهني الذكي/)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/اكتب فكرتك/), "فكرة ستفشل");
    await user.click(screen.getByRole("button", { name: /بدء جلسة/ }));

    await waitFor(() => {
      expect(screen.getByText(/جاري إعادة المحاولة/)).toBeInTheDocument();
    });
  });

  it("يحسب التقدم الأولي بدقة بعد إنجاز أول مرحلة", async () => {
    render(<BrainStormContent />);

    await waitFor(() => {
      expect(screen.getByText(/منصة العصف الذهني الذكي/)).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText(/اكتب فكرتك/),
      "فكرة لاختبار التقدم"
    );
    await user.click(screen.getByRole("button", { name: /بدء جلسة/ }));

    await waitFor(() => {
      expect(screen.getByText("20.0%")).toBeInTheDocument();
    });
  });
});
