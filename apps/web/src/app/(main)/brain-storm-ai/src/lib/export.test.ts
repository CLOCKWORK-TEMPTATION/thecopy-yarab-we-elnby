import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  exportToJSON,
  exportToMarkdown,
  copyToClipboard,
  prepareExportData,
  buildMarkdownContent,
} from "./export";

import type { Session, DebateMessage } from "../types";
import type { ExportData } from "./export";

function makeSession(overrides?: Partial<Session>): Session {
  return {
    id: "session-123",
    brief: "اختبار فكرة إبداعية",
    phase: 2,
    status: "active",
    startTime: new Date("2026-01-15T10:00:00Z"),
    activeAgents: ["agent-1", "agent-2"],
    ...overrides,
  };
}

function makeMessages(): DebateMessage[] {
  return [
    {
      agentId: "agent-1",
      agentName: "محلل السوق",
      message: "هذا اقتراح اختباري",
      timestamp: new Date("2026-01-15T10:01:00Z"),
      type: "proposal",
    },
    {
      agentId: "judge",
      agentName: "الحكم",
      message: "القرار النهائي",
      timestamp: new Date("2026-01-15T10:02:00Z"),
      type: "decision",
    },
  ];
}

describe("prepareExportData", () => {
  it("should structure session and messages correctly", () => {
    const data = prepareExportData(makeSession(), makeMessages());
    expect(data.session.id).toBe("session-123");
    expect(data.session.brief).toBe("اختبار فكرة إبداعية");
    expect(data.session.phase).toBe(2);
    expect(data.messages).toHaveLength(2);
    expect(data.messages[0]!.agent).toBe("محلل السوق");
    expect(data.version).toBe("1.0");
  });

  it("should handle session with no results", () => {
    const data = prepareExportData(makeSession({ results: undefined }), []);
    expect(data.results).toEqual({});
    expect(data.messages).toEqual([]);
  });
});

describe("buildMarkdownContent", () => {
  it("should produce valid markdown with headers and messages", () => {
    const data: ExportData = {
      session: {
        id: "s-1",
        brief: "فكرة",
        phase: 3,
        status: "completed",
        startTime: "2026-01-15T10:00:00Z",
      },
      messages: [
        {
          agent: "وكيل-1",
          type: "proposal",
          message: "اقتراح",
          timestamp: "2026-01-15T10:01:00Z",
        },
      ],
      results: {},
      exportedAt: "2026-01-15T12:00:00Z",
      version: "1.0",
    };
    const md = buildMarkdownContent(data);
    expect(md).toContain("# تقرير جلسة العصف الذهني");
    expect(md).toContain("**المعرّف:** s-1");
  });

  it("should map type labels to Arabic", () => {
    const data: ExportData = {
      session: {
        id: "s-1",
        brief: "",
        phase: 1,
        status: "active",
        startTime: "",
      },
      messages: [
        { agent: "A", type: "decision", message: "m", timestamp: "t" },
        { agent: "B", type: "critique", message: "m", timestamp: "t" },
      ],
      results: {},
      exportedAt: "",
      version: "1.0",
    };
    const md = buildMarkdownContent(data);
    expect(md).toContain("— قرار");
    expect(md).toContain("— نقد");
  });
});

describe("exportToJSON", () => {
  beforeEach(() => {
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: vi.fn(),
      style: {},
    } as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);
    vi.spyOn(document.body, "removeChild").mockImplementation((n) => n);
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake");
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it("should return ok:true and trigger download", () => {
    const result = exportToJSON(makeSession(), makeMessages());
    expect(result.ok).toBe(true);
    expect(result.filename).toMatch(/^brainstorm_session-123_\d+\.json$/);
  });

  it("should return ok:false when DOM operations fail", () => {
    globalThis.URL.createObjectURL = vi.fn(() => {
      throw new Error("DOM error");
    });
    const result = exportToJSON(makeSession(), makeMessages());
    expect(result.ok).toBe(false);
  });
});

describe("exportToMarkdown", () => {
  beforeEach(() => {
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: vi.fn(),
      style: {},
    } as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);
    vi.spyOn(document.body, "removeChild").mockImplementation((n) => n);
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake");
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it("should return ok:true", () => {
    const result = exportToMarkdown(makeSession(), makeMessages());
    expect(result.ok).toBe(true);
  });
});

describe("copyToClipboard", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("should return ok:true on success", async () => {
    const result = await copyToClipboard(makeSession(), makeMessages());
    expect(result.ok).toBe(true);
  });

  it("should return ok:false when clipboard fails", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    const result = await copyToClipboard(makeSession(), makeMessages());
    expect(result.ok).toBe(false);
  });
});
