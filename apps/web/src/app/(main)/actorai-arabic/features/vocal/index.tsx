"use client";

import { useState, useCallback, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { useApp } from "../../context/AppContext";
import { formatTime } from "../../lib/utils";
import { VOCAL_EXERCISES } from "../../types/constants";

// ─── Sub-components ───

interface ActiveExerciseBannerProps {
  activeExerciseId: string;
  exerciseTimer: number;
  onStop: () => void;
}

function ActiveExerciseBanner({
  activeExerciseId,
  exerciseTimer,
  onStop,
}: ActiveExerciseBannerProps) {
  const exercise = VOCAL_EXERCISES.find((e) => e.id === activeExerciseId);
  if (!exercise) return null;

  return (
    <Card className="mb-8 bg-gradient-to-l from-purple-500 to-blue-500 text-white">
      <CardContent className="p-8 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-2xl font-bold mb-2">{exercise.name}</h3>
        <p className="text-lg mb-4 opacity-90">{exercise.description}</p>
        <div className="text-5xl font-mono font-bold mb-6">
          {formatTime(exerciseTimer)}
        </div>
        <Button
          size="lg"
          variant="secondary"
          onClick={onStop}
          className="bg-white text-purple-600 hover:bg-white/6"
        >
          ⏹️ إنهاء التمرين
        </Button>
      </CardContent>
    </Card>
  );
}

function getCategoryIcon(category: string): string {
  if (category === "breathing") return "🌬️";
  if (category === "articulation") return "👄";
  if (category === "projection") return "📢";
  if (category === "resonance") return "🔔";
  return "";
}

interface ExerciseListProps {
  activeExerciseId: string | null;
  onStart: (id: string) => void;
}

function ExerciseList({ activeExerciseId, onStart }: ExerciseListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {VOCAL_EXERCISES.map((exercise) => (
        <Card
          key={exercise.id}
          className={`hover:shadow-lg transition-shadow bg-white/[0.04] border-white/8 ${activeExerciseId === exercise.id ? "ring-2 ring-purple-500" : ""}`}
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  {getCategoryIcon(exercise.category)}
                  {exercise.name}
                </CardTitle>
                <CardDescription className="text-white/68">
                  {exercise.description}
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-white/8 text-white/68">
                {exercise.duration}
              </Badge>
            </div>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => onStart(exercise.id)}
              disabled={
                activeExerciseId !== null && activeExerciseId !== exercise.id
              }
            >
              {activeExerciseId === exercise.id
                ? "⏸️ جاري التمرين..."
                : "▶️ ابدأ التمرين"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function TipsList() {
  return (
    <Card className="mt-8 bg-yellow-500/20 border-yellow-500/30">
      <CardHeader>
        <CardTitle className="text-yellow-100">
          💡 نصائح مهمة للتمارين الصوتية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-yellow-100">
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>قم بتمارين الإحماء الصوتي قبل أي أداء أو تسجيل</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>اشرب الماء بشكل مستمر للحفاظ على ترطيب الحبال الصوتية</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>تجنب الصراخ أو الهمس المفرط لحماية صوتك</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>
              مارس التمارين يومياً لمدة 10-15 دقيقة للحصول على أفضل النتائج
            </span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───

export function VocalExercisesView() {
  const { showNotification } = useApp();

  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [exerciseTimer, setExerciseTimer] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeExercise) {
      interval = setInterval(() => {
        setExerciseTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeExercise]);

  const startExercise = useCallback(
    (exerciseId: string) => {
      setActiveExercise(exerciseId);
      setExerciseTimer(0);
      showNotification("info", "ابدأ التمرين الآن!");
    },
    [showNotification]
  );

  const stopExercise = useCallback(() => {
    setActiveExercise(null);
    setExerciseTimer(0);
    showNotification("success", "أحسنت! تم إنهاء التمرين");
  }, [showNotification]);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h2 className="text-3xl font-bold text-white mb-2">
        🎤 تمارين الصوت والنطق
      </h2>
      <p className="text-white/68 mb-8">
        تمارين احترافية لتطوير صوتك وأدائك الصوتي
      </p>

      {activeExercise && (
        <ActiveExerciseBanner
          activeExerciseId={activeExercise}
          exerciseTimer={exerciseTimer}
          onStop={stopExercise}
        />
      )}

      <ExerciseList activeExerciseId={activeExercise} onStart={startExercise} />

      <TipsList />
    </div>
  );
}
