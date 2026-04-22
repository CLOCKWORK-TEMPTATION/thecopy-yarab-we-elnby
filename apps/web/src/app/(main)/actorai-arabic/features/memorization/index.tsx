"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { useApp } from "../../context/AppContext";
import type { MemorizationStats } from "../../types";

const INITIAL_STATS: MemorizationStats = {
  totalAttempts: 0,
  correctWords: 0,
  incorrectWords: 0,
  hesitationCount: 0,
  weakPoints: [],
  averageResponseTime: 0,
};

const SAMPLE_SCRIPT = `أكون أو لا أكون، ذلك هو السؤال
هل من الأنبل في العقل أن نحتمل
سهام القدر الجائر ورماحه
أم أن نتسلح ضد بحر من المتاعب
وبالمقاومة ننهيها؟`;

export function MemorizationView() {
  const { showNotification } = useApp();

  // ─── State ───
  const [memorizationScript, setMemorizationScript] = useState("");
  const [memorizationDeletionLevel, setMemorizationDeletionLevel] = useState<
    10 | 50 | 90
  >(10);
  const [memorizationActive, setMemorizationActive] = useState(false);
  const [memorizationPaused, setMemorizationPaused] = useState(false);
  const [, setPromptMode] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [userMemorizationInput, setUserMemorizationInput] = useState("");
  const [hesitationTimer, setHesitationTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [hesitationDetected, setHesitationDetected] = useState(false);
  const [memorizationStats, setMemorizationStats] =
    useState<MemorizationStats>(INITIAL_STATS);
  const [attemptStartTime, setAttemptStartTime] = useState<number>(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [weakPointsMap, setWeakPointsMap] = useState<Map<string, number>>(
    new Map()
  );
  const [showPromptHint, setShowPromptHint] = useState(false);
  const [currentPromptWord, setCurrentPromptWord] = useState("");

  // ─── Callbacks ───

  const processTextForMemorization = useCallback(
    (text: string, deletionLevel: number): string => {
      const words = text.split(/\s+/);
      const totalWords = words.length;
      const wordsToDelete = Math.floor(totalWords * (deletionLevel / 100));
      const indicesToDelete = new Set<number>();
      while (indicesToDelete.size < wordsToDelete) {
        indicesToDelete.add(Math.floor(Math.random() * totalWords));
      }
      return words
        .map((word, index) => (indicesToDelete.has(index) ? "____" : word))
        .join(" ");
    },
    []
  );

  const stopMemorizationSession = useCallback(() => {
    setMemorizationActive(false);
    setMemorizationPaused(false);
    if (hesitationTimer) {
      clearTimeout(hesitationTimer);
      setHesitationTimer(null);
    }
    if (responseTimes.length > 0) {
      const avgTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      setMemorizationStats((prev) => ({
        ...prev,
        averageResponseTime: Math.round((avgTime / 1000) * 10) / 10,
      }));
    }
    showNotification("info", "تم إنهاء جلسة الحفظ");
  }, [hesitationTimer, responseTimes, showNotification]);

  const startMemorizationSession = useCallback(() => {
    if (!memorizationScript.trim()) {
      showNotification("error", "الرجاء إدخال نص للحفظ أولاً");
      return;
    }
    setMemorizationActive(true);
    setMemorizationPaused(false);
    setCurrentLineIndex(0);
    setUserMemorizationInput("");
    setHesitationDetected(false);
    setAttemptStartTime(Date.now());
    setMemorizationStats(INITIAL_STATS);
    showNotification("success", "بدأت جلسة الحفظ - حاول تذكر الكلمات المحذوفة");
  }, [memorizationScript, showNotification]);

  const activatePromptMode = useCallback(() => {
    setPromptMode(true);
    setHesitationDetected(true);
    setMemorizationStats((prev) => ({
      ...prev,
      hesitationCount: prev.hesitationCount + 1,
    }));
    const lines = memorizationScript.split("\n");
    const currentLine = lines[currentLineIndex];
    if (currentLine) {
      const words = currentLine.split(/\s+/);
      const firstWord = words[0];
      if (firstWord) {
        setCurrentPromptWord(firstWord);
        setShowPromptHint(true);
      }
    }
    showNotification("info", "تم اكتشاف تردد - إليك تلميح");
  }, [memorizationScript, currentLineIndex, showNotification]);

  const handleMemorizationInput = useCallback(
    (value: string) => {
      setUserMemorizationInput(value);
      if (hesitationTimer) clearTimeout(hesitationTimer);
      const timer = setTimeout(() => {
        if (memorizationActive && !memorizationPaused) {
          activatePromptMode();
        }
      }, 3000);
      setHesitationTimer(timer);
    },
    [
      hesitationTimer,
      memorizationActive,
      memorizationPaused,
      activatePromptMode,
    ]
  );

  const handleMemorizationSubmit = useCallback(() => {
    const responseTime = Date.now() - attemptStartTime;
    setResponseTimes((prev) => [...prev, responseTime]);
    const lines = memorizationScript.split("\n");
    const lineAtIndex = lines[currentLineIndex];
    if (lineAtIndex) {
      const correctLine = lineAtIndex.trim();
      const userLine = userMemorizationInput.trim();
      const correctWords = correctLine.split(/\s+/);
      const userWords = userLine.split(/\s+/);
      let correct = 0;
      let incorrect = 0;
      const weakWords: string[] = [];
      correctWords.forEach((word, index) => {
        if (
          userWords[index] &&
          userWords[index].toLowerCase() === word.toLowerCase()
        ) {
          correct++;
        } else {
          incorrect++;
          weakWords.push(word);
          const currentCount = weakPointsMap.get(word) || 0;
          setWeakPointsMap((prev) => new Map(prev).set(word, currentCount + 1));
        }
      });
      setMemorizationStats((prev) => ({
        ...prev,
        totalAttempts: prev.totalAttempts + 1,
        correctWords: prev.correctWords + correct,
        incorrectWords: prev.incorrectWords + incorrect,
        weakPoints: [...new Set([...prev.weakPoints, ...weakWords])].slice(-10),
      }));
      if (currentLineIndex < lines.length - 1) {
        setCurrentLineIndex((prev) => prev + 1);
        setUserMemorizationInput("");
        setAttemptStartTime(Date.now());
        setShowPromptHint(false);
        setPromptMode(false);
        showNotification("success", `صحيح: ${correct}، خطأ: ${incorrect}`);
      } else {
        stopMemorizationSession();
        showNotification("success", "أحسنت! أكملت النص بالكامل");
      }
    }
  }, [
    attemptStartTime,
    memorizationScript,
    currentLineIndex,
    userMemorizationInput,
    weakPointsMap,
    stopMemorizationSession,
    showNotification,
  ]);

  const useSampleScriptForMemorization = useCallback(() => {
    setMemorizationScript(SAMPLE_SCRIPT);
    showNotification("success", "تم تحميل نص نموذجي");
  }, [showNotification]);

  const increaseDeletionLevel = useCallback(() => {
    setMemorizationDeletionLevel((prev) => {
      if (prev === 10) return 50;
      if (prev === 50) return 90;
      return prev;
    });
    showNotification("info", "تم زيادة مستوى الصعوبة");
  }, [showNotification]);

  const repeatDifficultParts = useCallback(() => {
    const weakWords = Array.from(weakPointsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    if (weakWords.length === 0) {
      showNotification("info", "لا توجد نقاط ضعف مسجلة بعد");
      return;
    }
    showNotification("info", `نقاط الضعف: ${weakWords.join("، ")}`);
  }, [weakPointsMap, showNotification]);

  // ─── Render ───

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="grid gap-6">
        {/* العنوان الرئيسي */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border border-white/8 backdrop-blur-xl">
          <Card className="bg-transparent border-0">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3 text-white">
                🧠 وضع اختبار الحفظ
              </CardTitle>
              <CardDescription className="text-white/55">
                تدرب على حفظ نصوصك مع حذف تدريجي للكلمات وتلقين ذكي عند التردد
              </CardDescription>
            </CardHeader>
          </Card>
        </CardSpotlight>

        {/* إدخال النص */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
          <Card className="bg-transparent border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                📝 النص للحفظ
              </CardTitle>
              <CardDescription className="text-white/55">
                أدخل النص الذي تريد حفظه
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={useSampleScriptForMemorization}
                >
                  📄 نص نموذجي
                </Button>
              </div>
              <Textarea
                placeholder="أدخل النص هنا..."
                value={memorizationScript}
                onChange={(e) => setMemorizationScript(e.target.value)}
                className="min-h-[150px] text-right bg-black/18 border-white/8 text-white placeholder-white/45"
                dir="rtl"
                disabled={memorizationActive}
              />

              {/* مستوى الصعوبة */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/55">مستوى الحذف:</span>
                <div className="flex gap-2">
                  {[10, 50, 90].map((level) => (
                    <Button
                      key={level}
                      variant={
                        memorizationDeletionLevel === level
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setMemorizationDeletionLevel(level as 10 | 50 | 90)
                      }
                      disabled={memorizationActive}
                    >
                      {level}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* أزرار التحكم */}
              <div className="flex gap-2 justify-center">
                {!memorizationActive ? (
                  <Button
                    onClick={startMemorizationSession}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    ▶️ بدء جلسة الحفظ
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={stopMemorizationSession}
                      variant="destructive"
                    >
                      ⏹️ إنهاء الجلسة
                    </Button>
                    <Button onClick={increaseDeletionLevel} variant="outline">
                      ⬆️ زيادة الصعوبة
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </CardSpotlight>

        {/* منطقة التدريب */}
        {memorizationActive && (
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
            <Card className="bg-transparent border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  🎯 منطقة التدريب
                  <Badge
                    variant={hesitationDetected ? "destructive" : "secondary"}
                  >
                    {hesitationDetected ? "تم اكتشاف تردد" : "جاري الحفظ"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-white/55">
                  السطر {currentLineIndex + 1} من{" "}
                  {memorizationScript.split("\n").length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-black/18 rounded-[22px] text-right border border-white/8">
                  <p className="text-lg leading-relaxed text-white">
                    {(() => {
                      const line =
                        memorizationScript.split("\n")[currentLineIndex];
                      return line
                        ? processTextForMemorization(
                            line,
                            memorizationDeletionLevel
                          )
                        : null;
                    })()}
                  </p>
                </div>

                {showPromptHint && (
                  <Alert className="border-yellow-400/40 bg-yellow-600/20">
                    <AlertDescription className="text-right text-white/85">
                      💡 تلميح: الكلمة التالية تبدأ بـ &quot;
                      {currentPromptWord.slice(0, 2)}...&quot;
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label className="text-white">اكتب السطر كاملاً:</Label>
                  <Textarea
                    value={userMemorizationInput}
                    onChange={(e) => handleMemorizationInput(e.target.value)}
                    placeholder="اكتب النص من ذاكرتك..."
                    className="text-right bg-black/18 border-white/8 text-white placeholder-white/45"
                    dir="rtl"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleMemorizationSubmit();
                      }
                    }}
                  />
                </div>

                <Button
                  onClick={handleMemorizationSubmit}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  ✓ تحقق من الإجابة
                </Button>
              </CardContent>
            </Card>
          </CardSpotlight>
        )}

        {/* إحصائيات الأداء */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
          <Card className="bg-transparent border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                📊 إحصائيات الأداء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-black/18 rounded-[22px] border border-white/8">
                  <p className="text-2xl font-bold text-blue-400">
                    {memorizationStats.totalAttempts}
                  </p>
                  <p className="text-sm text-white/55">المحاولات</p>
                </div>
                <div className="text-center p-4 bg-black/18 rounded-[22px] border border-white/8">
                  <p className="text-2xl font-bold text-green-400">
                    {memorizationStats.correctWords}
                  </p>
                  <p className="text-sm text-white/55">كلمات صحيحة</p>
                </div>
                <div className="text-center p-4 bg-black/18 rounded-[22px] border border-white/8">
                  <p className="text-2xl font-bold text-red-400">
                    {memorizationStats.incorrectWords}
                  </p>
                  <p className="text-sm text-white/55">كلمات خاطئة</p>
                </div>
                <div className="text-center p-4 bg-black/18 rounded-[22px] border border-white/8">
                  <p className="text-2xl font-bold text-yellow-400">
                    {memorizationStats.hesitationCount}
                  </p>
                  <p className="text-sm text-white/55">مرات التردد</p>
                </div>
                <div className="text-center p-4 bg-black/18 rounded-[22px] border border-white/8">
                  <p className="text-2xl font-bold text-purple-400">
                    {memorizationStats.averageResponseTime}s
                  </p>
                  <p className="text-sm text-white/55">متوسط الاستجابة</p>
                </div>
                <div className="text-center p-4 bg-black/18 rounded-[22px] border border-white/8">
                  <p className="text-2xl font-bold text-white">
                    {memorizationStats.totalAttempts > 0
                      ? Math.round(
                          (memorizationStats.correctWords /
                            (memorizationStats.correctWords +
                              memorizationStats.incorrectWords)) *
                            100
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-sm text-white/55">نسبة النجاح</p>
                </div>
              </div>

              {memorizationStats.weakPoints.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-white">نقاط الضعف:</h4>
                  <div className="flex flex-wrap gap-2">
                    {memorizationStats.weakPoints.map((word, index) => (
                      <Badge key={index} variant="destructive">
                        {word}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    onClick={repeatDifficultParts}
                    variant="outline"
                    size="sm"
                    className="mt-2 border-white/20 text-white hover:bg-white/8"
                  >
                    🔄 تكرار الأجزاء الصعبة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </CardSpotlight>

        {/* دليل الاستخدام */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
          <Card className="bg-transparent border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                📖 دليل الاستخدام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-white/55">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">1.</span>
                  أدخل النص الذي تريد حفظه أو استخدم النص النموذجي
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">2.</span>
                  اختر مستوى الحذف (10% للمبتدئين، 90% للمتقدمين)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">3.</span>
                  ابدأ الجلسة واكتب الكلمات المحذوفة من ذاكرتك
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">4.</span>
                  إذا ترددت لأكثر من 3 ثواني، سيظهر تلميح للمساعدة
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">5.</span>
                  راجع إحصائياتك وركز على نقاط الضعف
                </li>
              </ul>
            </CardContent>
          </Card>
        </CardSpotlight>
      </div>
    </div>
  );
}
