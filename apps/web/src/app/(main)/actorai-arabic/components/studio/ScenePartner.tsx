"use client";

import { useRef } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import type { ChatMessage } from "../../types";

interface ScenePartnerProps {
  rehearsing: boolean;
  chatMessages: ChatMessage[];
  userInput: string;
  setUserInput: (input: string) => void;
  startRehearsal: () => void;
  sendMessage: () => void;
  endRehearsal: () => void;
}

export const ScenePartner: React.FC<ScenePartnerProps> = ({
  rehearsing,
  chatMessages,
  userInput,
  setUserInput,
  startRehearsal,
  sendMessage,
  endRehearsal,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] backdrop-blur-xl">
      <Card className="border-0">
        <CardHeader>
          <CardTitle>🎭 شريك المشهد الذكي</CardTitle>
          <CardDescription>
            تدرب على مشاهدك مع شريك ذكي يستجيب لأدائك
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!rehearsing ? (
            <div className="text-center py-12">
              <div className="text-8xl mb-6">🎭</div>
              <h3 className="text-2xl font-semibold mb-4">مستعد للتدريب؟</h3>
              <p className="text-white/55 mb-6">
                سيقوم الذكاء الاصطناعي بدور الشخصية الأخرى في المشهد
              </p>
              <Button size="lg" onClick={startRehearsal}>
                🎬 ابدأ التدريب
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* منطقة الدردشة */}
              <div className="border rounded-[22px] p-4 h-[400px] overflow-y-auto bg-white/[0.04]">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${msg.role === "user" ? "text-left" : "text-right"}`}
                  >
                    <div
                      className={`inline-block p-4 rounded-lg max-w-[80%] ${
                        msg.role === "user"
                          ? "bg-blue-100 text-blue-900"
                          : "bg-purple-100 text-purple-900"
                      }`}
                    >
                      <p className="font-medium mb-1">
                        {msg.role === "user" ? "أنت (أحمد):" : "ليلى (AI):"}
                      </p>
                      <p className={msg.typing ? "animate-pulse" : ""}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* إدخال الرسالة */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="اكتب سطرك هنا..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <div className="flex flex-col gap-2">
                  <Button onClick={sendMessage} disabled={!userInput.trim()}>
                    📤 إرسال
                  </Button>
                  <Button variant="outline" onClick={endRehearsal}>
                    ⏹️ إنهاء
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </CardSpotlight>
  );
};
