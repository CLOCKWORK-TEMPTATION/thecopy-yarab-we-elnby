"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { VOCAL_EXERCISES } from "../../types/constants";

interface VocalExercisesProps {
  activeExercise: string | null;
  exerciseTimer: number;
  startExercise: (id: string) => void;
  stopExercise: () => void;
  formatTime: (seconds: number) => string;
}

export const VocalExercises: React.FC<VocalExercisesProps> = ({
  activeExercise,
  exerciseTimer,
  startExercise,
  stopExercise,
  formatTime,
}) => (
  <div className="max-w-6xl mx-auto py-8">
    <h2 className="text-3xl font-bold text-white/85 mb-2">
      🎤 تمارين الصوت والنطق
    </h2>
    <p className="text-white/55 mb-8">
      تمارين احترافية لتطوير صوتك وأدائك الصوتي
    </p>

    {/* التمرين النشط */}
    {activeExercise && (
      <CardSpotlight className="mb-8 overflow-hidden rounded-[22px] backdrop-blur-xl">
        <Card className="border-0 mb-8 bg-gradient-to-l from-purple-500 to-blue-500 text-white">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold mb-2">
              {VOCAL_EXERCISES.find((e) => e.id === activeExercise)?.name}
            </h3>
            <p className="text-lg mb-4 opacity-90">
              {
                VOCAL_EXERCISES.find((e) => e.id === activeExercise)
                  ?.description
              }
            </p>
            <div className="text-5xl font-mono font-bold mb-6">
              {formatTime(exerciseTimer)}
            </div>
            <Button
              size="lg"
              variant="secondary"
              onClick={stopExercise}
              className="bg-white/[0.04] text-purple-400 hover:bg-white/6"
            >
              ⏹️ إنهاء التمرين
            </Button>
          </CardContent>
        </Card>
      </CardSpotlight>
    )}

    {/* قائمة التمارين */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {VOCAL_EXERCISES.map((exercise) => (
        <Card
          key={exercise.id}
          className={`hover:shadow-lg transition-shadow ${
            activeExercise === exercise.id ? "ring-2 ring-purple-500" : ""
          }`}
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {exercise.category === "breathing" && "🌬️"}
                  {exercise.category === "articulation" && "👄"}
                  {exercise.category === "projection" && "📢"}
                  {exercise.category === "resonance" && "🔔"}
                  {exercise.name}
                </CardTitle>
                <CardDescription>{exercise.description}</CardDescription>
              </div>
              <Badge variant="outline">{exercise.duration}</Badge>
            </div>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => startExercise(exercise.id)}
              disabled={
                activeExercise !== null && activeExercise !== exercise.id
              }
            >
              {activeExercise === exercise.id
                ? "⏸️ جاري التمرين..."
                : "▶️ ابدأ التمرين"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>

    {/* نصائح عامة */}
    <Card className="mt-8 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">
          💡 نصائح مهمة للتمارين الصوتية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-yellow-900">
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
  </div>
);
