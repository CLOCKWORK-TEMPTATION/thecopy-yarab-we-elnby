"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EMPTY_CAPTIONS_TRACK } from "./constants";
import { formatRecordedAt, formatTime, getScoreColor } from "./utils";
import type { Take } from "./types";

interface RecorderPanelProps {
  cameraState: "idle" | "requesting" | "ready" | "error";
  cameraError: string;
  isRecording: boolean;
  isFinalizingTake: boolean;
  recordingTime: number;
  previewVideoRef: React.RefObject<HTMLVideoElement | null>;
  mediaCaptureSupported: boolean;
  availableTakes: Take[];
  bestScore: number;
  totalDuration: number;
  exportableTakeIds: Set<string>;
  currentPromptLine: string;
  requestCameraAccess: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetTeleprompter: () => void;
  deleteTake: (takeId: string) => void;
  exportTake: (takeId: string) => Promise<void>;
  setActiveTool: (tool: string) => void;
  setNotesTakeId: (takeId: string | null) => void;
}

export const RecorderPanel: React.FC<RecorderPanelProps> = ({
  cameraState,
  cameraError,
  isRecording,
  isFinalizingTake,
  recordingTime,
  previewVideoRef,
  mediaCaptureSupported,
  availableTakes,
  bestScore,
  totalDuration,
  exportableTakeIds,
  currentPromptLine,
  requestCameraAccess,
  startRecording,
  stopRecording,
  resetTeleprompter,
  deleteTake,
  exportTake,
  setActiveTool,
  setNotesTakeId,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border-purple-500/30">
        <Card className="bg-black/18 border-purple-500/30 bg-transparent">
          <CardHeader>
            <CardTitle className="text-white">🎬 استوديو التسجيل</CardTitle>
            <CardDescription className="text-purple-300">
              معاينة حية من الكاميرا مع تسجيل فعلي عبر المتصفح.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!mediaCaptureSupported && (
              <Alert className="border-yellow-500/40 bg-yellow-500/10 text-yellow-200">
                <AlertDescription>
                  هذه البيئة لا تدعم التسجيل الفعلي. ما يزال بإمكانك استعراض
                  الواجهة، لكن التسجيل سيتطلب متصفحاً حديثاً.
                </AlertDescription>
              </Alert>
            )}

            {cameraError && (
              <Alert className="border-red-500/40 bg-red-500/10 text-red-200">
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}

            <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-purple-500/30 bg-black">
              {cameraState === "ready" ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                >
                  <track
                    kind="captions"
                    src={EMPTY_CAPTIONS_TRACK}
                    srcLang="ar"
                    label="لا توجد ترجمة"
                  />
                </video>
              ) : (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-purple-500/20">
                      <span className="text-5xl">
                        {cameraState === "requesting" ? "⏳" : "📹"}
                      </span>
                    </div>
                    <p className="text-lg text-white">
                      {cameraState === "requesting"
                        ? "جاري طلب الإذن للوصول إلى الكاميرا..."
                        : "معاينة الكاميرا ستظهر هنا بعد التفعيل"}
                    </p>
                  </div>
                </div>
              )}

              {isRecording && (
                <>
                  <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-mono text-red-300">
                      {formatTime(recordingTime)}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3 text-center text-white">
                    <p className="line-clamp-2 text-lg">{currentPromptLine}</p>
                  </div>
                </>
              )}

              {isFinalizingTake && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center text-white">
                    <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                    <p>جاري إنهاء التسجيل وتحليل النتيجة...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Button
                variant="outline"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                onClick={() => {
                  void requestCameraAccess();
                }}
                disabled={cameraState === "requesting" || isRecording}
              >
                📷 تفعيل الكاميرا
              </Button>

              {!isRecording ? (
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => {
                    void startRecording();
                  }}
                  disabled={
                    cameraState === "requesting" ||
                    isFinalizingTake ||
                    !mediaCaptureSupported
                  }
                >
                  🎬 بدء التسجيل
                </Button>
              ) : (
                <Button
                  className="bg-black/22 text-white hover:bg-white/8"
                  onClick={stopRecording}
                >
                  ⏹️ إنهاء التسجيل
                </Button>
              )}

              <Button
                variant="outline"
                className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20"
                onClick={resetTeleprompter}
                disabled={isFinalizingTake}
              >
                📜 إعادة التلقين
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-purple-500/30 pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">
                  {availableTakes.length}
                </p>
                <p className="text-sm text-white/55">إجمالي التسجيلات</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">
                  {bestScore}%
                </p>
                <p className="text-sm text-white/55">أعلى تقييم</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">
                  {formatTime(totalDuration)}
                </p>
                <p className="text-sm text-white/55">إجمالي الوقت</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardSpotlight>

      <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border-purple-500/30">
        <Card className="bg-black/18 border-purple-500/30 bg-transparent">
          <CardHeader>
            <CardTitle className="text-white">
              📋 التسجيلات ({availableTakes.length})
            </CardTitle>
            <CardDescription className="text-purple-300">
              التسجيلات الحية تبقى قابلة للتصدير داخل الجلسة الحالية، بينما
              تُحفظ البيانات الوصفية محلياً بين الزيارات.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[560px] space-y-3 overflow-y-auto">
              {availableTakes.map((take) => (
                <div
                  key={take.id}
                  className="rounded-xl border border-purple-500/20 bg-black/14 p-4 transition-all hover:border-purple-500/50"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 font-medium text-white">
                        {take.name}
                        {take.source === "captured" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300">
                            جلسة حيّة
                          </Badge>
                        ) : (
                          <Badge className="bg-black/22/60 text-white/85">
                            نموذج
                          </Badge>
                        )}
                        {take.status === "exported" && (
                          <Badge className="bg-blue-500/20 text-blue-300">
                            مُصدَّر
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-white/55">
                        {formatRecordedAt(take.recordedAt)} •{" "}
                        {formatTime(take.duration)}
                      </p>
                    </div>

                    <div
                      className={`text-2xl font-bold ${getScoreColor(take.score)}`}
                    >
                      {take.score ?? 0}%
                    </div>
                  </div>

                  {take.videoUrl ? (
                    <video
                      src={take.videoUrl}
                      controls
                      muted
                      className="mb-3 aspect-video w-full rounded-[22px] bg-black object-cover"
                    >
                      <track
                        kind="captions"
                        src={EMPTY_CAPTIONS_TRACK}
                        srcLang="ar"
                        label="لا توجد ترجمة"
                      />
                    </video>
                  ) : (
                    <div className="mb-3 flex aspect-video items-center justify-center rounded-[22px] border border-dashed border-purple-500/20 bg-black/40 text-center text-sm text-white/55">
                      <div>
                        <p>لا يوجد ملف فيديو محفوظ مع هذا التسجيل.</p>
                        <p>
                          البيانات الوصفية محفوظة، لكن التصدير يتطلب جلسة حيّة.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mb-3 text-sm text-white/68">
                    <p>{take.notes[0]?.content ?? "لا توجد ملاحظات بعد."}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                      onClick={() => {
                        setActiveTool("notes");
                        setNotesTakeId(take.id);
                      }}
                    >
                      📝 الملاحظات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-green-500/50 text-green-300 hover:bg-green-500/20"
                      onClick={() => {
                        void exportTake(take.id);
                      }}
                      disabled={!exportableTakeIds.has(take.id)}
                    >
                      📤 تصدير
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-300 hover:bg-red-500/20"
                      onClick={() => deleteTake(take.id)}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CardSpotlight>
    </div>
  );
};
