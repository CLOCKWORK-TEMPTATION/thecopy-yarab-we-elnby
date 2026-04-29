"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EMPTY_CAPTIONS_TRACK } from "./constants";
import { formatRecordedAt, formatTime, getScoreColor } from "./utils";

import type { ComparisonView, Take } from "./types";

interface ComparisonPanelProps {
  availableTakes: Take[];
  comparisonView: ComparisonView;
  setComparisonView: (
    view: ComparisonView | ((prev: ComparisonView) => ComparisonView)
  ) => void;
}

// ─── Sub-components ───

interface SelectorProps {
  availableTakes: Take[];
  comparisonView: ComparisonView;
  setComparisonView: ComparisonPanelProps["setComparisonView"];
}

function TakeSelectorBar({
  availableTakes,
  comparisonView,
  setComparisonView,
}: SelectorProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border-purple-500/30">
      <Card className="bg-black/18 border-purple-500/30 bg-transparent">
        <CardHeader>
          <CardTitle className="text-white">⚖️ مقارنة التسجيلات</CardTitle>
          <CardDescription className="text-purple-300">
            قارن بين تسجيلين بصرياً وعددياً لاختيار النسخة الأقوى.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
            <div>
              <Label className="mb-2 block text-purple-300">
                التسجيل الأيسر
              </Label>
              <Select
                value={comparisonView.leftTakeId ?? ""}
                onValueChange={(value) =>
                  setComparisonView((previous) => ({
                    ...previous,
                    leftTakeId: value,
                  }))
                }
              >
                <SelectTrigger className="border-purple-500/30 bg-black/14 text-white">
                  <SelectValue placeholder="اختر تسجيلاً" />
                </SelectTrigger>
                <SelectContent className="border-purple-500/30 bg-black/14">
                  {availableTakes.map((take) => (
                    <SelectItem
                      key={take.id}
                      value={take.id}
                      className="text-white"
                    >
                      {take.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-center">
              <Button
                variant="outline"
                className={
                  comparisonView.syncPlayback
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-purple-500/50 text-white"
                }
                onClick={() =>
                  setComparisonView((previous) => ({
                    ...previous,
                    syncPlayback: !previous.syncPlayback,
                  }))
                }
              >
                {comparisonView.syncPlayback ? "🔗 متزامن" : "🔓 منفصل"}
              </Button>
            </div>

            <div>
              <Label className="mb-2 block text-purple-300">
                التسجيل الأيمن
              </Label>
              <Select
                value={comparisonView.rightTakeId ?? ""}
                onValueChange={(value) =>
                  setComparisonView((previous) => ({
                    ...previous,
                    rightTakeId: value,
                  }))
                }
              >
                <SelectTrigger className="border-purple-500/30 bg-black/14 text-white">
                  <SelectValue placeholder="اختر تسجيلاً" />
                </SelectTrigger>
                <SelectContent className="border-purple-500/30 bg-black/14">
                  {availableTakes.map((take) => (
                    <SelectItem
                      key={take.id}
                      value={take.id}
                      className="text-white"
                    >
                      {take.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

interface TakePreviewCardProps {
  take: Take | undefined;
  index: number;
  syncPlayback: boolean;
}

function TakePreviewCard({ take, index, syncPlayback }: TakePreviewCardProps) {
  return (
    <Card
      key={take?.id ?? `empty-${index}`}
      className="bg-black/18 border-purple-500/30"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white">
          {take?.name ?? "اختر تسجيلاً"}
        </CardTitle>
        {take && (
          <CardDescription className="text-purple-300">
            {formatRecordedAt(take.recordedAt)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {take?.videoUrl ? (
          <video
            src={take.videoUrl}
            controls
            muted={!syncPlayback}
            className="aspect-video w-full rounded-[22px] bg-black object-cover"
          >
            <track
              kind="captions"
              src={EMPTY_CAPTIONS_TRACK}
              srcLang="ar"
              label="لا توجد ترجمة"
            />
          </video>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-[22px] border border-dashed border-purple-500/20 bg-black/40 text-center text-white/55">
            <div>
              <p>لا يوجد ملف فيديو مباشر لهذا الجانب.</p>
              <p className="text-sm">
                ستبقى المقارنة الرقمية متاحة من خلال التقييمات والملاحظات.
              </p>
            </div>
          </div>
        )}

        {take && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/55">التقييم</span>
              <span className={`font-bold ${getScoreColor(take.score)}`}>
                {take.score ?? 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">المدة</span>
              <span className="text-white">{formatTime(take.duration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">الملاحظات</span>
              <span className="text-purple-300">
                {take.notes.length} ملاحظة
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SummaryProps {
  leftTake: Take;
  rightTake: Take;
}

function ComparisonSummary({ leftTake, rightTake }: SummaryProps) {
  const scoreDiff = (rightTake.score ?? 0) - (leftTake.score ?? 0);
  const durationDiff = Math.abs(rightTake.duration - leftTake.duration);
  const betterName =
    (rightTake.score ?? 0) > (leftTake.score ?? 0)
      ? rightTake.name
      : leftTake.name;

  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border-purple-500/30">
      <Card className="bg-black/18 border-purple-500/30 bg-transparent">
        <CardHeader>
          <CardTitle className="text-white">📊 ملخص المقارنة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl bg-black/14 p-4 text-center">
              <p className="mb-2 text-sm text-white/55">فرق التقييم</p>
              <p className="text-3xl font-bold text-green-400">
                {scoreDiff > 0 ? "+" : ""}
                {scoreDiff}%
              </p>
            </div>
            <div className="rounded-xl bg-black/14 p-4 text-center">
              <p className="mb-2 text-sm text-white/55">فرق المدة</p>
              <p className="text-3xl font-bold text-purple-400">
                {durationDiff}ث
              </p>
            </div>
            <div className="rounded-xl bg-black/14 p-4 text-center">
              <p className="mb-2 text-sm text-white/55">النسخة الأفضل</p>
              <p className="text-xl font-bold text-yellow-400">{betterName}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

// ─── Main component ───

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({
  availableTakes,
  comparisonView,
  setComparisonView,
}) => {
  const leftTake = availableTakes.find(
    (take) => take.id === comparisonView.leftTakeId
  );
  const rightTake = availableTakes.find(
    (take) => take.id === comparisonView.rightTakeId
  );

  return (
    <div className="space-y-6">
      <TakeSelectorBar
        availableTakes={availableTakes}
        comparisonView={comparisonView}
        setComparisonView={setComparisonView}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[leftTake, rightTake].map((take, index) => (
          <TakePreviewCard
            key={take?.id ?? `empty-${index}`}
            take={take}
            index={index}
            syncPlayback={comparisonView.syncPlayback}
          />
        ))}
      </div>

      {leftTake && rightTake && (
        <ComparisonSummary leftTake={leftTake} rightTake={rightTake} />
      )}
    </div>
  );
};
