"use client";

/**
 * الصفحة: brain-storm-ai / DebatePanel
 * الهوية: لوحة نقاش داخلية بطابع شبكي داكن مع رسائل مميزة بصريًا حسب النوع
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات الصفحة المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { MessageSquare, Shield } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Badge } from "@/components/ui/badge";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { DebateMessage } from "../../types";


interface DebatePanelProps {
  messages: DebateMessage[];
}

function getMessageStyle(type: DebateMessage["type"]) {
  switch (type) {
    case "proposal":
      return "border-blue-400/20 bg-blue-400/10";
    case "decision":
      return "border-purple-400/20 bg-purple-400/10";
    default:
      return "border-emerald-400/20 bg-emerald-400/10";
  }
}

function getMessageTypeLabel(type: DebateMessage["type"]) {
  switch (type) {
    case "proposal":
      return "اقتراح";
    case "decision":
      return "قرار";
    default:
      return "موافقة";
  }
}

export default function DebatePanel({ messages }: DebatePanelProps) {
  if (messages.length === 0) return null;

  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/24 backdrop-blur-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <MessageSquare className="w-6 h-6 text-[var(--page-accent,#3b5bdb)]" />
          النقاش
        </CardTitle>
        <CardDescription className="text-white/55">
          {messages.length} رسالة
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border p-4 ${getMessageStyle(msg.type)}`}
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <span className="font-medium text-sm text-white">
                    {msg.agentName}
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.uncertainty ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                msg.uncertainty.confidence > 0.7
                                  ? "bg-emerald-500/10"
                                  : msg.uncertainty.confidence > 0.4
                                    ? "bg-amber-500/10"
                                    : "bg-red-500/10"
                              }`}
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              {(msg.uncertainty.confidence * 100).toFixed(0)}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              الثقة: {msg.uncertainty.confidence.toFixed(2)}
                            </p>
                            <p>النوع: {msg.uncertainty.type}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                    <Badge variant="outline" className="text-xs bg-white/5">
                      {getMessageTypeLabel(msg.type)}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm leading-7 text-white/72">{msg.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </CardSpotlight>
  );
}
