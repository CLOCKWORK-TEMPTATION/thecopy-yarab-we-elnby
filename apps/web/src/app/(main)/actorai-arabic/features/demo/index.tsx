"use client";

import { useState, useRef, useCallback, useEffect } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useApp } from "../../context/AppContext";
import { buildTakeInsights } from "../../lib/self-tape";
import { formatTime } from "../../lib/utils";
import { ACTING_METHODOLOGIES } from "../../types/constants";

import type { ChatMessage, Recording } from "../../types";

// ─── Sub-components ───

interface ScriptAnalysisTabProps {
  scriptText: string;
  setScriptText: (text: string) => void;
  selectedMethodology: string;
  setSelectedMethodology: (value: string) => void;
  analyzing: boolean;
  analysisResult: string | null;
  analyzeScript: () => void;
}

function ScriptAnalysisTab({
  scriptText,
  setScriptText,
  selectedMethodology,
  setSelectedMethodology,
  analyzing,
  analysisResult,
  analyzeScript,
}: ScriptAnalysisTabProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle className="text-white">تحليل النص</CardTitle>
          <CardDescription className="text-white/55">
            ارفع نصاً للحصول على تحليل مدعوم بالذكاء الاصطناعي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>النص المسرحي/السينمائي</Label>
            <Textarea
              placeholder="الصق نصك هنا..."
              className="min-h-[200px] bg-black/18 border-white/8 text-white placeholder-white/45"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">منهجية التمثيل</Label>
            <Select
              value={selectedMethodology}
              onValueChange={setSelectedMethodology}
            >
              <SelectTrigger className="bg-black/18 border-white/8 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTING_METHODOLOGIES.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name} ({method.nameEn})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={analyzeScript}
            disabled={analyzing || !scriptText.trim()}
          >
            {analyzing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                جاري التحليل...
              </>
            ) : (
              "🔍 حلل النص"
            )}
          </Button>

          {analysisResult && (
            <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 mt-6 backdrop-blur-xl">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">🎯 نتائج التحليل</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/85 whitespace-pre-wrap">{analysisResult}</p>
                </CardContent>
              </Card>
            </CardSpotlight>
          )}
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

interface PartnerTabProps {
  rehearsing: boolean;
  chatMessages: ChatMessage[];
  userInput: string;
  setUserInput: (value: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  startRehearsal: () => void;
  sendMessage: () => void;
  endRehearsal: () => void;
}

function PartnerTab({
  rehearsing,
  chatMessages,
  userInput,
  setUserInput,
  chatEndRef,
  startRehearsal,
  sendMessage,
  endRehearsal,
}: PartnerTabProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle className="text-white">🎭 شريك المشهد الذكي</CardTitle>
          <CardDescription className="text-white/55">
            تدرب على مشاهدك مع شريك ذكي يستجيب لأدائك
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!rehearsing ? (
            <div className="text-center py-12">
              <div className="text-8xl mb-6">🎭</div>
              <h3 className="text-2xl font-semibold mb-4 text-white">
                مستعد للتدريب؟
              </h3>
              <p className="text-white/55 mb-6">
                سيقوم الذكاء الاصطناعي بدور الشخصية الأخرى في المشهد
              </p>
              <Button size="lg" onClick={startRehearsal}>
                🎬 ابدأ التدريب
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-white/8 rounded-[22px] p-4 h-[400px] overflow-y-auto bg-black/18">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${msg.role === "user" ? "text-left" : "text-right"}`}
                  >
                    <div
                      className={`inline-block p-4 rounded-lg max-w-[80%] ${msg.role === "user" ? "bg-white/8 text-white" : "bg-white/12 text-white"}`}
                    >
                      <p className="font-medium mb-1 text-white">
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
                  className="flex-1 bg-black/18 border-white/8 text-white placeholder-white/45"
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
}

interface RecordingTabProps {
  isRecording: boolean;
  recordingTime: number;
  recordings: Recording[];
  startRecording: () => void;
  stopRecording: () => void;
}

function RecordingTab({
  isRecording,
  recordingTime,
  recordings,
  startRecording,
  stopRecording,
}: RecordingTabProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle className="text-white">🎥 تسجيل الأداء</CardTitle>
          <CardDescription className="text-white/55">
            سجل أداءك واحصل على ملاحظات مدعومة بالذكاء الاصطناعي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            {!isRecording ? (
              <>
                <div className="text-8xl mb-6">🎥</div>
                <h3 className="text-2xl font-semibold mb-4 text-white">
                  مستعد لتسجيل أدائك؟
                </h3>
                <Button size="lg" onClick={startRecording}>
                  ⏺️ ابدأ التسجيل
                </Button>
              </>
            ) : (
              <>
                <div className="text-8xl mb-6 animate-pulse">🔴</div>
                <h3 className="text-4xl font-mono font-bold text-red-600 mb-4">
                  {formatTime(recordingTime)}
                </h3>
                <p className="text-white/55 mb-6">جاري التسجيل...</p>
                <Button size="lg" variant="destructive" onClick={stopRecording}>
                  ⏹️ إيقاف التسجيل
                </Button>
              </>
            )}
          </div>

          {recordings.length > 0 && (
            <div className="mt-8">
              <h4 className="font-semibold mb-4 text-white">
                📚 تسجيلاتك السابقة:
              </h4>
              <div className="space-y-3">
                {recordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex justify-between items-center p-4 border border-white/8 rounded-[22px] hover:bg-white/4 bg-black/14"
                  >
                    <div>
                      <h5 className="font-medium text-white">{rec.title}</h5>
                      <p className="text-sm text-white/55">
                        المدة: {rec.duration} • {rec.date}
                      </p>
                    </div>
                    <Badge
                      className={
                        rec.score >= 80
                          ? "bg-green-600"
                          : rec.score >= 70
                            ? "bg-yellow-600"
                            : "bg-red-600"
                      }
                    >
                      النتيجة: {rec.score}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

// ─── Main component ───

export function StudioView() {
  const { showNotification, addRecording } = useApp();

  const [scriptText, setScriptText] = useState("");
  const [selectedMethodology, setSelectedMethodology] =
    useState("stanislavsky");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const [rehearsing, setRehearsing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const analyzeScript = useCallback(() => {
    if (!scriptText.trim()) {
      showNotification("error", "يرجى إدخال نص أولاً");
      return;
    }
    setAnalyzing(true);
    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: scriptText,
        context: { type: "script-analysis", methodology: selectedMethodology },
      }),
    })
      .then((res) => res.json())
      .then((payload: { data?: { response?: string } }) => {
        const text = payload?.data?.response ?? "تعذر تحليل النص.";
        setAnalysisResult(text);
        showNotification("success", "تم تحليل النص بنجاح!");
      })
      .catch(() => {
        setAnalysisResult("تعذر الاتصال بخادم التحليل.");
        showNotification("error", "فشل تحليل النص");
      })
      .finally(() => setAnalyzing(false));
  }, [scriptText, selectedMethodology, showNotification]);

  const startRehearsal = useCallback(() => {
    setRehearsing(true);
    setChatMessages([
      {
        role: "ai",
        text: "مرحباً! أنا شريكك في المشهد. سأقوم بدور ليلى. ابدأ بقول سطرك الأول...",
      },
    ]);
  }, []);

  const sendMessage = useCallback(() => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;
    const newMessage: ChatMessage = { role: "user", text: trimmedInput };
    setChatMessages((prev) => [
      ...prev,
      newMessage,
      { role: "ai", text: "...", typing: true },
    ]);
    setUserInput("");
    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmedInput,
        context: { previousMessages: chatMessages, character: "ليلى" },
      }),
    })
      .then((res) => res.json())
      .then((payload: { data?: { response?: string } }) => {
        const replyText =
          payload?.data?.response ?? "تعذر الاتصال بمساعد المشهد.";
        setChatMessages((prev) => {
          const withoutTyping = prev.filter((m) => !m.typing);
          return [...withoutTyping, { role: "ai", text: replyText }];
        });
      })
      .catch(() => {
        setChatMessages((prev) => {
          const withoutTyping = prev.filter((m) => !m.typing);
          return [
            ...withoutTyping,
            { role: "ai", text: "تعذر الاتصال بمساعد المشهد." },
          ];
        });
      });
  }, [chatMessages, userInput]);

  const endRehearsal = useCallback(() => {
    setRehearsing(false);
    setChatMessages([]);
    showNotification("success", "انتهت جلسة التدريب! أحسنت 👏");
  }, [showNotification]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingTime(0);
    showNotification("info", "بدأ التسجيل... 🎥");
  }, [showNotification]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    const duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    const insights = buildTakeInsights({
      durationSeconds: recordingTime,
      scriptText: scriptText,
      teleprompterUsed: false,
      hadRetake: recordings.length > 0,
    });
    const newRecording: Recording = {
      id: Date.now().toString(),
      title: `تسجيل جديد - ${new Date().toLocaleDateString("ar-EG")}`,
      duration,
      date:
        new Date().toISOString().split("T")[0] ??
        new Date().toLocaleDateString(),
      score: insights.score,
    };
    setRecordings((prev) => [newRecording, ...prev]);
    addRecording(newRecording);
    showNotification(
      "success",
      `تم حفظ التسجيل! النتيجة: ${newRecording.score}/100`
    );
  }, [
    addRecording,
    recordingTime,
    recordings.length,
    scriptText,
    showNotification,
  ]);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h2 className="text-3xl font-bold text-white mb-6">
        🎬 التجربة التفاعلية
      </h2>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-black/14 border border-white/8">
          <TabsTrigger value="analysis">📝 تحليل النص</TabsTrigger>
          <TabsTrigger value="partner">🎭 شريك المشهد</TabsTrigger>
          <TabsTrigger value="recording">🎥 التسجيل</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          <ScriptAnalysisTab
            scriptText={scriptText}
            setScriptText={setScriptText}
            selectedMethodology={selectedMethodology}
            setSelectedMethodology={setSelectedMethodology}
            analyzing={analyzing}
            analysisResult={analysisResult}
            analyzeScript={analyzeScript}
          />
        </TabsContent>

        <TabsContent value="partner" className="space-y-6">
          <PartnerTab
            rehearsing={rehearsing}
            chatMessages={chatMessages}
            userInput={userInput}
            setUserInput={setUserInput}
            chatEndRef={chatEndRef}
            startRehearsal={startRehearsal}
            sendMessage={sendMessage}
            endRehearsal={endRehearsal}
          />
        </TabsContent>

        <TabsContent value="recording" className="space-y-6">
          <RecordingTab
            isRecording={isRecording}
            recordingTime={recordingTime}
            recordings={recordings}
            startRecording={startRecording}
            stopRecording={stopRecording}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
