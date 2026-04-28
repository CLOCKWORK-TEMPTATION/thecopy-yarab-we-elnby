import { motion } from "framer-motion";
import {
  MessageSquare,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DebateTurn {
  id: string;
  agent: string;
  claim: string;
  evidence: string[];
  verdict: "agree" | "disagree" | "partial";
  timestamp: Date;
}

interface DebateViewProps {
  density?: "compact" | "cozy";
  perspective?: "chronological" | "by-agent";
  turns: DebateTurn[];
  isEmpty?: boolean;
  insufficientEvidence?: boolean;
  agentMuted?: boolean;
}

const verdictIcons = {
  agree: <CheckCircle className="w-4 h-4" />,
  disagree: <XCircle className="w-4 h-4" />,
  partial: <AlertCircle className="w-4 h-4" />,
};

const verdictColors = {
  agree: "var(--state-final)",
  disagree: "var(--state-flagged)",
  partial: "var(--state-alt)",
};

const verdictLabels = {
  agree: "موافق",
  disagree: "معارض",
  partial: "جزئي",
};

export function DebateView({
  density = "cozy",
  perspective = "chronological",
  turns,
  isEmpty = false,
  insufficientEvidence = false,
  agentMuted = false,
}: DebateViewProps) {
  // Insufficient Evidence State
  if (insufficientEvidence) {
    return (
      <Card className="p-8 bg-[var(--color-panel)] border-[var(--color-surface)]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--state-alt)]/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-[var(--state-alt)]" />
          </div>
          <h3 className="text-[var(--color-text)] mb-2">أدلة غير كافية</h3>
          <p className="text-[var(--color-muted)] mb-4" dir="rtl">
            لا يوجد عدد كافٍ من الأدلة لإجراء مناظرة ذات معنى
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg text-[var(--color-muted)]">
            <MessageSquare className="w-4 h-4" />
            <span dir="rtl">قم بتشغيل المحطات 1-3 أولاً</span>
          </div>
        </div>
      </Card>
    );
  }

  // Agent Muted State
  if (agentMuted) {
    return (
      <Card className="p-8 bg-[var(--color-panel)] border-[var(--color-surface)]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-[var(--color-muted)]" />
          </div>
          <h3 className="text-[var(--color-text)] mb-2">الوكيل معطّل</h3>
          <p className="text-[var(--color-muted)]" dir="rtl">
            تم تعطيل وكيل المناظرة مؤقتاً
          </p>
        </div>
      </Card>
    );
  }

  // Empty State
  if (isEmpty || turns.length === 0) {
    return (
      <Card className="p-8 bg-[var(--color-panel)] border-[var(--color-surface)]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-[var(--color-muted)]" />
          </div>
          <h3 className="text-[var(--color-text)] mb-2">لا توجد مناظرة بعد</h3>
          <p className="text-[var(--color-muted)]" dir="rtl">
            انتظر بدء المناظرة بين الوكلاء
          </p>
        </div>
      </Card>
    );
  }

  const agents = Array.from(new Set(turns.map((t) => t.agent)));
  const isCompact = density === "compact";

  const renderTurns = (turnsToRender: DebateTurn[]) => (
    <ScrollArea className="h-[500px]">
      <div className={`space-y-${isCompact ? "3" : "4"} p-4`}>
        {turnsToRender.map((turn, index) => (
          <motion.div
            key={turn.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`bg-[var(--color-panel)] border-[var(--color-surface)] ${isCompact ? "p-3" : "p-4"}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${verdictColors[turn.verdict]}20`,
                    color: verdictColors[turn.verdict],
                  }}
                >
                  <User className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text)]">
                        {turn.agent}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-current flex items-center gap-1"
                        style={{ color: verdictColors[turn.verdict] }}
                      >
                        {verdictIcons[turn.verdict]}
                        {verdictLabels[turn.verdict]}
                      </Badge>
                    </div>
                    <span className="text-[var(--color-muted)]">
                      {turn.timestamp.toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h4 className="text-[var(--color-text)] mb-1" dir="rtl">
                        الادعاء:
                      </h4>
                      <p className="text-[var(--color-muted)]" dir="rtl">
                        {turn.claim}
                      </p>
                    </div>

                    {turn.evidence.length > 0 && !isCompact && (
                      <div>
                        <h4 className="text-[var(--color-text)] mb-1" dir="rtl">
                          الأدلة:
                        </h4>
                        <ul className="space-y-1" dir="rtl">
                          {turn.evidence.map((ev, idx) => (
                            <li
                              key={idx}
                              className="text-[var(--color-muted)] flex items-start gap-2"
                            >
                              <span className="text-[var(--color-accent)] mt-1">
                                •
                              </span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );

  if (perspective === "by-agent") {
    return (
      <Card className="bg-[var(--color-panel)] border-[var(--color-surface)]">
        <div className="p-4 border-b border-[var(--color-surface)]">
          <h3 className="text-[var(--color-text)]" dir="rtl">
            عرض المناظرة - حسب الوكيل
          </h3>
        </div>
        <Tabs {...(agents[0] && { defaultValue: agents[0] })} dir="rtl">
          <TabsList className="w-full justify-start border-b border-[var(--color-surface)] bg-transparent rounded-none">
            {agents.map((agent) => (
              <TabsTrigger
                key={agent}
                value={agent}
                className="data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-accent)]"
              >
                {agent}
              </TabsTrigger>
            ))}
          </TabsList>
          {agents.map((agent) => (
            <TabsContent key={agent} value={agent}>
              {renderTurns(turns.filter((t) => t.agent === agent))}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    );
  }

  return (
    <Card className="bg-[var(--color-panel)] border-[var(--color-surface)]">
      <div className="p-4 border-b border-[var(--color-surface)]">
        <h3 className="text-[var(--color-text)]" dir="rtl">
          عرض المناظرة - ترتيب زمني
        </h3>
        <p className="text-[var(--color-muted)] mt-1" dir="rtl">
          {turns.length} مداخلة من {agents.length} وكيل
        </p>
      </div>
      {renderTurns(turns)}
    </Card>
  );
}
