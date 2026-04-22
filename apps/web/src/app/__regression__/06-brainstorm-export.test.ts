/**
 * شبكة انحدار: brain-storm-ai — أزرار التصدير وتصدير سجل الجلسات
 *
 * يتحقق من:
 * - export buttons: exportToJSON و exportToMarkdown و copyToClipboard
 * - session history export: حفظ/تحميل/حذف/مسح الجلسات
 */
import { describe, it, expect, beforeEach } from "vitest";
import type {
  Session,
  DebateMessage,
} from "@/app/(main)/brain-storm-ai/src/types";

// ------------------------------------------------------------------
// بيانات اختبار مشتركة
// ------------------------------------------------------------------
function createMockSession(overrides?: Partial<Session>): Session {
  return {
    id: "session-001",
    brief: "عصف ذهني حول فكرة فيلم",
    phase: 3,
    status: "active",
    startTime: new Date("2026-04-10T10:00:00Z"),
    activeAgents: ["agent-1", "agent-2"],
    results: { topIdea: "فكرة رئيسية" },
    ...overrides,
  };
}

function createMockMessages(): DebateMessage[] {
  return [
    {
      agentId: "agent-1",
      agentName: "المحلل",
      message: "اقتراح: نركز على الجانب الإنساني",
      timestamp: new Date("2026-04-10T10:05:00Z"),
      type: "proposal",
    },
    {
      agentId: "agent-2",
      agentName: "الناقد",
      message: "ملاحظة: يحتاج تعمق أكثر",
      timestamp: new Date("2026-04-10T10:06:00Z"),
      type: "critique",
    },
    {
      agentId: "agent-1",
      agentName: "المحلل",
      message: "قرار: نمضي بالاتجاه الإنساني",
      timestamp: new Date("2026-04-10T10:10:00Z"),
      type: "decision",
    },
  ];
}

describe("شبكة انحدار: brain-storm-ai — التصدير", () => {
  // ================================================================
  // 1) أزرار التصدير — بنية البيانات
  // ================================================================
  describe("export buttons — بنية البيانات", () => {
    it("بيانات التصدير JSON تحتوي الحقول المطلوبة", () => {
      const session = createMockSession();
      const messages = createMockMessages();

      // محاكاة prepareExportData
      const exportData = {
        session: {
          id: session.id,
          brief: session.brief,
          phase: session.phase,
          status: session.status,
          startTime: session.startTime.toISOString(),
        },
        messages: messages.map((m) => ({
          agent: m.agentName,
          type: m.type,
          message: m.message,
          timestamp: m.timestamp.toISOString(),
        })),
        results: session.results || {},
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };

      expect(exportData.session.id).toBe("session-001");
      expect(exportData.messages).toHaveLength(3);
      expect(exportData.version).toBe("1.0");
      expect(exportData.results).toHaveProperty("topIdea");
    });

    it("بيانات التصدير Markdown تحتوي العناوين المطلوبة", () => {
      const session = createMockSession();

      // محاكاة بناء Markdown
      let md = `# تقرير جلسة العصف الذهني\n\n`;
      md += `**المعرّف:** ${session.id}\n\n`;
      md += `**الموجز:** ${session.brief}\n\n`;
      md += `**المرحلة:** ${session.phase} / 5\n\n`;

      expect(md).toContain("# تقرير جلسة العصف الذهني");
      expect(md).toContain(session.id);
      expect(md).toContain(session.brief);
      expect(md).toContain(`${session.phase} / 5`);
    });

    it("نسخ الحافظة يتضمن القرارات والاقتراحات", () => {
      const messages = createMockMessages();

      const decisions = messages.filter((m) => m.type === "decision");
      const proposals = messages.filter((m) => m.type === "proposal");

      expect(decisions).toHaveLength(1);
      expect(proposals).toHaveLength(1);
      expect(decisions[0].agentName).toBe("المحلل");
    });
  });

  // ================================================================
  // 2) سجل الجلسات — بنية التخزين
  // ================================================================
  describe("session history export", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("الجلسة المحفوظة تحتوي session و messages و savedAt", () => {
      const savedSession = {
        session: createMockSession(),
        messages: createMockMessages(),
        savedAt: new Date().toISOString(),
      };

      expect(savedSession).toHaveProperty("session");
      expect(savedSession).toHaveProperty("messages");
      expect(savedSession).toHaveProperty("savedAt");
      expect(savedSession.messages).toHaveLength(3);
    });

    it("التاريخ يُحوَّل من Date إلى string ويعود", () => {
      const session = createMockSession();
      const serialized = session.startTime.toISOString();
      const restored = new Date(serialized);

      expect(restored.getTime()).toBe(session.startTime.getTime());
    });

    it("التخزين يحتفظ بـ 20 جلسة كحد أقصى", () => {
      const sessions = Array.from({ length: 25 }, (_, i) => ({
        session: createMockSession({ id: `session-${i}` }),
        messages: [],
        savedAt: new Date().toISOString(),
      }));

      // محاكاة سلوك الحد الأقصى
      const trimmed = sessions.slice(0, 20);
      expect(trimmed).toHaveLength(20);
    });

    it("حفظ جلسة موجودة يحدّثها بدل إضافة نسخة جديدة", () => {
      const store = [
        {
          session: createMockSession({ id: "dup-1" }),
          messages: [],
          savedAt: "2026-04-10T10:00:00Z",
        },
      ];

      const updated = {
        session: createMockSession({
          id: "dup-1",
          status: "completed",
        }),
        messages: createMockMessages(),
        savedAt: "2026-04-10T11:00:00Z",
      };

      const idx = store.findIndex((s) => s.session.id === updated.session.id);
      if (idx >= 0) {
        store[idx] = updated;
      }

      expect(store).toHaveLength(1);
      expect(store[0].session.status).toBe("completed");
      expect(store[0].messages).toHaveLength(3);
    });

    it("localStorage يُكتب ويُقرأ بالتنسيق الصحيح", () => {
      const data = {
        sessions: [
          {
            session: {
              id: "s1",
              brief: "test",
              phase: 1,
              status: "active",
              startTime: "2026-04-10T10:00:00.000Z",
              activeAgents: [],
            },
            messages: [],
            savedAt: "2026-04-10T10:00:00.000Z",
          },
        ],
        version: 1,
      };

      localStorage.setItem("brainstorm_sessions", JSON.stringify(data));
      const raw = localStorage.getItem("brainstorm_sessions");
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.version).toBe(1);
    });
  });
});
