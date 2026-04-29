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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

import type { TeleprompterSettings } from "./types";

interface TeleprompterPanelProps {
  scriptText: string;
  setScriptText: (value: string) => void;
  teleprompterSettings: TeleprompterSettings;
  setTeleprompterSettings: (
    settings:
      | TeleprompterSettings
      | ((prev: TeleprompterSettings) => TeleprompterSettings)
  ) => void;
  teleprompterRunning: boolean;
  teleprompterPosition: number;
  countdown: number;
  startTeleprompter: () => void;
  stopTeleprompter: () => void;
  resetTeleprompter: () => void;
}

// ─── Sub-components ───

interface SettingsPanelProps {
  teleprompterSettings: TeleprompterSettings;
  setTeleprompterSettings: TeleprompterPanelProps["setTeleprompterSettings"];
  teleprompterRunning: boolean;
  countdown: number;
  startTeleprompter: () => void;
  stopTeleprompter: () => void;
  resetTeleprompter: () => void;
}

function TeleprompterSettingsPanel({
  teleprompterSettings,
  setTeleprompterSettings,
  teleprompterRunning,
  countdown,
  startTeleprompter,
  stopTeleprompter,
  resetTeleprompter,
}: SettingsPanelProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border-purple-500/30">
      <Card className="bg-black/18 border-purple-500/30 bg-transparent">
        <CardHeader>
          <CardTitle className="text-white">⚙️ إعدادات التلقين</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-purple-300">
              سرعة التمرير: {teleprompterSettings.speed}%
            </Label>
            <Slider
              value={[teleprompterSettings.speed]}
              min={10}
              max={100}
              step={5}
              onValueChange={([value]) =>
                setTeleprompterSettings((previous) => ({
                  ...previous,
                  speed: value ?? previous.speed,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-purple-300">
              حجم الخط: {teleprompterSettings.fontSize}px
            </Label>
            <Slider
              value={[teleprompterSettings.fontSize]}
              min={18}
              max={72}
              step={2}
              onValueChange={([value]) =>
                setTeleprompterSettings((previous) => ({
                  ...previous,
                  fontSize: value ?? previous.fontSize,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-purple-300">
              العد التنازلي: {teleprompterSettings.countdownSeconds} ثوان
            </Label>
            <Slider
              value={[teleprompterSettings.countdownSeconds]}
              min={0}
              max={10}
              step={1}
              onValueChange={([value]) =>
                setTeleprompterSettings((previous) => ({
                  ...previous,
                  countdownSeconds: value ?? previous.countdownSeconds,
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-purple-300">وضع المرآة</Label>
              <Button
                variant="outline"
                size="sm"
                className={
                  teleprompterSettings.mirrorMode
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-purple-500/50 text-white"
                }
                onClick={() =>
                  setTeleprompterSettings((previous) => ({
                    ...previous,
                    mirrorMode: !previous.mirrorMode,
                  }))
                }
              >
                {teleprompterSettings.mirrorMode ? "✓ مفعل" : "معطل"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-purple-300">تمييز السطر الحالي</Label>
              <Button
                variant="outline"
                size="sm"
                className={
                  teleprompterSettings.highlightCurrentLine
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-purple-500/50 text-white"
                }
                onClick={() =>
                  setTeleprompterSettings((previous) => ({
                    ...previous,
                    highlightCurrentLine: !previous.highlightCurrentLine,
                  }))
                }
              >
                {teleprompterSettings.highlightCurrentLine ? "✓ مفعل" : "معطل"}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {!teleprompterRunning ? (
              <Button
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
                onClick={startTeleprompter}
              >
                {countdown > 0 ? `${countdown}...` : "▶️ تشغيل"}
              </Button>
            ) : (
              <Button
                className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700"
                onClick={stopTeleprompter}
              >
                ⏸️ إيقاف مؤقت
              </Button>
            )}
            <Button
              variant="outline"
              className="border-purple-500/50 text-purple-300"
              onClick={resetTeleprompter}
            >
              🔄 إعادة
            </Button>
          </div>
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

interface DisplayProps {
  scriptText: string;
  teleprompterSettings: TeleprompterSettings;
  teleprompterPosition: number;
  countdown: number;
}

function TeleprompterDisplay({
  scriptText,
  teleprompterSettings,
  teleprompterPosition,
  countdown,
}: DisplayProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black border-purple-500/30 lg:col-span-2">
      <Card className="bg-black border-purple-500/30 bg-transparent lg:col-span-2">
        <CardContent className="p-0">
          <div
            className={`relative min-h-[500px] overflow-hidden ${teleprompterSettings.mirrorMode ? "scale-x-[-1]" : ""}`}
          >
            {countdown > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
                <span className="text-9xl font-bold text-purple-500">
                  {countdown}
                </span>
              </div>
            )}

            <div className="absolute left-0 right-0 top-0 h-1 bg-purple-900">
              <div
                className="h-full bg-purple-500 transition-all duration-100"
                style={{ width: `${teleprompterPosition}%` }}
              />
            </div>

            <div
              className="p-8 text-white transition-transform duration-100"
              style={{
                fontSize: `${teleprompterSettings.fontSize}px`,
                transform: `translateY(-${teleprompterPosition * 3}px)`,
              }}
            >
              {scriptText.split("\n").map((line, index, source) => {
                const lineProgress =
                  (index / Math.max(source.length - 1, 1)) * 100;
                const isCurrentLine =
                  teleprompterSettings.highlightCurrentLine &&
                  Math.abs(lineProgress - teleprompterPosition) < 10;

                return (
                  <p
                    key={`${line}-${index}`}
                    className={`mb-4 leading-relaxed transition-all duration-300 ${isCurrentLine ? "rounded-[22px] bg-yellow-500/10 px-4 py-2 text-yellow-300" : lineProgress < teleprompterPosition ? "text-white/45" : "text-white"}`}
                  >
                    {line || " "}
                  </p>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

interface ScriptInputProps {
  scriptText: string;
  setScriptText: (value: string) => void;
}

function ScriptTextInput({ scriptText, setScriptText }: ScriptInputProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border-purple-500/30 lg:col-span-3">
      <Card className="bg-black/18 border-purple-500/30 bg-transparent lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-white">✏️ النص المراد قراءته</CardTitle>
          <CardDescription className="text-purple-300">
            اكتب النص الذي تريد استخدامه داخل جلسة السيلف تيب.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={scriptText}
            onChange={(event) => setScriptText(event.target.value)}
            className="min-h-[220px] border-purple-500/30 bg-black/14 text-lg text-white"
            placeholder="أدخل نص المشهد هنا..."
          />
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

// ─── Main component ───

export const TeleprompterPanel: React.FC<TeleprompterPanelProps> = ({
  scriptText,
  setScriptText,
  teleprompterSettings,
  setTeleprompterSettings,
  teleprompterRunning,
  teleprompterPosition,
  countdown,
  startTeleprompter,
  stopTeleprompter,
  resetTeleprompter,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <TeleprompterSettingsPanel
        teleprompterSettings={teleprompterSettings}
        setTeleprompterSettings={setTeleprompterSettings}
        teleprompterRunning={teleprompterRunning}
        countdown={countdown}
        startTeleprompter={startTeleprompter}
        stopTeleprompter={stopTeleprompter}
        resetTeleprompter={resetTeleprompter}
      />

      <TeleprompterDisplay
        scriptText={scriptText}
        teleprompterSettings={teleprompterSettings}
        teleprompterPosition={teleprompterPosition}
        countdown={countdown}
      />

      <ScriptTextInput scriptText={scriptText} setScriptText={setScriptText} />
    </div>
  );
};
