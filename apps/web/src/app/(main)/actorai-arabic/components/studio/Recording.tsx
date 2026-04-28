"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Recording } from "../../types";

interface RecordingProps {
  isRecording: boolean;
  recordingTime: number;
  recordings: Recording[];
  startRecording: () => void;
  stopRecording: () => void;
  formatTime: (seconds: number) => string;
}

export const Recording: React.FC<RecordingProps> = ({
  isRecording,
  recordingTime,
  recordings,
  startRecording,
  stopRecording,
  formatTime,
}) => (
  <CardSpotlight className="overflow-hidden rounded-[22px] backdrop-blur-xl">
    <Card className="border-0">
      <CardHeader>
        <CardTitle>🎥 تسجيل الأداء</CardTitle>
        <CardDescription>
          سجل أداءك واحصل على ملاحظات مدعومة بالذكاء الاصطناعي
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          {!isRecording ? (
            <>
              <div className="text-8xl mb-6">🎥</div>
              <h3 className="text-2xl font-semibold mb-4">
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

        {/* قائمة التسجيلات */}
        {recordings.length > 0 && (
          <div className="mt-8">
            <h4 className="font-semibold mb-4">📚 تسجيلاتك السابقة:</h4>
            <div className="space-y-3">
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="flex justify-between items-center p-4 border rounded-[22px] hover:bg-white/[0.04]"
                >
                  <div>
                    <h5 className="font-medium">{rec.title}</h5>
                    <p className="text-sm text-white/55">
                      المدة: {rec.duration} • {rec.date}
                    </p>
                  </div>
                  <Badge
                    className={
                      rec.score >= 80
                        ? "bg-green-500"
                        : rec.score >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }
                  >
                    {rec.score}/100
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
